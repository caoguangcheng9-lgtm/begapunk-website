#!/usr/bin/env node
/**
 * Refresh <lastmod> values in sitemap.xml from git commit dates.
 *
 * The root sitemap is hand-maintained, so its <lastmod> values drift behind the
 * real page changes. Google uses <lastmod> to decide whether to re-crawl, so a
 * stale value means fresh edits never get picked up. This script maps every
 * <loc> to its source file, reads the latest git commit date for that file and
 * raises <lastmod> when the commit date is newer than the value in the file.
 *
 * Usage:
 *   node scripts/sync-sitemap-lastmod.mjs --write   # update sitemap.xml
 *   node scripts/sync-sitemap-lastmod.mjs           # check only (exit 1 if stale)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SITE_ORIGIN = 'https://www.begapunk.com/';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const args = new Set(process.argv.slice(2));
const write = args.has('--write');

const dateCache = new Map();
function gitDate(relativePath) {
  if (dateCache.has(relativePath)) return dateCache.get(relativePath);
  let value = null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', relativePath], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (ISO_DATE.test(out)) value = out;
  } catch {
    value = null;
  }
  dateCache.set(relativePath, value);
  return value;
}

function urlToSourceFile(url) {
  if (!url.startsWith(SITE_ORIGIN)) return null;
  let relative = url.slice(SITE_ORIGIN.length).split('?')[0].split('#')[0];
  if (relative === '' || relative.endsWith('/')) relative += 'index.html';
  const absolute = path.join(ROOT, relative);
  if (!absolute.startsWith(ROOT + path.sep)) return null;
  if (!fs.existsSync(absolute)) return null;
  return relative;
}

if (!fs.existsSync(SITEMAP)) {
  console.error('sitemap.xml not found');
  process.exit(1);
}

const source = fs.readFileSync(SITEMAP, 'utf8');
const stale = [];
let blocks = 0;
let missingLoc = 0;
let missingLastmod = 0;
let skipped = 0;

const updated = source.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
  blocks += 1;
  const loc = /<loc>([^<]+)<\/loc>/.exec(block);
  if (!loc) {
    missingLoc += 1;
    return block;
  }
  const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block);
  if (!lastmod) {
    missingLastmod += 1;
    return block;
  }
  const file = urlToSourceFile(loc[1]);
  if (!file) {
    skipped += 1;
    return block;
  }
  const date = gitDate(file);
  if (!date || date <= lastmod[1]) return block;
  stale.push({ url: loc[1], from: lastmod[1], to: date });
  return block.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${date}</lastmod>`);
});

if (missingLoc || missingLastmod) {
  console.error(`sitemap structure problem: ${missingLoc} url(s) without <loc>, ${missingLastmod} without <lastmod>`);
  process.exit(1);
}

const openUrls = (updated.match(/<url>/g) || []).length;
const closeUrls = (updated.match(/<\/url>/g) || []).length;
if (openUrls !== closeUrls || openUrls !== blocks) {
  console.error('sitemap structure problem: unbalanced <url> blocks');
  process.exit(1);
}

if (stale.length === 0) {
  console.log(`sitemap lastmod OK: ${blocks} urls checked, ${skipped} skipped (no local file)`);
  process.exit(0);
}

console.log(`sitemap lastmod stale: ${stale.length} of ${blocks} urls`);
for (const entry of stale.slice(0, 15)) {
  console.log(`  ${entry.url.replace(SITE_ORIGIN, '/')}  ${entry.from} -> ${entry.to}`);
}
if (stale.length > 15) console.log(`  ... and ${stale.length - 15} more`);

if (!write) {
  console.error('Run with --write to update sitemap.xml');
  process.exit(1);
}

fs.writeFileSync(SITEMAP, updated, 'utf8');
console.log(`sitemap.xml updated (${stale.length} lastmod values refreshed)`);
