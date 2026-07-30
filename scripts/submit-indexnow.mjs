import { readFile } from 'node:fs/promises';

const urlFile = process.argv[2];
if (!urlFile) {
  console.error('Usage: node scripts/submit-indexnow.mjs <url-list-file>');
  process.exit(2);
}

const key = process.env.INDEXNOW_KEY || '';
if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY is missing or has an invalid format.');
}

const urls = (await readFile(urlFile, 'utf8'))
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

if (!urls.length) {
  console.log('No changed public URLs require an IndexNow notification.');
  process.exit(0);
}
if (urls.length > 10_000) throw new Error(`IndexNow URL count exceeds protocol limit: ${urls.length}`);

for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.begapunk.com') {
    throw new Error(`Refusing to submit a URL outside the production host: ${value}`);
  }
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: 'www.begapunk.com',
    key,
    keyLocation: `https://www.begapunk.com/${key}.txt`,
    urlList: urls,
  }),
});

if (![200, 202].includes(response.status)) {
  const detail = (await response.text()).slice(0, 500);
  throw new Error(`IndexNow rejected the notification with HTTP ${response.status}: ${detail}`);
}

console.log(`IndexNow accepted ${urls.length} changed URL(s) with HTTP ${response.status}.`);
