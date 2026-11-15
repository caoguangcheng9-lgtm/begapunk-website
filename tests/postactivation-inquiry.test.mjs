import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateReceipt, waitForReceipt, RECEIPT_TIMEOUT_MS, verifyActivatedArtifact } from '../scripts/verify-postactivation-inquiry.mjs';
import { validateReleaseAuthorization, buildReleaseAuthorizationReport } from '../scripts/verify-release-authorization.mjs';

const start = Date.parse('2026-11-15T10:00:00Z');
const challenge = { candidateSha: 'a'.repeat(40), releaseId: `20261115-100000-${'a'.repeat(12)}-r1`, manifestSha256: 'b'.repeat(64), runId: '123', runAttempt: '1', nonce: 'c'.repeat(32), testId: 'BEGAPUNK-RELEASE-TEST-123-1-cccccccc', createdAt: new Date(start).toISOString() };
const ref = { reference: 'owner-evidence:20261115:controlled-test', sha256: 'd'.repeat(64) };
const record = { kind: 'BEGAPUNK_INQUIRY_RECEIPT_V1', ...challenge, decision: 'CONFIRMED_RECEIVED', submittedAt: new Date(start + 1000).toISOString(), receivedAt: new Date(start + 2000).toISOString(), httpStatus: 200, responseCode: 'sent', phpResult: 'sent', productionOrigin: 'https://www.begapunk.com', adConversionTriggered: false, controls: { 'INQ-SMTP': 'PASS', 'INQ-DELIVERY': 'PASS' }, httpEvidence: ref, smtpEvidence: ref, inboxEvidence: ref, ownerConfirmationEvidence: ref };
function comment(value = record) { return { user: { id: 1234, type: 'User' }, created_at: new Date(start + 3000).toISOString(), updated_at: new Date(start + 3000).toISOString(), body: JSON.stringify(value), html_url: 'https://github.com/owner/repo/issues/1#issuecomment-1' }; }
const now = () => start + 4000;

test('exact owner attestation is accepted only with all correlated evidence', () => {
  assert.deepEqual(validateReceipt(comment(), challenge, 1234, now()), []);
});
for (const field of ['candidateSha', 'releaseId', 'manifestSha256', 'runId', 'runAttempt', 'nonce', 'testId']) {
  test(`rejects cross-release or replayed ${field}`, () => assert.ok(validateReceipt(comment({ ...record, [field]: 'wrong' }), challenge, 1234, now()).length));
}
for (const field of ['httpEvidence', 'smtpEvidence', 'inboxEvidence', 'ownerConfirmationEvidence']) {
  test(`rejects absent ${field}`, () => assert.ok(validateReceipt(comment({ ...record, [field]: null }), challenge, 1234, now()).length));
  test(`rejects undigested ${field}`, () => assert.ok(validateReceipt(comment({ ...record, [field]: { ...ref, sha256: '' } }), challenge, 1234, now()).length));
}
for (const [field, value] of Object.entries({ decision: 'PENDING', httpStatus: 502, responseCode: 'mail_failed', phpResult: 'UNKNOWN', productionOrigin: 'https://example.com', adConversionTriggered: true, controls: { 'INQ-SMTP': 'UNKNOWN', 'INQ-DELIVERY': 'PASS' }, receivedAt: new Date(start - 1).toISOString() })) {
  test(`rejects invalid ${field}`, () => assert.ok(validateReceipt(comment({ ...record, [field]: value }), challenge, 1234, now()).length));
}
test('rejects forged owner and bot receipt', () => {
  assert.ok(validateReceipt({ ...comment(), user: { id: 55, type: 'User' } }, challenge, 1234, now()).length);
  assert.ok(validateReceipt({ ...comment(), user: { id: 1234, type: 'Bot' } }, challenge, 1234, now()).length);
});
test('rejects edits and deadline expiry', () => {
  assert.ok(validateReceipt({ ...comment(), updated_at: new Date(now()).toISOString() }, challenge, 1234, now()).length);
  assert.ok(validateReceipt(comment(), challenge, 1234, start + RECEIPT_TIMEOUT_MS).length);
});
test('rejects malformed or null JSON without treating it as approval', () => {
  for (const body of ['{', 'null', '[]', '"PASS"']) assert.ok(validateReceipt({ ...comment(), body }, challenge, 1234, now()).length);
});
test('polling returns only an authenticated matching owner receipt', async () => {
  const result = await waitForReceipt({ challenge, ownerId: 1234, fetchComments: async () => [comment()], now });
  assert.equal(result.body, comment().body);
});
test('missing and unauthorized receipt expires, without an infinite wait', async () => {
  let t = start; let count = 0;
  await assert.rejects(waitForReceipt({ challenge, ownerId: 1234, fetchComments: async () => [{ ...comment(), user: { id: 55 } }], now: () => t, sleep: async ms => { t += ms; count++; } }), /timed out/);
  assert.equal(t, start + RECEIPT_TIMEOUT_MS); assert.equal(count, 80);
});
test('API failure and explicit owner failure propagate to rollback', async () => {
  await assert.rejects(waitForReceipt({ challenge, ownerId: 1234, fetchComments: async () => { throw Error('HTTP 403'); }, now }), /403/);
  await assert.rejects(waitForReceipt({ challenge, ownerId: 1234, fetchComments: async () => [comment({ ...record, decision: 'REJECTED' })], now }), /did not confirm/);
});
test('duplicate receipts cannot ambiguously approve a release', async () => {
  await assert.rejects(waitForReceipt({ challenge, ownerId: 1234, fetchComments: async () => [comment(), comment()], now }), /Duplicate/);
});
test('unsafe or unbound active artifact is rejected', () => {
  assert.throws(() => verifyActivatedArtifact({ releaseId: 'wrong', manifestSha256: '0'.repeat(64) }, challenge));
});
test('active artifact must still match every manifest entry and the accepted release', () => {
  const raw = Buffer.from(`${'f'.repeat(64)}  index.html\n`);
  const manifestSha256 = createHash('sha256').update(raw).digest('hex');
  const observation = { activeStable: true, releaseId: challenge.releaseId, manifestSha256,
    manifestRawBase64: raw.toString('base64'), runtimeLinks: [], unsafePaths: [],
    files: [{ path: 'index.html', sha256: 'f'.repeat(64) }], regularPaths: ['manifest.sha256', 'index.html'] };
  const expected = { ...challenge, manifestSha256 };
  assert.doesNotThrow(() => verifyActivatedArtifact(observation, expected));
  for (const altered of [
    { ...observation, releaseId: `20261115-100000-${'e'.repeat(12)}-r1` },
    { ...observation, activeStable: false },
    { ...observation, files: [{ path: 'index.html', sha256: 'a'.repeat(64) }] },
    { ...observation, regularPaths: [...observation.regularPaths, 'extra.php'] },
  ]) assert.throws(() => verifyActivatedArtifact(altered, expected));
});

const authorization = { candidateCommit: challenge.candidateSha, baselineCommit: 'e'.repeat(40), approvedCommit: challenge.candidateSha, authorizationRef: 'owner-authorization:20261115:release', inquiryApplicability: 'required', inquiryPhase: 'post-activation', postActivationApprovedCommit: challenge.candidateSha, postActivationAuthorizationRef: 'owner-authorization:20261115:bounded-inquiry', receiptIssue: '34', inquiryApprovedCommit: '', inquiryEvidenceRef: '', changedPaths: ['send_inquiry.php'] };
test('explicit bounded post-activation authorization retains UNKNOWN delivery', () => {
  const result = validateReleaseAuthorization(authorization);
  assert.deepEqual(result.failures, []);
  assert.equal(result.inquiryReferenceBindingStatus, 'PENDING_POST_ACTIVATION');
  assert.equal(result.inquiryControlResult, 'UNKNOWN');
  const report = buildReleaseAuthorizationReport({ result, candidateCommit: authorization.candidateCommit, baselineCommit: authorization.baselineCommit, authorizationRef: authorization.authorizationRef, inquiryApplicability: 'required', externallyReferencedBlockingControls: ['INQ-SMTP', 'INQ-DELIVERY'] });
  assert.equal(report.inquiryEvidence.transactionCommitRequiresOwnerReceipt, true);
  assert.equal(report.inquiryEvidence.controls['INQ-DELIVERY'].result, 'UNKNOWN');
  assert.equal(report.inquiryEvidence.evidenceRef, null);
});
for (const [field, value] of Object.entries({ inquiryPhase: 'skip', postActivationApprovedCommit: 'f'.repeat(40), postActivationAuthorizationRef: '', receiptIssue: '../34', inquiryApprovedCommit: challenge.candidateSha, inquiryEvidenceRef: 'fabricated:receipt', inquiryApplicability: 'not-applicable', approvedCommit: 'f'.repeat(40) })) {
  test(`post-activation cannot bypass ${field}`, () => assert.ok(validateReleaseAuthorization({ ...authorization, [field]: value }).failures.length));
}
