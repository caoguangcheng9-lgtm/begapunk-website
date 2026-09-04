import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  parseSitemapLastmodState,
  renderInternationalSitemaps,
  serializeSitemapLastmodState,
  SITEMAP_LASTMOD_STATE,
} from './lib/sitemap-i18n.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const writeMode = process.argv.includes('--write');
const config = JSON.parse(await fs.readFile(path.join(repoRoot, 'i18n', 'config.json'), 'utf8'));
const statePath = path.join(repoRoot, ...SITEMAP_LASTMOD_STATE.split('/'));
let previousState;
try {
  previousState = parseSitemapLastmodState(await fs.readFile(statePath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  previousState = parseSitemapLastmodState();
}

const rendered = await renderInternationalSitemaps({
  contentRoot: repoRoot,
  config,
  previousState,
});
const expectedState = serializeSitemapLastmodState(rendered.state);
const failures = [];

for (const [fileName, expected] of rendered.sitemaps) {
  const filePath = path.join(repoRoot, fileName);
  if (writeMode) {
    await fs.writeFile(filePath, expected, 'utf8');
    continue;
  }
  let current = '';
  try {
    current = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (current.replace(/\r\n?/g, '\n') !== expected) failures.push(`${fileName} is stale.`);
}

const partialLanguageCodes = new Set(Object.keys(config.partialLanguagePages || {}));
for (const language of config.languages) {
  if (partialLanguageCodes.has(language.code)) continue;
  const stalePath = path.join(repoRoot, `sitemap-${language.code}.xml`);
  if (writeMode) {
    await fs.rm(stalePath, { force: true });
  } else {
    try {
      await fs.access(stalePath);
      failures.push(`${path.basename(stalePath)} exists without an active partial-language contract.`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

if (writeMode) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, expectedState, 'utf8');
  console.log(`Synchronized ${rendered.state.pages ? Object.keys(rendered.state.pages).length : 0} content-hash-backed sitemap lastmod entries.`);
} else {
  let currentState = '';
  try {
    currentState = await fs.readFile(statePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (currentState.replace(/\r\n?/g, '\n') !== expectedState) failures.push(`${SITEMAP_LASTMOD_STATE} is stale.`);
  const controlUrl = Object.keys(rendered.state.pages)[0];
  if (controlUrl) {
    const simulatedPreviousState = JSON.parse(expectedState);
    simulatedPreviousState.pages[controlUrl].contentSha256 = '0'.repeat(64);
    const simulatedDate = '2099-12-31';
    const simulated = await renderInternationalSitemaps({
      contentRoot: repoRoot,
      config,
      previousState: simulatedPreviousState,
      currentDate: simulatedDate,
    });
    const unexpectedlyChanged = Object.entries(simulated.state.pages).filter(([url, entry]) => (
      url !== controlUrl && entry.lastmod !== rendered.state.pages[url].lastmod
    ));
    if (simulated.state.pages[controlUrl]?.lastmod !== simulatedDate || unexpectedlyChanged.length) {
      failures.push('Content-hash lastmod regression test failed: exactly the changed page must receive the new date.');
    }
  }
  if (failures.length) {
    throw new Error(`International sitemap verification failed:\n- ${failures.join('\n- ')}\nRun npm run i18n:sitemap:sync after approved page changes.`);
  }
  console.log(`International sitemap verified for ${Object.keys(rendered.state.pages).length} content-hash-backed lastmod entries.`);
}
