import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const config = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languages = [
  { code: 'en', directory: '' },
  ...config.activeLanguageCodes.map((code) => ({ code, directory: code })),
];

const applicationOverviewRules = [
  '.app-hero',
  '.app-hero .breadcrumb',
  '.app-hero .breadcrumb a',
  '.app-hero h1',
  '.app-hero p',
  '.app-hero-actions',
];

const blogHeroRules = [
  '.blog-hero',
  '.blog-hero h1',
  '.blog-hero .meta',
  '.blog-hero .meta span',
];

const changedStylesheets = new Map([
  ['case-studies.css', '20260817-case-bundle1'],
  ['application-case.css', '20260814-hero1'],
  ['manufacturing-quality.css', '20260814-hero1'],
  ['production-inspection-testing.css', '20260814-hero1'],
  ['contact-rfq.css', '20260822-anchor1'],
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeInlineRules(html, selectors) {
  let next = html;
  for (const selector of selectors) {
    const pattern = new RegExp(`^[ \\t]*${escapeRegExp(selector)}[ \\t]*\\{[^{}\\r\\n]*\\}[ \\t]*\\r?\\n?`, 'gm');
    next = next.replace(pattern, '');
  }
  return next;
}

function updateStylesheetVersions(html) {
  let next = html;
  for (const [stylesheet, version] of changedStylesheets) {
    const pattern = new RegExp(`((?:\\.\\./)?css/${escapeRegExp(stylesheet)})(?:\\?[^"']*)?`, 'g');
    next = next.replace(pattern, `$1?v=${version}`);
  }
  return next;
}

const changed = [];
for (const language of languages) {
  for (const route of config.pages) {
    const relativePath = language.directory ? path.join(language.directory, route) : route;
    const absolutePath = path.join(root, relativePath);
    const current = fs.readFileSync(absolutePath, 'utf8');
    let next = updateStylesheetVersions(current);

    if (route === 'applications.html') {
      next = removeInlineRules(next, applicationOverviewRules);
    }
    if (route.startsWith('blog-')) {
      next = removeInlineRules(next, blogHeroRules);
    }

    if (next !== current) {
      changed.push(relativePath.replaceAll('\\', '/'));
      if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');
    }
  }
}

if (checkOnly && changed.length > 0) {
  throw new Error(`Page-hero synchronization required for ${changed.length} file(s):\n${changed.join('\n')}`);
}

console.log(checkOnly
  ? `Page-hero sync check passed: ${config.pages.length * languages.length} localized pages are synchronized.`
  : `Page-hero sync complete: ${changed.length} file(s) changed.`);
