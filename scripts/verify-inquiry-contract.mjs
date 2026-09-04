import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import {
  drawingBackedProductMetadata,
  drawingBackedProductModels,
} from './lib/drawing-backed-product-facts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', 'config.json'), 'utf8'));
const PRODUCT_PAGE_NAMES = SITE_CONFIG.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));
const TARGET_LANGUAGES = [...(SITE_CONFIG.activeLanguageCodes || [])];
const PRODUCT_LOCALES = ['en', ...TARGET_LANGUAGES];
const DRAWING_BACKED_PRODUCT_MODELS = new Set(drawingBackedProductModels);
const CONTACT_PAGES = [
  {
    file: 'contact.html', language: 'en', basePath: '/contact.html', sending: 'Sending...',
    quantityLabel: 'Estimated Quantity (Optional)',
    quantityPlaceholder: 'e.g. 1 prototype, 10 units, or 100 units/year',
    uploadLabel: 'Drawing or Photo (Optional)',
    uploadAction: 'Choose a file',
    quoteTemplate: 'I need a quote for this model or application.',
    stepModelTemplate: 'Catalog STEP for BP-2P-0001 is on the product page. Use this form for custom CAD or other files.',
  },
  {
    file: 'fr/contact.html', language: 'fr', basePath: '/fr/contact.html', sending: 'Envoi en cours…',
    quantityLabel: 'Quantité estimée (facultatif)',
    quantityPlaceholder: 'Ex. : 1 prototype, 10 unités ou 100 unités/an',
    uploadLabel: 'Plan ou photo (facultatif)',
    uploadAction: 'Choisir un fichier',
    quoteTemplate: 'Je souhaite obtenir un devis pour ce modèle ou cette application.',
    stepModelTemplate: 'Le fichier STEP catalogue de BP-2P-0001 se trouve sur la page produit. J’utilise ce formulaire pour un fichier CAO sur mesure ou un autre format.',
  },
  {
    file: 'de/contact.html', language: 'de', basePath: '/de/contact.html', sending: 'Anfrage wird gesendet…',
    quantityLabel: 'Voraussichtliche Menge (optional)',
    quantityPlaceholder: 'z. B. 1 Muster, 10 Stück oder 100 Stück/Jahr',
    uploadLabel: 'Zeichnung oder Foto (optional)',
    uploadAction: 'Datei auswählen',
    quoteTemplate: 'Ich benötige ein Angebot für dieses Modell oder diese Anwendung.',
    stepModelTemplate: 'Katalog-STEP für BP-2P-0001 steht auf der Produktseite. Dieses Formular ist für Sonder-CAD oder andere Dateien.',
  },
  {
    file: 'ja/contact.html', language: 'ja', basePath: '/ja/contact.html', sending: '送信中…',
    quantityLabel: '予定数量（任意）',
    quantityPlaceholder: '例：試作1個、10個、年間100個',
    uploadLabel: '図面または写真（任意）',
    uploadAction: 'ファイルを選択',
    quoteTemplate: 'この型式または用途の見積もりを希望します。',
    stepModelTemplate: 'BP-2P-0001 のカタログSTEPは製品ページにあります。特注CADや他形式はこのフォームでご依頼ください。',
  },
  {
    file: 'ru/contact.html', language: 'ru', basePath: '/ru/contact.html', sending: 'Отправка запроса…',
    quantityLabel: 'Ориентировочное количество (необязательно)',
    quantityPlaceholder: 'Например: 1 образец, 10 шт. или 100 шт./год',
    uploadLabel: 'Чертёж или фото (необязательно)',
    uploadAction: 'Выбрать файл',
    quoteTemplate: 'Мне нужно предложение для этой модели или области применения.',
    stepModelTemplate: 'Каталожный STEP для BP-2P-0001 есть на странице модели. Это форма для заказного CAD или других файлов.',
  },
];
const THANK_YOU_PAGES = [
  { file: 'thank-you.html', language: 'en' },
  { file: 'fr/thank-you.html', language: 'fr' },
  { file: 'de/thank-you.html', language: 'de' },
  { file: 'ja/thank-you.html', language: 'ja' },
  { file: 'ru/thank-you.html', language: 'ru' },
];
const ATTRIBUTION_HIDDEN_FIELDS = [
  'gclid', 'gbraid', 'wbraid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'first_landing_page', 'initial_referrer',
];
const REQUIRED_HIDDEN_FIELDS = [
  'inquiry_type', 'source_model', 'source_product', 'source_page', 'source_url',
  ...ATTRIBUTION_HIDDEN_FIELDS,
];
const REQUIRED_NATIVE_FIELDS = ['email', 'requirements'];
const OPTIONAL_NATIVE_FIELDS = ['fullname', 'company', 'country', 'product'];
const REQUEST_CODE_MAP = {
  quote: 'quote',
  '3d-step': '3d_step',
  'application-review': 'application_review',
  'seal-review': 'seal_review',
  'verified-drawing': 'verified_drawing',
};
const INQUIRY_TYPE_CODE_MAP = {
  quote: 'quote',
  '3d_step': '3d_step',
  'application_review': 'application_review',
  'seal_review': 'seal_review',
  'verified_drawing': 'verified_drawing',
  'technical_consultation': 'technical_consultation',
  'technical-consultation': 'technical_consultation',
  'general_inquiry': 'general_inquiry',
  hydraulic: 'hydraulic',
};
const STABLE_CODES = new Set([
  'quote',
  '3d_step',
  'application_review',
  'seal_review',
  'verified_drawing',
  'technical_consultation',
  'general_inquiry',
  'hydraulic',
]);
const RFQ_NESTED_KEYS = Object.freeze({
  requestTemplates: [...STABLE_CODES],
  modelRequestTemplates: ['3d_step'],
  requiredFields: [...REQUIRED_NATIVE_FIELDS],
});
const RFQ_SCALAR_KEYS = Object.freeze([
  'required', 'invalidEmail', 'emailSuggestion', 'invalidFileType',
  'fileTooLarge', 'noFile', 'sending', 'success', 'serviceUnavailable', 'invalidResponse',
  'networkFailure', 'stepButton',
]);
const RFQ_PLACEHOLDER_CONTRACT = Object.freeze({
  required: ['field'],
  emailSuggestion: ['domain'],
  invalidFileType: ['ext'],
  fileTooLarge: ['size'],
});

const failures = [];
let checkCount = 0;

function check(condition, message) {
  checkCount += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function normalizedObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameObject(actual, expected) {
  return JSON.stringify(normalizedObject(actual)) === JSON.stringify(expected);
}

function sameKeys(actual, expected) {
  return [...actual].sort().join('\0') === [...expected].sort().join('\0');
}

function placeholdersIn(value) {
  return [...String(value).matchAll(/\{([a-z]+)\}/g)].map((match) => match[1]).sort();
}

function stringLeafCount(value) {
  if (typeof value === 'string') return 1;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.values(value).reduce((total, child) => total + stringLeafCount(child), 0);
}

function pageRecord(config) {
  const html = read(config.file);
  const $ = load(html);
  const inlineScripts = $('script:not([src])').toArray()
    .filter((node) => String($(node).attr('type') || '').toLowerCase() !== 'application/ld+json')
    .map((node) => $(node).html() || '');
  const script = inlineScripts.find((source) => source.includes('REQUEST_CODE_MAP')) || '';
  const rfqBlocks = $('script#contact-rfq-copy[type="application/json"]');
  let copy = null;
  if (rfqBlocks.length === 1) {
    try {
      copy = JSON.parse(rfqBlocks.first().html() || '');
    } catch {
      copy = null;
    }
  }
  return { ...config, html, $, script, rfqBlocks, copy };
}

class FakeElement {
  constructor(id, audit, initialValue = '', initialText = '') {
    this.id = id;
    this.audit = audit;
    this.value = initialValue;
    this._textContent = initialText;
    this._innerHTML = '';
    this.className = '';
    this.style = {};
    this.options = [];
    this.files = [];
    this.disabled = false;
    this.focused = false;
    this._noValidate = false;
    this.listeners = new Map();
  }

  get noValidate() {
    return this._noValidate;
  }

  set noValidate(value) {
    this._noValidate = Boolean(value);
    this.audit.push({ target: this.id, sink: 'noValidate', value: this._noValidate });
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.audit.push({ target: this.id, sink: 'textContent', value: this._textContent });
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.audit.push({ target: this.id, sink: 'innerHTML', value: this._innerHTML });
  }

  get outerHTML() {
    return this._outerHTML || '';
  }

  set outerHTML(value) {
    this._outerHTML = String(value);
    this.audit.push({ target: this.id, sink: 'outerHTML', value: this._outerHTML });
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
    this.audit.push({ target: this.id, sink: `listener:${type}` });
  }

  insertBefore(option, reference) {
    const index = reference ? this.options.indexOf(reference) : -1;
    if (index >= 0) this.options.splice(index, 0, option);
    else this.options.push(option);
    return option;
  }

  insertAdjacentHTML(position, value) {
    this.audit.push({ target: this.id, sink: 'insertAdjacentHTML', position, value: String(value) });
  }

  setAttribute(name, value) {
    this[name] = String(value);
    this.audit.push({ target: this.id, sink: `attribute:${name}`, value: String(value) });
  }

  focus() {
    this.focused = true;
    this.audit.push({ target: this.id, sink: 'focus' });
  }

  scrollIntoView() {}

  reset() {
    this.audit.push({ target: this.id, sink: 'reset', value: true });
  }
}

function initialFieldValue($, id) {
  const element = $(`#${id}`).first();
  if (!element.length) return '';
  if (element.is('textarea')) return element.text();
  if (element.is('select')) {
    const selected = element.find('option[selected]').first();
    const option = selected.length ? selected : element.find('option').first();
    return option.attr('value') || '';
  }
  return element.attr('value') || '';
}

function runPageScript(page, search, initialValues = {}, runtime = {}) {
  const audit = [];
  const fields = {};
  const submission = {
    events: [],
    fetchCalls: [],
    formDataForms: [],
    redirects: [],
  };
  const ids = [
    'mobileToggle', 'mainNav', 'quoteForm', 'formMessage', 'submitBtn', 'inquiry_type',
    'source_model', 'source_product', 'source_page', 'source_url', ...ATTRIBUTION_HIDDEN_FIELDS,
    'product', 'application', 'quantity',
    'requirements', 'fullname', 'email', 'company', 'country', 'drawing', 'drawing-name', 'thankYouRedirect', 'contact-rfq-copy',
  ];
  for (const id of ids) {
    const element = page.$(`#${id}`).first();
    fields[id] = new FakeElement(
      id,
      audit,
      Object.hasOwn(initialValues, id) ? initialValues[id] : initialFieldValue(page.$, id),
      element.length ? element.text().trim() : '',
    );
  }

  const productOptions = page.$('#product option').toArray().map((node, index) => {
    const option = new FakeElement(`product-option-${index}`, audit, page.$(node).attr('value') || '', page.$(node).text());
    option.selected = page.$(node).is('[selected]');
    return option;
  });
  fields.product.options = productOptions;
  fields.quoteForm.action = page.$('form#quoteForm').attr('action') || '';

  const header = new FakeElement('header', audit);
  const document = {
    getElementById(id) {
      return fields[id] || null;
    },
    querySelector(selector) {
      return selector === '.header' ? header : null;
    },
    createElement(tagName) {
      return new FakeElement(`created-${tagName}`, audit);
    },
    dispatchEvent(event) {
      if (runtime.throwAnalyticsEvent) {
        throw new Error('Synthetic analytics-event failure.');
      }
      submission.events.push({ type: event?.type || '', detail: normalizedObject(event?.detail) });
      return true;
    },
  };
  const pageUrl = new URL(page.file.replaceAll('\\', '/'), 'https://www.begapunk.com/');
  const location = {
    search,
    origin: pageUrl.origin,
    href: pageUrl.href,
    assign(value) {
      const target = String(value);
      submission.redirects.push(target);
      this.href = target;
    },
  };
  const window = {
    location,
    scrollY: 0,
    addEventListener() {},
  };
  if (runtime.fetchAvailable !== false) {
    window.fetch = async (url, options) => {
      submission.fetchCalls.push({ url, options });
      if (runtime.networkFailure) {
        throw new Error('Synthetic network failure.');
      }
      if (runtime.responseGate) await runtime.responseGate;
      return {
        async json() {
          if (runtime.invalidJson) {
            throw new SyntaxError('Synthetic invalid JSON.');
          }
          return runtime.response ?? { success: true, message: '' };
        },
      };
    };
  }
  if (runtime.formDataAvailable !== false) {
    window.FormData = class RecordingFormData {
      constructor(form) {
        submission.formDataForms.push(form);
        if (runtime.formDataFailure) {
          throw new Error('Synthetic FormData failure.');
        }
        this.form = form;
      }

      get(name) {
        return fields[name]?.value ?? null;
      }
    };
  }
  const sandbox = {
    window,
    document,
    URL,
    URLSearchParams,
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        if (runtime.throwAnalyticsEvent) {
          throw new Error('Synthetic analytics-event failure.');
        }
        this.type = type;
        this.detail = options?.detail;
      }
    },
    console: { log() {}, warn() {}, error() {} },
  };
  const context = vm.createContext(sandbox);
  const instrumented = `${page.script}\n;globalThis.__rfqContract = { requestMap: REQUEST_CODE_MAP, inquiryMap: INQUIRY_TYPE_CODE_MAP, copy: RFQ_COPY };`;
  new vm.Script(instrumented, { filename: page.file }).runInContext(context, { timeout: 500 });
  return {
    fields,
    audit,
    contract: normalizedObject(context.__rfqContract),
    submission,
    submitHandler: fields.quoteForm.listeners.get('submit'),
  };
}

async function runSubmitFixture(page, runtime = {}, initialValues = {}) {
  const fixture = runPageScript(page, '', {
    fullname: 'Contract Test',
    email: 'contract-test@example.com',
    company: 'Contract Test Company',
    country: 'Germany',
    product: 'BP-2P-130-0001',
    requirements: 'Synthetic validation only. Do not submit.',
    ...initialValues,
  }, runtime);
  const event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  if (typeof fixture.submitHandler === 'function') {
    await fixture.submitHandler.call(fixture.fields.quoteForm, event);
  }
  return { ...fixture, event };
}

function extractFunctionBody(source, functionName) {
  const match = new RegExp(`function\\s+${functionName}\\s*\\(`).exec(source);
  if (!match) return '';
  const start = source.indexOf('{', match.index);
  if (start < 0) return '';
  let depth = 0;
  let state = 'code';
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'single') {
      if (character === '\\') index += 1;
      else if (character === "'") state = 'code';
      continue;
    }
    if (state === 'double') {
      if (character === '\\') index += 1;
      else if (character === '"') state = 'code';
      continue;
    }
    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (character === "'") state = 'single';
    else if (character === '"') state = 'double';
    else if (character === '/' && next === '/') {
      state = 'line-comment';
      index += 1;
    } else if (character === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
    } else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  return '';
}

const pages = CONTACT_PAGES.map(pageRecord);
const manualRfqContract = JSON.parse(read('i18n/manual/contact-rfq-copy.json'));

check(manualRfqContract.schemaVersion === 1, 'contact-rfq-copy.json: schemaVersion must be 1.');
check(
  manualRfqContract.review?.method === 'AI-assisted target-market line-by-line localization review',
  'contact-rfq-copy.json: review method must retain the approved AI-assisted wording.',
);
check(
  manualRfqContract.review?.independentNativeSpeakerReview === false,
  'contact-rfq-copy.json: the review metadata must not claim independent native-speaker review.',
);
check(
  sameKeys(Object.keys(manualRfqContract.copies || {}), TARGET_LANGUAGES),
  `contact-rfq-copy.json: target copies must exactly cover active languages (${TARGET_LANGUAGES.join(', ')}).`,
);
check(
  sameKeys(CONTACT_PAGES.map(({ language }) => language), ['en', ...TARGET_LANGUAGES]),
  'Contact-page contracts must exactly cover English and every active language.',
);
check(
  sameKeys(THANK_YOU_PAGES.map(({ language }) => language), ['en', ...TARGET_LANGUAGES]),
  'Thank-you-page contracts must exactly cover English and every active language.',
);

for (const page of pages) {
  const form = page.$('form#quoteForm');
  check(form.length === 1, `${page.file}: expected exactly one form#quoteForm.`);
  check(form.attr('action') === '/send_inquiry.php', `${page.file}: form action must be /send_inquiry.php.`);
  check(String(form.attr('method') || '').toUpperCase() === 'POST', `${page.file}: form method must be POST.`);
  check(String(form.attr('enctype') || '').toLowerCase() === 'multipart/form-data', `${page.file}: form enctype must be multipart/form-data.`);
  check(form.attr('onsubmit') === undefined, `${page.file}: inline onsubmit must not block native submission.`);
  check(form.attr('novalidate') === undefined, `${page.file}: novalidate must not be present in the static HTML.`);
  check(
    page.$('input[type="hidden"][name="source_language"]').attr('value') === page.language,
    `${page.file}: source_language must be ${page.language}.`,
  );
  const thankYouRedirect = page.$('input#thankYouRedirect[type="hidden"][name="redirect"]');
  check(thankYouRedirect.length === 1, `${page.file}: the same-site thank-you redirect field is missing or duplicated.`);
  check(
    thankYouRedirect.attr('value') === new URL('thank-you.html', new URL(page.file.replaceAll('\\', '/'), 'https://www.begapunk.com/')).href,
    `${page.file}: thank-you redirect must point to the matching language directory.`,
  );
  for (const fieldName of REQUIRED_HIDDEN_FIELDS) {
    const field = page.$(`input[type="hidden"][name="${fieldName}"]`);
    check(field.length === 1, `${page.file}: hidden field ${fieldName} is missing or duplicated.`);
    check(field.attr('id') === fieldName, `${page.file}: hidden field ${fieldName} must retain its id.`);
    if (ATTRIBUTION_HIDDEN_FIELDS.includes(fieldName)) {
      check((field.attr('value') || '') === '', `${page.file}: attribution field ${fieldName} must start empty.`);
    }
  }
  check(page.$('#inquiry_type').attr('value') === 'general_inquiry', `${page.file}: inquiry_type default must be general_inquiry.`);
  check(page.$('select[name="product"]').length === 1, `${page.file}: product select is missing.`);
  check(page.$('input[name="application"]').length === 1, `${page.file}: application field is missing.`);
  check(page.$('textarea[name="requirements"]').length === 1, `${page.file}: requirements field is missing.`);
  const quantity = form.find('input#quantity[name="quantity"]');
  check(quantity.length === 1, `${page.file}: quantity field is missing or duplicated.`);
  check(String(quantity.attr('type') || '').toLowerCase() === 'text', `${page.file}: quantity must use type=text.`);
  check(quantity.attr('maxlength') === '100', `${page.file}: quantity maxlength must be 100.`);
  check(quantity.attr('required') === undefined, `${page.file}: quantity must remain optional.`);
  check(quantity.attr('disabled') === undefined, `${page.file}: quantity must remain enabled.`);
  check(quantity.attr('value') === undefined || quantity.attr('value') === '', `${page.file}: quantity must start empty.`);
  const quantityLabel = form.find('label[for="quantity"]');
  check(quantityLabel.length === 1, `${page.file}: quantity label is missing or duplicated.`);
  check(quantityLabel.text().trim() === page.quantityLabel, `${page.file}: quantity label differs from the approved copy.`);
  check(quantity.attr('placeholder') === page.quantityPlaceholder, `${page.file}: quantity placeholder differs from the approved copy.`);
  const namedControls = form.find('[name]').toArray();
  const applicationIndex = namedControls.indexOf(form.find('[name="application"]').get(0));
  const quantityIndex = namedControls.indexOf(quantity.get(0));
  const drawingIndex = namedControls.indexOf(form.find('[name="drawing"]').get(0));
  check(
    applicationIndex >= 0 && applicationIndex < quantityIndex && drawingIndex >= 0
      && form.find('.bp-rfq-optional-fields [name="application"]').length === 1
      && form.find('.bp-rfq-optional-fields [name="quantity"]').length === 1,
    `${page.file}: application and quantity must remain adjacent optional project fields.`,
  );
  check(page.$('.bp-rfq-form-head > .bp-rfq-form-kicker').length === 1, `${page.file}: RFQ form kicker must remain present.`);
  check(page.$('.bp-rfq-form-head > h2#rfq-form-title').length === 1, `${page.file}: RFQ form title must remain present.`);
  check(page.$('.bp-rfq-form-head > p:not(.bp-rfq-form-kicker)').length === 0, `${page.file}: duplicated form-head upload guidance must be removed.`);
  check(page.$('.bp-rfq-quote-help').length === 0, `${page.file}: duplicated quote-help block must be removed.`);
  const drawingInput = form.find('input#drawing[name="drawing"]');
  const drawingLabel = form.find('label[for="drawing"]:not(.bp-rfq-upload-label)');
  check(drawingLabel.length === 1 && drawingLabel.text().trim() === page.uploadLabel, `${page.file}: drawing label differs from the approved short copy.`);
  check(form.find('.bp-rfq-upload-title').text().trim() === page.uploadAction, `${page.file}: upload action differs from the approved short copy.`);
  check(
    drawingInput.attr('accept') === '.pdf,.step,.stp,.iges,.igs,.dwg,.dxf,.jpg,.jpeg,.png',
    `${page.file}: drawing formats changed.`,
  );
  check(drawingInput.attr('aria-describedby') === 'drawing-help drawing-name', `${page.file}: drawing aria-describedby changed.`);
  check(/10\s*(?:MB|Mo|МБ)/u.test(form.find('#drawing-help').text()), `${page.file}: drawing 10 MB guidance is missing.`);
  check(form.find('#drawing-name').length === 1, `${page.file}: drawing filename feedback is missing.`);
  for (const fieldName of REQUIRED_NATIVE_FIELDS) {
    const field = form.find(`[name="${fieldName}"]`);
    check(field.length === 1 && field.attr('required') !== undefined, `${page.file}: ${fieldName} must retain its native required constraint.`);
  }
  for (const fieldName of OPTIONAL_NATIVE_FIELDS) {
    const field = form.find(`[name="${fieldName}"]`);
    check(field.length === 1, `${page.file}: optional field ${fieldName} is missing.`);
    check(field.attr('required') === undefined, `${page.file}: ${fieldName} must remain optional (no native required).`);
  }
  check(String(form.find('input[name="email"]').attr('type') || '').toLowerCase() === 'email', `${page.file}: email must retain its native email constraint.`);
  check(!REQUIRED_NATIVE_FIELDS.includes('quantity'), `${page.file}: quantity must not enter the native required-field set.`);
  check(page.rfqBlocks.length === 1, `${page.file}: expected exactly one Contact RFQ application/json data block.`);
  check(page.copy !== null, `${page.file}: Contact RFQ JSON data block is invalid.`);
  if (page.copy) {
    check(
      sameKeys(Object.keys(page.copy), [...Object.keys(RFQ_NESTED_KEYS), ...RFQ_SCALAR_KEYS]),
      `${page.file}: Contact RFQ top-level keys differ from the approved contract.`,
    );
    check(stringLeafCount(page.copy) === 23, `${page.file}: Contact RFQ data must contain exactly 23 string leaves.`);
    for (const [group, expectedKeys] of Object.entries(RFQ_NESTED_KEYS)) {
      check(
        page.copy[group] && typeof page.copy[group] === 'object' && !Array.isArray(page.copy[group]),
        `${page.file}: ${group} must be an object.`,
      );
      if (page.copy[group] && typeof page.copy[group] === 'object') {
        check(sameKeys(Object.keys(page.copy[group]), expectedKeys), `${page.file}: ${group} keys differ from the approved contract.`);
        for (const key of expectedKeys) {
          check(typeof page.copy[group][key] === 'string' && page.copy[group][key] !== '', `${page.file}: ${group}.${key} must be non-empty.`);
          check(
            sameKeys(placeholdersIn(page.copy[group][key]), group === 'modelRequestTemplates' ? ['model'] : []),
            `${page.file}: ${group}.${key} placeholders differ from the approved contract.`,
          );
        }
      }
    }
    for (const key of RFQ_SCALAR_KEYS) {
      check(typeof page.copy[key] === 'string' && page.copy[key] !== '', `${page.file}: ${key} must be a non-empty string.`);
      check(
        sameKeys(placeholdersIn(page.copy[key]), RFQ_PLACEHOLDER_CONTRACT[key] || []),
        `${page.file}: ${key} placeholders differ from the approved contract.`,
      );
    }
    if (Object.hasOwn(manualRfqContract.copies || {}, page.language)) {
      check(
        sameObject(page.copy, manualRfqContract.copies?.[page.language]),
        `${page.file}: RFQ data block differs from the reviewed manual source.`,
      );
    }
  }
  check(!/<\/script/i.test(page.rfqBlocks.first().html() || ''), `${page.file}: RFQ JSON contains an unsafe script-closing sequence.`);
  check(page.script !== '', `${page.file}: RFQ enhancement script was not found.`);

  if (page.script) {
    check(
      page.script.includes("JSON.parse(rfqCopyData.textContent)"),
      `${page.file}: RFQ behavior must read copy from the JSON data block.`,
    );
    check(
      !page.script.includes('const RFQ_COPY = Object.freeze({'),
      `${page.file}: RFQ behavior must not retain a hard-coded copy object.`,
    );
    const baseline = runPageScript(page, '');
    check(baseline.fields.inquiry_type.value === 'general_inquiry', `${page.file}: no-parameter visit must use general_inquiry.`);
    check(baseline.fields.requirements.value === '', `${page.file}: no-parameter visit must leave requirements empty.`);
    check(baseline.fields.quantity.value === '', `${page.file}: no-parameter visit must leave quantity empty.`);
    check(baseline.fields.quoteForm.noValidate === true, `${page.file}: AJAX-capable initialization must enable custom constraint validation.`);
    check(typeof baseline.submitHandler === 'function', `${page.file}: AJAX-capable initialization must install the submit handler.`);
    const submitListenerIndex = baseline.audit.findIndex((entry) => entry.target === 'quoteForm' && entry.sink === 'listener:submit');
    const noValidateIndex = baseline.audit.findIndex((entry) => entry.target === 'quoteForm' && entry.sink === 'noValidate' && entry.value === true);
    check(
      submitListenerIndex >= 0 && noValidateIndex > submitListenerIndex,
      `${page.file}: noValidate must be enabled only after the AJAX submit handler is installed.`,
    );
    check(sameObject(baseline.contract.requestMap, REQUEST_CODE_MAP), `${page.file}: request mapping differs from the approved contract.`);
    check(sameObject(baseline.contract.inquiryMap, INQUIRY_TYPE_CODE_MAP), `${page.file}: inquiry_type mapping differs from the approved contract.`);
    check(baseline.contract.copy.sending === page.sending, `${page.file}: sending state is not localized as approved.`);
    check(baseline.contract.copy.requestTemplates.quote === page.quoteTemplate, `${page.file}: quote template differs from the approved simplified copy.`);
    check(!Object.hasOwn(baseline.contract.copy.requiredFields, 'quantity'), `${page.file}: quantity must not enter RFQ_COPY.requiredFields.`);
    check(!page.script.includes("readTextParameter('quantity'"), `${page.file}: quantity must not be prefilled from the URL.`);
    check(
      Object.keys(baseline.contract.copy.modelRequestTemplates).join('|') === '3d_step',
      `${page.file}: model-specific request templates must cover only STEP requests.`,
    );

    for (const [requestValue, expectedCode] of Object.entries(REQUEST_CODE_MAP)) {
      const result = runPageScript(page, `?request=${encodeURIComponent(requestValue)}`);
      check(result.fields.inquiry_type.value === expectedCode, `${page.file}: request=${requestValue} must map to ${expectedCode}.`);
      check(result.fields.requirements.value.trim() !== '', `${page.file}: request=${requestValue} must prefill requirements.`);
    }
    const stepRequest = runPageScript(
      page,
      '?request=3d-step&model=BP-2P-0001&product=BP-2P-0001%202-Passage%20Pneumatic%20Rotary%20Union&source=BP-2P-0001.html',
    );
    check(stepRequest.fields.requirements.value === page.stepModelTemplate, `${page.file}: STEP request must be one natural model-specific sentence.`);
    check(!stepRequest.fields.requirements.value.includes('Source'), `${page.file}: STEP request must not expose source tracking.`);
    const legacy = runPageScript(page, '?inquiry_type=technical-consultation');
    check(legacy.fields.inquiry_type.value === 'technical_consultation', `${page.file}: legacy technical-consultation mapping failed.`);
    check(legacy.fields.requirements.value.trim() !== '', `${page.file}: valid legacy inquiry_type must prefill requirements.`);
    const stableInquiry = runPageScript(page, '?inquiry_type=seal_review');
    check(stableInquiry.fields.inquiry_type.value === 'seal_review', `${page.file}: stable inquiry_type mapping failed.`);
    const unknown = runPageScript(page, '?request=untrusted-business-classification');
    check(unknown.fields.inquiry_type.value === 'general_inquiry', `${page.file}: unknown request must fall back to general_inquiry.`);
    check(unknown.fields.requirements.value === '', `${page.file}: unknown request alone must leave requirements empty.`);
    const quantityParameter = runPageScript(page, '?quantity=URLInjectedQuantity');
    check(quantityParameter.fields.quantity.value === '', `${page.file}: quantity query parameter must not prefill the form.`);
    const drawingFeedback = runPageScript(page, '');
    const drawingChangeHandler = drawingFeedback.fields.drawing.listeners.get('change');
    check(typeof drawingChangeHandler === 'function', `${page.file}: drawing filename feedback handler is missing.`);
    if (typeof drawingChangeHandler === 'function') {
      drawingFeedback.fields.drawing.files = [{ name: 'contract-drawing.pdf', size: 1024 }];
      drawingChangeHandler.call(drawingFeedback.fields.drawing);
      check(drawingFeedback.fields['drawing-name'].textContent === 'contract-drawing.pdf', `${page.file}: selected drawing filename was not displayed.`);
      drawingFeedback.fields.drawing.files = [];
      drawingChangeHandler.call(drawingFeedback.fields.drawing);
      check(drawingFeedback.fields['drawing-name'].textContent === drawingFeedback.contract.copy.noFile, `${page.file}: cleared drawing did not restore localized no-file feedback.`);
    }
    const localizedProductOnly = runPageScript(page, '?product=BP-2P-130-0001');
    check(localizedProductOnly.fields.inquiry_type.value === 'general_inquiry', `${page.file}: product-only visit must remain general_inquiry.`);
    check(localizedProductOnly.fields.source_product.value === 'BP-2P-130-0001', `${page.file}: product-only visit must retain source_product.`);
    check(localizedProductOnly.fields.product.value === 'BP-2P-130-0001', `${page.file}: product-only visit must prefill the visible product field.`);
    check(localizedProductOnly.fields.requirements.value === page.copy.requestTemplates.general_inquiry, `${page.file}: product-only visit must use only the natural request template.`);
    for (const inheritedKey of ['toString', 'constructor', '__proto__']) {
      const inherited = runPageScript(page, `?request=${encodeURIComponent(inheritedKey)}`);
      check(inherited.fields.inquiry_type.value === 'general_inquiry', `${page.file}: inherited request key ${inheritedKey} must fall back to general_inquiry.`);
      const inheritedWithLegacy = runPageScript(
        page,
        `?request=${encodeURIComponent(inheritedKey)}&inquiry_type=technical-consultation`,
      );
      check(
        inheritedWithLegacy.fields.inquiry_type.value === 'technical_consultation',
        `${page.file}: inherited request key ${inheritedKey} must not override a valid legacy inquiry_type.`,
      );
    }
    const priority = runPageScript(page, '?request=quote&inquiry_type=technical-consultation');
    check(priority.fields.inquiry_type.value === 'quote', `${page.file}: valid request must take priority over inquiry_type.`);
    const fallbackPriority = runPageScript(page, '?request=unknown&inquiry_type=technical-consultation');
    check(fallbackPriority.fields.inquiry_type.value === 'technical_consultation', `${page.file}: invalid request must allow a valid inquiry_type fallback.`);
    check(
      [...STABLE_CODES].every((code) => /^[a-z0-9][a-z0-9_]*$/.test(code)),
      `${page.file}: machine classifications must be stable language-neutral codes.`,
    );

    const noFetch = await runSubmitFixture(page, { fetchAvailable: false });
    check(typeof noFetch.submitHandler !== 'function', `${page.file}: missing fetch must not install the AJAX submit handler.`);
    check(noFetch.fields.quoteForm.noValidate !== true, `${page.file}: missing fetch must preserve native constraint validation.`);
    check(!noFetch.event.defaultPrevented, `${page.file}: missing fetch must preserve native POST.`);
    check(noFetch.submission.fetchCalls.length === 0, `${page.file}: missing fetch unexpectedly attempted a request.`);
    check(noFetch.submission.formDataForms.length === 0, `${page.file}: missing fetch unexpectedly constructed FormData.`);

    const noFormData = await runSubmitFixture(page, { formDataAvailable: false });
    check(typeof noFormData.submitHandler !== 'function', `${page.file}: missing FormData must not install the AJAX submit handler.`);
    check(noFormData.fields.quoteForm.noValidate !== true, `${page.file}: missing FormData must preserve native constraint validation.`);
    check(!noFormData.event.defaultPrevented, `${page.file}: missing FormData must preserve native POST.`);
    check(noFormData.submission.fetchCalls.length === 0, `${page.file}: missing FormData unexpectedly attempted a request.`);

    const failedFormData = await runSubmitFixture(page, { formDataFailure: true });
    check(failedFormData.fields.quoteForm.noValidate === true, `${page.file}: available AJAX APIs must enable custom constraint validation.`);
    check(!failedFormData.event.defaultPrevented, `${page.file}: FormData construction failure must preserve native POST.`);
    check(failedFormData.submission.fetchCalls.length === 0, `${page.file}: failed FormData unexpectedly attempted a request.`);

    for (const fieldName of REQUIRED_NATIVE_FIELDS) {
      const requiredFailure = await runSubmitFixture(page, {}, { [fieldName]: '' });
      const expectedMessage = requiredFailure.contract.copy.required.replace(
        '{field}',
        requiredFailure.contract.copy.requiredFields[fieldName],
      );
      check(requiredFailure.fields.quoteForm.noValidate === true, `${page.file}: ${fieldName} required-path fixture must use custom validation.`);
      check(requiredFailure.event.defaultPrevented, `${page.file}: missing ${fieldName} must stop submission.`);
      check(requiredFailure.submission.fetchCalls.length === 0, `${page.file}: missing ${fieldName} must not reach AJAX.`);
      check(requiredFailure.fields[fieldName].focused, `${page.file}: missing ${fieldName} must receive focus.`);
      check(requiredFailure.fields.formMessage.className === 'form-error', `${page.file}: missing ${fieldName} must use the error state.`);
      check(
        requiredFailure.fields.formMessage.textContent === `✗ ${expectedMessage}`,
        `${page.file}: missing ${fieldName} did not render the localized required message.`,
      );
    }

    const invalidEmailFailure = await runSubmitFixture(page, {}, { email: 'not-an-email' });
    check(invalidEmailFailure.fields.quoteForm.noValidate === true, `${page.file}: invalid-email fixture must use custom validation.`);
    check(invalidEmailFailure.event.defaultPrevented, `${page.file}: invalid email must stop submission.`);
    check(invalidEmailFailure.submission.fetchCalls.length === 0, `${page.file}: invalid email must not reach AJAX.`);
    check(invalidEmailFailure.fields.email.focused, `${page.file}: invalid email must receive focus.`);
    check(invalidEmailFailure.fields.formMessage.className === 'form-error', `${page.file}: invalid email must use the error state.`);
    check(
      invalidEmailFailure.fields.formMessage.textContent === `✗ ${invalidEmailFailure.contract.copy.invalidEmail}`,
      `${page.file}: invalid email did not render the localized message.`,
    );

    const ajaxSuccess = await runSubmitFixture(page, {
      response: { success: true, message: '' },
      throwAnalyticsEvent: true,
    });
    check(typeof ajaxSuccess.submitHandler === 'function', `${page.file}: submit enhancement handler is missing.`);
    check(ajaxSuccess.fields.quoteForm.noValidate === true, `${page.file}: valid AJAX enhancement must use custom constraint validation.`);
    check(ajaxSuccess.event.defaultPrevented, `${page.file}: valid AJAX enhancement must prevent duplicate native POST.`);
    check(ajaxSuccess.submission.fetchCalls.length === 1, `${page.file}: valid AJAX enhancement must make exactly one synthetic fetch call.`);
    const ajaxCall = ajaxSuccess.submission.fetchCalls[0];
    check(ajaxCall?.url === page.$('form#quoteForm').attr('action'), `${page.file}: AJAX must use the real form action.`);
    check(ajaxCall?.options?.method === 'POST', `${page.file}: AJAX method must be POST.`);
    check(ajaxCall?.options?.headers?.Accept === 'application/json', `${page.file}: AJAX must request JSON through Accept.`);
    check(ajaxSuccess.submission.formDataForms[0] === ajaxSuccess.fields.quoteForm, `${page.file}: FormData must be constructed from form#quoteForm.`);
    check(
      ajaxSuccess.audit.some((write) => write.target === 'submitBtn' && write.sink === 'textContent' && write.value === page.sending),
      `${page.file}: localized sending state was not rendered during AJAX submission.`,
    );
    check(ajaxSuccess.fields.formMessage.className === 'form-success', `${page.file}: AJAX success must use the success state.`);
    check(
      ajaxSuccess.fields.formMessage.textContent.includes(ajaxSuccess.contract.copy.success),
      `${page.file}: AJAX success fallback is not localized.`,
    );
    check(
      !ajaxSuccess.fields.formMessage.textContent.includes(ajaxSuccess.contract.copy.networkFailure),
      `${page.file}: analytics-event failure must not turn a sent inquiry into a network error.`,
    );
    check(ajaxSuccess.submission.redirects.length === 1, `${page.file}: AJAX success must perform one full-page redirect.`);
    check(
      ajaxSuccess.submission.redirects[0] === page.$('#thankYouRedirect').attr('value'),
      `${page.file}: AJAX success must redirect to the matching thank-you page.`,
    );
    check(
      !ajaxSuccess.audit.some((write) => write.target === 'quoteForm' && write.sink === 'reset'),
      `${page.file}: AJAX success must not clear the form before the confirmation page opens.`,
    );

    const unsafeRedirect = await runSubmitFixture(
      page,
      { response: { success: true, message: '' } },
      { thankYouRedirect: 'https://example.invalid/thank-you.html' },
    );
    const expectedFallback = new URL('thank-you.html', new URL(page.file.replaceAll('\\', '/'), 'https://www.begapunk.com/')).href;
    check(
      unsafeRedirect.submission.redirects.length === 1 && unsafeRedirect.submission.redirects[0] === expectedFallback,
      `${page.file}: an external redirect value must fall back to the same-language thank-you page.`,
    );

    let releaseResponse;
    const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
    const concurrent = runPageScript(page, '', {
      fullname: 'Contract Test',
      email: 'contract-test@example.com',
      company: 'Contract Test Company',
      country: 'Germany',
      product: 'BP-2P-130-0001',
      requirements: 'Synthetic validation only. Do not submit.',
    }, { response: { success: true, message: '' }, responseGate });
    const firstEvent = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    const secondEvent = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    const firstSubmission = concurrent.submitHandler.call(concurrent.fields.quoteForm, firstEvent);
    await Promise.resolve();
    await concurrent.submitHandler.call(concurrent.fields.quoteForm, secondEvent);
    check(secondEvent.defaultPrevented, `${page.file}: a concurrent second submit must be intercepted.`);
    check(concurrent.submission.fetchCalls.length === 1, `${page.file}: a concurrent second submit must not send another request.`);
    releaseResponse();
    await firstSubmission;

    const quantityValue = '1 prototype & 100 units/year';
    const quantityAjax = await runSubmitFixture(
      page,
      { response: { success: true, message: '' } },
      { quantity: quantityValue },
    );
    check(quantityAjax.submission.fetchCalls.length === 1, `${page.file}: non-empty quantity must retain the AJAX submission path.`);
    check(
      quantityAjax.submission.fetchCalls[0]?.options?.body?.get('quantity') === quantityValue,
      `${page.file}: AJAX FormData did not preserve quantity exactly.`,
    );
    check(
      quantityAjax.submission.events.every((eventRecord) => !Object.hasOwn(eventRecord.detail || {}, 'quantity')),
      `${page.file}: quantity must not enter the inquiry analytics event.`,
    );
    const emptyQuantityAjax = await runSubmitFixture(
      page,
      { response: { success: true, message: '' } },
      { quantity: '' },
    );
    check(emptyQuantityAjax.submission.fetchCalls.length === 1, `${page.file}: empty optional quantity must not block AJAX submission.`);
    check(emptyQuantityAjax.submission.fetchCalls[0]?.options?.body?.get('quantity') === '', `${page.file}: empty quantity must remain empty in FormData.`);

    const businessFailure = await runSubmitFixture(page, { response: { success: false, message: '' } });
    check(businessFailure.event.defaultPrevented, `${page.file}: AJAX business failure must not fall through to native POST.`);
    check(
      businessFailure.fields.formMessage.textContent.includes(businessFailure.contract.copy.serviceUnavailable),
      `${page.file}: AJAX business-failure fallback is not localized.`,
    );
    check(businessFailure.submission.redirects.length === 0, `${page.file}: a business failure must not open the thank-you page.`);

    const invalidJson = await runSubmitFixture(page, { invalidJson: true });
    check(invalidJson.event.defaultPrevented, `${page.file}: invalid JSON response must not trigger a duplicate native POST.`);
    check(
      invalidJson.fields.formMessage.textContent.includes(invalidJson.contract.copy.invalidResponse),
      `${page.file}: invalid-response feedback is not localized.`,
    );
    check(invalidJson.submission.redirects.length === 0, `${page.file}: invalid JSON must not open the thank-you page.`);

    const networkFailure = await runSubmitFixture(page, { networkFailure: true });
    check(networkFailure.event.defaultPrevented, `${page.file}: network failure after AJAX interception must not trigger native POST.`);
    check(
      networkFailure.fields.formMessage.textContent.includes(networkFailure.contract.copy.networkFailure),
      `${page.file}: network-failure feedback is not localized.`,
    );
    check(networkFailure.submission.redirects.length === 0, `${page.file}: a network failure must not open the thank-you page.`);
  }
}

const normalizedEnglishBehavior = pages[0].script.replace(/\r\n?/g, '\n').trim();
for (const page of pages.slice(1)) {
  check(
    page.script.replace(/\r\n?/g, '\n').trim() === normalizedEnglishBehavior,
    `${page.file}: RFQ behavior code must remain structurally identical to the English source.`,
  );
}

check(PRODUCT_PAGE_NAMES.length === 16, `Product inquiry contract must cover exactly 16 product pages; found ${PRODUCT_PAGE_NAMES.length}.`);
for (const locale of PRODUCT_LOCALES) {
  for (const pageName of PRODUCT_PAGE_NAMES) {
    const model = path.basename(pageName, '.html');
    const relativePath = locale === 'en' ? pageName : path.join(locale, pageName);
    check(DRAWING_BACKED_PRODUCT_MODELS.has(model), `${relativePath}: model is absent from the drawing-backed product contract.`);
    const metadata = drawingBackedProductMetadata(locale, model);
    check(Boolean(metadata), `${relativePath}: localized product metadata is missing.`);
    if (!metadata) continue;

    const $ = load(read(relativePath));
    const reviewLinks = $('main a[href*="request=application-review"]');
    const expectedHref = `contact.html?request=application-review&model=${encodeURIComponent(model)}&product=${encodeURIComponent(metadata.linkLabel)}&source=${model}.html#quoteForm`;
    check(reviewLinks.length === 3, `${relativePath}: expected exactly three application-review entry links; found ${reviewLinks.length}.`);
    reviewLinks.each((index, element) => {
      check(
        $(element).attr('href') === expectedHref,
        `${relativePath}: application-review entry ${index + 1} must include the complete request/model/product/source/#quoteForm contract.`,
      );
    });
  }
}

const contactGeneration = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'build-localized-site.mjs'), '--mode', 'verify-contact'],
  {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  },
);
check(contactGeneration.error === undefined, `Contact generation verifier failed to start: ${contactGeneration.error?.message || 'unknown error'}.`);
check(contactGeneration.signal === null, `Contact generation verifier was terminated by ${contactGeneration.signal || 'an unknown signal'}.`);
check(
  contactGeneration.status === 0,
  `Contact generation verifier failed: ${(contactGeneration.stderr || contactGeneration.stdout || '').trim() || `exit ${contactGeneration.status}`}.`,
);
check((contactGeneration.stderr || '').trim() === '', 'Contact generation verifier emitted unexpected stderr output.');
let contactGenerationReport = null;
try {
  contactGenerationReport = JSON.parse((contactGeneration.stdout || '').trim());
} catch {
  contactGenerationReport = null;
}
check(contactGenerationReport !== null, 'Contact generation verifier did not emit one valid JSON result.');
if (contactGenerationReport) {
  const expectedResultKeys = ['result', 'targetLanguageCount', 'wroteFiles', 'comparisons'];
  const expectedLanguages = TARGET_LANGUAGES;
  const expectedScopes = [
    'section.bp-rfq-hero',
    'main.bp-rfq-main',
    'section.bp-rfq-details',
    'form#quoteForm',
    'script#contact-rfq-copy[type="application/json"]',
    'RFQ behavior script',
  ];
  check(
    sameKeys(Object.keys(contactGenerationReport), expectedResultKeys),
    'Contact generation verifier result keys do not match the strict contract.',
  );
  check(
    contactGenerationReport.result === 'Contact-owned regions verified',
    'Contact generation verifier did not report the exact Contact-owned success result.',
  );
  check(
    contactGenerationReport.targetLanguageCount === expectedLanguages.length,
    `Contact generation verifier target-language count must be ${expectedLanguages.length}.`,
  );
  check(
    contactGenerationReport.wroteFiles === false,
    'Contact generation verifier did not affirm its read-only behavior.',
  );
  check(
    Array.isArray(contactGenerationReport.comparisons)
      && contactGenerationReport.comparisons.length === expectedLanguages.length * expectedScopes.length,
    `Contact generation verifier must return ${expectedLanguages.length * expectedScopes.length} scope comparisons.`,
  );
  const observedComparisons = new Set();
  for (const comparison of Array.isArray(contactGenerationReport.comparisons)
    ? contactGenerationReport.comparisons
    : []) {
    check(
      comparison && typeof comparison === 'object' && !Array.isArray(comparison),
      'Contact generation verifier emitted a non-object scope comparison.',
    );
    if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) continue;
    check(
      sameKeys(Object.keys(comparison), ['language', 'file', 'scope', 'sha256']),
      'Contact generation verifier scope-comparison keys do not match the strict contract.',
    );
    check(
      expectedLanguages.includes(comparison.language),
      `Contact generation verifier reported unexpected language ${comparison.language}.`,
    );
    check(
      comparison.file === `${comparison.language}/contact.html`,
      `Contact generation verifier reported an unexpected file for ${comparison.language}.`,
    );
    check(
      expectedScopes.includes(comparison.scope),
      `Contact generation verifier reported unexpected scope ${comparison.scope}.`,
    );
    check(
      /^[0-9A-F]{64}$/.test(comparison.sha256),
      `Contact generation verifier reported an invalid SHA-256 for ${comparison.language}/${comparison.scope}.`,
    );
    const comparisonKey = `${comparison.language}\0${comparison.scope}`;
    check(
      !observedComparisons.has(comparisonKey),
      `Contact generation verifier repeated ${comparison.language}/${comparison.scope}.`,
    );
    observedComparisons.add(comparisonKey);
  }
  for (const language of expectedLanguages) {
    for (const scope of expectedScopes) {
      check(
        observedComparisons.has(`${language}\0${scope}`),
        `Contact generation verifier omitted ${language}/${scope}.`,
      );
    }
  }
}

const english = pages.find((page) => page.language === 'en');
const german = pages.find((page) => page.language === 'de');
const japanese = pages.find((page) => page.language === 'ja');
const russian = pages.find((page) => page.language === 'ru');

const productOnly = runPageScript(english, '?product=BP-2P-130-0001');
check(productOnly.fields.inquiry_type.value === 'general_inquiry', 'product-only: classification must remain general_inquiry.');
check(productOnly.fields.source_product.value === 'BP-2P-130-0001', 'product-only: source_product was ignored.');
check(productOnly.fields.product.value === 'BP-2P-130-0001', 'product-only: product select was not prefilled.');
check(productOnly.fields.requirements.value === english.copy.requestTemplates.general_inquiry, 'product-only: requirements must contain only the natural request template.');

const applicationOnly = runPageScript(german, '?request=application-review&application=cnc-pneumatic-clamping');
check(applicationOnly.fields.inquiry_type.value === 'application_review', 'application fixture: classification failed.');
check(applicationOnly.fields.application.value === 'cnc-pneumatic-clamping', 'application fixture: visible application field was not prefilled.');
check(applicationOnly.fields.requirements.value === german.copy.requestTemplates.application_review, 'application fixture: requirements must contain only the natural request template.');

const sealReview = runPageScript(japanese, '?request=seal-review&model=BP-2P-08-0001');
check(sealReview.fields.inquiry_type.value === 'seal_review', 'seal review fixture: classification failed.');
check(sealReview.fields.source_model.value === 'BP-2P-08-0001', 'seal review fixture: source_model was not prefilled.');
check(sealReview.fields.product.value === 'BP-2P-08-0001', 'seal review fixture: product select was not prefilled from model.');
check(sealReview.fields.requirements.value === japanese.copy.requestTemplates.seal_review, 'seal review fixture: requirements must contain only the natural request template.');

const technicalConsultation = runPageScript(russian, '?inquiry_type=technical-consultation&application=production-leak-testing');
check(technicalConsultation.fields.inquiry_type.value === 'technical_consultation', 'technical consultation fixture: classification failed.');
check(technicalConsultation.fields.application.value === 'production-leak-testing', 'technical consultation fixture: application was ignored.');
check(technicalConsultation.fields.requirements.value === russian.copy.requestTemplates.technical_consultation, 'technical consultation fixture: requirements must contain only the natural request template.');

const sourceFixture = runPageScript(english, '?request=quote&model=BP-1P-0003&product=BP-1P-0003&source=BP-1P-0003.html');
check(sourceFixture.fields.source_page.value === 'BP-1P-0003.html', 'valid source path was not retained.');
check(sourceFixture.fields.source_url.value !== '', 'valid source URL was not derived.');
if (sourceFixture.fields.source_url.value !== '') {
  const sourceUrl = new URL(sourceFixture.fields.source_url.value);
  check(sourceUrl.origin === 'https://www.begapunk.com', 'valid source URL was not kept on the site origin.');
  check(sourceUrl.pathname === '/BP-1P-0003.html', 'valid source URL has the wrong path.');
}
check(sourceFixture.fields.requirements.value === english.copy.requestTemplates.quote, 'source tracking must not be copied into the customer message.');
for (const maliciousSource of ['https://evil.example/x.html', '//evil.example/x.html', 'javascript:alert(1)', '../secret.html', '..\\secret.html']) {
  const result = runPageScript(english, `?source=${encodeURIComponent(maliciousSource)}`);
  check(result.fields.source_page.value === '', `unsafe source was accepted: ${maliciousSource}`);
  check(result.fields.source_url.value === '', `unsafe source URL was derived: ${maliciousSource}`);
}

const manualRequirements = 'Manually entered requirements must remain unchanged.';
const preserved = runPageScript(
  english,
  '?request=quote&product=BP-2P-130-0001',
  { requirements: manualRequirements },
);
check(preserved.fields.requirements.value === manualRequirements, 'manual requirements content was overwritten.');

for (const parameterName of ['request', 'model', 'product', 'application', 'inquiry_type', 'source']) {
  const xssSentinel = `<img src=x data-parameter=${parameterName} onerror=globalThis.__executed=true>`;
  const xssResult = runPageScript(english, `?${parameterName}=${encodeURIComponent(xssSentinel)}`);
  check(
    !xssResult.audit.some((write) => (
      ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'attribute:src', 'attribute:href'].includes(write.sink)
      && String(write.value).includes(xssSentinel)
    )),
    `${parameterName}: query text reached an HTML or navigational sink.`,
  );
  if (parameterName === 'model') {
    check(xssResult.fields.source_model.value === xssSentinel, 'model query text was not preserved as a literal value.');
    check(xssResult.fields.product.options.some((option) => option.textContent === xssSentinel), 'model query text was not assigned through safe option text.');
  } else if (parameterName === 'product') {
    check(xssResult.fields.source_product.value === xssSentinel, 'product query text was not preserved as a literal value.');
    check(xssResult.fields.product.options.some((option) => option.textContent === xssSentinel), 'product query text was not assigned through safe option text.');
  } else if (parameterName === 'application') {
    check(xssResult.fields.application.value === xssSentinel, 'application query text was not preserved as a literal value.');
  } else if (parameterName === 'request' || parameterName === 'inquiry_type') {
    check(xssResult.fields.inquiry_type.value === 'general_inquiry', `${parameterName}: untrusted classification did not fall back to general_inquiry.`);
  } else if (parameterName === 'source') {
    check(xssResult.fields.source_page.value === '', 'unsafe source query text was accepted.');
  }
}

const php = read('send_inquiry.php');
check(
  php.includes("$productionPath = '/www/begapunk/shared/.env';")
    && php.includes('load_env_file(inquiry_env_file());'),
  'send_inquiry.php: production SMTP configuration must load from outside the public release root.',
);
check(
  !php.includes("load_env_file(__DIR__ . '/.env');"),
  'send_inquiry.php: the public release root must not be the production .env location.',
);
const wantsJsonBody = extractFunctionBody(php, 'request_wants_json');
const respondBody = extractFunctionBody(php, 'respond');
const languageBody = extractFunctionBody(php, 'normalize_source_language');
const clickIdentifierBody = extractFunctionBody(php, 'normalize_click_identifier');
const campaignValueBody = extractFunctionBody(php, 'normalize_campaign_value');
const trackingUrlBody = extractFunctionBody(php, 'normalize_tracking_url');
const attachmentBody = extractFunctionBody(php, 'validate_attachment');
const quantityRead = "$quantity = post_value('quantity', 100, $context);";
const productReadPosition = php.indexOf("$product = post_value('product', 200, $context);");
const quantityReadPosition = php.indexOf(quantityRead);
const applicationReadPosition = php.indexOf("$application = post_value('application', 500, $context);");
check(quantityReadPosition >= 0, 'send_inquiry.php: optional quantity must use post_value with a 100-character limit.');
check(
  productReadPosition >= 0 && productReadPosition < quantityReadPosition && quantityReadPosition < applicationReadPosition,
  'send_inquiry.php: quantity must be read after product and before application.',
);
const quantityRow = "'Estimated Quantity' => $quantity";
const productRowPosition = php.indexOf("'Product / Reference' => $productReference");
const quantityRowPosition = php.indexOf(quantityRow);
const applicationRowPosition = php.indexOf("'Application' => $application");
check(quantityRowPosition >= 0, 'send_inquiry.php: quantity email row is missing.');
check(
  productRowPosition >= 0 && productRowPosition < quantityRowPosition && quantityRowPosition < applicationRowPosition,
  'send_inquiry.php: quantity email row must follow Product / Reference and precede Application.',
);
const requiredConditionStart = php.indexOf("if ($email === ''");
const invalidContactStart = php.indexOf('if (!filter_var($email', requiredConditionStart);
const requiredCondition = php.slice(requiredConditionStart, invalidContactStart);
check(requiredConditionStart >= 0 && invalidContactStart > requiredConditionStart, 'send_inquiry.php: required-field condition could not be located.');
check(requiredCondition.includes('$email') && requiredCondition.includes('$requirements'), 'send_inquiry.php: email and requirements must remain required.');
check(!requiredCondition.includes('$name'), 'send_inquiry.php: fullname must not be required.');
check(!requiredCondition.includes('$company'), 'send_inquiry.php: company must not be required.');
check(!requiredCondition.includes('$country'), 'send_inquiry.php: country must not be required.');
check(!requiredCondition.includes('$product'), 'send_inquiry.php: product must not be required.');
check(!requiredCondition.includes('$quantity'), 'send_inquiry.php: quantity must not become required.');
check((php.match(/\$quantity\b/g) || []).length === 2, 'send_inquiry.php: quantity must be limited to input normalization and the email row.');
check(php.includes("$requesterLabel = $name !== '' ? $name : $email;"), 'send_inquiry.php: blank fullname must fall back to the validated email address in mail headers.');
const rowsStart = php.indexOf('$rows = [');
const htmlBodyStart = php.indexOf('$htmlBody =', rowsStart);
const rowsRendering = php.slice(rowsStart, htmlBodyStart);
check(php.includes("'Request Type' => $inquiryLabel"), 'send_inquiry.php: friendly request type row is missing.');
check(!rowsRendering.includes("'Source Model'"), 'send_inquiry.php: Source Model must not duplicate Product / Reference.');
check(!rowsRendering.includes("'Source Product'"), 'send_inquiry.php: Source Product must not duplicate Product / Reference.');
check(!rowsRendering.includes("'Source Page'"), 'send_inquiry.php: Source Page must not duplicate Source URL.');
check(php.includes('<strong>Customer Message:</strong>'), 'send_inquiry.php: customer message label is missing.');
check(!php.includes('<strong>Technical Requirements:</strong>'), 'send_inquiry.php: legacy technical requirements label remains.');
check(rowsRendering.includes("if ($value !== '')"), 'send_inquiry.php: empty optional email rows must remain omitted.');
check(rowsRendering.includes('escape_html($value)'), 'send_inquiry.php: email row values must retain HTML escaping.');
check(wantsJsonBody.includes('HTTP_ACCEPT') && wantsJsonBody.includes('application/json'), 'send_inquiry.php: JSON mode must be negotiated through Accept.');
check(
  wantsJsonBody.includes("explode(',', $accept)") && wantsJsonBody.includes('$quality > 0.0'),
  'send_inquiry.php: JSON negotiation must honor media-range quality instead of accepting q=0.',
);
check(/['"]success['"]\s*=>\s*\$success/.test(respondBody), 'send_inquiry.php: JSON response must retain success.');
check(/['"]code['"]\s*=>\s*\$code/.test(respondBody), 'send_inquiry.php: JSON response must include code.');
check(/['"]message['"]\s*=>\s*\$message/.test(respondBody), 'send_inquiry.php: JSON response must retain message.');
check(respondBody.includes('application/json') && respondBody.includes('text/html'), 'send_inquiry.php: both JSON and HTML response modes are required.');
check(respondBody.includes("header('Location: '") && respondBody.includes('303'), 'send_inquiry.php: native success must use a fixed 303 redirect.');
const sourceLanguageAllowlistMatch = languageBody.match(/in_array\(\$language,\s*\[([^\]]+)\],\s*true\)/);
const sourceLanguageAllowlist = sourceLanguageAllowlistMatch
  ? [...sourceLanguageAllowlistMatch[1].matchAll(/'([a-z]{2})'/g)].map((match) => match[1])
  : [];
check(
  sameKeys(sourceLanguageAllowlist, PRODUCT_LOCALES) && languageBody.includes("? $language : 'en'"),
  `send_inquiry.php: source_language must use a strict source + active-language allowlist (${PRODUCT_LOCALES.join(', ')}) with English fallback.`,
);
check(php.includes("'fr' => [") && php.includes("'error_title' => 'Demande non envoyée'"), 'send_inquiry.php: French responses must not fall back to English.');
for (const language of PRODUCT_LOCALES) {
  const requiredPath = language === SITE_CONFIG.sourceLanguage.code ? '/thank-you.html' : `/${language}/thank-you.html`;
  check(php.includes(`'${requiredPath}'`), `send_inquiry.php: missing fixed success path ${requiredPath}.`);
}
for (const language of PRODUCT_LOCALES) {
  const requiredPath = language === SITE_CONFIG.sourceLanguage.code ? '/contact.html#quoteForm' : `/${language}/contact.html#quoteForm`;
  check(php.includes(`'${requiredPath}'`), `send_inquiry.php: missing fixed Contact return path ${requiredPath}.`);
}
check(clickIdentifierBody.includes('[A-Za-z0-9._~-]+'), 'send_inquiry.php: click identifiers must use a strict character allowlist.');
check(campaignValueBody.includes('\\p{L}') && campaignValueBody.includes('\\p{N}'), 'send_inquiry.php: campaign fields must preserve international text through an explicit allowlist.');
check(trackingUrlBody.includes('FILTER_VALIDATE_URL'), 'send_inquiry.php: attribution URLs must be structurally validated.');
check(trackingUrlBody.includes("['https', 'http']"), 'send_inquiry.php: attribution URLs must be restricted to HTTP(S).');
check(trackingUrlBody.includes("['begapunk.com', 'www.begapunk.com']"), 'send_inquiry.php: first landing pages must use the Begapunk host allowlist.');
check(trackingUrlBody.includes("(int) $parts['port'] !== 443"), 'send_inquiry.php: first landing pages must reject nonstandard ports.');
const attributionReads = [
  ['gclid', '$gclid', 'normalize_click_identifier', 300],
  ['gbraid', '$gbraid', 'normalize_click_identifier', 300],
  ['wbraid', '$wbraid', 'normalize_click_identifier', 300],
  ['utm_source', '$utmSource', 'normalize_campaign_value', 200],
  ['utm_medium', '$utmMedium', 'normalize_campaign_value', 200],
  ['utm_campaign', '$utmCampaign', 'normalize_campaign_value', 200],
  ['utm_term', '$utmTerm', 'normalize_campaign_value', 200],
  ['utm_content', '$utmContent', 'normalize_campaign_value', 200],
  ['first_landing_page', '$firstLandingPage', 'normalize_tracking_url', 500],
  ['initial_referrer', '$initialReferrer', 'normalize_tracking_url', 500],
];
for (const [fieldName, variable, normalizer, limit] of attributionReads) {
  const expectedRead = variable + ' = ' + normalizer + "(post_value('" + fieldName + "', " + limit + ', $context)';
  check(php.includes(expectedRead), 'send_inquiry.php: ' + fieldName + ' must use ' + normalizer + ' after the ' + limit + '-character limit.');
  check(rowsRendering.includes(variable), 'send_inquiry.php: sanitized ' + fieldName + ' is missing from the internal inquiry record.');
  check(!respondBody.includes(fieldName), 'send_inquiry.php: response must not echo attribution field ' + fieldName + '.');
}
for (const resultCode of [
  'sent', 'invalid_method', 'origin_not_allowed', 'rate_limited', 'spam_detected',
  'field_too_long', 'required_fields', 'invalid_contact', 'attachment_invalid', 'service_unavailable', 'mail_failed',
]) {
  check(php.includes(`'${resultCode}'`), `send_inquiry.php: missing stable result code ${resultCode}.`);
}
check(!/post_value\(\s*['"]redirect['"]/.test(php), 'send_inquiry.php: visitor-controlled redirect field must not control navigation.');
check(!/\$_POST\s*\[\s*['"]redirect['"]/.test(php), 'send_inquiry.php: visitor-controlled redirect field must remain unused.');
check(attachmentBody.includes('10 * 1024 * 1024'), 'send_inquiry.php: 10 MB attachment limit was not retained.');
for (const serverUploadError of ['UPLOAD_ERR_NO_TMP_DIR', 'UPLOAD_ERR_CANT_WRITE', 'UPLOAD_ERR_EXTENSION']) {
  check(attachmentBody.includes(serverUploadError), `send_inquiry.php: server upload error ${serverUploadError} must remain distinguishable.`);
}
check(
  /respond\(\$context,\s*503,\s*false,\s*['"]service_unavailable['"],\s*['"]attachment_service_unavailable['"]\)/.test(attachmentBody),
  'send_inquiry.php: server-side upload failures must return 503 service_unavailable.',
);
for (const extension of ['pdf', 'step', 'stp', 'iges', 'igs', 'dwg', 'dxf', 'jpg', 'jpeg', 'png']) {
  check(attachmentBody.includes(`'${extension}'`), `send_inquiry.php: attachment extension ${extension} was not retained.`);
}
const securityAnchors = [
  'REQUEST_METHOD',
  'enforce_same_origin($context)',
  'enforce_rate_limit($context)',
  "post_value('honeypot'",
  "post_value('fullname'",
  'filter_var($email, FILTER_VALIDATE_EMAIL)',
  'validate_attachment($_FILES',
  '$mail->send()',
];
let previousAnchor = -1;
for (const anchor of securityAnchors) {
  const position = php.indexOf(anchor);
  check(position > previousAnchor, `send_inquiry.php: security step is missing or out of order: ${anchor}.`);
  previousAnchor = position;
}
check(php.includes('catch (\\Throwable $exception)'), 'send_inquiry.php: PHPMailer failures must stay inside a Throwable-safe boundary.');
check(!respondBody.includes('$_POST') && !/\$(?:name|email)\b/.test(respondBody), 'send_inquiry.php: native error HTML must not echo submitted data.');

for (const page of THANK_YOU_PAGES) {
  const absolute = path.join(ROOT, page.file);
  check(fs.existsSync(absolute) && fs.statSync(absolute).isFile(), `${page.file}: thank-you page does not exist.`);
  if (fs.existsSync(absolute)) {
    const $ = load(read(page.file));
    check($('html').attr('lang') === page.language, `${page.file}: thank-you page language must be ${page.language}.`);
  }
}

const packageJson = JSON.parse(read('package.json'));
check(
  packageJson.scripts?.['inquiry:verify'] === 'node scripts/verify-inquiry-contract.mjs && node scripts/verify-analytics-attribution.mjs',
  'package.json: inquiry:verify must include the contract and consent-attribution checks.',
);
for (const scriptName of ['quality:pr', 'deploy:prepare']) {
  const chain = String(packageJson.scripts?.[scriptName] || '').split(' && ');
  const inquiryIndexes = chain.reduce((indexes, command, index) => command === 'npm run inquiry:verify' ? [...indexes, index] : indexes, []);
  const analyticsCacheIndexes = chain.reduce((indexes, command, index) => command === 'npm run analytics:cache:verify' ? [...indexes, index] : indexes, []);
  const homepageLinksIndexes = chain.reduce((indexes, command, index) => command === 'npm run homepage-links:verify' ? [...indexes, index] : indexes, []);
  const discoveryIndexes = chain.reduce((indexes, command, index) => command === 'npm run discovery:verify' ? [...indexes, index] : indexes, []);
  check(inquiryIndexes.length === 1, `package.json: ${scriptName} must contain inquiry:verify exactly once.`);
  check(analyticsCacheIndexes.length === 1, `package.json: ${scriptName} must contain analytics:cache:verify exactly once.`);
  check(homepageLinksIndexes.length === 1, `package.json: ${scriptName} must contain homepage-links:verify exactly once.`);
  check(discoveryIndexes.length === 1, `package.json: ${scriptName} must contain discovery:verify exactly once.`);
  check(
    inquiryIndexes[0] + 1 === analyticsCacheIndexes[0]
      && analyticsCacheIndexes[0] + 1 === homepageLinksIndexes[0]
      && homepageLinksIndexes[0] + 1 === discoveryIndexes[0],
    `package.json: ${scriptName} must run inquiry:verify, analytics:cache:verify, homepage-links:verify, and discovery:verify in sequence.`,
  );
}

if (failures.length > 0) {
  console.error(`Inquiry contract verification failed (${failures.length} of ${checkCount} checks):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Verified inquiry contract (${checkCount} checks).`);
  console.log('No HTTP request, browser submission, PHP execution, or file write was performed.');
}
