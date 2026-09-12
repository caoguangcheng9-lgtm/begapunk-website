import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const EVIDENCE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{7,127}$/u;
// This is intentionally conservative. package manifests and .env.example are not
// copied into the public release, but they define the build and operator mail
// contract; path-only analysis cannot prove that changing them is delivery-neutral.
const INQUIRY_RUNTIME_PATHS = [
  /^send_inquiry[.]php$/u,
  /^phpmailer\//u,
  /(?:^|\/)[.]env$/u,
  /^(?:[.]env[.]example|package(?:-lock)?[.]json)$/u,
  /^(?:composer[.](?:json|lock))$/u,
  /(?:^|\/)contact(?:-[^/]*)?[.]html$/u,
  /(?:^|\/)[.]htaccess$/u,
  /^ops\//u,
  /^nginx(?:[-_.][^/]*)?[.]conf$/u,
  /^deploy[.]ps1$/u,
  /^audit\/policy\/public-directory-inventory[.]json$/u,
  /^scripts\/(?:build-localized-site|build-minified-site|build-production-release|sync-partial-contact-behavior)[.]mjs$/u,
  /^scripts\/lib\/release-boundary[.]mjs$/u,
  /^js\/(?:analytics|contact|form|inquiry|submission)(?:[-_.][^/]*)?[.]js$/u,
  /^[.]github\/workflows\/(?:deploy|production|release)(?:[-_.][^/]*)?[.]ya?ml$/u,
];
const UNKNOWN_RUNTIME_OR_ROUTING_PATHS = [
  /(?:^|\/)(?:api|cgi-bin|config|handlers?|infra|infrastructure|middleware|nginx|php-fpm|routes?|routing|server)(?:\/|$)/u,
  /(?:^|\/)(?:activate|bootstrap|deploy|fastcgi|gateway|handler|installer|middleware|proxy|router|routing|server)(?:[-_.][^/]*)?[.](?:js|mjs|cjs|ts|mts|cts|sh|ps1|py|rb|lua|ya?ml|json|toml)$/u,
  /(?:^|\/)(?:caddyfile|dockerfile|procfile|web[.]config)$/u,
  /(?:^|\/)docker-compose(?:[-_.][^/]*)?[.]ya?ml$/u,
  /[.](?:cgi|conf|fcgi|inc|ini|lua|php\d*|phtml|service)$/u,
];

function normalizeChangedPath(relativePath) {
  const original = typeof relativePath === 'string' ? relativePath : '';
  const normalized = original.replaceAll('\\', '/').toLowerCase();
  const invalid = !normalized
    || normalized.includes('\0')
    || normalized.includes('\uFFFD')
    || normalized.startsWith('/')
    || /^[a-z]:\//u.test(normalized)
    || normalized.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
  return { normalized, invalid };
}

export function isInquiryRuntimePath(relativePath) {
  const { normalized, invalid } = normalizeChangedPath(relativePath);
  if (invalid) return true;
  return [...INQUIRY_RUNTIME_PATHS, ...UNKNOWN_RUNTIME_OR_ROUTING_PATHS]
    .some((pattern) => pattern.test(normalized));
}

export function validateReleaseAuthorization(input) {
  const failures = [];
  const changedPaths = [...new Set(input.changedPaths || [])].sort();
  const inquiryChangedPaths = changedPaths.filter(isInquiryRuntimePath);
  const inquiryEvidenceRequired = input.inquiryApplicability === 'required';
  const inquiryApplicabilityValid = ['required', 'not-applicable'].includes(input.inquiryApplicability);
  const inquiryEffectiveApplicability = inquiryChangedPaths.length || inquiryEvidenceRequired
    ? 'required'
    : inquiryApplicabilityValid ? 'not-applicable' : 'UNKNOWN';
  const inquiryReferenceBound = inquiryEvidenceRequired
    && SHA_PATTERN.test(input.candidateCommit || '')
    && input.inquiryApprovedCommit === input.candidateCommit
    && EVIDENCE_REF_PATTERN.test(input.inquiryEvidenceRef || '');

  if (!SHA_PATTERN.test(input.candidateCommit || '')) failures.push('candidate commit must be an exact lowercase 40-character SHA.');
  if (!SHA_PATTERN.test(input.baselineCommit || '')) failures.push('trusted baseline must be an exact lowercase 40-character SHA.');
  if (input.baselineCommit === input.candidateCommit) failures.push('trusted baseline must differ from the candidate commit.');
  if (input.approvedCommit !== input.candidateCommit) failures.push('protected RELEASE_APPROVED_SHA must exactly match the candidate commit.');
  if (!EVIDENCE_REF_PATTERN.test(input.authorizationRef || '')) {
    failures.push('protected RELEASE_AUTHORIZATION_REF must be an 8-128 character external evidence reference; this check cannot prove that the record is immutable.');
  }
  if (!inquiryApplicabilityValid) {
    failures.push('protected INQUIRY_DELIVERY_APPLICABILITY must be exactly required or not-applicable.');
  }
  if (inquiryChangedPaths.length && input.inquiryApplicability !== 'required') {
    failures.push(`inquiry delivery evidence is required because runtime/form paths changed: ${inquiryChangedPaths.join(', ')}.`);
  }
  if (inquiryEvidenceRequired) {
    if (input.inquiryApprovedCommit !== input.candidateCommit) {
      failures.push('protected INQUIRY_DELIVERY_APPROVED_SHA must exactly match the candidate commit when delivery evidence is required.');
    }
    if (!EVIDENCE_REF_PATTERN.test(input.inquiryEvidenceRef || '')) {
      failures.push('protected INQUIRY_DELIVERY_EVIDENCE_REF must be an 8-128 character reference to the external SMTP and inbox evidence record.');
    }
  }

  return {
    failures,
    changedPaths,
    inquiryChangedPaths,
    inquiryEvidenceRequired,
    inquiryEffectiveApplicability,
    inquiryReferenceBindingStatus: !inquiryApplicabilityValid || (inquiryChangedPaths.length && !inquiryEvidenceRequired)
      ? 'INVALID'
      : inquiryEvidenceRequired
        ? inquiryReferenceBound ? 'BOUND' : 'INVALID'
        : 'NOT_APPLICABLE',
    inquiryControlResult: inquiryEffectiveApplicability === 'required' ? 'UNKNOWN' : null,
  };
}

export function buildReleaseAuthorizationReport({
  result,
  candidateCommit,
  baselineCommit,
  authorizationRef,
  inquiryApplicability,
  inquiryEvidenceRef,
  externallyReferencedBlockingControls,
  recordedAt = new Date().toISOString(),
}) {
  const controlsApplicable = result.inquiryEffectiveApplicability === 'required'
    ? true
    : result.inquiryEffectiveApplicability === 'not-applicable' ? false : null;
  return {
    schemaVersion: 1,
    status: result.failures.length ? 'FAIL' : 'PASS',
    scope: 'authorization-and-reference-binding-only',
    resultSemantics: 'PASS means the protected candidate authorization and a syntactically valid evidence reference were co-recorded for this candidate; it does not prove reference immutability, inspect the referenced record, or establish SMTP acceptance or inbox delivery.',
    candidateCommit,
    trustedBaselineCommit: baselineCommit,
    authorizationRef: EVIDENCE_REF_PATTERN.test(authorizationRef || '') ? authorizationRef : null,
    externallyReferencedBlockingControls,
    inquiryEvidence: {
      declaredApplicability: inquiryApplicability || null,
      effectiveApplicability: result.inquiryEffectiveApplicability,
      referenceBindingStatus: result.inquiryReferenceBindingStatus,
      referencedEvidenceInspected: false,
      controls: {
        'INQ-SMTP': {
          applicable: controlsApplicable,
          result: result.inquiryControlResult,
        },
        'INQ-DELIVERY': {
          applicable: controlsApplicable,
          result: result.inquiryControlResult,
        },
      },
      changedPaths: result.inquiryChangedPaths,
      evidenceRef: result.inquiryEvidenceRequired && EVIDENCE_REF_PATTERN.test(inquiryEvidenceRef || '')
        ? inquiryEvidenceRef
        : null,
    },
    failures: result.failures,
    recordedAt,
  };
}

function git(repositoryRoot, arguments_) {
  const result = spawnSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: null,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) {
    throw new Error(result.error?.message || Buffer.from(result.stderr || '').toString('utf8').trim());
  }
  return Buffer.from(result.stdout || Buffer.alloc(0));
}

async function main() {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const policy = JSON.parse(await readFile(
    path.join(repositoryRoot, 'audit', 'policy', 'release-audit-v2.json'),
    'utf8',
  ));
  const externallyReferencedBlockingControls = (policy.controls || [])
    .filter((control) => control.stages?.release === 'BLOCK' && control.automationStatus !== 'implemented')
    .map((control) => control.id)
    .sort();
  if (!externallyReferencedBlockingControls.length) {
    throw new Error('The release policy exposes no partial/manual BLOCK controls to the authorization record.');
  }
  const candidateCommit = git(repositoryRoot, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const baselineCommit = (process.env.EDITORIAL_TRUSTED_BASE_REF || '').trim();
  if (!SHA_PATTERN.test(baselineCommit)) {
    throw new Error('EDITORIAL_TRUSTED_BASE_REF must be the workflow-injected exact production baseline SHA.');
  }
  const resolvedBaseline = git(repositoryRoot, ['rev-parse', `${baselineCommit}^{commit}`]).toString('utf8').trim();
  if (resolvedBaseline !== baselineCommit) throw new Error('The trusted production baseline does not resolve to its exact commit.');
  git(repositoryRoot, ['merge-base', '--is-ancestor', baselineCommit, candidateCommit]);

  const changedPathBytes = git(repositoryRoot, [
    'diff', '--name-only', '--no-renames', '--diff-filter=ACDMRTUXB', '-z', baselineCommit, candidateCommit, '--',
  ]);
  const changedPaths = changedPathBytes.toString('utf8').split('\0').filter(Boolean);
  if (changedPaths.some((entry) => entry.includes('\uFFFD'))) {
    throw new Error('Changed path inventory is not valid UTF-8.');
  }

  const result = validateReleaseAuthorization({
    candidateCommit,
    baselineCommit,
    approvedCommit: (process.env.RELEASE_APPROVED_SHA || '').trim(),
    authorizationRef: (process.env.RELEASE_AUTHORIZATION_REF || '').trim(),
    inquiryApplicability: (process.env.INQUIRY_DELIVERY_APPLICABILITY || '').trim(),
    inquiryApprovedCommit: (process.env.INQUIRY_DELIVERY_APPROVED_SHA || '').trim(),
    inquiryEvidenceRef: (process.env.INQUIRY_DELIVERY_EVIDENCE_REF || '').trim(),
    changedPaths,
  });

  const report = buildReleaseAuthorizationReport({
    result,
    candidateCommit,
    baselineCommit,
    authorizationRef: (process.env.RELEASE_AUTHORIZATION_REF || '').trim(),
    inquiryApplicability: (process.env.INQUIRY_DELIVERY_APPLICABILITY || '').trim(),
    inquiryEvidenceRef: (process.env.INQUIRY_DELIVERY_EVIDENCE_REF || '').trim(),
    externallyReferencedBlockingControls,
  });
  const reportDirectory = path.join(repositoryRoot, 'dist', 'audit');
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    path.join(reportDirectory, 'release-authorization.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  if (result.failures.length) {
    console.error(`Release authorization failed with ${result.failures.length} issue(s):`);
    result.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Release authorization is bound to ${candidateCommit}; inquiry evidence reference is ${report.inquiryEvidence.referenceBindingStatus}. `
    + 'This check does not evaluate SMTP acceptance or inbox delivery.',
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) await main();
