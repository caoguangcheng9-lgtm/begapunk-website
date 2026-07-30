import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [, , baseRef, headRef = 'HEAD', outputFile] = process.argv;
if (!baseRef || !outputFile) {
  console.error('Usage: node scripts/prepare-indexnow-urls.mjs <base-ref|--all> <head-ref> <output-file>');
  process.exit(2);
}

const siteOrigin = 'https://www.begapunk.com';
const repoRoot = process.cwd();
const urls = new Set();

async function addPublicPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized === '404.html') return;

  if (/^(?:de|ja|ru)\/index\.html$/i.test(normalized)) {
    urls.add(`${siteOrigin}/${normalized.split('/')[0]}/`);
    return;
  }
  if (normalized === 'index.html') {
    urls.add(`${siteOrigin}/`);
    return;
  }
  if (/^(?:de|ja|ru)\/.*\.html$/i.test(normalized) || /^[^/]+\.html$/i.test(normalized)) {
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
    urls.add(`${siteOrigin}/${normalized}`);
  }
}

async function addAllSitemapUrls() {
  for (const sitemap of ['sitemap.xml', 'sitemap-i18n.xml']) {
    const xml = await readFile(path.join(repoRoot, sitemap), 'utf8');
    for (const match of xml.matchAll(/<loc>(https:\/\/www\.begapunk\.com\/[^<]*)<\/loc>/g)) {
      urls.add(match[1].trim());
    }
  }
}

if (baseRef === '--all') {
  await addAllSitemapUrls();
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
}

const sorted = [...urls].sort((left, right) => left.localeCompare(right, 'en'));
if (sorted.length > 10_000) throw new Error(`IndexNow URL count exceeds protocol limit: ${sorted.length}`);
await writeFile(outputFile, sorted.length ? `${sorted.join('\n')}\n` : '', 'utf8');
console.log(`Prepared ${sorted.length} IndexNow URL notification(s).`);
