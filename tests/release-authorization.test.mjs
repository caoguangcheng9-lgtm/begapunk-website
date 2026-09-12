import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReleaseAuthorizationReport,
  isInquiryRuntimePath,
  validateReleaseAuthorization,
} from '../scripts/verify-release-authorization.mjs';

const baseline = 'a'.repeat(40);
const candidate = 'b'.repeat(40);
const valid = {
  candidateCommit: candidate,
  baselineCommit: baseline,
  approvedCommit: candidate,
  authorizationRef: 'release-review:2026-09-05:001',
  inquiryApplicability: 'not-applicable',
  inquiryApprovedCommit: '',
  inquiryEvidenceRef: '',
  changedPaths: ['about.html'],
};

test('identifies inquiry, deployment and routing paths without flagging ordinary content', () => {
  for (const relativePath of [
    'send_inquiry.php',
    'PHPMailer/SMTP.php',
    'contact.html',
    'fr/contact.html',
    'es/contact-support.html',
    '.htaccess',
    '.env',
    '.env.example',
    'package.json',
    'package-lock.json',
    'composer.lock',
    'ops/bootstrap-server.sh',
    'ops/activate-release.sh',
    'ops/install-nginx-managed-redirects.sh',
    'ops/nginx-managed-redirects.conf',
    'ops/future-routing-hardening.sh',
    'nginx-legacy-redirects.conf',
    'deploy.ps1',
    '.github/workflows/deploy.yml',
    'scripts/build-production-release.mjs',
    'scripts/lib/release-boundary.mjs',
    'scripts/sync-partial-contact-behavior.mjs',
    'server/new-route.js',
    'config/unrecognized-proxy.toml',
    'api/lead-handler.js',
    'api/future-route.ts',
    'future-handler.php',
    '../outside/router.js',
  ]) assert.equal(isInquiryRuntimePath(relativePath), true, relativePath);
  for (const relativePath of [
    'fr/about.html',
    'css/style.css',
    'images/contact-banner.webp',
    'docs/inquiry-notes.md',
    '.github/workflows/pr-quality.yml',
  ]) assert.equal(isInquiryRuntimePath(relativePath), false, relativePath);
});

test('accepts an externally authorized content-only release', () => {
  const result = validateReleaseAuthorization(valid);
  assert.deepEqual(result.failures, []);
  assert.equal(result.inquiryReferenceBindingStatus, 'NOT_APPLICABLE');
  assert.equal(result.inquiryControlResult, null);
});

test('rejects stale or missing release authorization', () => {
  const result = validateReleaseAuthorization({ ...valid, approvedCommit: baseline, authorizationRef: '' });
  assert.match(result.failures.join('\n'), /RELEASE_APPROVED_SHA/);
  assert.match(result.failures.join('\n'), /RELEASE_AUTHORIZATION_REF/);
});

test('cannot declare inquiry evidence not applicable when the chain changed', () => {
  const result = validateReleaseAuthorization({
    ...valid,
    changedPaths: ['.htaccess', 'fr/contact.html', 'ops/future-router.sh', 'send_inquiry.php'],
  });
  assert.match(result.failures.join('\n'), /inquiry delivery evidence is required/);
  assert.equal(result.inquiryReferenceBindingStatus, 'INVALID');
  assert.equal(result.inquiryControlResult, 'UNKNOWN');
});

test('unknown runtime or routing changes fail closed to required evidence', () => {
  for (const changedPath of [
    'server/brand-new-adapter.js',
    'config/gateway.toml',
    'api/unrecognized-route.mjs',
    'future-endpoint.phtml',
  ]) {
    const result = validateReleaseAuthorization({ ...valid, changedPaths: [changedPath] });
    assert.match(result.failures.join('\n'), /inquiry delivery evidence is required/, changedPath);
    assert.deepEqual(result.inquiryChangedPaths, [changedPath]);
  }
});

test('required inquiry reference is candidate-bound without promoting the external controls', () => {
  const missing = validateReleaseAuthorization({
    ...valid,
    inquiryApplicability: 'required',
    changedPaths: ['send_inquiry.php'],
  });
  assert.match(missing.failures.join('\n'), /INQUIRY_DELIVERY_APPROVED_SHA/);
  assert.match(missing.failures.join('\n'), /INQUIRY_DELIVERY_EVIDENCE_REF/);

  const accepted = validateReleaseAuthorization({
    ...valid,
    inquiryApplicability: 'required',
    inquiryApprovedCommit: candidate,
    inquiryEvidenceRef: 'smtp-inbox:controlled:2026-09-05',
    changedPaths: ['send_inquiry.php'],
  });
  assert.deepEqual(accepted.failures, []);
  assert.equal(accepted.inquiryReferenceBindingStatus, 'BOUND');
  assert.equal(accepted.inquiryControlResult, 'UNKNOWN');
  assert.equal(Object.values(accepted).includes('PASS'), false);

  const report = buildReleaseAuthorizationReport({
    result: accepted,
    candidateCommit: candidate,
    baselineCommit: baseline,
    authorizationRef: valid.authorizationRef,
    inquiryApplicability: 'required',
    inquiryEvidenceRef: 'smtp-inbox:controlled:2026-09-05',
    externallyReferencedBlockingControls: ['INQ-SMTP', 'INQ-DELIVERY'],
    recordedAt: '2026-09-05T00:00:00.000Z',
  });
  assert.equal(report.status, 'PASS');
  assert.equal(report.scope, 'authorization-and-reference-binding-only');
  assert.equal(report.inquiryEvidence.referenceBindingStatus, 'BOUND');
  assert.equal(report.inquiryEvidence.referencedEvidenceInspected, false);
  assert.equal(report.inquiryEvidence.controls['INQ-SMTP'].result, 'UNKNOWN');
  assert.equal(report.inquiryEvidence.controls['INQ-DELIVERY'].result, 'UNKNOWN');
  assert.equal(Object.hasOwn(report.inquiryEvidence, 'status'), false);
  assert.deepEqual(report.externallyReferencedBlockingControls, ['INQ-SMTP', 'INQ-DELIVERY']);
  assert.equal(Object.hasOwn(report, 'attestedBlockingControls'), false);
});
