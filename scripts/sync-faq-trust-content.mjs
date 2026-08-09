import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const filePath = path.join(root, 'faq.html');
const checkOnly = process.argv.includes('--check');

export const faqTrustCopy = {
  performance: 'Model ranges vary. Use the current product page and approved drawing for pressure, speed, temperature, medium, and mounting limits; requirements outside published limits need engineering review.',
  custom: 'Custom passage count, mounting, and materials can be reviewed. CAD files, drawing approval, inspection scope, price, and lead time are confirmed for the selected project and order.',
  delivery: 'Lead time and shipping terms depend on model, quantity, customization, destination, and the accepted quotation or order.',
  warranty: 'Warranty coverage and claim handling follow the accepted quotation, order, and applicable Terms; contact Begapunk with order and inspection details.',
  cad: 'STEP/IGES files may be provided for qualified projects after model and application review; format and timing are confirmed per project.',
  moq: 'Minimum order quantity is confirmed for the selected model, customization scope, and quotation or order.',
  media: 'Compatible media are model-specific. Review the current product page and approved drawing; confirm wetted materials, seal compound, pressure, temperature, viscosity, cleaning chemistry, and filtration for the selected configuration.',
  materials: 'Body, shaft, and seal materials vary by model and configuration. Use the current product page and approved drawing, and confirm any material substitution or regulated or food-contact requirement for the selected project.',
  mounting: 'Threaded and flange mounting are available on selected models. Confirm the exact interface on the current product page and approved drawing, and use flexible connections unless the approved installation specifies otherwise.',
  causes: 'Potential contributors to early leakage include rigid piping, misalignment or side load, contamination, operation outside approved limits, and unsuitable anti-rotation. Review the approved installation and inspection procedure.',
  repair: 'Repairability and seal-kit availability depend on the model and its condition. Contact Begapunk with the model, serial or order details, operating conditions, and inspection findings before repair.',
  filtration: 'Filtration requirements are model- and medium-specific. Confirm the required grade for the selected configuration; a clean supply helps reduce abrasive wear.',
};

const answerByQuestion = new Map([
  ['What media can pass through a Begapunk rotary joint?', faqTrustCopy.media],
  ['What is the maximum pressure and speed?', faqTrustCopy.performance],
  ['What materials are used in Begapunk rotary joints?', faqTrustCopy.materials],
  ['Do you offer custom rotary joint designs?', faqTrustCopy.custom],
  ['What is the minimum order quantity (MOQ)?', faqTrustCopy.moq],
  ['How long is delivery?', faqTrustCopy.delivery],
  ['What warranty do you offer?', faqTrustCopy.warranty],
  ['Do you provide 3D CAD files?', faqTrustCopy.cad],
  ['What mounting types are available?', faqTrustCopy.mounting],
  ['What causes early rotary joint failure?', faqTrustCopy.causes],
  ['Can rotary joints be rebuilt or repaired?', faqTrustCopy.repair],
  ['What filtration is required?', faqTrustCopy.filtration],
]);

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function questionText($, item) {
  const question = $(item).find('.faq-question, h3').first().clone();
  question.find('svg, i, .faq-icon, .faq-toggle, .arrow').remove();
  return compact(question.text());
}

function visibleFaqEntities(source) {
  const $ = load(source, { decodeEntities: false });
  return $('.faq-item, .app-faq-item').map((_, item) => {
    const question = questionText($, item);
    const answer = compact($(item).find('.faq-answer, p').first().text());
    if (!question || !answer) return null;
    return {
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    };
  }).get().filter(Boolean);
}

function replaceRanges(source, replacements) {
  return [...replacements]
    .sort((left, right) => right.start - left.start)
    .reduce((value, replacement) => (
      `${value.slice(0, replacement.start)}${replacement.text}${value.slice(replacement.end)}`
    ), source);
}

function synchronizeVisibleAnswers(source) {
  const $ = load(source, { decodeEntities: false, sourceCodeLocationInfo: true });
  const replacements = [];

  for (const [question, answer] of answerByQuestion) {
    const matches = $('.faq-item').filter((_, item) => questionText($, item) === question);
    if (matches.length !== 1) throw new Error(`faq.html: expected one visible FAQ item for "${question}", found ${matches.length}.`);
    const answerNode = matches.find('.faq-answer').first()[0];
    const location = answerNode?.sourceCodeLocation;
    if (!location?.startTag || !location?.endTag) throw new Error(`faq.html: missing source location for "${question}".`);
    replacements.push({
      start: location.startTag.endOffset,
      end: location.endTag.startOffset,
      text: `\n\n <p>${escapeHtml(answer)}</p>\n\n `,
    });
  }

  return replaceRanges(source, replacements);
}

function synchronizeFaqJsonLd(source) {
  const entities = visibleFaqEntities(source);
  const $ = load(source, { decodeEntities: false, sourceCodeLocationInfo: true });
  const matches = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    let data;
    try {
      data = JSON.parse($(element).html());
    } catch (error) {
      throw new Error(`faq.html: invalid JSON-LD (${error.message}).`);
    }
    if (data?.['@type'] !== 'FAQPage') return;
    const location = element.sourceCodeLocation;
    if (!location?.startTag || !location?.endTag) throw new Error('faq.html: FAQPage JSON-LD has no source location.');
    matches.push({ data, location });
  });

  if (matches.length !== 1) throw new Error(`faq.html: expected one FAQPage JSON-LD block, found ${matches.length}.`);
  const [{ data, location }] = matches;
  const synchronized = { ...data, mainEntity: entities };
  return replaceRanges(source, [{
    start: location.startTag.endOffset,
    end: location.endTag.startOffset,
    text: JSON.stringify(synchronized),
  }]);
}

function buildDesired(source) {
  return synchronizeFaqJsonLd(synchronizeVisibleAnswers(source));
}

function assertSynchronized(source) {
  const $ = load(source, { decodeEntities: false });
  for (const [question, answer] of answerByQuestion) {
    const matches = $('.faq-item').filter((_, item) => questionText($, item) === question);
    if (matches.length !== 1 || compact(matches.find('.faq-answer').first().text()) !== answer) {
      throw new Error(`faq.html: trust-bounded visible answer is not synchronized for "${question}".`);
    }
  }

  const visible = visibleFaqEntities(source);
  const faqSchemas = $('script[type="application/ld+json"]').map((_, element) => {
    const data = JSON.parse($(element).html());
    return data?.['@type'] === 'FAQPage' ? data : null;
  }).get().filter(Boolean);
  if (faqSchemas.length !== 1) throw new Error(`faq.html: expected one FAQPage JSON-LD block, found ${faqSchemas.length}.`);
  const structured = faqSchemas[0].mainEntity || [];
  if (JSON.stringify(structured) !== JSON.stringify(visible)) {
    throw new Error('faq.html: FAQPage JSON-LD must match all visible FAQ questions and answers exactly and in order.');
  }
}

const before = await fs.readFile(filePath, 'utf8');
const desired = buildDesired(before);
assertSynchronized(desired);

if (checkOnly) {
  if (desired !== before) throw new Error('faq.html: run npm run faq-trust:sync to synchronize approved FAQ trust boundaries.');
  console.log(`FAQ trust content and ${visibleFaqEntities(before).length} structured answers are synchronized.`);
} else if (desired !== before) {
  await fs.writeFile(filePath, desired, 'utf8');
  console.log(`Synchronized FAQ trust content and ${visibleFaqEntities(desired).length} structured answers.`);
} else {
  console.log('FAQ trust content already synchronized; 0 files changed.');
}
