import { verifyOwnerArtifact, readRetainedApprovalBytes } from './lib/owner-incremental-acceptance.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Cohort-specific receipt validation; this is not a release authorization gate.
// The two pinned digests identify the evidence explicitly accepted in the owner
// instruction. They are not signatures or identity verification.
const PACKAGE_SHA = 'e4b5f43912a38a91daaee41fae8675de6c4b9a237f8c942d48cd021f54212c56';
const MATRIX_SHA = '7a65a7080b14edb200af535fb6343cbcaa6f6fbbeef0e2f089ca989eabba788e';
const DIR = 'audit/approvals/2026-11-13-ai-content';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safe = p => typeof p === 'string' && !path.isAbsolute(p)
  && !p.includes('\\') && !p.split('/').some(s => !s || s === '.' || s === '..')
  && !p.includes(':');

function csvRows(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('Unterminated evidence CSV field.');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.some(Boolean)).map(r => {
    if (r.length !== header.length) throw new Error('Invalid evidence CSV width.');
    return Object.fromEntries(header.map((k, i) => [k, r[i]]));
  });
}

export async function verifyOwnerAiContentAcceptance(root, receiptOverride) {
  const receipt = receiptOverride ?? JSON.parse(await readFile(path.join(root, DIR, 'owner-acceptance.json'), 'utf8'));
  const fail = message => { throw new Error(message); };
  if (receipt.schemaVersion !== 1 || receipt.approvalType !== 'OWNER_ACCEPTED_AI_REVIEWED_CONTENT'
      || receipt.decisionDate !== '2026-11-13') fail('Owner decision type/date/schema mismatch.');
  if (receipt.deploymentAuthorized !== false || receipt.nativeSpeakerReviewPerformed !== false
      || receipt.additional17OwnerApproved !== false) fail('Content acceptance cannot authorize deployment, native review or the additional 17 pages.');
  if (!Number.isFinite(Date.parse(receipt.recordedAt)) || Date.parse(receipt.recordedAt) > Date.now() + 300000
      || !receipt.decisionSource?.includes('conversation')) fail('Receipt lacks a real recording time or decision source.');
  if (receipt.aiPackage?.name !== 'BEGAPUNK_AI_LANGUAGE_REVIEW.zip'
      || receipt.aiPackage?.sha256 !== PACKAGE_SHA) fail('Accepted AI package binding mismatch.');
  const expectedEvidence = ['OWNER_STATEMENT.md', '80_PAGE_REVIEW_MATRIX.csv', 'AI_LANGUAGE_AUDIT_SUMMARY.md', 'CANDIDATE_FILE_SHA256.csv'].map(p => `${DIR}/${p}`).sort();
  if (!Array.isArray(receipt.evidence) || JSON.stringify(receipt.evidence.map(e => e.path).sort()) !== JSON.stringify(expectedEvidence)) fail('Missing or unexpected approval evidence.');
  for (const e of receipt.evidence) {
    if (!safe(e.path) || !/^[a-f0-9]{64}$/.test(e.sha256)) fail(`Evidence hash mismatch: ${e.path}`);
    try { if (hash(await readRetainedApprovalBytes(root, e.path, e.sha256)) !== e.sha256) fail(`Evidence hash mismatch: ${e.path}`); }
    catch (error) { if (error.code === 'ENOENT') throw error; fail(`Evidence hash mismatch: ${e.path}; ${error.message}`); }
  }
  const matrix = await readRetainedApprovalBytes(root, `${DIR}/80_PAGE_REVIEW_MATRIX.csv`, MATRIX_SHA);
  if (hash(matrix) !== MATRIX_SHA) fail('Original AI review matrix digest changed.');
  const rows = csvRows(matrix.toString('utf8').replace(/^\uFEFF/, ''));
  const original = rows.map(r => ({path: r.page.replace(/^E:\/begapunk-site-v2\//, ''), sha256: r.after_sha256}));
  if (original.length !== 80 || rows.some(r => r.review_method !== 'AI_REVIEWED' || r.final_result !== 'PASS'
      || r.native_human_review !== 'NOT_PERFORMED')) fail('Original evidence does not establish 80 AI-reviewed pages.');
  const normalized = values => [...values].map(v => ({path:v.path,sha256:v.sha256})).sort((a,b) => a.path.localeCompare(b.path));
  if (!Array.isArray(receipt.artifacts) || receipt.artifacts.length !== 80
      || new Set(receipt.artifacts.map(a => a.path)).size !== 80
      || JSON.stringify(normalized(receipt.artifacts)) !== JSON.stringify(normalized(original))) fail('Approval scope must exactly match the original 80 paths and hashes.');
  for (const a of receipt.artifacts) {
    if (!safe(a.path) || !/^(de|fr|ja|ru)\//.test(a.path)) fail(`Approved page hash changed: ${a.path}`);
    await verifyOwnerArtifact(root, a.path, a.sha256);
  }
  return { acceptedPageCount:80, approvalType:receipt.approvalType, deploymentAuthorized:false, additional17OwnerApproved:false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await verifyOwnerAiContentAcceptance(path.resolve(import.meta.dirname, '..'));
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
