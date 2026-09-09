import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
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
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const status = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'editorial', 'status.json'), 'utf8'));
const approvalPath = path.join(root, 'i18n', 'editorial', 'release-approval.json');
const failures = [];
const policyFailures = [];

const pages = [...config.pages];
const pageSet = new Set(pages);
const languages = [...config.activeLanguageCodes];

function fail(message) {
  failures.push(message);
}

function normalizedSet(values) {
  return [...new Set(values)].sort();
}

function sameSet(actual, expected) {
  return JSON.stringify(normalizedSet(actual)) === JSON.stringify(normalizedSet(expected));
}

function policyFail(message) {
  policyFailures.push(message);
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function validTimestamp(value) {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || parsed > Date.now() + 5 * 60 * 1000) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone, , offsetHour, offsetMinute] = match;
  const calendarProbe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarProbe.getUTCFullYear() !== Number(year)
    || calendarProbe.getUTCMonth() !== Number(month) - 1
    || calendarProbe.getUTCDate() !== Number(day)
    || Number(hour) > 23
    || Number(minute) > 59
    || Number(second) > 59) return false;
  if (zone !== 'Z'
    && (Number(offsetHour) > 14
      || Number(offsetMinute) > 59
      || (Number(offsetHour) === 14 && Number(offsetMinute) !== 0))) return false;
  return true;
}

function evidenceScalar(record, field, label) {
  const matches = [...record.source.matchAll(new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'gm'))];
  if (matches.length !== 1) {
    policyFail(`${label} evidence field ${field}: must appear exactly once, found ${matches.length} (${record.relativePath}).`);
    return undefined;
  }
  const [match] = matches;
  const firstSectionEnd = record.source.search(/^##\s+/m);
  const topSection = firstSectionEnd >= 0 ? record.source.slice(0, firstSectionEnd) : record.source;
  if ((firstSectionEnd >= 0 && match.index > firstSectionEnd)
    || /^ {0,3}(?:`{3,}|~{3,})/m.test(topSection)) {
    policyFail(`${label} evidence field ${field}: must be in the top record section, outside code fences (${record.relativePath}).`);
    return undefined;
  }
  const raw = match[1].trim();
  const value = raw.startsWith('`') && raw.endsWith('`') ? raw.slice(1, -1).trim() : raw;
  if (!value) {
    policyFail(`${label} has an empty ${field} value (${record.relativePath}).`);
    return undefined;
  }
  return value;
}

function evidenceLiteral(record, field, expected, label) {
  const actual = evidenceScalar(record, field, label);
  if (actual !== undefined && actual !== expected) {
    policyFail(`${label} ${field} must be ${JSON.stringify(expected)}, found ${JSON.stringify(actual)} (${record.relativePath}).`);
  }
  return actual;
}

function evidenceTimestamp(record, field, label) {
  const value = evidenceScalar(record, field, label);
  if (value !== undefined && !validTimestamp(value)) {
    policyFail(`${label} ${field} must be a timezone-qualified, non-future ISO-8601 timestamp (${record.relativePath}).`);
    return undefined;
  }
  return value;
}

function evidenceJsonArray(record, field, label, { allowEmpty = true } = {}) {
  const value = evidenceScalar(record, field, label);
  if (value === undefined) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || (!allowEmpty && parsed.length === 0)) {
      policyFail(`${label} ${field} must be ${allowEmpty ? 'a JSON array' : 'a non-empty JSON array'} (${record.relativePath}).`);
      return undefined;
    }
    return parsed;
  } catch (error) {
    policyFail(`${label} ${field} must be valid JSON (${record.relativePath}: ${error.message}).`);
    return undefined;
  }
}

function gitResult(arguments_) {
  return spawnSync('git', arguments_, {
    cwd: root,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function resolvableCommit(reference) {
  if (!reference) return false;
  const result = gitResult(['rev-parse', '--verify', `${reference}^{commit}`]);
  return result.status === 0 && !result.error;
}

function resolvedCommit(reference) {
  if (!reference) return undefined;
  const result = gitResult(['rev-parse', '--verify', `${reference}^{commit}`]);
  if (result.status !== 0 || result.error) return undefined;
  return String(result.stdout).trim();
}

function isCommitAncestor(ancestor, descendant) {
  if (!ancestor || !descendant) return false;
  const result = gitResult(['merge-base', '--is-ancestor', ancestor, descendant]);
  return result.status === 0 && !result.error;
}

function gitBytes(reference, relativePath) {
  const result = gitResult(['show', `${reference}:${relativePath}`]);
  if (result.status !== 0 || result.error) {
    throw new Error(result.error?.message ?? String(result.stderr).trim());
  }
  return Buffer.from(result.stdout);
}

function gitJson(reference, relativePath) {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(gitBytes(reference, relativePath)));
}

function requestedBaselineRef() {
  const explicitArgument = process.argv.find((argument) => argument.startsWith('--baseline-ref='))?.slice('--baseline-ref='.length);
  const trustedEnvironmentReference = process.env.EDITORIAL_TRUSTED_BASE_REF?.trim();
  const githubActionsRun = /^true$/i.test(process.env.GITHUB_ACTIONS ?? '');

  if (githubActionsRun) {
    return {
      reference: trustedEnvironmentReference || undefined,
      explicit: true,
      argumentConflict: Boolean(
        explicitArgument && explicitArgument !== trustedEnvironmentReference,
      ),
    };
  }
  if (explicitArgument) return { reference: explicitArgument, explicit: true, argumentConflict: false };
  if (trustedEnvironmentReference) {
    return { reference: trustedEnvironmentReference, explicit: true, argumentConflict: false };
  }
  if (/^true$/i.test(process.env.CI ?? '')) {
    return { reference: undefined, explicit: true };
  }
  for (const candidate of ['@{upstream}', 'HEAD']) {
    if (resolvableCommit(candidate)) return { reference: candidate, explicit: false, argumentConflict: false };
  }
  return { reference: undefined, explicit: false, argumentConflict: false };
}

const localMarketReview = status.localMarketReview ?? {};
const requiredReviewScopes = ['new-localized-page', 'changed-localized-page'];
const requiredRecordFields = [
  'page',
  'language',
  'referenceUrls',
  'referenceAccessDates',
  'terminologyDecisions',
  'searchIntentDecisions',
  'reviewMethod',
  'reviewedAt',
  'reviewedByRole',
  'unresolvedIssues'
];

if (localMarketReview.schemaVersion !== 1) policyFail('schemaVersion must be 1.');
if (localMarketReview.effectiveDate !== '2026-08-14') policyFail('effectiveDate must be 2026-08-14.');
if (!sameSet(Array.isArray(localMarketReview.requiredFor) ? localMarketReview.requiredFor : [], requiredReviewScopes)) {
  policyFail('requiredFor must cover new and changed localized pages.');
}
if (localMarketReview.machineTranslationDraftOnly !== true) policyFail('machine translation must be draft-only.');
if (localMarketReview.aiAssistedTargetMarketReviewRequired !== true) {
  policyFail('AI-assisted target-market review must be required.');
}
if (localMarketReview.aiLineByLineReviewSufficientForRelease !== true) {
  policyFail('recorded AI-assisted line-by-line review must be sufficient for release.');
}
if (localMarketReview.independentNativeSpeakerRequiredForRelease !== false) {
  policyFail('independent native-speaker sign-off must remain optional, not a release requirement.');
}
if (localMarketReview.humanEditorialSignOffRequiredForRelease !== false) {
  policyFail('human editorial sign-off must remain optional, not a release requirement.');
}
if (localMarketReview.reviewClaimMustRemainAiAssisted !== true) {
  policyFail('AI-only review must remain labelled as AI-assisted.');
}
if (localMarketReview.targetMarketPeerReferenceRequired !== true) {
  policyFail('target-market peer references must be required.');
}
if (localMarketReview.targetMarketSearchPatternReviewRequired !== true) {
  policyFail('target-market search-pattern review must be required.');
}
if (localMarketReview.referenceUse !== 'terminology-and-search-intent-only') {
  policyFail('peer references must be limited to terminology and search intent.');
}
if (localMarketReview.competitorContentMayBeCopied !== false) policyFail('competitor content copying must be prohibited.');
if (localMarketReview.competitorFactsMayBeUsedAsBegapunkFacts !== false) {
  policyFail('competitor facts must not be accepted as Begapunk facts.');
}
if (localMarketReview.independentNativeSpeakerEquivalent !== false) {
  policyFail('AI review must not be treated as independent native-speaker confirmation.');
}
if (localMarketReview.recordDirectory !== 'audit/localization') {
  policyFail('review records must be stored under audit/localization.');
}
if (!sameSet(
  Array.isArray(localMarketReview.requiredRecordFields) ? localMarketReview.requiredRecordFields : [],
  requiredRecordFields
)) {
  policyFail('requiredRecordFields do not match the target-market review evidence contract.');
}

const reviewedArtifactSnapshot = status.reviewedArtifactSnapshot ?? {};
if (reviewedArtifactSnapshot.schemaVersion !== EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION) {
  policyFail(`reviewedArtifactSnapshot.schemaVersion must be ${EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION}.`);
}
if (reviewedArtifactSnapshot.manifestSchemaVersion !== EDITORIAL_MANIFEST_SCHEMA_VERSION) {
  policyFail(`reviewedArtifactSnapshot.manifestSchemaVersion must be ${EDITORIAL_MANIFEST_SCHEMA_VERSION}.`);
}
if (reviewedArtifactSnapshot.semanticAlgorithm !== SEMANTIC_ALGORITHM) {
  policyFail(`reviewedArtifactSnapshot.semanticAlgorithm must be ${SEMANTIC_ALGORITHM}.`);
}
if (reviewedArtifactSnapshot.mechanicalAlgorithm !== MECHANICAL_ALGORITHM) {
  policyFail(`reviewedArtifactSnapshot.mechanicalAlgorithm must be ${MECHANICAL_ALGORITHM}.`);
}
if (reviewedArtifactSnapshot.manifest !== 'audit/localization/current-localized-artifacts.json') {
  policyFail('reviewedArtifactSnapshot.manifest must point to the governed per-page artifact manifest.');
}
if (reviewedArtifactSnapshot.pagesPerLanguage !== pages.length) {
  policyFail(`reviewedArtifactSnapshot.pagesPerLanguage must be ${pages.length}.`);
}
if (!sameSet(reviewedArtifactSnapshot.languages ?? [], languages)) {
  policyFail('reviewedArtifactSnapshot.languages must exactly match the active localized languages.');
}
if (reviewedArtifactSnapshot.qualityBoundary !== SNAPSHOT_QUALITY_BOUNDARY) {
  policyFail('reviewedArtifactSnapshot must preserve the semantic/mechanical integrity quality boundary.');
}
if (!validTimestamp(reviewedArtifactSnapshot.manifestUpdatedAt)) {
  policyFail('reviewedArtifactSnapshot.manifestUpdatedAt must be a timezone-qualified, non-future ISO-8601 timestamp.');
}
if (!/^audit\/localization\/[^/]+\.md$/.test(reviewedArtifactSnapshot.migrationRecord ?? '')) {
  policyFail('reviewedArtifactSnapshot.migrationRecord must identify the governed schema migration record.');
}
if (!SHA256_PATTERN.test(reviewedArtifactSnapshot.migrationRecordSha256 ?? '')) {
  policyFail('reviewedArtifactSnapshot.migrationRecordSha256 must be a valid SHA-256 digest.');
}

let artifactManifest;
if (reviewedArtifactSnapshot.manifest === 'audit/localization/current-localized-artifacts.json') {
  try {
    artifactManifest = JSON.parse(await fs.readFile(
      path.join(root, ...reviewedArtifactSnapshot.manifest.split('/')),
      'utf8',
    ));
  } catch (error) {
    policyFail(`reviewed localized artifact manifest cannot be read (${error.message}).`);
  }
}

let trustedBaselineManifest;
let trustedBaselineStatus;
let trustedBaselineRef;
const baselineRequest = requestedBaselineRef();
const baselineCommit = resolvedCommit(baselineRequest.reference);
const githubActionsRun = /^true$/i.test(process.env.GITHUB_ACTIONS ?? '');
const headCommit = resolvedCommit('HEAD');
if (baselineRequest.argumentConflict) {
  policyFail('a CLI baseline-ref must exactly match the workflow-injected EDITORIAL_TRUSTED_BASE_REF in GitHub Actions.');
}
if (baselineRequest.explicit
  && (!COMMIT_SHA_PATTERN.test(baselineRequest.reference ?? '')
    || baselineCommit !== baselineRequest.reference)) {
  policyFail('an explicitly supplied trusted git baseline must be the exact lowercase 40-character commit SHA, not a symbolic ref, tag object, or branch name.');
}
if (!baselineRequest.reference || !baselineCommit) {
  policyFail(`a resolvable trusted git baseline is required${baselineRequest.reference ? ` (${baselineRequest.reference})` : ''}.`);
} else if (!baselineRequest.explicit || baselineCommit === baselineRequest.reference) {
  if (githubActionsRun && baselineCommit === headCommit) {
    policyFail('the GitHub Actions trusted git baseline must differ from the candidate HEAD commit.');
  }
  if (githubActionsRun && (!headCommit || !isCommitAncestor(baselineCommit, headCommit))) {
    policyFail('the GitHub Actions trusted git baseline must be an ancestor of the candidate HEAD commit.');
  }
  trustedBaselineRef = baselineRequest.reference;
  try {
    trustedBaselineManifest = gitJson(
      trustedBaselineRef,
      'audit/localization/current-localized-artifacts.json',
    );
    trustedBaselineStatus = gitJson(trustedBaselineRef, 'i18n/editorial/status.json');
  } catch (error) {
    policyFail(`trusted git baseline cannot be read (${trustedBaselineRef}: ${error.message}).`);
  }
}

if (artifactManifest) {
  if (artifactManifest.schemaVersion !== EDITORIAL_MANIFEST_SCHEMA_VERSION) {
    policyFail(`artifact manifest schemaVersion must be ${EDITORIAL_MANIFEST_SCHEMA_VERSION}.`);
  }
  if (artifactManifest.semanticAlgorithm !== reviewedArtifactSnapshot.semanticAlgorithm) {
    policyFail('artifact manifest semanticAlgorithm must match reviewedArtifactSnapshot.semanticAlgorithm.');
  }
  if (artifactManifest.mechanicalAlgorithm !== reviewedArtifactSnapshot.mechanicalAlgorithm) {
    policyFail('artifact manifest mechanicalAlgorithm must match reviewedArtifactSnapshot.mechanicalAlgorithm.');
  }
  if (artifactManifest.updatedAt !== reviewedArtifactSnapshot.manifestUpdatedAt) {
    policyFail('artifact manifest updatedAt must match reviewedArtifactSnapshot.manifestUpdatedAt.');
  }
  if (artifactManifest.statusUpdatedAt !== status.updatedAt) {
    policyFail('artifact manifest statusUpdatedAt must match editorial status updatedAt.');
  }
  if (artifactManifest.qualityBoundary !== reviewedArtifactSnapshot.qualityBoundary) {
    policyFail('artifact manifest qualityBoundary must match reviewedArtifactSnapshot.qualityBoundary.');
  }
  if (!validTimestamp(artifactManifest.updatedAt)) {
    policyFail('artifact manifest updatedAt must be a timezone-qualified, non-future ISO-8601 timestamp.');
  }

  const validEvidencePath = (value) => typeof value === 'string'
    && /^audit\/localization\/[^/]+\.md$/.test(value)
    && !path.isAbsolute(value)
    && !value.includes('..')
    && !value.includes('\\');
  const expectedArtifactPaths = languages.flatMap((language) =>
    pages.map((page) => `${language}/${page}`)
  );
  const expectedArtifactSet = new Set(expectedArtifactPaths);
  const evidenceRecords = new Map();
  const reportedEvidenceFailures = new Set();
  const readEvidenceRecord = async (relativePath, expectedSha256, label) => {
    if (!validEvidencePath(relativePath)) {
      policyFail(`${label} must be a safe Markdown record directly under audit/localization/.`);
      return undefined;
    }
    if (!SHA256_PATTERN.test(expectedSha256 ?? '')) {
      const failureKey = `${relativePath}:invalid:${String(expectedSha256)}`;
      if (!reportedEvidenceFailures.has(failureKey)) {
        policyFail(`${label} must carry a valid recordSha256 (${relativePath}).`);
        reportedEvidenceFailures.add(failureKey);
      }
      return undefined;
    }
    let record = evidenceRecords.get(relativePath);
    if (!record) {
      try {
        const bytes = await fs.readFile(path.join(root, ...relativePath.split('/')));
        record = {
          relativePath,
          source: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
          sha256: mechanicalSha256(bytes),
        };
        evidenceRecords.set(relativePath, record);
      } catch (error) {
        const failureKey = `${relativePath}:read`;
        if (!reportedEvidenceFailures.has(failureKey)) {
          policyFail(`${label} cannot be read as valid UTF-8 (${relativePath}: ${error.message}).`);
          reportedEvidenceFailures.add(failureKey);
        }
        return undefined;
      }
    }
    if (record.sha256 !== expectedSha256) {
      const failureKey = `${relativePath}:digest:${expectedSha256}`;
      if (!reportedEvidenceFailures.has(failureKey)) {
        policyFail(`${label} content no longer matches recordSha256 (${relativePath}).`);
        reportedEvidenceFailures.add(failureKey);
      }
      return undefined;
    }
    return record;
  };

  const migrationRecordContracts = new Map();
  const validateMigrationRecord = async (relativePath, sha256, label) => {
    const key = `${relativePath}:${sha256}`;
    if (migrationRecordContracts.has(key)) return migrationRecordContracts.get(key);
    const record = await readEvidenceRecord(relativePath, sha256, label);
    if (!record) {
      migrationRecordContracts.set(key, undefined);
      return undefined;
    }
    const contract = {
      record,
      migratedAt: evidenceTimestamp(record, 'migratedAt', label),
    };
    evidenceScalar(record, 'migratedByRole', label);
    evidenceLiteral(record, 'migrationType', 'editorial-snapshot-schema-v1-to-v2', label);
    evidenceLiteral(record, 'semanticReviewPerformed', 'false', label);
    evidenceLiteral(record, 'nativeSpeakerReviewPerformed', 'false', label);
    evidenceLiteral(record, 'sourceReviewClaimsPreserved', 'true', label);
    migrationRecordContracts.set(key, contract);
    return contract;
  };

  const semanticRecordContracts = new Map();
  const validateSemanticReviewRecord = async (relativePath, sha256, label) => {
    const key = `${relativePath}:${sha256}`;
    if (semanticRecordContracts.has(key)) return semanticRecordContracts.get(key);
    const record = await readEvidenceRecord(relativePath, sha256, label);
    if (!record) {
      semanticRecordContracts.set(key, undefined);
      return undefined;
    }
    const contract = {
      record,
      reviewedAt: evidenceTimestamp(record, 'reviewedAt', label),
      reviewedArtifactPaths: evidenceJsonArray(record, 'reviewedArtifactPaths', label, { allowEmpty: false }),
      reviewedArtifactTransitions: evidenceJsonArray(
        record,
        'reviewedArtifactTransitions',
        label,
        { allowEmpty: false },
      ),
    };
    evidenceScalar(record, 'reviewedByRole', label);
    evidenceScalar(record, 'reviewMethod', label);
    evidenceLiteral(record, 'reviewType', 'ai-assisted-target-market-semantic-review', label);
    evidenceLiteral(record, 'semanticReviewPerformed', 'true', label);
    evidenceLiteral(record, 'nativeSpeakerReviewPerformed', 'false', label);

    const referenceUrls = evidenceJsonArray(record, 'referenceUrls', label, { allowEmpty: false });
    const referenceAccessDates = evidenceJsonArray(record, 'referenceAccessDates', label, { allowEmpty: false });
    const terminologyDecisions = evidenceJsonArray(record, 'terminologyDecisions', label, { allowEmpty: false });
    const searchIntentDecisions = evidenceJsonArray(record, 'searchIntentDecisions', label, { allowEmpty: false });
    const unresolvedIssues = evidenceJsonArray(record, 'unresolvedIssues', label);
    const blockingIssues = evidenceJsonArray(record, 'blockingIssues', label);
    if (Array.isArray(blockingIssues) && blockingIssues.length) {
      policyFail(`${label} blockingIssues must be an empty JSON array (${relativePath}).`);
    }
    if (Array.isArray(referenceUrls)) {
      for (const referenceUrl of referenceUrls) {
        if (typeof referenceUrl !== 'string' || !referenceUrl.trim()) {
          policyFail(`${label} referenceUrls entries must be non-empty strings (${relativePath}).`);
          break;
        }
        try {
          const parsed = new URL(referenceUrl);
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
        } catch {
          policyFail(`${label} referenceUrls must contain only absolute HTTP(S) URLs (${relativePath}).`);
          break;
        }
      }
    }
    if (Array.isArray(referenceAccessDates)) {
      const reviewedDate = contract.reviewedAt?.slice(0, 10);
      if (!referenceAccessDates.every((date) => {
        if (typeof date !== 'string') return false;
        const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return false;
        const [, year, month, day] = match;
        const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        return probe.getUTCFullYear() === Number(year)
          && probe.getUTCMonth() === Number(month) - 1
          && probe.getUTCDate() === Number(day)
          && typeof reviewedDate === 'string'
          && date <= reviewedDate;
      })) {
        policyFail(`${label} referenceAccessDates must contain real YYYY-MM-DD dates not later than reviewedAt (${relativePath}).`);
      }
      if (Array.isArray(referenceUrls) && referenceAccessDates.length !== referenceUrls.length) {
        policyFail(`${label} referenceUrls and referenceAccessDates must have the same length (${relativePath}).`);
      }
    }
    if ([...(terminologyDecisions ?? []), ...(searchIntentDecisions ?? [])]
      .some((decision) => typeof decision !== 'string' || !decision.trim())) {
      policyFail(`${label} terminology/search-intent decisions must be non-empty strings (${relativePath}).`);
    }
    if (Array.isArray(unresolvedIssues) && unresolvedIssues.length !== 0) {
      policyFail(`${label} unresolvedIssues must be an empty JSON array before semantic re-signing (${relativePath}).`);
    }
    if (Array.isArray(contract.reviewedArtifactPaths)) {
      if (contract.reviewedArtifactPaths.some((artifactPath) => typeof artifactPath !== 'string'
        || !expectedArtifactSet.has(artifactPath))) {
        policyFail(`${label} reviewedArtifactPaths contains an unknown or invalid artifact path (${relativePath}).`);
      }
      if (contract.reviewedArtifactPaths.length !== new Set(contract.reviewedArtifactPaths).size) {
        policyFail(`${label} reviewedArtifactPaths must not contain duplicates (${relativePath}).`);
      }
    }
    if (Array.isArray(contract.reviewedArtifactTransitions)) {
      const transitionPaths = [];
      for (const transition of contract.reviewedArtifactTransitions) {
        if (!transition || typeof transition !== 'object' || Array.isArray(transition)
          || typeof transition.path !== 'string'
          || !expectedArtifactSet.has(transition.path)
          || !SHA256_PATTERN.test(transition.beforeSemanticSha256 ?? '')
          || !SHA256_PATTERN.test(transition.afterSemanticSha256 ?? '')
          || !SHA256_PATTERN.test(transition.beforeMechanicalSha256 ?? '')
          || !SHA256_PATTERN.test(transition.afterMechanicalSha256 ?? '')) {
          policyFail(`${label} reviewedArtifactTransitions contains an invalid transition (${relativePath}).`);
          continue;
        }
        transitionPaths.push(transition.path);
      }
      if (transitionPaths.length !== new Set(transitionPaths).size) {
        policyFail(`${label} reviewedArtifactTransitions must not contain duplicate paths (${relativePath}).`);
      }
      if (Array.isArray(contract.reviewedArtifactPaths)
        && !sameSet(transitionPaths, contract.reviewedArtifactPaths)) {
        policyFail(`${label} reviewedArtifactTransitions and reviewedArtifactPaths must have identical scope (${relativePath}).`);
      }
    }
    semanticRecordContracts.set(key, contract);
    return contract;
  };

  const mechanicalRecordContracts = new Map();
  const validateMechanicalRecord = async (relativePath, sha256, label) => {
    const key = `${relativePath}:${sha256}`;
    if (mechanicalRecordContracts.has(key)) return mechanicalRecordContracts.get(key);
    const record = await readEvidenceRecord(relativePath, sha256, label);
    if (!record) {
      mechanicalRecordContracts.set(key, undefined);
      return undefined;
    }
    const contract = {
      record,
      changedAt: evidenceTimestamp(record, 'changedAt', label),
      changedArtifactTransitions: evidenceJsonArray(
        record,
        'changedArtifactTransitions',
        label,
        { allowEmpty: false },
      ),
    };
    evidenceScalar(record, 'changedByRole', label);
    evidenceScalar(record, 'reason', label);
    evidenceLiteral(record, 'changeType', 'mechanical-only', label);
    evidenceLiteral(record, 'semanticReviewPerformed', 'false', label);
    evidenceLiteral(record, 'nativeSpeakerReviewPerformed', 'false', label);
    if (Array.isArray(contract.changedArtifactTransitions)) {
      const transitionPaths = [];
      for (const transition of contract.changedArtifactTransitions) {
        if (!transition || typeof transition !== 'object' || Array.isArray(transition)
          || typeof transition.path !== 'string'
          || !expectedArtifactSet.has(transition.path)
          || !SHA256_PATTERN.test(transition.beforeMechanicalSha256 ?? '')
          || !SHA256_PATTERN.test(transition.afterMechanicalSha256 ?? '')) {
          policyFail(`${label} changedArtifactTransitions contains an invalid transition (${relativePath}).`);
          continue;
        }
        transitionPaths.push(transition.path);
      }
      if (transitionPaths.length !== new Set(transitionPaths).size) {
        policyFail(`${label} changedArtifactTransitions must not contain duplicate paths (${relativePath}).`);
      }
    }
    mechanicalRecordContracts.set(key, contract);
    return contract;
  };

  const migration = artifactManifest.migration ?? {};
  if (migration.fromManifestSchemaVersion !== 1 || migration.fromAlgorithm !== LEGACY_ALGORITHM) {
    policyFail(`artifact manifest migration must identify schemaVersion 1 ${LEGACY_ALGORITHM}.`);
  }
  if (migration.record !== reviewedArtifactSnapshot.migrationRecord) {
    policyFail('artifact manifest migration record must match reviewedArtifactSnapshot.migrationRecord.');
  }
  if (migration.recordSha256 !== reviewedArtifactSnapshot.migrationRecordSha256) {
    policyFail('artifact manifest migration recordSha256 must match reviewedArtifactSnapshot.migrationRecordSha256.');
  }
  if (!validTimestamp(migration.migratedAt)) {
    policyFail('artifact manifest migration.migratedAt must be a timezone-qualified, non-future ISO-8601 timestamp.');
  }
  if (!validTimestamp(migration.sourceCapturedAt)) {
    policyFail('artifact manifest migration.sourceCapturedAt must be a timezone-qualified, non-future ISO-8601 timestamp.');
  }
  if (migration.legacyMechanicalHashesVerified !== true
    || migration.semanticReviewPerformed !== false
    || migration.nativeSpeakerReviewPerformed !== false
    || migration.sourceReviewClaimsPreserved !== true) {
    policyFail('artifact manifest migration must preserve the verified legacy snapshot without claiming a new semantic or native-speaker review.');
  }
  const migrationRecordContract = await validateMigrationRecord(
    migration.record,
    migration.recordSha256,
    'artifact manifest migration record',
  );
  if (migrationRecordContract?.migratedAt !== undefined
    && migrationRecordContract.migratedAt !== migration.migratedAt) {
    policyFail('artifact manifest migration.migratedAt must exactly match the migration record.');
  }
  await readEvidenceRecord(
    migration.sourceReviewRecord,
    migration.sourceReviewRecordSha256,
    'artifact manifest legacy source review record',
  );

  const lastUpdate = artifactManifest.lastUpdate ?? {};
  const supportedUpdateModes = ['schema-migration', 'mechanical-only', 'reviewed-semantic'];
  if (!supportedUpdateModes.includes(lastUpdate.mode)) {
    policyFail(`artifact manifest lastUpdate.mode is unsupported: ${JSON.stringify(lastUpdate.mode)}.`);
  }
  if (!validTimestamp(lastUpdate.recordedAt)) {
    policyFail('artifact manifest lastUpdate.recordedAt must be a timezone-qualified, non-future ISO-8601 timestamp.');
  }
  if (lastUpdate.recordedAt !== artifactManifest.updatedAt) {
    policyFail('artifact manifest lastUpdate.recordedAt must exactly match manifest updatedAt.');
  }
  const semanticChangedPaths = Array.isArray(lastUpdate.semanticChangedPaths)
    ? lastUpdate.semanticChangedPaths
    : [];
  const mechanicalChangedPaths = Array.isArray(lastUpdate.mechanicalChangedPaths)
    ? lastUpdate.mechanicalChangedPaths
    : [];
  if (['schema-migration', 'mechanical-only'].includes(lastUpdate.mode)
    && (lastUpdate.semanticReviewPerformed !== false
      || lastUpdate.nativeSpeakerReviewPerformed !== false
      || semanticChangedPaths.length !== 0)) {
    policyFail(`${lastUpdate.mode} must not claim or record a semantic/native-speaker review.`);
  }
  if (lastUpdate.mode === 'schema-migration') {
    if (mechanicalChangedPaths.length !== 0) {
      policyFail('schema-migration lastUpdate must not claim post-baseline mechanical changes.');
    }
    if (lastUpdate.record !== migration.record || lastUpdate.recordSha256 !== migration.recordSha256) {
      policyFail('schema-migration lastUpdate must point to the immutable migration evidence record.');
    }
    await validateMigrationRecord(lastUpdate.record, lastUpdate.recordSha256, 'artifact manifest lastUpdate record');
  }
  if (lastUpdate.mode === 'mechanical-only') {
    if (!mechanicalChangedPaths.length) {
      policyFail('mechanical-only lastUpdate must identify at least one changed mechanical artifact.');
    }
    const lastMechanicalRecord = await validateMechanicalRecord(
      lastUpdate.record,
      lastUpdate.recordSha256,
      'artifact manifest lastUpdate record',
    );
    const transitionPaths = Array.isArray(lastMechanicalRecord?.changedArtifactTransitions)
      ? lastMechanicalRecord.changedArtifactTransitions.map((transition) => transition?.path)
      : [];
    if (Array.isArray(lastMechanicalRecord?.changedArtifactTransitions)
      && !sameSet(transitionPaths, mechanicalChangedPaths)) {
      policyFail('mechanical-only transitions must exactly match lastUpdate.mechanicalChangedPaths.');
    }
    if (!validTimestamp(lastUpdate.baselineManifestUpdatedAt)
      || (lastMechanicalRecord?.changedAt !== undefined
        && Date.parse(lastMechanicalRecord.changedAt) <= Date.parse(lastUpdate.baselineManifestUpdatedAt))) {
      policyFail('mechanical-only evidence must be later than its trusted baseline manifest timestamp.');
    }
  }
  if (lastUpdate.mode === 'reviewed-semantic') {
    if (lastUpdate.semanticReviewPerformed !== true || lastUpdate.nativeSpeakerReviewPerformed !== false) {
      policyFail('reviewed-semantic update must remain AI-assisted and must not claim native-speaker review.');
    }
    if (!semanticChangedPaths.length) {
      policyFail('reviewed-semantic update must identify at least one changed semantic artifact.');
    }
    const lastSemanticRecord = await validateSemanticReviewRecord(
      lastUpdate.record,
      lastUpdate.recordSha256,
      'artifact manifest lastUpdate record',
    );
    if (Array.isArray(lastSemanticRecord?.reviewedArtifactPaths)
      && !sameSet(lastSemanticRecord.reviewedArtifactPaths, semanticChangedPaths)) {
      policyFail('reviewed-semantic record scope must exactly match lastUpdate.semanticChangedPaths.');
    }
    const transitionPaths = Array.isArray(lastSemanticRecord?.reviewedArtifactTransitions)
      ? lastSemanticRecord.reviewedArtifactTransitions.map((transition) => transition?.path)
      : [];
    if (Array.isArray(lastSemanticRecord?.reviewedArtifactTransitions)
      && !sameSet(transitionPaths, semanticChangedPaths)) {
      policyFail('reviewed-semantic transitions must exactly match lastUpdate.semanticChangedPaths.');
    }
    if (!validTimestamp(lastUpdate.baselineManifestUpdatedAt)
      || (lastSemanticRecord?.reviewedAt !== undefined
        && Date.parse(lastSemanticRecord.reviewedAt) <= Date.parse(lastUpdate.baselineManifestUpdatedAt))) {
      policyFail('reviewed-semantic evidence must be later than its trusted baseline manifest timestamp.');
    }
  }

  const artifacts = Array.isArray(artifactManifest.artifacts) ? artifactManifest.artifacts : [];
  const artifactPaths = artifacts.map((artifact) => artifact?.path);
  const artifactByPath = new Map(artifacts.map((artifact) => [artifact?.path, artifact]));
  const duplicateArtifactPaths = artifactPaths.filter((artifactPath, index) => artifactPaths.indexOf(artifactPath) !== index);
  const missingArtifactPaths = expectedArtifactPaths.filter((artifactPath) => !artifactPaths.includes(artifactPath));
  const extraArtifactPaths = artifactPaths.filter((artifactPath) => !expectedArtifactSet.has(artifactPath));

  if (duplicateArtifactPaths.length) {
    policyFail(`artifact manifest contains duplicate paths: ${[...new Set(duplicateArtifactPaths)].join(', ')}.`);
  }
  if (missingArtifactPaths.length) {
    policyFail(`artifact manifest is missing reviewed pages: ${missingArtifactPaths.join(', ')}.`);
  }
  if (extraArtifactPaths.length) {
    policyFail(`artifact manifest contains unknown pages: ${extraArtifactPaths.join(', ')}.`);
  }

  if (trustedBaselineStatus) {
    const governedStatus = (value) => {
      const {
        updatedAt: _updatedAt,
        reviewedArtifactSnapshot: _reviewedArtifactSnapshot,
        ...governed
      } = value ?? {};
      return governed;
    };
    if (JSON.stringify(governedStatus(status)) !== JSON.stringify(governedStatus(trustedBaselineStatus))) {
      policyFail(`editorial readiness fields differ from trusted git baseline ${trustedBaselineRef}; a snapshot refresh may not self-approve status debt.`);
    }
  }

  if (trustedBaselineManifest) {
    const baselineArtifacts = Array.isArray(trustedBaselineManifest.artifacts)
      ? trustedBaselineManifest.artifacts
      : [];
    const baselineByPath = new Map(baselineArtifacts.map((artifact) => [artifact?.path, artifact]));
    if (baselineArtifacts.length !== baselineByPath.size
      || !sameSet([...baselineByPath.keys()], expectedArtifactPaths)) {
      policyFail(`trusted git baseline ${trustedBaselineRef} has a duplicate or incompatible artifact scope.`);
    } else if (trustedBaselineManifest.schemaVersion === 1
      && trustedBaselineManifest.algorithm === LEGACY_ALGORITHM) {
      if (migration.sourceCapturedAt !== trustedBaselineManifest.capturedAt
        || migration.sourceReviewRecord !== trustedBaselineManifest.reviewRecord) {
        policyFail(`schema migration source provenance does not match trusted git baseline ${trustedBaselineRef}.`);
      }
      try {
        const baselineSourceReviewDigest = mechanicalSha256(
          gitBytes(trustedBaselineRef, trustedBaselineManifest.reviewRecord),
        );
        if (migration.sourceReviewRecordSha256 !== baselineSourceReviewDigest) {
          policyFail(`schema migration source review digest does not match trusted git baseline ${trustedBaselineRef}.`);
        }
      } catch (error) {
        policyFail(`schema migration source review record cannot be read from trusted git baseline ${trustedBaselineRef} (${error.message}).`);
      }
      for (const artifactPath of expectedArtifactPaths) {
        const baselineArtifact = baselineByPath.get(artifactPath);
        const currentArtifact = artifactByPath.get(artifactPath);
        if (!baselineArtifact || baselineArtifact.sha256 !== currentArtifact?.mechanicalSha256) {
          policyFail(`${artifactPath}: schema migration changed content relative to trusted git baseline ${trustedBaselineRef}.`);
        }
      }
    } else if (trustedBaselineManifest.schemaVersion === EDITORIAL_MANIFEST_SCHEMA_VERSION
      && trustedBaselineManifest.semanticAlgorithm === SEMANTIC_ALGORITHM) {
      for (const artifactPath of expectedArtifactPaths) {
        const baselineArtifact = baselineByPath.get(artifactPath);
        const currentArtifact = artifactByPath.get(artifactPath);
        if (!baselineArtifact || !currentArtifact) continue;
        if (baselineArtifact.semanticSha256 !== currentArtifact.semanticSha256) {
          const provenance = currentArtifact.semanticProvenance ?? {};
          if (provenance.kind !== 'ai-assisted-reviewed-semantic-change'
            || provenance.beforeSemanticSha256 !== baselineArtifact.semanticSha256
            || provenance.afterSemanticSha256 !== currentArtifact.semanticSha256
            || !validTimestamp(provenance.recordedAt)
            || !validTimestamp(trustedBaselineManifest.updatedAt)
            || Date.parse(provenance.recordedAt) <= Date.parse(trustedBaselineManifest.updatedAt)) {
            policyFail(`${artifactPath}: semantic change is not bound to an exact review transition from trusted git baseline ${trustedBaselineRef}.`);
          }
        }
        if (baselineArtifact.mechanicalSha256 !== currentArtifact.mechanicalSha256) {
          const provenance = currentArtifact.mechanicalProvenance ?? {};
          if (!['mechanical-only-refresh', 'semantic-review-artifact-capture'].includes(provenance.kind)
            || provenance.beforeMechanicalSha256 !== baselineArtifact.mechanicalSha256
            || provenance.afterMechanicalSha256 !== currentArtifact.mechanicalSha256
            || !validTimestamp(provenance.recordedAt)
            || !validTimestamp(trustedBaselineManifest.updatedAt)
            || Date.parse(provenance.recordedAt) <= Date.parse(trustedBaselineManifest.updatedAt)) {
            policyFail(`${artifactPath}: mechanical change is not bound to an exact evidence transition from trusted git baseline ${trustedBaselineRef}.`);
          }
        }
      }
    } else {
      policyFail(`trusted git baseline ${trustedBaselineRef} uses an unsupported artifact manifest schema.`);
    }
  }

  if (lastUpdate.mode === 'reviewed-semantic') {
    for (const artifactPath of semanticChangedPaths) {
      const provenance = artifactByPath.get(artifactPath)?.semanticProvenance;
      if (provenance?.kind !== 'ai-assisted-reviewed-semantic-change'
        || provenance.record !== lastUpdate.record
        || provenance.recordSha256 !== lastUpdate.recordSha256
        || provenance.baselineManifestUpdatedAt !== lastUpdate.baselineManifestUpdatedAt) {
        policyFail(`${artifactPath}: last reviewed-semantic update is not bound to the artifact's semantic provenance.`);
      }
    }
  }
  if (lastUpdate.mode === 'mechanical-only') {
    for (const artifactPath of mechanicalChangedPaths) {
      const provenance = artifactByPath.get(artifactPath)?.mechanicalProvenance;
      if (provenance?.kind !== 'mechanical-only-refresh'
        || provenance.record !== lastUpdate.record
        || provenance.recordSha256 !== lastUpdate.recordSha256) {
        policyFail(`${artifactPath}: last mechanical-only update is not bound to the artifact's mechanical provenance.`);
      }
    }
  }

  for (const changedPath of [...semanticChangedPaths, ...mechanicalChangedPaths]) {
    if (!expectedArtifactSet.has(changedPath)) {
      policyFail(`artifact manifest lastUpdate contains an unknown path: ${JSON.stringify(changedPath)}.`);
    }
  }
  if (semanticChangedPaths.length !== new Set(semanticChangedPaths).size
    || mechanicalChangedPaths.length !== new Set(mechanicalChangedPaths).size) {
    policyFail('artifact manifest lastUpdate path lists must not contain duplicates.');
  }

  for (const artifact of artifacts) {
    const relativePath = artifact?.path;
    if (typeof relativePath !== 'string'
      || path.isAbsolute(relativePath)
      || relativePath.includes('..')
      || relativePath.includes('\\')
      || !expectedArtifactSet.has(relativePath)) {
      policyFail(`artifact manifest path is unsafe or outside the localized review scope: ${JSON.stringify(relativePath)}.`);
      continue;
    }
    if (!SHA256_PATTERN.test(artifact.semanticSha256 ?? '')) {
      policyFail(`artifact manifest has an invalid semantic SHA-256: ${relativePath}.`);
      continue;
    }
    if (!SHA256_PATTERN.test(artifact.mechanicalSha256 ?? '')) {
      policyFail(`artifact manifest has an invalid mechanical SHA-256: ${relativePath}.`);
      continue;
    }

    const semanticProvenance = artifact.semanticProvenance ?? {};
    const supportedSemanticKinds = [
      'schema-migration-of-existing-reviewed-artifact',
      'ai-assisted-reviewed-semantic-change',
    ];
    if (!supportedSemanticKinds.includes(semanticProvenance.kind)
      || !validTimestamp(semanticProvenance.recordedAt)
      || semanticProvenance.nativeSpeakerReviewPerformed !== false) {
      policyFail(`${relativePath}: semantic provenance is missing, invalid, or claims unsupported native-speaker review.`);
    }
    if (semanticProvenance.kind === 'schema-migration-of-existing-reviewed-artifact'
      && (semanticProvenance.record !== migration.record
        || semanticProvenance.recordSha256 !== migration.recordSha256
        || semanticProvenance.recordedAt !== migration.migratedAt
        || semanticProvenance.semanticReviewPerformed !== false)) {
      policyFail(`${relativePath}: migrated semantic provenance must point to the migration record and claim no new review.`);
    }
    if (semanticProvenance.kind === 'schema-migration-of-existing-reviewed-artifact') {
      await validateMigrationRecord(
        semanticProvenance.record,
        semanticProvenance.recordSha256,
        `${relativePath} semantic provenance record`,
      );
    }
    if (semanticProvenance.kind === 'ai-assisted-reviewed-semantic-change') {
      if (semanticProvenance.semanticReviewPerformed !== true) {
        policyFail(`${relativePath}: reviewed semantic provenance must explicitly record the AI-assisted review.`);
      }
      const contract = await validateSemanticReviewRecord(
        semanticProvenance.record,
        semanticProvenance.recordSha256,
        `${relativePath} semantic provenance record`,
      );
      if (contract?.reviewedAt !== undefined && contract.reviewedAt !== semanticProvenance.recordedAt) {
        policyFail(`${relativePath}: semantic provenance timestamp must exactly match its review record.`);
      }
      if (!validTimestamp(semanticProvenance.baselineManifestUpdatedAt)
        || (contract?.reviewedAt !== undefined
          && Date.parse(contract.reviewedAt) <= Date.parse(semanticProvenance.baselineManifestUpdatedAt))) {
        policyFail(`${relativePath}: semantic review must be later than its trusted baseline manifest timestamp.`);
      }
      if (Array.isArray(contract?.reviewedArtifactPaths)
        && !contract.reviewedArtifactPaths.includes(relativePath)) {
        policyFail(`${relativePath}: semantic provenance review record does not include this artifact in its declared scope.`);
      }
      if (Array.isArray(contract?.reviewedArtifactTransitions)) {
        const transition = contract.reviewedArtifactTransitions.find((candidate) => candidate?.path === relativePath);
        if (!transition
          || transition.beforeSemanticSha256 === transition.afterSemanticSha256
          || transition.beforeSemanticSha256 !== semanticProvenance.beforeSemanticSha256
          || transition.afterSemanticSha256 !== semanticProvenance.afterSemanticSha256
          || transition.afterSemanticSha256 !== artifact.semanticSha256) {
          policyFail(`${relativePath}: semantic provenance does not match the record's exact before/after transition.`);
        }
      }
    }

    const mechanicalProvenance = artifact.mechanicalProvenance ?? {};
    const supportedMechanicalKinds = [
      'verified-legacy-snapshot-migration',
      'mechanical-only-refresh',
      'semantic-review-artifact-capture',
    ];
    if (!supportedMechanicalKinds.includes(mechanicalProvenance.kind)
      || !validTimestamp(mechanicalProvenance.recordedAt)) {
      policyFail(`${relativePath}: mechanical provenance is missing or invalid.`);
    }
    if (mechanicalProvenance.kind === 'verified-legacy-snapshot-migration') {
      if (mechanicalProvenance.record !== migration.record
        || mechanicalProvenance.recordSha256 !== migration.recordSha256) {
        policyFail(`${relativePath}: migrated mechanical provenance must point to the immutable migration record.`);
      }
      await validateMigrationRecord(
        mechanicalProvenance.record,
        mechanicalProvenance.recordSha256,
        `${relativePath} mechanical provenance record`,
      );
    }
    if (mechanicalProvenance.kind === 'mechanical-only-refresh') {
      const contract = await validateMechanicalRecord(
        mechanicalProvenance.record,
        mechanicalProvenance.recordSha256,
        `${relativePath} mechanical provenance record`,
      );
      if (contract?.changedAt !== undefined && contract.changedAt !== mechanicalProvenance.recordedAt) {
        policyFail(`${relativePath}: mechanical provenance timestamp must exactly match its change record.`);
      }
      if (!validTimestamp(mechanicalProvenance.baselineManifestUpdatedAt)
        || (contract?.changedAt !== undefined
          && Date.parse(contract.changedAt) <= Date.parse(mechanicalProvenance.baselineManifestUpdatedAt))) {
        policyFail(`${relativePath}: mechanical change must be later than its trusted baseline manifest timestamp.`);
      }
      if (Array.isArray(contract?.changedArtifactTransitions)) {
        const transition = contract.changedArtifactTransitions.find((candidate) => candidate?.path === relativePath);
        if (!transition
          || transition.beforeMechanicalSha256 === transition.afterMechanicalSha256
          || transition.beforeMechanicalSha256 !== mechanicalProvenance.beforeMechanicalSha256
          || transition.afterMechanicalSha256 !== mechanicalProvenance.afterMechanicalSha256
          || transition.afterMechanicalSha256 !== artifact.mechanicalSha256) {
          policyFail(`${relativePath}: mechanical provenance does not match the record's exact before/after transition.`);
        }
      }
    }
    if (mechanicalProvenance.kind === 'semantic-review-artifact-capture') {
      const contract = await validateSemanticReviewRecord(
        mechanicalProvenance.record,
        mechanicalProvenance.recordSha256,
        `${relativePath} mechanical provenance record`,
      );
      if (contract?.reviewedAt !== undefined && contract.reviewedAt !== mechanicalProvenance.recordedAt) {
        policyFail(`${relativePath}: semantic-review mechanical provenance timestamp must exactly match its review record.`);
      }
      if (!validTimestamp(mechanicalProvenance.baselineManifestUpdatedAt)
        || (contract?.reviewedAt !== undefined
          && Date.parse(contract.reviewedAt) <= Date.parse(mechanicalProvenance.baselineManifestUpdatedAt))) {
        policyFail(`${relativePath}: semantic-review artifact capture must be later than its trusted baseline manifest timestamp.`);
      }
      if (Array.isArray(contract?.reviewedArtifactPaths)
        && !contract.reviewedArtifactPaths.includes(relativePath)) {
        policyFail(`${relativePath}: mechanical provenance review record does not include this artifact in its declared scope.`);
      }
      if (Array.isArray(contract?.reviewedArtifactTransitions)) {
        const transition = contract.reviewedArtifactTransitions.find((candidate) => candidate?.path === relativePath);
        if (!transition
          || transition.beforeMechanicalSha256 === transition.afterMechanicalSha256
          || transition.beforeMechanicalSha256 !== mechanicalProvenance.beforeMechanicalSha256
          || transition.afterMechanicalSha256 !== mechanicalProvenance.afterMechanicalSha256
          || transition.afterMechanicalSha256 !== artifact.mechanicalSha256) {
          policyFail(`${relativePath}: semantic-review mechanical provenance does not match the record's exact before/after transition.`);
        }
      }
    }

    try {
      const actual = createArtifactSnapshot(
        relativePath,
        await fs.readFile(path.join(root, ...relativePath.split('/'))),
      );
      if (actual.semanticSha256 !== artifact.semanticSha256) {
        policyFail(`${relativePath}: governed editorial semantics changed after the recorded semantic review snapshot.`);
      }
      if (actual.mechanicalSha256 !== artifact.mechanicalSha256) {
        policyFail(`${relativePath}: LF-normalized artifact text changed after the recorded mechanical snapshot.`);
      }
    } catch (error) {
      policyFail(`${relativePath}: localized artifact cannot be verified (${error.message}).`);
    }
  }
}

failures.push(...policyFailures.map((message) => `local-market review policy: ${message}`));

for (const language of languages) {
  const record = status.languages?.[language];
  if (!record) {
    fail(`${language}: missing editorial status record.`);
    continue;
  }

  const reviewed = Array.isArray(record.reviewed) ? record.reviewed : [];
  const reviewedSet = new Set(reviewed);
  const duplicates = reviewed.filter((page, index) => reviewed.indexOf(page) !== index);
  const missing = pages.filter((page) => !reviewedSet.has(page));
  const extra = reviewed.filter((page) => !pageSet.has(page));
  const awaiting = Array.isArray(record.copyReviewedAwaitingRender)
    ? record.copyReviewedAwaitingRender
    : [];
  const inProgress = Array.isArray(record.inProgress) ? record.inProgress : [];

  if (duplicates.length) fail(`${language}: duplicate reviewed pages: ${[...new Set(duplicates)].join(', ')}.`);
  if (missing.length) fail(`${language}: pages not editorially reviewed: ${missing.join(', ')}.`);
  if (extra.length) fail(`${language}: reviewed list contains unknown pages: ${extra.join(', ')}.`);
  if (awaiting.length) fail(`${language}: pages still awaiting render QA: ${awaiting.join(', ')}.`);
  if (inProgress.length) fail(`${language}: pages still marked in progress: ${inProgress.join(', ')}.`);
  if (record.remaining !== 0) fail(`${language}: remaining must be 0, found ${JSON.stringify(record.remaining)}.`);

  const seoGeo = status.seoGeo?.[language];
  if (!seoGeo || seoGeo.reviewed !== pages.length || seoGeo.total !== pages.length) {
    fail(`${language}: SEO/GEO review must be ${pages.length}/${pages.length}.`);
  }
}

const renderQa = status.renderQa ?? {};
const viewportsPerPage = Number(renderQa.viewportsPerPage);
const expectedViewports = pages.length * languages.length * viewportsPerPage;
if (renderQa.pagesPerLanguage !== pages.length) {
  fail(`renderQa.pagesPerLanguage must be ${pages.length}, found ${JSON.stringify(renderQa.pagesPerLanguage)}.`);
}
if (!Number.isInteger(viewportsPerPage) || viewportsPerPage < 2) {
  fail(`renderQa.viewportsPerPage must be an integer of at least 2, found ${JSON.stringify(renderQa.viewportsPerPage)}.`);
} else if (renderQa.checkedViewports !== expectedViewports) {
  fail(`renderQa.checkedViewports must be ${expectedViewports}, found ${JSON.stringify(renderQa.checkedViewports)}.`);
}

if (!failures.length) {
  console.log(`Editorial release status verified: ${pages.length} pages x ${languages.length} languages and ${expectedViewports} recorded viewport checks.`);
  process.exit(0);
}

const exceptionFailures = [];
const exceptionFail = (message) => exceptionFailures.push(message);
policyFailures.forEach((message) => exceptionFail(`local-market review policy: ${message}`));
const allowedEditorialDebtPages = [
  'case-bp-2p-95-pneumatic-chuck-integration.html',
  'case-bp-3p-s06-sensor-monitored-chuck.html',
  'manufacturing-quality.html',
  'production-inspection-testing.html'
];

let approval;
try {
  approval = JSON.parse(await fs.readFile(approvalPath, 'utf8'));
} catch (error) {
  exceptionFail(`release approval is missing or invalid JSON: ${error.message}`);
}

if (approval) {
  if (approval.schemaVersion !== 1) exceptionFail('release approval schemaVersion must be 1.');
  if (approval.decision !== 'release-with-known-editorial-debt') {
    exceptionFail('release approval decision is not the supported known-editorial-debt decision.');
  }
  if (approval.approvedByRole !== 'site-owner') exceptionFail('release approval must be issued by the site owner.');
  if (approval.reviewMethod !== 'AI-assisted manual line-by-line review') {
    exceptionFail('release approval must identify the AI-assisted line-by-line review method.');
  }
  if (approval.independentNativeSpeakerConfirmed !== false) {
    exceptionFail('release approval must explicitly state that independent native-speaker confirmation is not complete.');
  }
  if (!sameSet(approval.pages ?? [], allowedEditorialDebtPages)) {
    exceptionFail(`release approval pages must exactly match the ${allowedEditorialDebtPages.length} known editorial-debt pages.`);
  }

  const approvedAt = Date.parse(approval.approvedAt);
  const expiresAt = Date.parse(approval.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt)) {
    exceptionFail('release approval timestamps must be valid ISO-8601 values.');
  } else {
    if (expiresAt <= approvedAt) exceptionFail('release approval expiresAt must be later than approvedAt.');
    if (expiresAt - approvedAt > 24 * 60 * 60 * 1000) {
      exceptionFail('release approval validity must not exceed 24 hours.');
    }
    if (now < approvedAt || now >= expiresAt) exceptionFail('release approval is not currently valid.');
  }

  const expected = approval.expectedStatus ?? {};
  if (expected.reviewedPerLanguage !== pages.length - allowedEditorialDebtPages.length
    || expected.totalPerLanguage !== pages.length
    || expected.remainingPerLanguage !== allowedEditorialDebtPages.length
    || expected.renderQaPagesPerLanguage !== pages.length
    || expected.renderQaCheckedViewports !== pages.length * languages.length * 2
    || expected.renderQaRequiredViewports !== pages.length * languages.length * 2) {
    exceptionFail('release approval expectedStatus does not exactly describe the current known debt.');
  }

  for (const language of languages) {
    const record = status.languages?.[language] ?? {};
    const reviewed = Array.isArray(record.reviewed) ? record.reviewed : [];
    const missing = pages.filter((page) => !new Set(reviewed).has(page));
    const inProgress = Array.isArray(record.inProgress) ? record.inProgress : [];
    const awaiting = Array.isArray(record.copyReviewedAwaitingRender)
      ? record.copyReviewedAwaitingRender
      : [];
    const duplicates = reviewed.filter((page, index) => reviewed.indexOf(page) !== index);
    const extra = reviewed.filter((page) => !pageSet.has(page));
    const seoGeo = status.seoGeo?.[language];

    if (!sameSet(missing, allowedEditorialDebtPages)) {
      exceptionFail(`${language}: missing pages differ from the approved ${allowedEditorialDebtPages.length}-page editorial debt.`);
    }
    if (!sameSet(inProgress, allowedEditorialDebtPages)) {
      exceptionFail(`${language}: inProgress pages differ from the approved ${allowedEditorialDebtPages.length}-page editorial debt.`);
    }
    if (reviewed.length !== pages.length - allowedEditorialDebtPages.length) {
      exceptionFail(`${language}: reviewed count must remain ${pages.length - allowedEditorialDebtPages.length}.`);
    }
    if (duplicates.length || extra.length || awaiting.length) {
      exceptionFail(`${language}: unexpected duplicate, unknown, or awaiting-render editorial status exists.`);
    }
    if (record.remaining !== allowedEditorialDebtPages.length) {
      exceptionFail(`${language}: remaining must be ${allowedEditorialDebtPages.length}.`);
    }
    if (!seoGeo || seoGeo.reviewed !== pages.length - allowedEditorialDebtPages.length || seoGeo.total !== pages.length) {
      exceptionFail(`${language}: SEO/GEO status must remain ${pages.length - allowedEditorialDebtPages.length}/${pages.length}.`);
    }
  }

  if (renderQa.pagesPerLanguage !== pages.length
    || renderQa.viewportsPerPage !== 2
    || renderQa.checkedViewports !== pages.length * languages.length * 2) {
    exceptionFail(`render QA status must remain the recorded ${pages.length} pages per language and ${pages.length * languages.length * 2} viewport checks.`);
  }

  const expectedArtifactPaths = languages.flatMap((language) =>
    allowedEditorialDebtPages.map((page) => `${language}/${page}`)
  ).sort();
  const artifacts = Array.isArray(approval.artifacts) ? approval.artifacts : [];
  const artifactPaths = artifacts.map((artifact) => artifact?.path).sort();
  if (artifacts.length !== expectedArtifactPaths.length
    || JSON.stringify(artifactPaths) !== JSON.stringify(expectedArtifactPaths)) {
    exceptionFail(`release approval artifacts must exactly cover the ${expectedArtifactPaths.length} localized debt pages.`);
  } else {
    for (const artifact of artifacts) {
      const relativePath = artifact.path;
      if (path.isAbsolute(relativePath) || relativePath.includes('..') || relativePath.includes('\\')) {
        exceptionFail(`release approval artifact path is unsafe: ${relativePath}.`);
        continue;
      }
      if (!/^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')) {
        exceptionFail(`release approval artifact has an invalid SHA-256: ${relativePath}.`);
        continue;
      }
      try {
        const actual = mechanicalSha256(await fs.readFile(path.join(root, ...relativePath.split('/'))));
        if (actual !== artifact.sha256) exceptionFail(`release approval artifact changed: ${relativePath}.`);
      } catch (error) {
        exceptionFail(`release approval artifact cannot be read: ${relativePath}: ${error.message}`);
      }
    }
  }

  const acknowledgements = Array.isArray(approval.acknowledgements) ? approval.acknowledgements : [];
  const requiredAcknowledgements = [
    'No independent native-speaker sign-off is claimed.',
    'Editorial and render-QA debt remains recorded and requires later completion.',
    'This approval applies only to the exact artifact bytes listed in this file.'
  ];
  for (const acknowledgement of requiredAcknowledgements) {
    if (!acknowledgements.includes(acknowledgement)) {
      exceptionFail(`release approval is missing acknowledgement: ${acknowledgement}`);
    }
  }
}

if (exceptionFailures.length) {
  console.error(`Editorial release status is not ready with ${failures.length} strict issue(s):`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  console.error(`The owner-approved exception is invalid with ${exceptionFailures.length} issue(s):`);
  exceptionFailures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exitCode = 1;
} else {
  console.warn(`WARNING: owner-approved exception ${approval.approvalId} permits this exact release until ${approval.expiresAt}. No native-speaker or human editorial sign-off is claimed or required; the recorded AI-assisted review boundary remains in force.`);
}
