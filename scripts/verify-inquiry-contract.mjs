import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTACT_PAGES = [
  { file: 'contact.html', language: 'en', basePath: '/contact.html', sending: 'Sending...' },
  { file: 'de/contact.html', language: 'de', basePath: '/de/contact.html', sending: 'Anfrage wird gesendet…' },
  { file: 'ja/contact.html', language: 'ja', basePath: '/ja/contact.html', sending: '送信中…' },
  { file: 'ru/contact.html', language: 'ru', basePath: '/ru/contact.html', sending: 'Отправка запроса…' },
];
const THANK_YOU_PAGES = [
  { file: 'thank-you.html', language: 'en' },
  { file: 'de/thank-you.html', language: 'de' },
  { file: 'ja/thank-you.html', language: 'ja' },
  { file: 'ru/thank-you.html', language: 'ru' },
];
const REQUIRED_HIDDEN_FIELDS = ['inquiry_type', 'source_model', 'source_product', 'source_page', 'source_url'];
const REQUIRED_NATIVE_FIELDS = ['fullname', 'email', 'company', 'country', 'product', 'requirements'];
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
};
const STABLE_CODES = new Set([
  'quote',
  '3d_step',
  'application_review',
  'seal_review',
  'verified_drawing',
  'technical_consultation',
  'general_inquiry',
]);

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

function pageRecord(config) {
  const html = read(config.file);
  const $ = load(html);
  const inlineScripts = $('script:not([src])').toArray()
    .filter((node) => String($(node).attr('type') || '').toLowerCase() !== 'application/ld+json')
    .map((node) => $(node).html() || '');
  const script = inlineScripts.find((source) => source.includes('REQUEST_CODE_MAP')) || '';
  return { ...config, html, $, script };
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

  reset() {}
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
  };
  const ids = [
    'mobileToggle', 'mainNav', 'quoteForm', 'formMessage', 'submitBtn', 'inquiry_type',
    'source_model', 'source_product', 'source_page', 'source_url', 'product', 'application',
    'requirements', 'fullname', 'email', 'company', 'country', 'drawing', 'drawing-name',
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
  const window = {
    location: {
      search,
      origin: 'https://www.begapunk.com',
    },
    scrollY: 0,
    addEventListener() {},
  };
  if (runtime.fetchAvailable !== false) {
    window.fetch = async (url, options) => {
      submission.fetchCalls.push({ url, options });
      if (runtime.networkFailure) {
        throw new Error('Synthetic network failure.');
      }
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
  for (const fieldName of REQUIRED_HIDDEN_FIELDS) {
    const field = page.$(`input[type="hidden"][name="${fieldName}"]`);
    check(field.length === 1, `${page.file}: hidden field ${fieldName} is missing or duplicated.`);
    check(field.attr('id') === fieldName, `${page.file}: hidden field ${fieldName} must retain its id.`);
  }
  check(page.$('#inquiry_type').attr('value') === 'general_inquiry', `${page.file}: inquiry_type default must be general_inquiry.`);
  check(page.$('select[name="product"]').length === 1, `${page.file}: product select is missing.`);
  check(page.$('input[name="application"]').length === 1, `${page.file}: application field is missing.`);
  check(page.$('textarea[name="requirements"]').length === 1, `${page.file}: requirements field is missing.`);
  for (const fieldName of REQUIRED_NATIVE_FIELDS) {
    const field = form.find(`[name="${fieldName}"]`);
    check(field.length === 1 && field.attr('required') !== undefined, `${page.file}: ${fieldName} must retain its native required constraint.`);
  }
  check(String(form.find('input[name="email"]').attr('type') || '').toLowerCase() === 'email', `${page.file}: email must retain its native email constraint.`);
  check(page.script !== '', `${page.file}: RFQ enhancement script was not found.`);

  if (page.script) {
    const baseline = runPageScript(page, '');
    check(baseline.fields.inquiry_type.value === 'general_inquiry', `${page.file}: no-parameter visit must use general_inquiry.`);
    check(baseline.fields.requirements.value === '', `${page.file}: no-parameter visit must leave requirements empty.`);
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
    check(
      [...Object.keys(baseline.contract.copy.requestLabels)].sort().join('|') === [...STABLE_CODES].sort().join('|'),
      `${page.file}: visible request labels do not cover all stable machine codes.`,
    );

    for (const [requestValue, expectedCode] of Object.entries(REQUEST_CODE_MAP)) {
      const result = runPageScript(page, `?request=${encodeURIComponent(requestValue)}`);
      check(result.fields.inquiry_type.value === expectedCode, `${page.file}: request=${requestValue} must map to ${expectedCode}.`);
      check(result.fields.requirements.value.trim() !== '', `${page.file}: request=${requestValue} must prefill requirements.`);
    }
    const legacy = runPageScript(page, '?inquiry_type=technical-consultation');
    check(legacy.fields.inquiry_type.value === 'technical_consultation', `${page.file}: legacy technical-consultation mapping failed.`);
    check(legacy.fields.requirements.value.trim() !== '', `${page.file}: valid legacy inquiry_type must prefill requirements.`);
    const stableInquiry = runPageScript(page, '?inquiry_type=seal_review');
    check(stableInquiry.fields.inquiry_type.value === 'seal_review', `${page.file}: stable inquiry_type mapping failed.`);
    const unknown = runPageScript(page, '?request=untrusted-business-classification');
    check(unknown.fields.inquiry_type.value === 'general_inquiry', `${page.file}: unknown request must fall back to general_inquiry.`);
    check(unknown.fields.requirements.value === '', `${page.file}: unknown request alone must leave requirements empty.`);
    const localizedProductOnly = runPageScript(page, '?product=BP-2P-130-0001');
    check(localizedProductOnly.fields.inquiry_type.value === 'general_inquiry', `${page.file}: product-only visit must remain general_inquiry.`);
    check(localizedProductOnly.fields.source_product.value === 'BP-2P-130-0001', `${page.file}: product-only visit must retain source_product.`);
    check(localizedProductOnly.fields.product.value === 'BP-2P-130-0001', `${page.file}: product-only visit must prefill the visible product field.`);
    check(localizedProductOnly.fields.requirements.value.includes('BP-2P-130-0001'), `${page.file}: product-only visit must prefill requirements.`);
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

    const businessFailure = await runSubmitFixture(page, { response: { success: false, message: '' } });
    check(businessFailure.event.defaultPrevented, `${page.file}: AJAX business failure must not fall through to native POST.`);
    check(
      businessFailure.fields.formMessage.textContent.includes(businessFailure.contract.copy.serviceUnavailable),
      `${page.file}: AJAX business-failure fallback is not localized.`,
    );

    const invalidJson = await runSubmitFixture(page, { invalidJson: true });
    check(invalidJson.event.defaultPrevented, `${page.file}: invalid JSON response must not trigger a duplicate native POST.`);
    check(
      invalidJson.fields.formMessage.textContent.includes(invalidJson.contract.copy.invalidResponse),
      `${page.file}: invalid-response feedback is not localized.`,
    );

    const networkFailure = await runSubmitFixture(page, { networkFailure: true });
    check(networkFailure.event.defaultPrevented, `${page.file}: network failure after AJAX interception must not trigger native POST.`);
    check(
      networkFailure.fields.formMessage.textContent.includes(networkFailure.contract.copy.networkFailure),
      `${page.file}: network-failure feedback is not localized.`,
    );
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
check(productOnly.fields.requirements.value.includes('BP-2P-130-0001'), 'product-only: requirements were not prefilled.');

const applicationOnly = runPageScript(german, '?request=application-review&application=cnc-pneumatic-clamping');
check(applicationOnly.fields.inquiry_type.value === 'application_review', 'application fixture: classification failed.');
check(applicationOnly.fields.application.value === 'cnc-pneumatic-clamping', 'application fixture: visible application field was not prefilled.');
check(applicationOnly.fields.requirements.value.includes('cnc-pneumatic-clamping'), 'application fixture: requirements omitted the application.');
check(applicationOnly.fields.requirements.value.includes('Anwendungsprüfung'), 'application fixture: German request label was not used.');

const sealReview = runPageScript(japanese, '?request=seal-review&model=BP-2P-08-0001');
check(sealReview.fields.inquiry_type.value === 'seal_review', 'seal review fixture: classification failed.');
check(sealReview.fields.source_model.value === 'BP-2P-08-0001', 'seal review fixture: source_model was not prefilled.');
check(sealReview.fields.product.value === 'BP-2P-08-0001', 'seal review fixture: product select was not prefilled from model.');
check(sealReview.fields.requirements.value.includes('シール選定確認'), 'seal review fixture: Japanese request label was not used.');

const technicalConsultation = runPageScript(russian, '?inquiry_type=technical-consultation&application=production-leak-testing');
check(technicalConsultation.fields.inquiry_type.value === 'technical_consultation', 'technical consultation fixture: classification failed.');
check(technicalConsultation.fields.application.value === 'production-leak-testing', 'technical consultation fixture: application was ignored.');
check(technicalConsultation.fields.requirements.value.includes('Техническая консультация'), 'technical consultation fixture: Russian request label was not used.');

const sourceFixture = runPageScript(english, '?request=quote&model=BP-1P-0003&product=BP-1P-0003&source=BP-1P-0003.html');
check(sourceFixture.fields.source_page.value === 'BP-1P-0003.html', 'valid source path was not retained.');
check(sourceFixture.fields.source_url.value !== '', 'valid source URL was not derived.');
if (sourceFixture.fields.source_url.value !== '') {
  const sourceUrl = new URL(sourceFixture.fields.source_url.value);
  check(sourceUrl.origin === 'https://www.begapunk.com', 'valid source URL was not kept on the site origin.');
  check(sourceUrl.pathname === '/BP-1P-0003.html', 'valid source URL has the wrong path.');
}
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
const wantsJsonBody = extractFunctionBody(php, 'request_wants_json');
const respondBody = extractFunctionBody(php, 'respond');
const languageBody = extractFunctionBody(php, 'normalize_source_language');
const attachmentBody = extractFunctionBody(php, 'validate_attachment');
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
check(languageBody.includes("['en', 'de', 'ja', 'ru']") && languageBody.includes("? $language : 'en'"), 'send_inquiry.php: source_language must use a strict four-language allowlist with English fallback.');
for (const requiredPath of ['/thank-you.html', '/de/thank-you.html', '/ja/thank-you.html', '/ru/thank-you.html']) {
  check(php.includes(`'${requiredPath}'`), `send_inquiry.php: missing fixed success path ${requiredPath}.`);
}
for (const requiredPath of ['/contact.html#quoteForm', '/de/contact.html#quoteForm', '/ja/contact.html#quoteForm', '/ru/contact.html#quoteForm']) {
  check(php.includes(`'${requiredPath}'`), `send_inquiry.php: missing fixed Contact return path ${requiredPath}.`);
}
for (const resultCode of [
  'sent', 'invalid_method', 'origin_not_allowed', 'rate_limited', 'spam_detected',
  'required_fields', 'invalid_contact', 'attachment_invalid', 'service_unavailable', 'mail_failed',
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
check(packageJson.scripts?.['inquiry:verify'] === 'node scripts/verify-inquiry-contract.mjs', 'package.json: inquiry:verify script is missing or incorrect.');
for (const scriptName of ['quality:pr', 'deploy:prepare']) {
  const chain = String(packageJson.scripts?.[scriptName] || '').split(' && ');
  const inquiryIndexes = chain.reduce((indexes, command, index) => command === 'npm run inquiry:verify' ? [...indexes, index] : indexes, []);
  const discoveryIndexes = chain.reduce((indexes, command, index) => command === 'npm run discovery:verify' ? [...indexes, index] : indexes, []);
  check(inquiryIndexes.length === 1, `package.json: ${scriptName} must contain inquiry:verify exactly once.`);
  check(discoveryIndexes.length === 1, `package.json: ${scriptName} must contain discovery:verify exactly once.`);
  check(
    inquiryIndexes[0] + 1 === discoveryIndexes[0],
    `package.json: ${scriptName} must place inquiry:verify immediately before discovery:verify.`,
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
