import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const recordArgument = process.argv.find((argument) => argument.startsWith('--review-record='));

if (!write) throw new Error('Use --write only after the changed localized pages have a recorded line-by-line review.');
if (!recordArgument) throw new Error('A review record is required: --review-record=audit/localization/<file>.md');

const recordRelative = recordArgument.slice('--review-record='.length).replaceAll('\\', '/');
if (!/^audit\/localization\/[^/]+\.md$/.test(recordRelative)) {
  throw new Error('The review record must be a Markdown file directly under audit/localization/.');
}

const recordPath = path.join(root, ...recordRelative.split('/'));
const record = await fs.readFile(recordPath, 'utf8');
for (const required of ['reviewedAt:', 'reviewedByRole:', 'reviewMethod:', 'unresolvedIssues:', '目标市场参考来源', '术语决定', '搜索意图决定']) {
  if (!record.includes(required)) throw new Error(`${recordRelative}: required review evidence is missing (${required}).`);
}

const reviewedAtMatch = record.match(/reviewedAt:\s*`(\d{4}-\d{2}-\d{2}T[^`]+)`/);
if (!reviewedAtMatch || !Number.isFinite(Date.parse(reviewedAtMatch[1]))) {
  throw new Error(`${recordRelative}: reviewedAt must contain a valid ISO-8601 timestamp.`);
}

const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const statusPath = path.join(root, 'i18n', 'editorial', 'status.json');
const statusSource = await fs.readFile(statusPath, 'utf8');
const status = JSON.parse(statusSource);
const languages = config.activeLanguageCodes;
const pages = config.pages;

if (status.reviewedArtifactSnapshot?.pagesPerLanguage !== pages.length) {
  throw new Error('Editorial status page count does not match i18n/config.json.');
}
if (JSON.stringify([...status.reviewedArtifactSnapshot.languages].sort()) !== JSON.stringify([...languages].sort())) {
  throw new Error('Editorial status languages do not match i18n/config.json.');
}

function normalizeLf(buffer) {
  const src = Buffer.from(buffer);
  const out = Buffer.allocUnsafe(src.length);
  let j = 0;
  for (let i = 0; i < src.length; i += 1) {
    if (src[i] === 0x0d) {
      if (i + 1 < src.length && src[i + 1] === 0x0a) continue;
      out[j++] = 0x0a;
      continue;
    }
    out[j++] = src[i];
  }
  return out.subarray(0, j);
}

const sha256 = (buffer) => createHash('sha256').update(normalizeLf(buffer)).digest('hex');
const artifacts = [];
for (const language of languages) {
  for (const page of pages) {
    const relativePath = `${language}/${page}`;
    artifacts.push({
      path: relativePath,
      sha256: sha256(await fs.readFile(path.join(root, ...relativePath.split('/')))),
    });
  }
}

const capturedAt = new Date().toISOString();
const statusUpdatedAt = reviewedAtMatch[1].slice(0, 10);
const manifest = {
  schemaVersion: 1,
  algorithm: 'sha256-bytes-v1',
  capturedAt,
  statusUpdatedAt,
  qualityBoundary: 'integrity-only-not-native-speaker-or-semantic-proof',
  reviewRecord: recordRelative,
  artifacts,
};

let nextStatus = statusSource.replace(/("updatedAt"\s*:\s*)"[^"]+"/, `$1"${statusUpdatedAt}"`);
nextStatus = nextStatus.replace(
  /("reviewedArtifactSnapshot"\s*:\s*\{[\s\S]*?"capturedAt"\s*:\s*)"[^"]+"/,
  `$1"${capturedAt}"`,
);
if (nextStatus === statusSource) throw new Error('Editorial status timestamps were not updated.');

await fs.writeFile(
  path.join(root, 'audit', 'localization', 'current-localized-artifacts.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);
await fs.writeFile(statusPath, nextStatus, 'utf8');

console.log(`Captured ${artifacts.length} reviewed localized artifacts using ${recordRelative}.`);
