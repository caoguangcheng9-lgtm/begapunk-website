import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languageCopy = {
  en: { dir: '', home: 'Home', quality: 'Quality' },
  de: { dir: 'de', home: 'Startseite', quality: 'Qualität' },
  fr: { dir: 'fr', home: 'Accueil', quality: 'Qualité' },
  ja: { dir: 'ja', home: 'ホーム', quality: '品質管理' },
  ru: { dir: 'ru', home: 'Главная', quality: 'Качество' },
};
const languages = [config.sourceLanguage.code, ...config.activeLanguageCodes];

for (const language of languages) {
  const copy = languageCopy[language];
  if (!copy) throw new Error(`Missing quality breadcrumb copy for configured language: ${language}`);
  const file = path.join(root, copy.dir, 'manufacturing-quality.html');
  let html = await fs.readFile(file, 'utf8');
  const $ = load(html, { decodeEntities: false, sourceCodeLocationInfo: true });
  const breadcrumb = $('.mq-breadcrumb').get(0);
  if (!breadcrumb?.sourceCodeLocation) throw new Error(`${language}: visible Quality breadcrumb is missing.`);

  const prefix = language === 'en' ? '' : `${language}/`;
  const homeUrl = `https://www.begapunk.com/${prefix}`;
  const pageUrl = `https://www.begapunk.com/${prefix}manufacturing-quality.html`;
  const visible = `<div class="mq-breadcrumb"><a href="./">${copy.home}</a> / ${copy.quality}</div>`;
  html = `${html.slice(0, breadcrumb.sourceCodeLocation.startOffset)}${visible}${html.slice(breadcrumb.sourceCodeLocation.endOffset)}`;

  const refreshed = load(html, { decodeEntities: false });
  let schemaUpdated = false;
  refreshed('script[type="application/ld+json"]').each((_, element) => {
    const payload = JSON.parse(refreshed(element).html());
    const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
    const breadcrumbNode = nodes.find((node) => {
      const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
      return types.includes('BreadcrumbList');
    });
    if (!breadcrumbNode) return;
    breadcrumbNode.itemListElement = [
      { '@type': 'ListItem', position: 1, name: copy.home, item: homeUrl },
      { '@type': 'ListItem', position: 2, name: copy.quality, item: pageUrl },
    ];
    refreshed(element).html(JSON.stringify(payload));
    schemaUpdated = true;
  });
  if (!schemaUpdated) throw new Error(`${language}: BreadcrumbList JSON-LD is missing.`);
  await fs.writeFile(file, refreshed.html(), 'utf8');
}

console.log(`Manufacturing & Quality breadcrumbs synchronized across ${languages.length} languages.`);
