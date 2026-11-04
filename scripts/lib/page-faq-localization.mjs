import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function faqItemKey(page, item, index) {
  return item.sourceIds.length ? item.sourceIds.join('+') : `${page.file.replace(/\.html$/, '')}-existing-${index + 1}`;
}

export async function localizedPageFaqManifest(root, source, language) {
  if (language === 'en') return source;
  const config = JSON.parse(await readFile(path.join(root, 'i18n/config.json'), 'utf8'));
  if (!config.activeLanguageCodes.includes(language)) throw new Error(`Unsupported FAQ language: ${language}`);
  const data = JSON.parse(await readFile(path.join(root, `i18n/manual/page-faq-${language}.json`), 'utf8'));
  const digest = createHash('sha256').update(JSON.stringify(source.pages)).digest('hex');
  if (data.language !== language || data.sourceDigest !== digest) throw new Error(`${language}: FAQ translation source is stale`);
  const keys = source.pages.flatMap(page => page.items.map((item, i) => faqItemKey(page, item, i)));
  if (JSON.stringify(Object.keys(data.items).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`${language}: missing or unexpected FAQ item`);
  const sourceLabels = [...new Set(source.pages.flatMap(p => p.items.flatMap(i => (i.links || []).map(l => l[1]))))];
  if (data.headings.length !== source.pages.length || data.links.length !== sourceLabels.length) throw new Error(`${language}: heading/link count mismatch`);
  const labels = new Map(sourceLabels.map((label, i) => [label, data.links[i]]));
  const requireText = (value, label) => {
    if (typeof value !== 'string' || !value.trim() || /[<>\uFFFD]/.test(value)) throw new Error(`${language}: invalid ${label}`);
    return value;
  };
  return { ...source, language, pages: source.pages.map((page, pageIndex) => ({
    ...page,
    heading: requireText(data.headings[pageIndex], 'heading'),
    items: page.items.map((item, index) => {
      const key = faqItemKey(page, item, index);
      const pair = data.items[key];
      if (!Array.isArray(pair) || pair.length !== 2) throw new Error(`${language}/${key}: question and answer required`);
      const [question, answer] = pair.map(value => requireText(value, key));
      const models = value => [...new Set(value.match(/BP-[A-Z0-9-]+/g) || [])].sort().join('|');
      if (models(answer) !== models(item.answer)) throw new Error(`${language}/${key}: model number mismatch`);
      return { ...item, question, answer, ...(item.links ? { links: item.links.map(([href, label]) => [href, requireText(labels.get(label), 'link')]) } : {}) };
    }),
  })) };
}
