import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANALYTICS_PATH = path.join(ROOT, 'js', 'analytics.js');
const ATTRIBUTION_KEY = 'begapunk_session_attribution_v1';
const CONSENT_KEY = 'begapunk_cookie_consent';
const ATTRIBUTION_FIELDS = [
  'gclid', 'gbraid', 'wbraid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'first_landing_page', 'initial_referrer',
];
const failures = [];
let checkCount = 0;

function check(condition, message) {
  checkCount += 1;
  if (!condition) failures.push(message);
}

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

function createFixture(source) {
  const now = new Date().toISOString();
  const localStorage = new MemoryStorage({
    [CONSENT_KEY]: JSON.stringify({ value: 'denied', version: '2.0', timestamp: now }),
  });
  const sessionStorage = new MemoryStorage();
  const listeners = new Map();
  const fields = new Map();
  const appendedScripts = [];

  for (const name of ATTRIBUTION_FIELDS) {
    fields.set(name, {
      id: name,
      name,
      tagName: 'INPUT',
      type: 'hidden',
      value: '',
    });
  }

  const attributes = new Map();
  const documentElement = {
    lang: 'en',
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.get(String(name)) ?? null;
    },
  };
  const document = {
    readyState: 'complete',
    referrer: 'https://search.example/results?q=rotary#result',
    cookie: '',
    documentElement,
    head: {
      appendChild(element) {
        if (element.src) appendedScripts.push(String(element.src));
        if (typeof element.onload === 'function') element.onload();
        return element;
      },
    },
    body: {
      appendChild(element) {
        return element;
      },
    },
    getElementById(id) {
      return fields.get(String(id)) ?? null;
    },
    createElement(tagName) {
      return {
        tagName: String(tagName).toUpperCase(),
        classList: { add() {}, remove() {} },
        setAttribute() {},
      };
    },
    addEventListener(type, listener) {
      const group = listeners.get(type) ?? [];
      group.push(listener);
      listeners.set(type, group);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
      return true;
    },
  };
  class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }

  const window = {
    document,
    location: new URL(
      'https://www.begapunk.com/fr/contact.html'
      + '?GCLID=Test.Click-123'
      + '&utm_source=google'
      + '&utm_medium=cpc'
      + '&utm_campaign=Pompes%20%C3%A0%20vide'
      + '&utm_term=joint%20tournant'
      + '&utm_content=ad%2B1'
      + '&gbraid=bad%20value'
      + '#quoteForm',
    ),
    matchMedia() {
      return { matches: true };
    },
  };
  const sandbox = {
    window,
    document,
    localStorage,
    sessionStorage,
    CustomEvent,
    URL,
    URLSearchParams,
    Date,
    JSON,
    Object,
    Array,
    Number,
    String,
    RegExp,
    Promise,
    encodeURIComponent,
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    console: { log() {}, warn() {}, error() {} },
  };

  vm.runInNewContext(source, sandbox, { filename: ANALYTICS_PATH });
  return { window, document, localStorage, sessionStorage, fields, listeners, appendedScripts, CustomEvent };
}

function calls(fixture) {
  return fixture.window.dataLayer.map((entry) => Array.from(entry));
}

function latestConsentCall(fixture, mode) {
  return calls(fixture).filter((entry) => entry[0] === 'consent' && entry[1] === mode).at(-1);
}

const source = fs.readFileSync(ANALYTICS_PATH, 'utf8');
check(source.includes("BANNER_VERSION: '2.0'"), 'analytics.js must invalidate analytics-only consent with banner version 2.0.');
check(source.includes("ATTRIBUTION_STORAGE_KEY: '" + ATTRIBUTION_KEY + "'"), 'analytics.js is missing the versioned session attribution key.');
check(!/\bAW-\d{5,}\b/.test(source), 'analytics.js must not invent or install a Google Ads destination ID.');
check(source.includes("trackEvent('whatsapp_click'"), 'WhatsApp must remain an auxiliary analytics event.');
check(source.includes("trackEvent('technical_document_download'"), 'Technical downloads must remain auxiliary analytics events.');
check(
  /document\.addEventListener\('submit',[\s\S]*?\}, true\);/.test(source),
  'Attribution must refresh in submit capture phase before contact handlers serialize FormData.',
);

const fixture = createFixture(source);
const initialDefault = latestConsentCall(fixture, 'default');
check(Boolean(initialDefault), 'Consent Mode default was not queued before GA initialization.');
for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
  check(initialDefault?.[2]?.[key] === 'denied', 'Consent Mode default must deny ' + key + '.');
}
check(fixture.sessionStorage.getItem(ATTRIBUTION_KEY) === null, 'Denied consent must not retain session attribution.');
check(ATTRIBUTION_FIELDS.every((name) => fixture.fields.get(name).value === ''), 'Denied consent must leave attribution fields empty.');
check(fixture.appendedScripts.length === 0, 'GA4 must not load before measurement consent.');

fixture.window.BegapunkConsent.grant();
const grantedUpdate = latestConsentCall(fixture, 'update');
for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data']) {
  check(grantedUpdate?.[2]?.[key] === 'granted', 'Measurement acceptance must grant ' + key + '.');
}
check(grantedUpdate?.[2]?.ad_personalization === 'denied', 'Measurement acceptance must keep ad_personalization denied.');
check(fixture.appendedScripts.length === 1, 'GA4 must load exactly once after measurement consent.');
check(
  fixture.appendedScripts[0] === 'https://www.googletagmanager.com/gtag/js?id=G-D4FZF37Z07',
  'Only the configured GA4 destination may load.',
);

const stored = JSON.parse(fixture.sessionStorage.getItem(ATTRIBUTION_KEY) || '{}');
check(stored.gclid === 'Test.Click-123', 'Mixed-case gclid query keys must be captured and sanitized.');
check(stored.gbraid === undefined, 'Malformed click identifiers must be discarded.');
check(stored.utm_source === 'google' && stored.utm_medium === 'cpc', 'Campaign source and medium were not captured.');
check(stored.utm_campaign === 'Pompes à vide', 'Unicode campaign names must be preserved.');
check(stored.utm_term === 'joint tournant' && stored.utm_content === 'ad+1', 'Campaign term/content were not captured.');
check(stored.first_landing_page.startsWith('https://www.begapunk.com/fr/contact.html?'), 'First landing page must stay on the site origin.');
check(!stored.first_landing_page.includes('#'), 'First landing page fragments must be removed.');
check(stored.initial_referrer === 'https://search.example/results?q=rotary', 'Initial referrer must be captured without its fragment.');
for (const name of ATTRIBUTION_FIELDS) {
  check(fixture.fields.get(name).value === (stored[name] || ''), 'Hidden field did not mirror sanitized session attribution: ' + name + '.');
}

const configCall = calls(fixture).find((entry) => entry[0] === 'config');
check(configCall?.[1] === 'G-D4FZF37Z07', 'GA4 configuration must retain the existing measurement ID.');
check(configCall?.[2]?.allow_google_signals === false, 'Google Signals must remain disabled.');
check(configCall?.[2]?.allow_ad_personalization_signals === false, 'Ad personalization signals must remain disabled.');
check(!calls(fixture).some((entry) => entry[0] === 'event' && entry[1] === 'generate_lead'), 'generate_lead must not fire during initialization or consent.');

fixture.document.dispatchEvent(new fixture.CustomEvent('begapunk:inquiry-success', {
  detail: { formId: 'quoteForm', inquiryType: 'quote', product: 'BP-TEST' },
}));
check(
  calls(fixture).filter((entry) => entry[0] === 'event' && entry[1] === 'generate_lead').length === 1,
  'generate_lead must fire only from the server-success event contract.',
);

fixture.window.BegapunkConsent.deny();
const deniedUpdate = latestConsentCall(fixture, 'update');
for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
  check(deniedUpdate?.[2]?.[key] === 'denied', 'Declining measurement must deny ' + key + '.');
}
check(fixture.sessionStorage.getItem(ATTRIBUTION_KEY) === null, 'Declining measurement must clear session attribution.');
check(ATTRIBUTION_FIELDS.every((name) => fixture.fields.get(name).value === ''), 'Declining measurement must clear attribution form fields.');

for (const phrase of [
  'Analytics and advertising measurement',
  'Analyse und Werbeerfolg messen',
  'アクセス解析と広告効果の計測',
  'Аналитика и оценка эффективности рекламы',
  'Analyse et mesure de l’efficacité publicitaire',
]) {
  check(source.includes(phrase), 'Consent banner is missing localized measurement copy: ' + phrase + '.');
}

for (const privacyFile of ['privacy.html', 'fr/privacy.html', 'de/privacy.html', 'ja/privacy.html', 'ru/privacy.html']) {
  const privacy = fs.readFileSync(path.join(ROOT, privacyFile), 'utf8');
  for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
    check(privacy.includes(key), privacyFile + ' must disclose Consent Mode v2 key ' + key + '.');
  }
  check(privacy.includes(ATTRIBUTION_KEY), privacyFile + ' must disclose session attribution storage.');
  for (const fieldName of ['gclid', 'gbraid', 'wbraid']) {
    check(privacy.includes(fieldName), privacyFile + ' must disclose attribution field ' + fieldName + '.');
  }
  check(/\butm(?:_|\b)/i.test(privacy), privacyFile + ' must disclose UTM campaign attribution.');
}

if (failures.length > 0) {
  console.error('Analytics attribution verification failed (' + failures.length + ' of ' + checkCount + ' checks):');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('Verified Consent Mode v2 and session attribution (' + checkCount + ' checks).');
  console.log('No HTTP request, browser submission, external write, or Ads destination was used.');
}
