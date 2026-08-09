import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const status = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'editorial', 'status.json'), 'utf8'));
const approvalPath = path.join(root, 'i18n', 'editorial', 'release-approval.json');
const failures = [];

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

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

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
    exceptionFail('release approval pages must exactly match the four known editorial-debt pages.');
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
    || expected.renderQaPagesPerLanguage !== 49
    || expected.renderQaCheckedViewports !== 294
    || expected.renderQaRequiredViewports !== 330) {
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
      exceptionFail(`${language}: missing pages differ from the approved four-page editorial debt.`);
    }
    if (!sameSet(inProgress, allowedEditorialDebtPages)) {
      exceptionFail(`${language}: inProgress pages differ from the approved four-page editorial debt.`);
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

  if (renderQa.pagesPerLanguage !== 49
    || renderQa.viewportsPerPage !== 2
    || renderQa.checkedViewports !== 294) {
    exceptionFail('render QA status must remain the recorded 49 pages per language and 294 viewport checks.');
  }

  const expectedArtifactPaths = languages.flatMap((language) =>
    allowedEditorialDebtPages.map((page) => `${language}/${page}`)
  ).sort();
  const artifacts = Array.isArray(approval.artifacts) ? approval.artifacts : [];
  const artifactPaths = artifacts.map((artifact) => artifact?.path).sort();
  if (artifacts.length !== expectedArtifactPaths.length
    || JSON.stringify(artifactPaths) !== JSON.stringify(expectedArtifactPaths)) {
    exceptionFail('release approval artifacts must exactly cover the 12 localized debt pages.');
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
        const actual = sha256(await fs.readFile(path.join(root, ...relativePath.split('/'))));
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
  console.warn(`WARNING: owner-approved exception ${approval.approvalId} permits this exact release until ${approval.expiresAt}. Independent native-language review remains outstanding.`);
}
