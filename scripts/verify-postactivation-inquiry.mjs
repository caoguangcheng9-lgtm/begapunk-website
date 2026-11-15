import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateObservedFiles, normalReleasePrefix } from './lib/legacy-composite-baseline.mjs';

export const RECEIPT_TIMEOUT_MS = 20 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
const sha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const evidence = value => value && sha256(value.sha256)
  && typeof value.reference === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/#-]{7,255}$/.test(value.reference);

// This is an owner attestation gate. HTTP success alone is never inbox evidence.
// The retained owner record must identify the independently inspected evidence.
export function validateReceipt(comment, challenge, ownerId, now = Date.now()) {
  const errors = [];
  if (comment?.user?.id !== ownerId || comment.user?.type !== 'User') errors.push('Receipt author is not the repository owner.');
  if (comment?.created_at !== comment?.updated_at) errors.push('Edited receipt records are not accepted; append a new record.');
  let record;
  try { record = JSON.parse(comment.body); } catch { return ['Receipt must be a JSON object.']; }
  if (!record || Array.isArray(record) || record.kind !== 'BEGAPUNK_INQUIRY_RECEIPT_V1') return ['Invalid receipt kind.'];
  for (const field of ['candidateSha', 'releaseId', 'manifestSha256', 'runId', 'runAttempt', 'nonce', 'testId']) {
    if (record[field] !== challenge[field]) errors.push(`Receipt ${field} does not match this release attempt.`);
  }
  const start = Date.parse(challenge.createdAt);
  const submitted = Date.parse(record.submittedAt);
  const received = Date.parse(record.receivedAt);
  const attested = Date.parse(comment.created_at);
  if (![start, submitted, received, attested, now].every(Number.isFinite)
    || submitted < start || received < submitted || attested < received || attested > now
    || now >= start + RECEIPT_TIMEOUT_MS) errors.push('Receipt timestamps are invalid, stale, or outside the bounded window.');
  if (record.decision !== 'CONFIRMED_RECEIVED') errors.push('Owner did not confirm receipt.');
  if (record.httpStatus !== 200 || record.responseCode !== 'sent' || record.phpResult !== 'sent') errors.push('Successful website HTTP/PHP evidence is missing.');
  if (record.productionOrigin !== 'https://www.begapunk.com' || record.adConversionTriggered !== false) errors.push('Origin or no-ad-conversion attestation is invalid.');
  if (record.controls?.['INQ-SMTP'] !== 'PASS' || record.controls?.['INQ-DELIVERY'] !== 'PASS') errors.push('SMTP and inbox controls must both be confirmed.');
  for (const field of ['httpEvidence', 'smtpEvidence', 'inboxEvidence', 'ownerConfirmationEvidence']) {
    if (!evidence(record[field])) errors.push(`${field} needs a real evidence reference and SHA-256.`);
  }
  return errors;
}

export async function waitForReceipt({ challenge, ownerId, fetchComments, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const deadline = Date.parse(challenge.createdAt) + RECEIPT_TIMEOUT_MS;
  while (now() < deadline) {
    const comments = await fetchComments();
    const matching = comments.filter(comment => {
      if (comment?.user?.id !== ownerId) return false;
      try { const r = JSON.parse(comment.body); return r.kind === 'BEGAPUNK_INQUIRY_RECEIPT_V1' && r.nonce === challenge.nonce; } catch { return false; }
    });
    if (matching.length > 1) throw new Error('Duplicate owner receipts for this challenge.');
    if (matching.length === 1) {
      const errors = validateReceipt(matching[0], challenge, ownerId, now());
      if (errors.length) throw new Error(errors.join(' '));
      return matching[0];
    }
    await sleep(Math.min(15000, Math.max(0, deadline - now())));
  }
  throw new Error('INQ-DELIVERY confirmation timed out; transaction must roll back.');
}

export function verifyActivatedArtifact(observation, challenge) {
  validateObservedFiles(observation);
  if (observation.releaseId !== challenge.releaseId || observation.manifestSha256 !== challenge.manifestSha256
    || normalReleasePrefix(observation.releaseId) !== challenge.candidateSha.slice(0, 12)) {
    throw new Error('Active artifact changed while waiting for the owner receipt.');
  }
}

async function main() {
  const directory = 'dist/audit';
  await mkdir(directory, { recursive: true });
  if (process.argv[2] === '--verify-active') {
    const result = JSON.parse(await readFile(`${directory}/postactivation-inquiry.json`, 'utf8'));
    if (result.status !== 'PASS') throw new Error('Owner receipt is not confirmed.');
    verifyActivatedArtifact(JSON.parse(await readFile(process.argv[3], 'utf8')), result.challenge);
    console.log('Active release and owner receipt are bound to the exact artifact.');
    return;
  }
  const preparing = process.argv[2] === '--prepare' && process.argv.length === 3;
  if (!preparing && process.argv.length !== 2) throw new Error('Unexpected arguments; the receipt deadline cannot be overridden.');
  const { GITHUB_SHA, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_TOKEN,
    INQUIRY_RECEIPT_ISSUE, EXPECTED_RELEASE_ID, EXPECTED_MANIFEST_SHA256 } = process.env;
  if (!/^[a-f0-9]{40}$/.test(GITHUB_SHA || '') || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(GITHUB_REPOSITORY || '')
    || !/^[1-9][0-9]*$/.test(GITHUB_RUN_ID || '') || !/^[1-9][0-9]*$/.test(GITHUB_RUN_ATTEMPT || '')
    || !/^[1-9][0-9]*$/.test(INQUIRY_RECEIPT_ISSUE || '') || !GITHUB_TOKEN
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{5,100}$/.test(EXPECTED_RELEASE_ID || '') || !sha256(EXPECTED_MANIFEST_SHA256)) {
    throw new Error('Missing exact production identity or receipt issue binding.');
  }
  async function api(path) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Receipt evidence API failed: HTTP ${response.status}`);
    return response.json();
  }
  const repository = await api('');
  if (repository.owner?.type !== 'User' || !Number.isSafeInteger(repository.owner.id)) throw new Error('Repository owner identity is not a supported individual approver.');
  const nonce = randomBytes(16).toString('hex');
  const challenge = preparing ? {
    candidateSha: GITHUB_SHA, releaseId: EXPECTED_RELEASE_ID, manifestSha256: EXPECTED_MANIFEST_SHA256,
    runId: GITHUB_RUN_ID, runAttempt: GITHUB_RUN_ATTEMPT, nonce,
    testId: `BEGAPUNK-RELEASE-TEST-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${nonce.slice(0, 8)}`,
    createdAt: new Date().toISOString(), issue: Number(INQUIRY_RECEIPT_ISSUE), ownerId: repository.owner.id,
  } : JSON.parse(await readFile(`${directory}/postactivation-inquiry-challenge.json`, 'utf8'));
  if (challenge.candidateSha !== GITHUB_SHA || challenge.releaseId !== EXPECTED_RELEASE_ID
    || challenge.manifestSha256 !== EXPECTED_MANIFEST_SHA256 || challenge.runId !== GITHUB_RUN_ID
    || challenge.runAttempt !== GITHUB_RUN_ATTEMPT || challenge.ownerId !== repository.owner.id
    || challenge.issue !== Number(INQUIRY_RECEIPT_ISSUE)) throw new Error('Prepared challenge does not match the current workflow identity.');
  if (preparing) {
    await writeFile(`${directory}/postactivation-inquiry-challenge.json`, `${JSON.stringify(challenge, null, 2)}\n`);
    console.log(`PREPARED_OWNER_RECEIPT ${JSON.stringify(challenge)}`);
    return;
  }
  console.log(`WAITING_FOR_OWNER_RECEIPT ${JSON.stringify(challenge)}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\nAwaiting website test **${challenge.testId}**. Owner receipt must bind this run, SHA and manifest. Timeout: 20 minutes; failure rolls back.\n`);
  try {
    const receipt = await waitForReceipt({ challenge, ownerId: repository.owner.id, fetchComments: async () => {
      const all = [];
      for (let page = 1; page <= 10; page++) {
        const batch = await api(`/issues/${INQUIRY_RECEIPT_ISSUE}/comments?per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('Invalid comment API response.');
        all.push(...batch);
        if (batch.length < 100) return all;
      }
      throw new Error('Receipt comment inventory exceeds the bounded limit.');
    } });
    const report = { status: 'PASS', scope: 'owner-attested-correlated-http-smtp-inbox-evidence', challenge,
      receipt, receiptBodySha256: digest(receipt.body), completedAt: new Date().toISOString(),
      evidenceBoundary: 'Owner reviewed referenced evidence; this verifier authenticates and binds the owner attestation, not the mailbox or SMTP provider itself.' };
    await writeFile(`${directory}/postactivation-inquiry.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Owner receipt verified: ${receipt.html_url}`);
  } catch (error) {
    await writeFile(`${directory}/postactivation-inquiry.json`, `${JSON.stringify({ status: 'FAIL', challenge, error: error.message, completedAt: new Date().toISOString() }, null, 2)}\n`);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
