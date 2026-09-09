import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  applyMechanicalOnlySnapshots,
  compareArtifactSnapshots,
  createArtifactSnapshot,
  EDITORIAL_MANIFEST_SCHEMA_VERSION,
  EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION,
  LEGACY_ALGORITHM,
  MECHANICAL_ALGORITHM,
  mechanicalSha256,
  SEMANTIC_ALGORITHM,
  SNAPSHOT_QUALITY_BOUNDARY,
} from './lib/editorial-artifact-snapshot.mjs';

const root = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const mechanicalOnly = process.argv.includes('--mechanical-only');
const schemaMigration = process.argv.includes('--schema-migration');

if (!write) throw new Error('Use --write only after the required evidence record is complete.');
if (mechanicalOnly && schemaMigration) {
  throw new Error('--mechanical-only and --schema-migration are mutually exclusive.');
}

const mode = schemaMigration
  ? 'schema-migration'
  : mechanicalOnly
    ? 'mechanical-only'
    : 'reviewed-semantic';

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function readEvidenceRecord(argumentName) {
  const raw = argumentValue(argumentName);
  if (!raw) {
    throw new Error(`Mode ${mode} requires --${argumentName}=audit/localization/<file>.md.`);
  }
  const relativePath = raw.replaceAll('\\', '/');
  if (!/^audit\/localization\/[^/]+\.md$/.test(relativePath)) {
    throw new Error(`--${argumentName} must name a Markdown file directly under audit/localization/.`);
  }
  return readRecordPath(relativePath, `--${argumentName}`);
}

async function readRecordPath(relativePath, label) {
  if (!/^audit\/localization\/[^/]+\.md$/.test(relativePath ?? '')) {
    throw new Error(`${label} must name a Markdown file directly under audit/localization/.`);
  }
  const bytes = await fs.readFile(path.join(root, ...relativePath.split('/')));
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { relativePath, source, sha256: mechanicalSha256(bytes) };
}

function recordScalar(record, field) {
  const matches = [...record.source.matchAll(new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'gm'))];
  if (matches.length !== 1) {
    throw new Error(
      `${record.relativePath}: evidence field ${field}: must appear exactly once, found ${matches.length}.`,
    );
  }
  const [match] = matches;
  const firstSectionEnd = record.source.search(/^##\s+/m);
  const topSection = firstSectionEnd >= 0 ? record.source.slice(0, firstSectionEnd) : record.source;
  if ((firstSectionEnd >= 0 && match.index > firstSectionEnd)
    || /^ {0,3}(?:`{3,}|~{3,})/m.test(topSection)) {
    throw new Error(`${record.relativePath}: evidence field ${field}: must be in the top record section, outside code fences.`);
  }
  const raw = match[1].trim();
  const value = raw.startsWith('`') && raw.endsWith('`') ? raw.slice(1, -1).trim() : raw;
  if (!value) throw new Error(`${record.relativePath}: ${field} must not be empty.`);
  return value;
}

function recordTimestamp(record, field) {
  const value = recordScalar(record, field);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/);
  const parsed = Date.parse(value);
  if (!match || !Number.isFinite(parsed)) {
    throw new Error(`${record.relativePath}: ${field} must be a timezone-qualified ISO-8601 timestamp.`);
  }
  const [, year, month, day, hour, minute, second, zone, , offsetHour, offsetMinute] = match;
  const calendarProbe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarProbe.getUTCFullYear() !== Number(year)
    || calendarProbe.getUTCMonth() !== Number(month) - 1
    || calendarProbe.getUTCDate() !== Number(day)
    || Number(hour) > 23
    || Number(minute) > 59
    || Number(second) > 59
    || (zone !== 'Z'
      && (Number(offsetHour) > 14
        || Number(offsetMinute) > 59
        || (Number(offsetHour) === 14 && Number(offsetMinute) !== 0)))) {
    throw new Error(`${record.relativePath}: ${field} is not a valid ISO-8601 calendar timestamp.`);
  }
  if (parsed > Date.now() + 5 * 60 * 1000) {
    throw new Error(`${record.relativePath}: ${field} must not be in the future.`);
  }
  return value;
}

function recordJsonArray(record, field, { allowEmpty = true } = {}) {
  let value;
  try {
    value = JSON.parse(recordScalar(record, field));
  } catch (error) {
    throw new Error(`${record.relativePath}: ${field} must be a JSON array (${error.message}).`);
  }
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${record.relativePath}: ${field} must be ${allowEmpty ? 'a JSON array' : 'a non-empty JSON array'}.`);
  }
  return value;
}

function requireLiteral(record, field, expected) {
  const actual = recordScalar(record, field);
  if (actual !== expected) {
    throw new Error(`${record.relativePath}: ${field} must be ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);
  }
}

function normalizedSet(values) {
  return [...new Set(values)].sort();
}

function assertSameSet(actual, expected, message) {
  if (JSON.stringify(normalizedSet(actual)) !== JSON.stringify(normalizedSet(expected))) {
    throw new Error(message);
  }
}

function safeArtifactPath(relativePath, expectedArtifactSet) {
  return typeof relativePath === 'string'
    && !path.isAbsolute(relativePath)
    && !relativePath.includes('..')
    && !relativePath.includes('\\')
    && expectedArtifactSet.has(relativePath);
}

function validateCurrentManifest(manifest, expectedArtifactPaths) {
  if (manifest.schemaVersion !== EDITORIAL_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Current artifact manifest schemaVersion must be ${EDITORIAL_MANIFEST_SCHEMA_VERSION}.`);
  }
  if (manifest.semanticAlgorithm !== SEMANTIC_ALGORITHM) {
    throw new Error(`Current artifact manifest semanticAlgorithm must be ${SEMANTIC_ALGORITHM}.`);
  }
  if (manifest.mechanicalAlgorithm !== MECHANICAL_ALGORITHM) {
    throw new Error(`Current artifact manifest mechanicalAlgorithm must be ${MECHANICAL_ALGORITHM}.`);
  }
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  assertSameSet(
    artifacts.map((artifact) => artifact?.path),
    expectedArtifactPaths,
    'Current artifact manifest paths do not exactly match the configured localized pages.',
  );
  if (artifacts.length !== expectedArtifactPaths.length) {
    throw new Error('Current artifact manifest contains duplicate artifact paths.');
  }
  for (const artifact of artifacts) {
    if (!/^[a-f0-9]{64}$/.test(artifact?.semanticSha256 ?? '')) {
      throw new Error(`Current artifact manifest has an invalid semantic SHA-256: ${artifact?.path}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(artifact?.mechanicalSha256 ?? '')) {
      throw new Error(`Current artifact manifest has an invalid mechanical SHA-256: ${artifact?.path}.`);
    }
    if (!artifact.semanticProvenance || !artifact.mechanicalProvenance) {
      throw new Error(`Current artifact manifest lacks per-artifact provenance: ${artifact?.path}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(artifact.semanticProvenance.recordSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(artifact.mechanicalProvenance.recordSha256 ?? '')) {
      throw new Error(`Current artifact manifest has invalid provenance evidence digests: ${artifact?.path}.`);
    }
  }
}

function parseReviewedArtifactPaths(record) {
  const paths = recordJsonArray(record, 'reviewedArtifactPaths', { allowEmpty: false });
  if (!Array.isArray(paths) || paths.some((artifactPath) => typeof artifactPath !== 'string')) {
    throw new Error(`${record.relativePath}: reviewedArtifactPaths must be a JSON array of paths.`);
  }
  return paths;
}

function parseReviewedArtifactTransitions(record) {
  const transitions = recordJsonArray(record, 'reviewedArtifactTransitions', { allowEmpty: false });
  const seenPaths = new Set();
  for (const transition of transitions) {
    if (!transition || typeof transition !== 'object' || Array.isArray(transition)
      || typeof transition.path !== 'string'
      || !/^[a-f0-9]{64}$/.test(transition.beforeSemanticSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(transition.afterSemanticSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(transition.beforeMechanicalSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(transition.afterMechanicalSha256 ?? '')) {
      throw new Error(
        `${record.relativePath}: reviewedArtifactTransitions entries require exact before/after semantic and mechanical hashes.`,
      );
    }
    if (seenPaths.has(transition.path)) {
      throw new Error(`${record.relativePath}: reviewedArtifactTransitions contains duplicate path ${transition.path}.`);
    }
    seenPaths.add(transition.path);
  }
  return transitions;
}

function normalizedTransitions(transitions) {
  return transitions
    .map(({
      path: artifactPath,
      beforeSemanticSha256,
      afterSemanticSha256,
      beforeMechanicalSha256,
      afterMechanicalSha256,
    }) => ({
      path: artifactPath,
      beforeSemanticSha256,
      afterSemanticSha256,
      beforeMechanicalSha256,
      afterMechanicalSha256,
    }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function parseChangedArtifactTransitions(record) {
  const transitions = recordJsonArray(record, 'changedArtifactTransitions', { allowEmpty: false });
  const seenPaths = new Set();
  for (const transition of transitions) {
    if (!transition || typeof transition !== 'object' || Array.isArray(transition)
      || typeof transition.path !== 'string'
      || !/^[a-f0-9]{64}$/.test(transition.beforeMechanicalSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(transition.afterMechanicalSha256 ?? '')) {
      throw new Error(
        `${record.relativePath}: changedArtifactTransitions entries require path, beforeMechanicalSha256 and afterMechanicalSha256.`,
      );
    }
    if (seenPaths.has(transition.path)) {
      throw new Error(`${record.relativePath}: changedArtifactTransitions contains duplicate path ${transition.path}.`);
    }
    seenPaths.add(transition.path);
  }
  return transitions;
}

function normalizedMechanicalTransitions(transitions) {
  return transitions
    .map(({ path: artifactPath, beforeMechanicalSha256, afterMechanicalSha256 }) => ({
      path: artifactPath,
      beforeMechanicalSha256,
      afterMechanicalSha256,
    }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function requireNoBlockingIssues(record) {
  const blockingIssues = recordJsonArray(record, 'blockingIssues');
  if (!Array.isArray(blockingIssues) || blockingIssues.length !== 0) {
    throw new Error(`${record.relativePath}: blockingIssues must be an empty JSON array before semantic re-signing.`);
  }
}

function validateSemanticReviewRecord(record) {
  const reviewedAt = recordTimestamp(record, 'reviewedAt');
  recordScalar(record, 'reviewedByRole');
  recordScalar(record, 'reviewMethod');
  requireLiteral(record, 'reviewType', 'ai-assisted-target-market-semantic-review');
  requireLiteral(record, 'semanticReviewPerformed', 'true');
  requireLiteral(record, 'nativeSpeakerReviewPerformed', 'false');

  const referenceUrls = recordJsonArray(record, 'referenceUrls', { allowEmpty: false });
  const referenceAccessDates = recordJsonArray(record, 'referenceAccessDates', { allowEmpty: false });
  const terminologyDecisions = recordJsonArray(record, 'terminologyDecisions', { allowEmpty: false });
  const searchIntentDecisions = recordJsonArray(record, 'searchIntentDecisions', { allowEmpty: false });
  const unresolvedIssues = recordJsonArray(record, 'unresolvedIssues');
  requireNoBlockingIssues(record);

  for (const referenceUrl of referenceUrls) {
    if (typeof referenceUrl !== 'string' || !referenceUrl.trim()) {
      throw new Error(`${record.relativePath}: referenceUrls entries must be non-empty strings.`);
    }
    try {
      const parsed = new URL(referenceUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    } catch {
      throw new Error(`${record.relativePath}: referenceUrls must contain only absolute HTTP(S) URLs.`);
    }
  }
  const reviewedDate = reviewedAt.slice(0, 10);
  if (!referenceAccessDates.every((date) => {
    if (typeof date !== 'string') return false;
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const [, year, month, day] = match;
    const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return probe.getUTCFullYear() === Number(year)
      && probe.getUTCMonth() === Number(month) - 1
      && probe.getUTCDate() === Number(day)
      && date <= reviewedDate;
  })) {
    throw new Error(`${record.relativePath}: referenceAccessDates must contain real YYYY-MM-DD dates not later than reviewedAt.`);
  }
  if (referenceAccessDates.length !== referenceUrls.length) {
    throw new Error(`${record.relativePath}: referenceUrls and referenceAccessDates must have the same length.`);
  }
  if (![...terminologyDecisions, ...searchIntentDecisions]
    .every((decision) => typeof decision === 'string' && decision.trim())) {
    throw new Error(`${record.relativePath}: terminology/search-intent decisions must be non-empty strings.`);
  }
  if (unresolvedIssues.length !== 0) {
    throw new Error(`${record.relativePath}: unresolvedIssues must be an empty JSON array before semantic re-signing.`);
  }
  return reviewedAt;
}

function readHeadBytes(relativePath) {
  const result = spawnSync('git', ['show', `HEAD:${relativePath}`], {
    cwd: root,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    throw new Error(`Cannot read trusted HEAD baseline for ${relativePath}: ${result.error?.message ?? String(result.stderr).trim()}.`);
  }
  return Buffer.from(result.stdout);
}

function readHeadJson(relativePath) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readHeadBytes(relativePath)));
  } catch (error) {
    throw new Error(`Trusted HEAD baseline is invalid JSON (${relativePath}: ${error.message}).`);
  }
}

function readHeadRecordPath(relativePath, label) {
  if (!/^audit\/localization\/[^/]+\.md$/.test(relativePath ?? '')) {
    throw new Error(`${label} must name a Markdown file directly under audit/localization/.`);
  }
  const bytes = readHeadBytes(relativePath);
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return { relativePath, source, sha256: mechanicalSha256(bytes) };
}

const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const statusPath = path.join(root, 'i18n', 'editorial', 'status.json');
const status = JSON.parse(await fs.readFile(statusPath, 'utf8'));
const languages = [...config.activeLanguageCodes];
const pages = [...config.pages];
const expectedArtifactPaths = languages.flatMap((language) =>
  pages.map((page) => `${language}/${page}`)
);
const expectedArtifactSet = new Set(expectedArtifactPaths);

if (status.reviewedArtifactSnapshot?.pagesPerLanguage !== pages.length) {
  throw new Error('Editorial status page count does not match i18n/config.json.');
}
assertSameSet(
  status.reviewedArtifactSnapshot?.languages ?? [],
  languages,
  'Editorial status languages do not match i18n/config.json.',
);

const manifestRelative = status.reviewedArtifactSnapshot?.manifest;
if (manifestRelative !== 'audit/localization/current-localized-artifacts.json') {
  throw new Error('Editorial status must point to audit/localization/current-localized-artifacts.json.');
}
const manifestPath = path.join(root, ...manifestRelative.split('/'));
const previousManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const trustedHeadManifest = readHeadJson(manifestRelative);
const trustedHeadStatus = readHeadJson('i18n/editorial/status.json');

if (mode !== 'schema-migration'
  && JSON.stringify(previousManifest) !== JSON.stringify(trustedHeadManifest)) {
  throw new Error(
    'Snapshot refresh refused because the working manifest differs from the trusted HEAD baseline. Commit or restore the prior governed manifest before refreshing it.',
  );
}
if (mode !== 'schema-migration'
  && JSON.stringify(status) !== JSON.stringify(trustedHeadStatus)) {
  throw new Error(
    'Snapshot refresh refused because the working editorial status differs from the trusted HEAD baseline.',
  );
}

const currentArtifacts = [];
for (const relativePath of expectedArtifactPaths) {
  if (!safeArtifactPath(relativePath, expectedArtifactSet)) {
    throw new Error(`Unsafe localized artifact path: ${JSON.stringify(relativePath)}.`);
  }
  const source = await fs.readFile(path.join(root, ...relativePath.split('/')));
  currentArtifacts.push(createArtifactSnapshot(relativePath, source));
}

const recordedAt = new Date().toISOString();
let nextManifest;

if (mode === 'schema-migration') {
  const record = await readEvidenceRecord('migration-record');
  const migratedAt = recordTimestamp(record, 'migratedAt');
  recordScalar(record, 'migratedByRole');
  requireLiteral(record, 'migrationType', 'editorial-snapshot-schema-v1-to-v2');
  requireLiteral(record, 'semanticReviewPerformed', 'false');
  requireLiteral(record, 'nativeSpeakerReviewPerformed', 'false');
  requireLiteral(record, 'sourceReviewClaimsPreserved', 'true');

  if (![2, EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION].includes(status.reviewedArtifactSnapshot?.schemaVersion)) {
    throw new Error('Schema migration requires the legacy status or an uncommitted idempotent migration result.');
  }
  if (trustedHeadManifest.schemaVersion !== 1 || trustedHeadManifest.algorithm !== LEGACY_ALGORITHM) {
    throw new Error(`Schema migration requires a trusted HEAD schemaVersion 1 ${LEGACY_ALGORITHM} manifest.`);
  }
  if (previousManifest.schemaVersion !== 1
    && (previousManifest.schemaVersion !== EDITORIAL_MANIFEST_SCHEMA_VERSION
      || previousManifest.migration?.record !== record.relativePath)) {
    throw new Error('Working manifest is neither the trusted legacy baseline nor this same uncommitted migration.');
  }
  const legacyArtifacts = Array.isArray(trustedHeadManifest.artifacts) ? trustedHeadManifest.artifacts : [];
  assertSameSet(
    legacyArtifacts.map((artifact) => artifact?.path),
    expectedArtifactPaths,
    'Legacy artifact paths do not exactly match the configured localized pages.',
  );
  if (legacyArtifacts.length !== expectedArtifactPaths.length) {
    throw new Error('Legacy artifact manifest contains duplicate artifact paths.');
  }
  const currentByPath = new Map(currentArtifacts.map((artifact) => [artifact.path, artifact]));
  for (const artifact of legacyArtifacts) {
    if (!safeArtifactPath(artifact?.path, expectedArtifactSet)) {
      throw new Error(`Legacy artifact path is unsafe: ${JSON.stringify(artifact?.path)}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(artifact?.sha256 ?? '')) {
      throw new Error(`Legacy artifact has an invalid SHA-256: ${artifact.path}.`);
    }
    if (artifact.sha256 !== currentByPath.get(artifact.path).mechanicalSha256) {
      throw new Error(`${artifact.path}: migration refused because the legacy exact artifact snapshot no longer matches.`);
    }
  }
  const sourceReviewRecord = readHeadRecordPath(
    trustedHeadManifest.reviewRecord,
    'Legacy manifest sourceReviewRecord',
  );
  const workingSourceReviewRecord = await readRecordPath(
    trustedHeadManifest.reviewRecord,
    'Legacy manifest sourceReviewRecord',
  );
  if (workingSourceReviewRecord.sha256 !== sourceReviewRecord.sha256) {
    throw new Error('Schema migration refused because the legacy source review record differs from trusted HEAD.');
  }

  const migratedArtifacts = currentArtifacts.map((artifact) => ({
    ...artifact,
    semanticProvenance: {
      kind: 'schema-migration-of-existing-reviewed-artifact',
      record: record.relativePath,
      recordSha256: record.sha256,
      recordedAt: migratedAt,
      semanticReviewPerformed: false,
      nativeSpeakerReviewPerformed: false,
    },
    mechanicalProvenance: {
      kind: 'verified-legacy-snapshot-migration',
      record: record.relativePath,
      recordSha256: record.sha256,
      recordedAt,
    },
  }));
  nextManifest = {
    schemaVersion: EDITORIAL_MANIFEST_SCHEMA_VERSION,
    semanticAlgorithm: SEMANTIC_ALGORITHM,
    mechanicalAlgorithm: MECHANICAL_ALGORITHM,
    updatedAt: recordedAt,
    statusUpdatedAt: status.updatedAt,
    qualityBoundary: SNAPSHOT_QUALITY_BOUNDARY,
    lastUpdate: {
      mode: 'schema-migration',
      recordedAt,
      record: record.relativePath,
      recordSha256: record.sha256,
      semanticReviewPerformed: false,
      nativeSpeakerReviewPerformed: false,
      semanticChangedPaths: [],
      mechanicalChangedPaths: [],
    },
    migration: {
      fromManifestSchemaVersion: 1,
      fromAlgorithm: LEGACY_ALGORITHM,
      sourceCapturedAt: trustedHeadManifest.capturedAt,
      sourceReviewRecord: trustedHeadManifest.reviewRecord,
      sourceReviewRecordSha256: sourceReviewRecord.sha256,
      migratedAt,
      record: record.relativePath,
      recordSha256: record.sha256,
      legacyMechanicalHashesVerified: true,
      semanticReviewPerformed: false,
      nativeSpeakerReviewPerformed: false,
      sourceReviewClaimsPreserved: true,
    },
    artifacts: migratedArtifacts,
  };
  status.reviewedArtifactSnapshot = {
    schemaVersion: EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION,
    manifestSchemaVersion: EDITORIAL_MANIFEST_SCHEMA_VERSION,
    semanticAlgorithm: SEMANTIC_ALGORITHM,
    mechanicalAlgorithm: MECHANICAL_ALGORITHM,
    manifest: manifestRelative,
    manifestUpdatedAt: recordedAt,
    pagesPerLanguage: pages.length,
    languages,
    qualityBoundary: SNAPSHOT_QUALITY_BOUNDARY,
    migrationRecord: record.relativePath,
    migrationRecordSha256: record.sha256,
  };
} else {
  if (status.reviewedArtifactSnapshot?.schemaVersion !== EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Editorial status snapshot schemaVersion must be ${EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION}.`);
  }
  validateCurrentManifest(previousManifest, expectedArtifactPaths);
  const comparison = compareArtifactSnapshots(previousManifest.artifacts, currentArtifacts);

  if (mode === 'mechanical-only') {
    const record = await readEvidenceRecord('change-record');
    const changedAt = recordTimestamp(record, 'changedAt');
    recordScalar(record, 'changedByRole');
    recordScalar(record, 'reason');
    requireLiteral(record, 'changeType', 'mechanical-only');
    requireLiteral(record, 'semanticReviewPerformed', 'false');
    requireLiteral(record, 'nativeSpeakerReviewPerformed', 'false');
    if (!Number.isFinite(Date.parse(previousManifest.updatedAt ?? ''))
      || Date.parse(changedAt) <= Date.parse(previousManifest.updatedAt)) {
      throw new Error(
        `${record.relativePath}: changedAt must be later than the trusted manifest updatedAt (${previousManifest.updatedAt}).`,
      );
    }
    const update = applyMechanicalOnlySnapshots(previousManifest.artifacts, currentArtifacts, {
      kind: 'mechanical-only-refresh',
      record: record.relativePath,
      recordSha256: record.sha256,
      recordedAt: changedAt,
    });
    if (!update.comparison.mechanicalChangedPaths.length) {
      throw new Error('Mechanical-only refresh refused because no LF-normalized artifact changed.');
    }
    const changedTransitions = parseChangedArtifactTransitions(record);
    if (changedTransitions.some((transition) => !safeArtifactPath(transition.path, expectedArtifactSet))) {
      throw new Error(`${record.relativePath}: changedArtifactTransitions contains an unsafe or unconfigured path.`);
    }
    assertSameSet(
      changedTransitions.map((transition) => transition.path),
      update.comparison.mechanicalChangedPaths,
      `${record.relativePath}: changedArtifactTransitions must exactly cover the mechanical changes.`,
    );
    const previousByPath = new Map(previousManifest.artifacts.map((artifact) => [artifact.path, artifact]));
    const currentByPath = new Map(currentArtifacts.map((artifact) => [artifact.path, artifact]));
    const expectedTransitions = update.comparison.mechanicalChangedPaths.map((artifactPath) => ({
      path: artifactPath,
      beforeMechanicalSha256: previousByPath.get(artifactPath).mechanicalSha256,
      afterMechanicalSha256: currentByPath.get(artifactPath).mechanicalSha256,
    }));
    if (JSON.stringify(normalizedMechanicalTransitions(changedTransitions))
      !== JSON.stringify(normalizedMechanicalTransitions(expectedTransitions))) {
      throw new Error(`${record.relativePath}: changedArtifactTransitions hashes do not match the actual mechanical changes.`);
    }
    const transitionByPath = new Map(changedTransitions.map((transition) => [transition.path, transition]));
    const nextArtifacts = update.artifacts.map((artifact) => {
      const transition = transitionByPath.get(artifact.path);
      if (!transition) return artifact;
      return {
        ...artifact,
        mechanicalProvenance: {
          ...artifact.mechanicalProvenance,
          baselineManifestUpdatedAt: previousManifest.updatedAt,
          beforeMechanicalSha256: transition.beforeMechanicalSha256,
          afterMechanicalSha256: transition.afterMechanicalSha256,
        },
      };
    });
    nextManifest = {
      ...previousManifest,
      updatedAt: recordedAt,
      lastUpdate: {
        mode: 'mechanical-only',
        recordedAt,
        baselineManifestUpdatedAt: previousManifest.updatedAt,
        record: record.relativePath,
        recordSha256: record.sha256,
        semanticReviewPerformed: false,
        nativeSpeakerReviewPerformed: false,
        semanticChangedPaths: [],
        mechanicalChangedPaths: update.comparison.mechanicalChangedPaths,
      },
      artifacts: nextArtifacts,
    };
  } else {
    const record = await readEvidenceRecord('review-record');
    const reviewedAt = validateSemanticReviewRecord(record);
    if (!Number.isFinite(Date.parse(previousManifest.updatedAt ?? ''))
      || Date.parse(reviewedAt) <= Date.parse(previousManifest.updatedAt)) {
      throw new Error(
        `${record.relativePath}: reviewedAt must be later than the trusted manifest updatedAt (${previousManifest.updatedAt}).`,
      );
    }
    if (!comparison.semanticChangedPaths.length) {
      throw new Error('Semantic refresh refused because no governed semantic field changed; use --mechanical-only if only artifact text changed.');
    }
    const reviewedArtifactPaths = parseReviewedArtifactPaths(record);
    if (reviewedArtifactPaths.some((artifactPath) => !safeArtifactPath(artifactPath, expectedArtifactSet))) {
      throw new Error(`${record.relativePath}: reviewedArtifactPaths contains an unsafe or unconfigured path.`);
    }
    assertSameSet(
      reviewedArtifactPaths,
      comparison.semanticChangedPaths,
      `${record.relativePath}: reviewedArtifactPaths must exactly match the semantic changes: ${comparison.semanticChangedPaths.join(', ')}.`,
    );
    if (reviewedArtifactPaths.length !== new Set(reviewedArtifactPaths).size) {
      throw new Error(`${record.relativePath}: reviewedArtifactPaths contains duplicates.`);
    }

    const previousByPath = new Map(previousManifest.artifacts.map((artifact) => [artifact.path, artifact]));
    const currentByPath = new Map(currentArtifacts.map((artifact) => [artifact.path, artifact]));
    const reviewedTransitions = parseReviewedArtifactTransitions(record);
    if (reviewedTransitions.some((transition) => !safeArtifactPath(transition.path, expectedArtifactSet))) {
      throw new Error(`${record.relativePath}: reviewedArtifactTransitions contains an unsafe or unconfigured path.`);
    }
    assertSameSet(
      reviewedTransitions.map((transition) => transition.path),
      comparison.semanticChangedPaths,
      `${record.relativePath}: reviewedArtifactTransitions must exactly cover the semantic changes.`,
    );
    const expectedTransitions = comparison.semanticChangedPaths.map((artifactPath) => ({
      path: artifactPath,
      beforeSemanticSha256: previousByPath.get(artifactPath).semanticSha256,
      afterSemanticSha256: currentByPath.get(artifactPath).semanticSha256,
      beforeMechanicalSha256: previousByPath.get(artifactPath).mechanicalSha256,
      afterMechanicalSha256: currentByPath.get(artifactPath).mechanicalSha256,
    }));
    if (JSON.stringify(normalizedTransitions(reviewedTransitions))
      !== JSON.stringify(normalizedTransitions(expectedTransitions))) {
      throw new Error(`${record.relativePath}: reviewedArtifactTransitions hashes do not match the actual semantic changes.`);
    }
    const transitionByPath = new Map(reviewedTransitions.map((transition) => [transition.path, transition]));
    const semanticChanged = new Set(comparison.semanticChangedPaths);
    const mechanicalChanged = new Set(comparison.mechanicalChangedPaths);
    const nextArtifacts = currentArtifacts.map((artifact) => {
      const prior = previousByPath.get(artifact.path);
      return {
        ...artifact,
        semanticProvenance: semanticChanged.has(artifact.path)
          ? {
              kind: 'ai-assisted-reviewed-semantic-change',
              record: record.relativePath,
              recordSha256: record.sha256,
              recordedAt: reviewedAt,
              baselineManifestUpdatedAt: previousManifest.updatedAt,
              beforeSemanticSha256: transitionByPath.get(artifact.path).beforeSemanticSha256,
              afterSemanticSha256: transitionByPath.get(artifact.path).afterSemanticSha256,
              semanticReviewPerformed: true,
              nativeSpeakerReviewPerformed: false,
            }
          : prior.semanticProvenance,
        mechanicalProvenance: mechanicalChanged.has(artifact.path)
          ? {
              kind: 'semantic-review-artifact-capture',
              record: record.relativePath,
              recordSha256: record.sha256,
              recordedAt: reviewedAt,
              baselineManifestUpdatedAt: previousManifest.updatedAt,
              beforeMechanicalSha256: transitionByPath.get(artifact.path).beforeMechanicalSha256,
              afterMechanicalSha256: transitionByPath.get(artifact.path).afterMechanicalSha256,
            }
          : prior.mechanicalProvenance,
      };
    });
    status.updatedAt = reviewedAt.slice(0, 10);
    nextManifest = {
      ...previousManifest,
      updatedAt: recordedAt,
      statusUpdatedAt: status.updatedAt,
      lastUpdate: {
        mode: 'reviewed-semantic',
        recordedAt,
        baselineManifestUpdatedAt: previousManifest.updatedAt,
        record: record.relativePath,
        recordSha256: record.sha256,
        semanticReviewPerformed: true,
        nativeSpeakerReviewPerformed: false,
        semanticChangedPaths: comparison.semanticChangedPaths,
        mechanicalChangedPaths: comparison.mechanicalChangedPaths,
      },
      artifacts: nextArtifacts,
    };
  }
  status.reviewedArtifactSnapshot.manifestUpdatedAt = recordedAt;
}

await fs.writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
await fs.writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');

console.log(
  `Captured ${nextManifest.artifacts.length} localized semantic/mechanical snapshots in ${mode} mode; no native-speaker review is claimed.`,
);
