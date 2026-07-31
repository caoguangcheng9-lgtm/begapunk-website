import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const sourceDirectories = ['', 'de', 'ja', 'ru'];

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

const privacyPolicies = [
  { file: 'privacy.html', rateWindow: '15-minute', uploadLimit: '10 MB', staleClaims: ['14 months', '26 months'] },
  { file: 'de/privacy.html', rateWindow: '15-minütig', uploadLimit: '10 MB', staleClaims: ['14 Monate', '26 Monate'] },
  { file: 'ja/privacy.html', rateWindow: '15分', uploadLimit: '10 MB', staleClaims: ['14か月', '26か月', '14ヶ月', '26ヶ月'] },
  { file: 'ru/privacy.html', rateWindow: '15-минут', uploadLimit: '10 МБ', staleClaims: ['14 месяцев', '26 месяцев'] },
];
for (const policy of privacyPolicies) {
  const privacy = await readFile(path.join(repoRoot, ...policy.file.split('/')), 'utf8');
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

console.log('Source quality validation passed: consent, privacy, schema, favicon, external-link, and local dependency checks are clean.');
