import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const filePath = path.join(root, 'faq.html');
const checkOnly = process.argv.includes('--check');

const expectedQuestions = [
  'What is an industrial fluid rotary joint?',
  'Do rotary joint, rotary union, and swivel joint mean the same thing?',
  'How does a rotary joint transfer fluid while rotating?',
  'What is the difference between a fluid rotary joint and an electrical slip ring?',
  'What types of industrial equipment use rotary joints?',
  'What information is needed to select a rotary joint or request a quotation?',
  'Can Begapunk design for simultaneous maximum pressure, speed, and temperature?',
  'How many passages does my rotary joint need?',
  'Can different passages in a multi-passage rotary joint carry different media?',
  'What media have Begapunk rotary joints been used with?',
  'Can a rotary joint run dry, and when is lubrication needed?',
  'Can the port connections, mounting arrangement, and central through bore be customized?',
  "What is Begapunk's design and approval process for a custom rotary joint?",
  'Can I receive a quotation and CAD files without a complete machine drawing?',
  'What are the key requirements when installing a rotary joint?',
  'Can a rotary joint carry radial or axial loads?',
  'Which part of a rotary joint rotates, and can it rotate in both directions or oscillate?',
  'What air preparation does a compressed-air rotary joint require?',
  'What warning signs require an immediate shutdown and rotary joint inspection?',
  'What affects rotary joint service life?',
  'How does Begapunk test every fully assembled rotary joint?',
  'What does the standard 1.0 MPa leak test demonstrate, and what does it not demonstrate?',
  'How does Begapunk test for cross-port leakage?',
  'Can customers obtain inspection and traceability records for an individual unit?',
  'Can a rotary joint be repaired, and how is warranty responsibility assessed?',
  'What is the minimum order quantity, and what are the typical production lead times?',
  'How do I request an engineering review for a rotary joint application?',
];

const expectedSections = [
  'faq-basics',
  'faq-selection',
  'faq-customization',
  'faq-installation',
  'faq-testing',
  'faq-commercial',
];

const expectedRelatedLinks = new Map([
  [expectedQuestions[3], ['BP-3P-S06-0001.html', 'See the BP-3P-S06-0001 pneumatic-electric rotary union.']],
  [expectedQuestions[4], ['applications.html', 'Explore rotary joint applications by machine type.']],
  [expectedQuestions[7], ['product-comparison.html', 'Compare Begapunk models by passage count.']],
  [expectedQuestions[12], ['contact.html#inquiry-process', "Review Begapunk's inquiry and drawing-approval process."]],
  [expectedQuestions[13], ['contact.html?request=3d-step&source=faq.html#quoteForm', 'Request a 2D drawing or STEP model.']],
  [expectedQuestions[14], ['blog-rotary-joint-installation-mistakes.html#checklist', 'Use the rotary joint installation checklist.']],
  [expectedQuestions[21], ['production-inspection-testing.html#verified-test-parameters', 'Review the confirmed production leak-test parameters.']],
  [expectedQuestions[26], ['contact.html?request=application-review&source=faq.html#quoteForm', 'Request an engineering review for your rotary joint application.']],
]);

const trustRequirements = new Map([
  [expectedQuestions[1], {
    required: ['are often used interchangeably', 'varies by region, industry, and customer', 'The name alone is not a selection criterion'],
  }],
  [expectedQuestions[6], {
    required: ['must not be assumed to be available simultaneously', 'simultaneous design conditions', 'product drawing approved by both parties'],
  }],
  [expectedQuestions[9], {
    required: ['compressed air', 'additive-containing water-soluble coolants', 'hydraulic oil', 'does not mean that every model is compatible with every listed medium'],
    forbidden: [/\bsteam\b/i, /\boxygen\b/i, /\bcorrosive\b/i],
  }],
  [expectedQuestions[10], {
    required: ['does not rely on the transferred medium for continuous lubrication', 'particulate filter', 'water separator', 'oil-mist lubricator', 'select a suitable alternative configuration'],
  }],
  [expectedQuestions[13], {
    required: ['After the application review', '2D outline drawing and STEP model for virtual assembly at no additional charge for the project under review', 'do not disclose internal construction, manufacturing tolerances, or other production know-how'],
  }],
  [expectedQuestions[15], {
    required: ['incidental loads from correctly routed and independently supported hoses and cables', 'must not carry additional radial or axial machine loads'],
  }],
  [expectedQuestions[16], {
    required: ['either the shaft or the housing may rotate', 'approved angle, reversal frequency, duty cycle, and speed', 'not designed to accommodate axial reciprocating motion'],
  }],
  [expectedQuestions[17], {
    required: ['standard compressed-air configurations approved for oil-mist lubrication', 'particulate filter', 'water separator', 'oil-mist lubricator', 'Oil-free or ESD-sensitive applications require a separately reviewed configuration'],
  }],
  [expectedQuestions[20], {
    required: ['Every fully assembled rotary joint', 'passage-by-passage leak testing', 'rotated while', 'PASS or NG'],
  }],
  [expectedQuestions[21], {
    required: ['1.0 MPa', 'approximately one second', 'approximately four seconds', 'does not validate service life', 'maximum speed', 'compatibility with every medium'],
  }],
  [expectedQuestions[22], {
    required: ['all other passages remain open and unpressurized', 'does not detect cross-port leakage above the defined detection threshold under the specified test conditions'],
    forbidden: [/\bzero (?:cross[- ]passage|inter[- ]passage) leakage\b/i, /guarantee(?:s|d)? zero leakage/i],
  }],
  [expectedQuestions[23], {
    required: ['individual traceability number', 'retained for two years', 'agreed before the order', 'exclude confidential internal production information'],
  }],
  [expectedQuestions[24], {
    required: ['one year from the shipment date', 'If Begapunk confirms a covered product or manufacturing defect', 'replacement at no charge', 'costs agreed in writing for that claim'],
  }],
  [expectedQuestions[25], {
    required: ['minimum order quantity is one unit', 'approximately 20 days', 'approximately 30 days', 'formal quotation or accepted order governs the final lead time'],
  }],
]);

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function questionText($, item) {
  const question = $(item).find('.faq-question, h3').first().clone();
  question.find('svg, i, .faq-icon, .faq-toggle, .arrow').remove();
  return compact(question.text());
}

function visibleFaqEntities(source) {
  const $ = load(source, { decodeEntities: false });
  return $('.faq-item').map((_, item) => {
    const question = questionText($, item);
    const answer = compact($(item).find('.faq-answer').first().text());
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

function assertVisibleContract(source) {
  const $ = load(source, { decodeEntities: false });
  const items = $('.faq-item');
  const actualQuestions = items.map((_, item) => questionText($, item)).get();

  if (JSON.stringify(actualQuestions) !== JSON.stringify(expectedQuestions)) {
    throw new Error('faq.html: the approved 27-question set or order has changed.');
  }
  if (new Set(actualQuestions).size !== expectedQuestions.length) {
    throw new Error('faq.html: FAQ questions must be unique.');
  }
  if ($('main#main-content').length !== 1) throw new Error('faq.html: expected one main content landmark.');
  if (JSON.stringify($('.faq-section').map((_, section) => $(section).attr('id')).get()) !== JSON.stringify(expectedSections)) {
    throw new Error('faq.html: the six approved FAQ sections or their order changed.');
  }

  items.each((index, item) => {
    const number = String(index + 1).padStart(2, '0');
    const button = $(item).find('h3.faq-heading > button.faq-question').first();
    const panel = $(item).find('.faq-panel').first();
    if ($(item).attr('id') !== `faq-${number}`
        || button.attr('id') !== `faq-${number}-question`
        || button.attr('aria-controls') !== `faq-${number}-panel`
        || button.attr('aria-expanded') !== 'true'
        || button.attr('disabled') === undefined
        || panel.attr('id') !== `faq-${number}-panel`
        || panel.attr('aria-labelledby') !== `faq-${number}-question`) {
      throw new Error(`faq.html: accessible source contract is incomplete for FAQ ${number}.`);
    }
  });

  if ($('.faq-answer a').length) {
    throw new Error('faq.html: related navigation must stay outside FAQ answer text used by structured data.');
  }

  let relatedLinkCount = 0;
  for (const [question, [href, text]] of expectedRelatedLinks) {
    const item = items.filter((_, candidate) => questionText($, candidate) === question);
    const links = item.find('.faq-related-link a');
    if (links.length !== 1 || links.attr('href') !== href || compact(links.text()) !== text) {
      throw new Error(`faq.html: approved related link changed for "${question}".`);
    }
    relatedLinkCount += links.length;
  }
  if ($('.faq-related-link a').length !== relatedLinkCount || relatedLinkCount !== 8) {
    throw new Error('faq.html: expected exactly eight approved answer-level related links.');
  }

  for (const [question, requirements] of trustRequirements) {
    const item = items.filter((_, candidate) => questionText($, candidate) === question);
    const answer = compact(item.find('.faq-answer').first().text());
    for (const required of requirements.required || []) {
      if (!answer.includes(required)) throw new Error(`faq.html: trust boundary missing "${required}" for "${question}".`);
    }
    for (const forbidden of requirements.forbidden || []) {
      if (forbidden.test(answer)) throw new Error(`faq.html: forbidden overclaim detected for "${question}".`);
    }
  }
}

function assertStructuredData(source) {
  const $ = load(source, { decodeEntities: false });
  const visible = visibleFaqEntities(source);
  const faqSchemas = $('script[type="application/ld+json"]').map((_, element) => {
    const data = JSON.parse($(element).html());
    return data?.['@type'] === 'FAQPage' ? data : null;
  }).get().filter(Boolean);
  if (faqSchemas.length !== 1) throw new Error(`faq.html: expected one FAQPage JSON-LD block, found ${faqSchemas.length}.`);
  const structured = faqSchemas[0].mainEntity || [];
  if (JSON.stringify(structured) !== JSON.stringify(visible)) {
    throw new Error('faq.html: FAQPage JSON-LD must match all 27 visible questions and factual answers exactly and in order.');
  }
}

const before = await fs.readFile(filePath, 'utf8');
assertVisibleContract(before);
const desired = synchronizeFaqJsonLd(before);
assertVisibleContract(desired);
assertStructuredData(desired);

if (checkOnly) {
  if (desired !== before) throw new Error('faq.html: run npm run faq-trust:sync to synchronize FAQPage structured data.');
  console.log('FAQ trust boundaries, eight related links, and 27 structured answers are synchronized.');
} else if (desired !== before) {
  await fs.writeFile(filePath, desired, 'utf8');
  console.log('Synchronized FAQPage structured data for 27 approved questions.');
} else {
  console.log('FAQ trust content already synchronized; 0 files changed.');
}
