import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  discoveryExcludedPageSet,
  filterDiscoveryLlms,
  filterDiscoverySearchRecords,
  filterDiscoverySitemap,
  patchDiscoveryRobotsMeta,
  publicPageUrl,
} from './discovery-exclusions.mjs';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const rootOptionIndex = args.indexOf('--root');
if (rootOptionIndex !== -1 && !args[rootOptionIndex + 1]) throw new Error('--root requires a directory path.');
const root = rootOptionIndex === -1
  ? path.resolve(import.meta.dirname, '..')
  : path.resolve(args[rootOptionIndex + 1]);
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const discoveryExcludedPages = discoveryExcludedPageSet(config);
const locales = [
  { code: config.sourceLanguage.code, directory: root },
  ...(config.activeLanguageCodes || []).map((code) => ({ code, directory: path.join(root, code) })),
];
const excludedUrls = new Set(locales.flatMap((locale) => [...discoveryExcludedPages]
  .map((pageName) => publicPageUrl(config, locale.code, pageName))));
const changed = [];

function serializeJsonWithSourceEol(value, source) {
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  return `${JSON.stringify(value, null, 2).replace(/\n/g, lineEnding)}${lineEnding}`;
}

async function synchronize(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const before = await fs.readFile(filePath, 'utf8');
  const after = await transform(before);
  if (before === after) return;
  changed.push(relativePath.replaceAll('\\', '/'));
  if (!checkOnly) await fs.writeFile(filePath, after, 'utf8');
}

for (const locale of locales) {
  for (const pageName of config.pages) {
    const relativePath = path.relative(root, path.join(locale.directory, pageName));
    await synchronize(relativePath, (html) => patchDiscoveryRobotsMeta(
      html,
      discoveryExcludedPages.has(pageName),
    ));
  }

  const indexPath = path.relative(root, path.join(locale.directory, 'search-index.json'));
  await synchronize(indexPath, (source) => {
    const records = filterDiscoverySearchRecords(JSON.parse(source), discoveryExcludedPages);
    return serializeJsonWithSourceEol(records, source);
  });

  const llmsPath = path.relative(root, path.join(locale.directory, 'llms.txt'));
  await synchronize(llmsPath, (source) => filterDiscoveryLlms(source, excludedUrls));
}

await synchronize('sitemap.xml', (source) => filterDiscoverySitemap(source, excludedUrls));
await synchronize('sitemap-i18n.xml', (source) => filterDiscoverySitemap(source, excludedUrls));

const expectedExcludedHtmlCount = discoveryExcludedPages.size * locales.length;
if (checkOnly && changed.length) {
  console.error(`Discovery-exclusion verification failed: ${changed.length} file(s) require synchronization.`);
  changed.forEach((fileName) => console.error(`- ${fileName}`));
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`Discovery exclusions are synchronized: ${discoveryExcludedPages.size} routes, ${expectedExcludedHtmlCount} localized HTML pages, four search indexes, four AI indexes, and two sitemaps.`);
} else {
  console.log(`Synchronized ${changed.length} discovery-surface file(s) for ${discoveryExcludedPages.size} routes and ${expectedExcludedHtmlCount} localized HTML pages.`);
}
