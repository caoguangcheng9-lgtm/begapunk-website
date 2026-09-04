import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { SITE_SEARCH_SCRIPT_VERSION } from './lib/site-asset-versions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const config = JSON.parse(await readFile(path.join(repoRoot, 'i18n', 'config.json'), 'utf8'));
const activeLanguageCodes = config.activeLanguageCodes || [];
const sourceDirectories = ['', ...activeLanguageCodes];

function collectJsonLd($, relative) {
  const values = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    try {
      values.push(JSON.parse($(element).html() || ''));
    } catch (error) {
      failures.push(`${relative}: invalid JSON-LD block ${index + 1} (${error.message})`);
    }
  });
  return values;
}

function walkJson(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walkJson(item, visit);
    return;
  }
  for (const child of Object.values(value)) walkJson(child, visit);
}

for (const directory of sourceDirectories) {
  const absoluteDirectory = path.join(repoRoot, directory);
  const fileNames = (await readdir(absoluteDirectory)).filter((fileName) => fileName.endsWith('.html'));
  for (const fileName of fileNames) {
    const relative = directory ? `${directory}/${fileName}` : fileName;
    const source = await readFile(path.join(absoluteDirectory, fileName), 'utf8');
    const $ = load(source);

    const main = $('main');
    if (main.length !== 1) failures.push(`${relative}: expected exactly one main landmark (found ${main.length})`);
    if ($('h1').length !== 1) failures.push(`${relative}: expected exactly one h1 (found ${$('h1').length})`);

    $('a[target="_blank"]').each((_, element) => {
      const tokens = new Set(String($(element).attr('rel') || '').toLowerCase().split(/\s+/).filter(Boolean));
      if (!tokens.has('noopener') || !tokens.has('noreferrer')) {
        failures.push(`${relative}: target="_blank" link must include rel="noopener noreferrer" (${($(element).attr('href') || '').slice(0, 120)})`);
      }
    });

    const faviconCount = $('link[rel]').filter((_, element) => {
      const rel = String($(element).attr('rel') || '').toLowerCase().trim();
      return rel === 'icon' || rel === 'shortcut icon';
    }).length;
    if (faviconCount > 1) failures.push(`${relative}: duplicate favicon declarations (${faviconCount})`);

    if ($('#cookieBar, #cookieAccept, .cookie-bar').length || /\bcookiesAccepted\b/.test(source)) {
      failures.push(`${relative}: legacy duplicate cookie consent system is still present`);
    }

    for (const jsonLd of collectJsonLd($, relative)) {
      walkJson(jsonLd, (node) => {
        if (Object.hasOwn(node, 'founders')) failures.push(`${relative}: use Schema.org founder, not founders`);
        if (node['@type'] === 'Organization' && node.founder) {
          const founders = Array.isArray(node.founder) ? node.founder : [node.founder];
          if (founders.some((founder) => founder?.['@type'] !== 'Person' || !founder?.name)) {
            failures.push(`${relative}: Organization founder must be a named Person`);
          }
        }
      });
    }
  }
}

const searchScript = await readFile(path.join(repoRoot, 'js', 'search.js'), 'utf8');
if (/https?:\/\/[^'"\s]*fuse/i.test(searchScript)) failures.push('js/search.js: Fuse.js must not load from a remote CDN');
if (!/vendor\/fuse\.min\.js/.test(searchScript)) failures.push('js/search.js: local Fuse.js asset is not configured');
await access(path.join(repoRoot, 'js', 'vendor', 'fuse.min.js')).catch(() => failures.push('js/vendor/fuse.min.js: local Fuse.js asset is missing'));

if (!/document\.documentElement\.lang/.test(searchScript)) {
  failures.push('js/search.js: dynamic search copy must follow the page language');
}
const searchUiContracts = [
  {
    language: 'en',
    page: 'search.html',
    required: ['Product', 'Application', 'Blog', 'Page', 'Enter a search term above', '% match', 'Search is temporarily unavailable.'],
  },
  {
    language: 'de',
    page: 'de/search.html',
    required: ['Produkt', 'Anwendung', 'Fachbeitrag', 'Seite', 'Geben Sie oben einen Suchbegriff ein.', 'Übereinstimmung', 'Die Suche ist vorübergehend nicht verfügbar.'],
  },
  {
    language: 'fr',
    page: 'fr/search.html',
    required: ['Produit', 'Application', 'Article', 'Page', 'Saisissez un terme de recherche ci-dessus.', 'résultat', 'pour « ', 'Pertinence :', 'La recherche est temporairement indisponible.'],
  },
  {
    language: 'ja',
    page: 'ja/search.html',
    required: ['製品', '用途', '技術記事', 'ページ', '上の入力欄に検索キーワードを入力してください。', '一致度', '現在、検索を利用できません。'],
  },
  {
    language: 'ru',
    page: 'ru/search.html',
    required: ['Изделие', 'Применение', 'Статья', 'Страница', 'Введите запрос в поле выше.', 'Совпадение:', 'Поиск временно недоступен.'],
  },
];
const expectedSearchUiLanguages = ['en', ...activeLanguageCodes].sort();
const actualSearchUiLanguages = searchUiContracts.map(({ language }) => language).sort();
if (JSON.stringify(actualSearchUiLanguages) !== JSON.stringify(expectedSearchUiLanguages)) {
  failures.push(`Search UI contracts must exactly cover active languages (${expectedSearchUiLanguages.join(', ')}).`);
}
for (const contract of searchUiContracts) {
  for (const text of contract.required) {
    if (!searchScript.includes(text)) failures.push(`js/search.js: missing ${contract.language} dynamic search copy (${text})`);
  }
  let pageSource;
  try {
    pageSource = await readFile(path.join(repoRoot, ...contract.page.split('/')), 'utf8');
  } catch (error) {
    failures.push(`${contract.page}: cannot be read (${error.message})`);
    continue;
  }
  const $search = load(pageSource);
  if ($search('html').attr('lang') !== contract.language) {
    failures.push(`${contract.page}: html lang must be ${contract.language} for dynamic search localization`);
  }
  const assetPrefix = contract.page.includes('/') ? '../' : '';
  const expectedSearchScript = `${assetPrefix}js/search.js?v=${SITE_SEARCH_SCRIPT_VERSION}`;
  if ($search(`script[src="${expectedSearchScript}"]`).length !== 1) {
    failures.push(`${contract.page}: expected one cache-busted shared search script (${expectedSearchScript})`);
  }
}

const privacyPolicies = [
  { file: 'privacy.html', rateWindow: '15-minute', uploadLimit: '10 MB', staleClaims: ['14 months', '26 months'] },
  { file: 'de/privacy.html', rateWindow: '15-minütig', uploadLimit: '10 MB', staleClaims: ['14 Monate', '26 Monate'] },
  { file: 'fr/privacy.html', rateWindow: '15 minutes', uploadLimit: '10 Mo', staleClaims: ['14 mois', '26 mois'] },
  { file: 'ja/privacy.html', rateWindow: '15分', uploadLimit: '10 MB', staleClaims: ['14か月', '26か月', '14ヶ月', '26ヶ月'] },
  { file: 'ru/privacy.html', rateWindow: '15-минут', uploadLimit: '10 МБ', staleClaims: ['14 месяцев', '26 месяцев'] },
];
const expectedPrivacyLanguages = ['en', ...activeLanguageCodes].sort();
const actualPrivacyLanguages = privacyPolicies.map(({ file }) => file.includes('/') ? file.split('/')[0] : 'en').sort();
if (JSON.stringify(actualPrivacyLanguages) !== JSON.stringify(expectedPrivacyLanguages)) {
  failures.push(`Privacy contracts must exactly cover active languages (${expectedPrivacyLanguages.join(', ')}).`);
}
for (const policy of privacyPolicies) {
  let privacy;
  try {
    privacy = await readFile(path.join(repoRoot, ...policy.file.split('/')), 'utf8');
  } catch (error) {
    failures.push(`${policy.file}: cannot be read (${error.message})`);
    continue;
  }
  for (const staleClaim of ['FormBold', ...policy.staleClaims]) {
    if (privacy.includes(staleClaim)) failures.push(`${policy.file}: stale implementation claim remains (${staleClaim})`);
  }
  for (const requiredDetail of [
    'begapunk_cookie_consent',
    'localStorage',
    'PHPMailer',
    'SMTP',
    'GA4',
    policy.rateWindow,
    policy.uploadLimit,
  ]) {
    if (!privacy.includes(requiredDetail)) failures.push(`${policy.file}: missing implementation detail (${requiredDetail})`);
  }
}

if (failures.length) {
  console.error(`Source quality validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Source quality validation passed: landmarks, consent, privacy, schema, favicon, external-link, and local dependency checks are clean.');
