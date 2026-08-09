import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  'case-studies.html',
  'case-bp-2p-95-pneumatic-chuck-integration.html',
  'case-bp-3p-s06-sensor-monitored-chuck.html',
];
const invalidCaseTags = new Set(['core', 'page', 'information']);
const languages = {
  en: { dir: '', home: 'Home', applications: 'Applications', cases: 'Case Studies' },
  de: { dir: 'de', home: 'Startseite', applications: 'Anwendungen', cases: 'Fallstudien' },
  ja: { dir: 'ja', home: 'ホーム', applications: '用途別情報', cases: '選定事例' },
  ru: { dir: 'ru', home: 'Главная', applications: 'Применение', cases: 'Примеры применения' },
};

function pageUrl(language, pageName = '') {
  const prefix = language === 'en' ? '' : `${language}/`;
  return `https://www.begapunk.com/${prefix}${pageName}`;
}

function searchRecord($, pageName) {
  const body = $('body').clone();
  body.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
  return {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content')?.trim() || '',
    h1: $('h1').first().text().replace(/\s+/g, ' ').trim(),
    h2s: $('h2').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
    body: body.text().replace(/\s+/g, ' ').trim(),
    url: pageName,
  };
}

function caseSearchMetadata(record) {
  const existingTags = Array.isArray(record.tags) ? record.tags : [];
  const tags = [...existingTags, 'application', 'case study']
    .filter((tag) => typeof tag === 'string' && !invalidCaseTags.has(tag.toLowerCase()))
    .filter((tag, index, values) => values.indexOf(tag) === index);
  return { category: 'application', tags };
}

for (const [language, copy] of Object.entries(languages)) {
  const searchFile = path.join(root, copy.dir, 'search-index.json');
  const searchIndex = JSON.parse(await fs.readFile(searchFile, 'utf8'));

  for (const pageName of pages) {
    const file = path.join(root, copy.dir, pageName);
    let html = await fs.readFile(file, 'utf8');
    let $ = load(html, { decodeEntities: false, sourceCodeLocationInfo: true });
    const breadcrumb = $('.breadcrumb-bar').first().get(0);
    if (!breadcrumb?.sourceCodeLocation) throw new Error(`${language}/${pageName}: visible breadcrumb is missing.`);

    const isCenter = pageName === 'case-studies.html';
    const currentText = isCenter ? copy.cases : $('.breadcrumb-bar span').last().text().replace(/\s+/g, ' ').trim();
    const schemaCurrentText = currentText;
    if (!currentText) throw new Error(`${language}/${pageName}: current breadcrumb label is missing.`);
    const visibleParts = [
      `<a href="index.html">${copy.home}</a>`,
      `<a href="applications.html">${copy.applications}</a>`,
    ];
    if (isCenter) visibleParts.push(`<span>${copy.cases}</span>`);
    else visibleParts.push(`<a href="case-studies.html">${copy.cases}</a>`, `<span>${currentText}</span>`);
    const visible = `<div class="breadcrumb-bar"><div class="container">${visibleParts.join(' &rsaquo; ')}</div></div>`;
    html = `${html.slice(0, breadcrumb.sourceCodeLocation.startOffset)}${visible}${html.slice(breadcrumb.sourceCodeLocation.endOffset)}`;

    $ = load(html, { decodeEntities: false, sourceCodeLocationInfo: true });
    let schemaEdit;
    $('script[type="application/ld+json"]').each((_, element) => {
      if (schemaEdit) return;
      const payload = JSON.parse($(element).html());
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      const node = nodes.find((candidate) => {
        const types = Array.isArray(candidate?.['@type']) ? candidate['@type'] : [candidate?.['@type']];
        return types.includes('BreadcrumbList');
      });
      if (!node) return;
      node.itemListElement = [
        { '@type': 'ListItem', position: 1, name: copy.home, item: pageUrl(language) },
        { '@type': 'ListItem', position: 2, name: copy.applications, item: pageUrl(language, 'applications.html') },
        { '@type': 'ListItem', position: 3, name: copy.cases, item: pageUrl(language, 'case-studies.html') },
      ];
      if (!isCenter) node.itemListElement.push({ '@type': 'ListItem', position: 4, name: schemaCurrentText, item: pageUrl(language, pageName) });
      const location = element.sourceCodeLocation;
      schemaEdit = {
        start: location.startOffset,
        end: location.endOffset,
        text: `<script type="application/ld+json">${JSON.stringify(payload)}</script>`,
      };
    });
    if (!schemaEdit) throw new Error(`${language}/${pageName}: BreadcrumbList JSON-LD is missing.`);
    html = `${html.slice(0, schemaEdit.start)}${schemaEdit.text}${html.slice(schemaEdit.end)}`;
    await fs.writeFile(file, html, 'utf8');

    const finalPage = load(html, { decodeEntities: false });
    const record = searchIndex.find((entry) => entry.url === pageName);
    if (!record) throw new Error(`${language}/${pageName}: search-index record is missing.`);
    Object.assign(record, searchRecord(finalPage, pageName), caseSearchMetadata(record));
  }

  await fs.writeFile(searchFile, `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8');
}

console.log('Case-study breadcrumbs and search records synchronized across four languages.');
