import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadPublicDownloadAllowlist } from './lib/public-downloads.mjs';
import { filterExistingNoindexUrls } from './lib/indexing-policy.mjs';

const [, , baseRef, headRef = 'HEAD', outputFile] = process.argv;
if (!baseRef || !outputFile) {
  console.error('Usage: node scripts/prepare-indexnow-urls.mjs <base-ref|--all> <head-ref> <output-file>');
  process.exit(2);
}

const siteOrigin = 'https://www.begapunk.com';
const repoRoot = process.cwd();
const urls = new Set();
const i18nConfig = JSON.parse(await readFile(path.join(repoRoot, 'i18n', 'config.json'), 'utf8'));
const partialLanguageCodes = Object.keys(i18nConfig.partialLanguagePages || {});
const deployedLanguageCodes = [...new Set([
  ...(i18nConfig.activeLanguageCodes || []),
  ...partialLanguageCodes,
])].sort();
const escapedLanguageCodes = deployedLanguageCodes
  .map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const localizedHomepagePattern = new RegExp(`^(?:${escapedLanguageCodes})/index\\.html$`, 'i');
const localizedHtmlPattern = new RegExp(`^(?:${escapedLanguageCodes})/.*\\.html$`, 'i');
const approvedDownloadPaths = new Set(
  (await loadPublicDownloadAllowlist(repoRoot)).map((fileName) => `downloads/${fileName}`),
);

async function addPublicPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized === '404.html') return;

  if (localizedHomepagePattern.test(normalized)) {
    urls.add(`${siteOrigin}/${normalized.split('/')[0]}/`);
    return;
  }
  if (normalized === 'index.html') {
    urls.add(`${siteOrigin}/`);
    return;
  }
  if (localizedHtmlPattern.test(normalized) || /^[^/]+\.html$/i.test(normalized)) {
    try {
      const html = await readFile(path.join(repoRoot, normalized), 'utf8');
      const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
      if (canonical && canonical.startsWith(`${siteOrigin}/`)) {
        urls.add(canonical);
        return;
      }
    } catch {
      // Deleted pages still need a notification using their former public URL.
    }
    urls.add(`${siteOrigin}/${normalized}`);
    return;
  }
  if (/^downloads\/[^/]+\.pdf$/i.test(normalized)) {
    if (approvedDownloadPaths.has(normalized)) urls.add(`${siteOrigin}/${normalized}`);
  }
}

async function addAllSitemapUrls() {
  for (const sitemap of [
    'sitemap.xml',
    'sitemap-i18n.xml',
    ...partialLanguageCodes.map((code) => `sitemap-${code}.xml`),
  ]) {
    const xml = await readFile(path.join(repoRoot, sitemap), 'utf8');
    for (const match of xml.matchAll(/<loc>(https:\/\/www\.begapunk\.com\/[^<]*)<\/loc>/g)) {
      urls.add(match[1].trim());
    }
  }
}

async function addRetiredUrls() {
  const retired = await readFile(path.join(repoRoot, 'ops', 'indexnow-retired-urls.txt'), 'utf8');
  for (const value of retired.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const url = new URL(value);
    const retiredPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (url.protocol !== 'https:'
      || url.hostname !== 'www.begapunk.com'
      || !retiredPath.startsWith('downloads/')
      || approvedDownloadPaths.has(retiredPath)) {
      throw new Error(`Invalid retired IndexNow URL: ${value}`);
    }
    urls.add(url.href);
  }
}

if (baseRef === '--all') {
  await addAllSitemapUrls();
  await addRetiredUrls();
} else {
  const diff = execFileSync('git', ['diff', '--name-status', '--find-renames', baseRef, headRef], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  for (const line of diff.split(/\r?\n/).filter(Boolean)) {
    const fields = line.split('\t');
    const status = fields.shift() || '';
    for (const changedPath of fields) await addPublicPath(changedPath);
    if (status.startsWith('R') && fields.length === 2) await addPublicPath(fields[0]);
  }

  if (diff.includes('ops/nginx-managed-redirects.conf')) {
    urls.add(`${siteOrigin}/3-in-3-out-Pneumatic-rotary-joint-P6776400.html`);
    urls.add(`${siteOrigin}/BP-3P-0004.html`);
  }
  if (diff.includes('ops/indexnow-extra-urls.txt')) {
    const extra = await readFile(path.join(repoRoot, 'ops', 'indexnow-extra-urls.txt'), 'utf8');
    for (const value of extra.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'www.begapunk.com') {
        throw new Error(`Invalid extra IndexNow URL: ${value}`);
      }
      const publicPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
      if (publicPath.startsWith('downloads/') && !approvedDownloadPaths.has(publicPath)) {
        throw new Error(`Refusing non-public download in IndexNow URL list: ${value}`);
      }
      urls.add(url.href);
    }
  }
  if (diff.includes('ops/indexnow-retired-urls.txt')) await addRetiredUrls();
}

const filteredUrls = await filterExistingNoindexUrls(urls, { siteOrigin, contentRoot: repoRoot });
const sorted = [...filteredUrls].sort((left, right) => left.localeCompare(right, 'en'));
if (sorted.length > 10_000) throw new Error(`IndexNow URL count exceeds protocol limit: ${sorted.length}`);
await writeFile(outputFile, sorted.length ? `${sorted.join('\n')}\n` : '', 'utf8');
console.log(`Prepared ${sorted.length} IndexNow URL notification(s).`);
