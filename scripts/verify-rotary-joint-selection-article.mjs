import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const pageName = 'blog-rotary-joint-selection.html';
const failures = [];

const pages = [
  {
    code: 'en',
    file: pageName,
    air: /\bAir\b/i,
    pressure1: /\b1\.0 MPa\b/,
    pressure5: /\b5\.0 MPa\b/,
    speed200: /\b200 RPM\b/,
    speed80: /\b80 RPM\b/,
    liquid: /\b(?:water|coolant|hydraulic(?:-oil)?|oil)\b/i,
    customWater: /Water or coolant rotary joint/i,
    customHydraulic: /Hydraulic rotary joint/i,
  },
  {
    code: 'de',
    file: `de/${pageName}`,
    air: /Druckluft/i,
    pressure1: /1,0 MPa/,
    pressure5: /5,0 MPa/,
    speed200: /200 min⁻¹/,
    speed80: /80 min⁻¹/,
    liquid: /Wasser|Kühlschmierstoff|Hydrauliköl/i,
    customWater: /Drehdurchführung für Wasser oder Kühlschmierstoff/i,
    customHydraulic: /Hydraulische Drehdurchführung/i,
  },
  {
    code: 'ja',
    file: `ja/${pageName}`,
    air: /空気/,
    pressure1: /1\.0 MPa/,
    pressure5: /5\.0 MPa/,
    speed200: /200 min⁻¹/,
    speed80: /80 min⁻¹/,
    liquid: /水|クーラント|作動油/,
    customWater: /水・クーラント用ロータリージョイント/,
    customHydraulic: /油圧ロータリージョイント/,
  },
  {
    code: 'ru',
    file: `ru/${pageName}`,
    air: /Воздух/i,
    pressure1: /1,0 МПа/,
    pressure5: /5,0 МПа/,
    speed200: /200 об\/мин/,
    speed80: /80 об\/мин/,
    liquid: /вод|охлаждающ|гидравлическ|масл/i,
    customWater: /Соединение для воды или охлаждающей жидкости/i,
    customHydraulic: /Гидравлическое вращающееся соединение/i,
  },
];

const forbiddenPatterns = [
  /0[.,]9\s*(?:MPa|МПа)/i,
  /three months|drei Monate|3か月|три месяца/i,
  /200\s*[–-]\s*500/i,
  /500\s*[–-]\s*2[,.]?000/i,
  /Spec Is Misleading/i,
  /Water\/oil compatible[^<]*BP-2P-130-0001/i,
  /Wasser- oder ölverträgliche Ausführung[^<]*BP-2P-130-0001/i,
  /水・油対応仕様[^<]*BP-2P-130-0001/i,
  /Исполнение для воды или масла[^<]*BP-2P-130-0001/i,
];

function normalize(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const drawingFacts = JSON.parse(await readFile(path.join(root, 'data', 'product-drawing-facts.json'), 'utf8')).products;
const expectedFacts = {
  'BP-2P-95-0005': { pressure: 1, speed: 200 },
  'BP-2P-130-0001': { pressure: 5, speed: 80 },
};

for (const [model, expected] of Object.entries(expectedFacts)) {
  const product = drawingFacts[model];
  assert(product?.drawingFacts?.media?.length === 1 && product.drawingFacts.media[0] === 'air', `${model}: controlled medium must be air only`);
  assert(product?.drawingFacts?.maximumPressure?.value === expected.pressure, `${model}: controlled maximum pressure differs`);
  assert(product?.drawingFacts?.maximumSpeed?.value === expected.speed, `${model}: controlled maximum speed differs`);
}

for (const page of pages) {
  const html = await readFile(path.join(root, page.file), 'utf8');
  const $ = load(html);
  const article = $('article.blog-content');
  const articleText = normalize(article.text());
  const label = `${page.code}/${pageName}`;

  assert(article.length === 1, `${label}: expected one article.blog-content`);
  assert(article.find('h2').length === 7, `${label}: expected seven article section headings`);
  forbiddenPatterns.forEach((pattern) => assert(!pattern.test(html), `${label}: forbidden legacy claim remains (${pattern})`));

  const modelRows = new Map();
  article.find('tr').each((_, row) => {
    const text = normalize($(row).text());
    for (const model of Object.keys(expectedFacts)) {
      if (text.includes(model)) {
        if (!modelRows.has(model)) modelRows.set(model, []);
        modelRows.get(model).push(text);
      }
    }
  });

  const row95List = modelRows.get('BP-2P-95-0005') || [];
  const row130List = modelRows.get('BP-2P-130-0001') || [];
  assert(row95List.length === 1, `${label}: BP-2P-95-0005 must appear in exactly one table row`);
  assert(row130List.length === 1, `${label}: BP-2P-130-0001 must appear in exactly one table row`);

  const row95 = row95List[0] || '';
  const row130 = row130List[0] || '';
  assert(page.air.test(row95) && page.pressure1.test(row95) && page.speed200.test(row95), `${label}: BP-2P-95-0005 row must state air, 1 MPa, and 200 RPM`);
  assert(!/500/.test(row95) && !page.liquid.test(row95), `${label}: BP-2P-95-0005 row contains an unsupported speed or medium`);
  assert(page.air.test(row130) && page.pressure5.test(row130) && page.speed80.test(row130), `${label}: BP-2P-130-0001 row must state air, 5 MPa, and 80 RPM`);
  assert(!page.liquid.test(row130), `${label}: BP-2P-130-0001 row contains an unsupported liquid medium`);

  const inquiryRows = article.find('tr').map((_, row) => normalize($(row).text())).get();
  assert(inquiryRows.some((text) => page.customWater.test(text) && !/BP-2P-(?:95-0005|130-0001)/.test(text)), `${label}: custom water/coolant inquiry route is missing or tied to a standard model`);
  assert(inquiryRows.some((text) => page.customHydraulic.test(text) && !/BP-2P-(?:95-0005|130-0001)/.test(text)), `${label}: custom hydraulic inquiry route is missing or tied to a standard model`);
  assert(articleText.includes('BP-2P-95-0005') && articleText.includes('BP-2P-130-0001'), `${label}: referenced model facts are missing`);
}

if (failures.length) {
  console.error(`Rotary-joint selection article verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Rotary-joint selection article verification passed: 4 languages, 2 controlled model rows, and custom-fluid inquiry boundaries.');
