import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languages = [
  { code: 'en', directory: '' },
  ...config.activeLanguageCodes.map((code) => ({ code, directory: code })),
];

const softIsolationRoutes = new Set([
  'application-packaging-machinery.html',
  'application-bottle-filling-capping.html',
  'blog-rotary-joint-leaking.html',
  'application-automation-rotary-tables.html',
  'application-pneumatic-tools-hose-anti-twist.html',
  'blog-seal-replacement.html',
  'blog-threaded-vs-flange.html',
  'application-robot-end-of-arm-tooling.html',
  'blog-rotary-joint-materials.html',
]);

const changedStylesheets = new Map([
  ['case-studies.css', '20260817-case-bundle1'],
  ['application-case.css', '20260814-hero1'],
  ['manufacturing-quality.css', '20260814-hero1'],
  ['production-inspection-testing.css', '20260814-hero1'],
  ['contact-rfq.css', '20260814-hero1'],
]);

function contractFor(route) {
  if (route === 'index.html') return { family: 'home-feature', selector: '.hero-deublin' };
  if (/^BP-[A-Z0-9-]+\.html$/i.test(route)) return { family: 'product-detail', selector: '.pd-info' };
  if (route === 'search.html') return { family: 'search-utility', selector: '.search-hero' };
  if (route === '404.html') return { family: 'outcome-utility', selector: '.err-container' };
  if (route === 'thank-you.html') return { family: 'outcome-utility', selector: '.thank-you-section' };
  if (route === 'manufacturing-quality.html') return { family: 'quality-feature', selector: '.mq-hero' };
  if (route === 'production-inspection-testing.html') return { family: 'quality-feature', selector: '.pit-hero' };
  if (route === 'contact.html') return { family: 'rfq-feature', selector: '.bp-rfq-hero' };
  if (route.startsWith('case-') || route === 'case-studies.html') return { family: 'case-feature', selector: '.cs-hero' };
  if (route === 'products.html' || route === 'products-p2.html' || route === 'product-comparison.html') {
    return { family: 'standard-dark', selector: '.products-hero' };
  }
  if (route === 'applications.html' || route.startsWith('application-')) return { family: 'standard-dark', selector: '.app-hero' };
  if (route === 'blog.html' || route.startsWith('blog-')) return { family: 'standard-dark', selector: '.blog-hero' };
  if (route === 'installation.html') return { family: 'standard-dark', selector: '.install-hero' };
  if (route === 'about.html') return { family: 'standard-dark', selector: '.about-hero' };
  if (route === 'faq.html') return { family: 'standard-dark', selector: '.faq-hero' };
  if (route === 'privacy.html' || route === 'terms.html') return { family: 'standard-dark', selector: '.legal-hero' };
  throw new Error(`No page-hero contract for ${route}`);
}

const failures = [];
const familyCounts = new Map();
let checkedPages = 0;

for (const language of languages) {
  for (const route of config.pages) {
    const relativePath = language.directory ? path.join(language.directory, route) : route;
    const normalizedPath = relativePath.replaceAll('\\', '/');
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const $ = load(html);
    const contract = contractFor(route);
    const hero = $(contract.selector);
    checkedPages += 1;
    familyCounts.set(contract.family, (familyCounts.get(contract.family) ?? 0) + 1);

    if (hero.length !== 1) {
      failures.push(`${language.code}/${route}: expected one ${contract.selector}, found ${hero.length}.`);
      continue;
    }
    if (hero.find('h1').length !== 1) {
      failures.push(`${language.code}/${route}: ${contract.selector} must contain exactly one h1.`);
    }
    if ($('h1').length !== 1) {
      failures.push(`${language.code}/${route}: page must contain exactly one h1, found ${$('h1').length}.`);
    }

    if (softIsolationRoutes.has(route)) {
      if ($('.soft-isolation-hero').length !== 1 || !hero.hasClass('soft-isolation-hero')) {
        failures.push(`${language.code}/${route}: soft-isolation title must use one dedicated hero.`);
      }
    } else if ($('.soft-isolation-hero').length !== 0) {
      failures.push(`${language.code}/${route}: unexpected soft-isolation hero.`);
    }

    const inlineCss = $('style').map((_, node) => $(node).html() ?? '').get().join('\n');
    if (/\.(?:app|blog)-hero(?:\s|[.#:{>])/i.test(inlineCss)) {
      failures.push(`${language.code}/${route}: legacy inline app/blog hero CSS is not allowed.`);
    }

    const stylesheetHrefs = $('link[rel="stylesheet"]').map((_, node) => $(node).attr('href') ?? '').get();
    const sharedStylesheetHrefs = stylesheetHrefs.filter((href) => /(?:^|\/)css\/style\.css(?:\?|$)/.test(href));
    if (sharedStylesheetHrefs.length !== 1) {
      failures.push(`${language.code}/${route}: expected one shared css/style.css link, found ${sharedStylesheetHrefs.length}.`);
    }
    for (const href of stylesheetHrefs) {
      const pathname = href.split('?')[0];
      const filename = path.posix.basename(pathname);
      const expectedVersion = changedStylesheets.get(filename);
      if (expectedVersion && !href.endsWith(`${filename}?v=${expectedVersion}`)) {
        failures.push(`${language.code}/${route}: ${filename} cache key is not ${expectedVersion}.`);
      }
    }
  }
}

if (checkedPages !== config.pages.length * languages.length) {
  failures.push(`Expected ${config.pages.length * languages.length} localized pages, checked ${checkedPages}.`);
}
if (softIsolationRoutes.size * languages.length !== 36) {
  failures.push('Soft-isolation contract must cover exactly 36 localized pages.');
}

const stylesheetContracts = [
  ['css/style.css', /--page-hero-background:/, /--page-hero-title-size:/, /UNIFIED INNER-PAGE HERO SYSTEM/],
  ['css/case-studies.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/application-case.css', /padding:\s*var\(--page-hero-padding\)/],
  ['css/manufacturing-quality.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/production-inspection-testing.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/contact-rfq.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
];

for (const [relativePath, ...patterns] of stylesheetContracts) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const pattern of patterns) {
    if (!pattern.test(content)) failures.push(`${relativePath}: missing page-hero contract ${pattern}.`);
  }
}

if (failures.length > 0) {
  console.error(`Page-hero verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Page-hero verification passed: ${checkedPages} pages; ${[...familyCounts.entries()].map(([family, count]) => `${family}=${count}`).join(', ')}.`);
