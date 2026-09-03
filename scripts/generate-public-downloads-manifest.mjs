import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createPublicDownloadsManifest,
  loadPublicDownloadAllowlist,
  PUBLIC_DOWNLOADS_MANIFEST,
} from './lib/public-downloads.mjs';

const checkOnly = process.argv.includes('--check');
const repoArgument = process.argv.slice(2).find((argument) => argument !== '--check');
const repo = path.resolve(repoArgument || process.cwd());
const downloadsRoot = path.join(repo, 'downloads');
const manifestPath = path.join(downloadsRoot, PUBLIC_DOWNLOADS_MANIFEST);
const files = await loadPublicDownloadAllowlist(repo);
const expected = await createPublicDownloadsManifest(downloadsRoot, files);

async function verifyIndexNowDownloadUrls() {
  const source = await fs.readFile(path.join(repo, 'ops', 'indexnow-extra-urls.txt'), 'utf8');
  const approved = new Set(files);
  const listed = new Set();
  for (const value of source.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'www.begapunk.com') {
      throw new Error(`Invalid extra IndexNow URL: ${value}`);
    }
    const publicPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!publicPath.startsWith('downloads/')) continue;
    const fileName = publicPath.slice('downloads/'.length);
    if (!approved.has(fileName)) {
      throw new Error(`IndexNow lists a download outside the approved allowlist: ${fileName}`);
    }
    if (listed.has(fileName)) throw new Error(`IndexNow lists a public download more than once: ${fileName}`);
    listed.add(fileName);
  }
  const missing = files.filter((fileName) => !listed.has(fileName));
  if (missing.length) throw new Error(`Approved public downloads missing from IndexNow: ${missing.join(', ')}`);
}

async function verifyRetiredIndexNowUrls() {
  const source = await fs.readFile(path.join(repo, 'ops', 'indexnow-retired-urls.txt'), 'utf8');
  const approvedPaths = new Set(files.map((fileName) => `downloads/${fileName}`));
  const retired = new Set();
  for (const value of source.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const url = new URL(value);
    const retiredPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (url.protocol !== 'https:'
      || url.hostname !== 'www.begapunk.com'
      || !retiredPath.startsWith('downloads/')
      || approvedPaths.has(retiredPath)) {
      throw new Error(`Invalid retired IndexNow URL: ${value}`);
    }
    if (retired.has(url.href)) throw new Error(`Retired IndexNow URL is listed more than once: ${value}`);
    retired.add(url.href);
  }
}

await verifyIndexNowDownloadUrls();
await verifyRetiredIndexNowUrls();

if (checkOnly) {
  const actual = await fs.readFile(manifestPath, 'utf8');
  if (actual.replaceAll('\r\n', '\n') !== expected) {
    throw new Error(`${PUBLIC_DOWNLOADS_MANIFEST} is stale. Run npm run downloads:manifest.`);
  }
  console.log(`Public-download allowlist verified: ${files.length} approved PDF/STEP files.`);
} else {
  await fs.writeFile(manifestPath, expected, 'utf8');
  console.log(`Wrote ${files.length} approved PDF/STEP downloads to ${manifestPath}`);
}
