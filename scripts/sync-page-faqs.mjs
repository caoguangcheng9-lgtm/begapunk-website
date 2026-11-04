import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { localizedPageFaqManifest } from './lib/page-faq-localization.mjs';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const sourceManifest = JSON.parse(await readFile(path.join(root, 'data/page-faq.en.json'), 'utf8'));
const language = process.argv.find(arg => arg.startsWith('--locale='))?.split('=')[1] || 'en';
const manifest = await localizedPageFaqManifest(root, sourceManifest, language);
const pageRoot = path.join(root, language === 'en' ? '' : language);
const outputRoot = process.env.I18N_OUTPUT_ROOT ? path.resolve(process.env.I18N_OUTPUT_ROOT) : root;
const targetRoot = path.join(outputRoot, language === 'en' ? '' : language);
const startMarker = '<!-- PAGE-FAQ:START -->';
const endMarker = '<!-- PAGE-FAQ:END -->';
const blockPattern = /<!-- PAGE-FAQ:START -->[\s\S]*?<!-- PAGE-FAQ:END -->/g;
const stylePattern = /<style id="page-faq-style">[\s\S]*?<\/style>/g;
const style = `<style id="page-faq-style">
.embedded-faq .container{max-width:960px}
.embedded-faq .section-title{text-align:left;margin-bottom:24px}
.embedded-faq-item{border-bottom:1px solid var(--border,#e2e8f0);padding:0;background:var(--bg,#fff)}
.embedded-faq-item:first-child{border-top:1px solid var(--border,#e2e8f0)}
.embedded-faq-item summary{display:flex;align-items:center;justify-content:space-between;gap:20px;cursor:pointer;list-style:none;padding:20px 4px;font-weight:600;color:var(--dark,#0f172a);line-height:1.6;overflow-wrap:anywhere}
.embedded-faq-item summary::-webkit-details-marker{display:none}
.embedded-faq-item summary::after{content:'+';flex:none;font-size:1.4rem;color:var(--primary,#ea580c)}
.embedded-faq-item[open] summary::after{content:'−'}
.embedded-faq-item summary:focus-visible{outline:3px solid var(--primary,#ea580c);outline-offset:3px}
.embedded-faq-answer,.embedded-faq-links{margin:0 4px 20px;line-height:1.8;overflow-wrap:anywhere}
.embedded-faq-answer p{margin:0}
.embedded-faq-links{display:flex;flex-wrap:wrap;gap:10px 24px;font-weight:600}
.embedded-faq-links a{display:inline-flex;align-items:center;min-height:44px;text-decoration:underline;text-underline-offset:3px}
</style>`;

function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function compact(value) { return String(value).replace(/\s+/g, ' ').trim(); }
function replaceAt(source, start, end, text) { return source.slice(0, start) + text + source.slice(end); }
function render(page) {
  const items = page.items.map((item, index) => {
    const id = item.sourceIds.length ? `question-${item.sourceIds.map(id => `q${id}`).join('-')}` : `question-existing-${index + 1}`;
    const links = item.links?.length
      ? `\n     <p class="embedded-faq-links">${item.links.map(([href, label]) => `<a href="${escape(href)}">${escape(label)}</a>`).join('')}</p>` : '';
    return `    <details class="embedded-faq-item" id="${id}"${index === 0 ? ' open' : ''}>
     <summary>${escape(item.question)}</summary>
     <div class="embedded-faq-answer"><p>${escape(item.answer)}</p></div>${links}
    </details>`;
  }).join('\n');
  return `${startMarker}
<section class="section embedded-faq" aria-labelledby="page-faq-heading">
 <div class="container">
  <h2 class="section-title" id="page-faq-heading">${escape(page.heading)}</h2>
  <div class="embedded-faq-list">
${items}
  </div>
 </div>
</section>
${endMarker}`;
}

function placeBlock(source, page, block) {
  const oldBlocks = [...source.matchAll(blockPattern)];
  if (oldBlocks.length > 1) throw new Error(`${page.file}: duplicate managed FAQ sections`);
  if (oldBlocks.length === 1) return source.replace(blockPattern, () => block);
  const $ = load(source, { sourceCodeLocationInfo: true });
  let target;
  if (page.placement === 'replace-application-faq') {
    target = $('.app-faq-list').closest('section');
    if (target.length !== 1) throw new Error(`${page.file}: expected one existing application FAQ section`);
    const location = target[0].sourceCodeLocation;
    return replaceAt(source, location.startOffset, location.endOffset, block);
  }
  if (page.placement === 'after-article') {
    target = $('article.blog-content');
    if (target.length !== 1) throw new Error(`${page.file}: expected one article`);
    const offset = target[0].sourceCodeLocation.endOffset;
    return replaceAt(source, offset, offset, '\n\n' + block);
  }
  target = page.placement === 'before-about-cta' ? $('main .cta-section') : $('main');
  if (target.length !== 1) throw new Error(`${page.file}: ambiguous FAQ insertion point`);
  const location = target[0].sourceCodeLocation;
  const offset = page.placement === 'before-about-cta' ? location.startOffset : location.endTag.startOffset;
  return replaceAt(source, offset, offset, block + '\n\n');
}

function schemaFromVisible(source) {
  const $ = load(source);
  return $('.embedded-faq-item, .app-faq-item, .faq-item').map((_, item) => {
    const question = $(item).find('summary, .faq-question, h3').first().clone();
    question.find('[aria-hidden="true"], .arrow, .icon').remove();
    const answer = $(item).find('.embedded-faq-answer, .faq-answer').first();
    const text = compact(answer.length ? answer.text() : $(item).children('p').text());
    const name = compact(question.text());
    if (!name || !text) throw new Error('Visible FAQ has an empty question or answer');
    return { '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } };
  }).get();
}

function synchronizeSchema(source) {
  const mainEntity = schemaFromVisible(source);
  let replaced = false;
  function visit(node) {
    if (Array.isArray(node)) return node.map(visit).filter(Boolean);
    if (!node || typeof node !== 'object') return node;
    if (node['@type'] === 'FAQPage') {
      if (replaced) return null;
      replaced = true;
      return { ...node, ...(language === 'en' ? {} : { inLanguage: language }), mainEntity };
    }
    if (node['@graph']) return { ...node, '@graph': visit(node['@graph']) };
    return node;
  }
  let next = source.replace(/<script\b([^>]*type=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, raw) => {
    const data = JSON.parse(raw);
    const updated = visit(data);
    if (updated === null) return '';
    if (JSON.stringify(updated) === JSON.stringify(data)) return tag;
    return `<script${attrs}>${JSON.stringify(updated).replaceAll('<', '\\u003c')}</script>`;
  });
  if (!replaced) {
    const data = { '@context': 'https://schema.org', '@type': 'FAQPage', ...(language === 'en' ? {} : { inLanguage: language }), mainEntity };
    next = next.replace('</head>', `<script type="application/ld+json" id="page-faq-schema">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>\n</head>`);
  }
  return next;
}

const expectedIds = [1,2,3,4,16,17,18,19,20,21,22,23,24,25,41,42,44,45,47,49,51,53,55,64,65,66,67,79,80,81,82,104,105,106,107,108,119,120,121,122,123];
const actualIds = [...manifest.pages.flatMap(page => page.items.flatMap(item => item.sourceIds)), ...manifest.reused.map(item => item.sourceId), ...manifest.held.map(item => item.sourceId)].sort((a,b) => a-b);
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) throw new Error('All 41 source questions must have exactly one disposition');

let changed = 0;
const editorialMappings = new Map();
for (const page of manifest.pages) {
  const file = path.join(checkOnly ? targetRoot : pageRoot, page.file);
  const before = await readFile(file, 'utf8');
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const normalizeEol = text => text.replace(/\r\n|\r|\n/g, eol);
  let next = placeBlock(before, page, normalizeEol(render(page)));
  if (stylePattern.test(next)) next = next.replace(stylePattern, () => normalizeEol(style));
  else next = next.replace('</head>', normalizeEol(style) + eol + '</head>');
  next = synchronizeSchema(next);
  const $ = load(next);
  if ($('main').length !== 1 || $('h1').length !== 1 || $('main .embedded-faq').length !== 1) throw new Error(`${page.file}: invalid page landmarks`);
  const questions = schemaFromVisible(next).map(item => item.name);
  if (new Set(questions).size !== questions.length) throw new Error(`${page.file}: duplicate FAQ question`);
  if ($('.embedded-faq-item').length !== page.items.length) throw new Error(`${page.file}: FAQ count mismatch`);
  for (const item of page.items) {
    for (const [href] of item.links || []) {
      const [relative, anchor] = href.split('#');
      const target = await readFile(path.join(pageRoot, relative.split('?')[0]), 'utf8');
      if (anchor && load(target)(`[id="${anchor}"]`).length !== 1) throw new Error(`${page.file}: missing anchor ${href}`);
    }
  }
  if (language !== 'en') {
    const source = load(await readFile(path.join(root, page.file), 'utf8'));
    const selectors = '.embedded-faq h2, .embedded-faq summary, .embedded-faq p';
    const sourceRecords = source(selectors).map((_, el) => source(el).html().trim()).get();
    const targetRecords = $(selectors).map((_, el) => $(el).html().trim()).get();
    if (sourceRecords.length !== targetRecords.length) throw new Error(`${language}/${page.file}: translation record count mismatch`);
    editorialMappings.set(page.file, new Map(sourceRecords.map((record, i) => [record, targetRecords[i]])));
  }
  if (next !== before) {
    changed++;
    if (!checkOnly) {
      await mkdir(targetRoot, { recursive: true });
      await writeFile(path.join(targetRoot, page.file), next, 'utf8');
    }
    else console.error(`${page.file}: FAQ content, style or schema needs synchronization`);
  } else if (!checkOnly && targetRoot !== pageRoot) {
    await mkdir(targetRoot, { recursive: true });
    await writeFile(path.join(targetRoot, page.file), next, 'utf8');
  }
}
if (language !== 'en') {
  const relative = `i18n/editorial/${language}.json`;
  const before = await readFile(path.join(checkOnly ? outputRoot : root, relative), 'utf8');
  const editorial = JSON.parse(before);
  const catalog = JSON.parse(await readFile(path.join(root, 'i18n/source-catalog.json'), 'utf8'));
  let count = 0;
  for (const entry of catalog.entries) {
    for (const page of entry.pages) {
      const translated = editorialMappings.get(page)?.get(entry.source);
      if (translated === undefined) continue;
      editorial[page] ||= {};
      if (editorial[page][entry.id] !== translated) {
        if (checkOnly) throw new Error(`${language}/${page}: FAQ translation memory out of date (${entry.id})`);
        editorial[page][entry.id] = translated;
      }
      count++;
    }
  }
  if (!count) throw new Error(`${language}: FAQ translation catalog mappings missing`);
  if (!checkOnly) {
    const eol = before.includes('\r\n') ? '\r\n' : '\n';
    await mkdir(path.join(outputRoot, 'i18n/editorial'), { recursive: true });
    await writeFile(path.join(outputRoot, relative), (JSON.stringify(editorial, null, 2) + '\n').replaceAll('\n', eol), 'utf8');
  }
  console.log(`${language}: ${count} FAQ translation-memory entries checked.`);
}
for (const item of manifest.reused) {
  const $ = load(await readFile(path.join(root, item.file), 'utf8'));
  if ($(`[id="${item.anchor}"] .faq-answer`).length !== 1) throw new Error(`Q${item.sourceId}: reused FAQ target missing`);
}
if (checkOnly && changed) process.exitCode = 1;
console.log(`${checkOnly ? 'Checked' : 'Synchronized'} ${manifest.pages.length} ${language} pages; ${changed} ${checkOnly ? 'pending' : 'changed'}. All 41 source questions accounted for.`);
