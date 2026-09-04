import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const siteRoot = path.resolve(process.argv[2] || sourceRoot);
const languages = [
  { code: 'en', directory: '', label: 'English' },
  { code: 'de', directory: 'de', label: 'Deutsch' },
  { code: 'fr', directory: 'fr', label: 'Français' },
  { code: 'ja', directory: 'ja', label: '日本語' },
  { code: 'ru', directory: 'ru', label: 'Русский' },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function findBrowser() {
  const candidates = process.platform === 'win32'
    ? [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next locally installed browser.
    }
  }
  throw new Error('No supported local Chrome or Edge executable was found.');
}

function contentType(filePath) {
  return ({
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff2': 'font/woff2',
  })[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function createPreviewServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
      const target = path.resolve(siteRoot, pathname);
      const relative = path.relative(siteRoot, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await fs.readFile(target);
      response.writeHead(200, {
        'Content-Type': contentType(target),
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function blockExternalRequests(page) {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (/^(?:file|data|blob):/i.test(url) || /^http:\/\/127\.0\.0\.1:/i.test(url)) request.continue();
    else request.abort();
  });
}

async function clickUnobscured(page, selector, description) {
  await page.$eval(selector, (element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForFunction((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (!element || element.disabled) return false;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    return Boolean(hit && (hit === element || element.contains(hit)));
  }, { timeout: 5000 }, selector);
  const hitTarget = await page.$eval(selector, (element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    return hit?.id || hit?.className || hit?.tagName || '';
  });
  assert(hitTarget, `${description}: control has no pointer-reachable hit target.`);
  await page.click(selector);
}

async function settleConsent(page) {
  await page.waitForFunction(() => {
    const state = document.documentElement.getAttribute('data-bp-consent-ui');
    const banner = document.getElementById('bp-consent-banner');
    return state === 'settled' || (state === 'open' && banner?.classList.contains('bp-visible'));
  }, { timeout: 5000 });
  const state = await page.evaluate(() => document.documentElement.getAttribute('data-bp-consent-ui'));
  if (state !== 'open') return;
  await clickUnobscured(page, '#bp-decline-btn', 'Consent decline');
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-bp-consent-ui') === 'settled',
    { timeout: 5000 },
  );
}

function publicPath(language, pageName) {
  return language.directory ? `/${language.directory}/${pageName}` : `/${pageName}`;
}

function diskPageUrl(language, pageName) {
  const directory = language.directory ? path.join(siteRoot, language.directory) : siteRoot;
  return pathToFileURL(path.join(directory, pageName));
}

function crossLanguageTarget(language) {
  return languages.find((candidate) => candidate.code === (language.code === 'fr' ? 'en' : 'fr'));
}

async function selectLanguage(page, targetLanguage) {
  const optionValue = await page.$eval(
    '.i18n-switcher select',
    (select, label) => [...select.options].find((option) => option.textContent.trim() === label)?.value || '',
    targetLanguage.label,
  );
  assert(optionValue, `Language option ${targetLanguage.label} is missing.`);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
    page.select('.i18n-switcher select', optionValue),
  ]);
}

function assertPreservedContext(actualUrl, expectedPathname, context, description) {
  assert(actualUrl.pathname === expectedPathname, `${description}: landed on ${actualUrl.pathname}, expected ${expectedPathname}.`);
  for (const [name, value] of Object.entries(context.parameters)) {
    assert(actualUrl.searchParams.get(name) === value, `${description}: ${name} was not preserved.`);
  }
  assert(!actualUrl.searchParams.has('unrelated'), `${description}: unrelated query data was copied.`);
  assert(actualUrl.hash === context.hash, `${description}: hash was not preserved.`);
}

function withContext(baseUrl, context) {
  const url = new URL(baseUrl);
  for (const [name, value] of Object.entries(context.inputParameters || context.parameters)) url.searchParams.set(name, value);
  url.searchParams.set('unrelated', 'must-not-cross-languages');
  url.hash = context.hash;
  return url.href;
}

const searchLanguageContext = Object.freeze({
  parameters: Object.freeze({
    q: 'BP-2P-0001',
    utm_source: 'google',
    utm_campaign: 'language-switch-test',
  }),
  hash: '#search-results',
});
const contactLanguageContext = Object.freeze({
  parameters: Object.freeze({
    request: 'application-review',
    model: 'BP-2P-0001',
    product: 'BP-2P-0001 2-Passage Pneumatic Rotary Union',
    application: 'laser tube cutting',
    source: 'BP-2P-0001.html',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'language-switch-test',
    gclid: 'test-click-id',
  }),
  inputParameters: Object.freeze({
    request: 'application-review',
    model: 'BP-2P-0001',
    product: 'BP-2P-0001 2-Passage Pneumatic Rotary Union',
    application: 'laser tube cutting',
    source: 'BP-2P-0001.html',
    UTM_SOURCE: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'language-switch-test',
    GCLID: 'test-click-id',
  }),
  hash: '#quoteForm',
});

const browser = await puppeteer.launch({
  executablePath: await findBrowser(),
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
});
const preview = await createPreviewServer();
const failures = [];
let searchChecks = 0;
let fileGuidanceChecks = 0;
let mobileKeyboardChecks = 0;
let httpLanguageContextChecks = 0;
let fileLanguageContextChecks = 0;
let noScriptSearchChecks = 0;
let loadingStateChecks = 0;

try {
  for (const language of languages) {
    const prefix = language.directory ? `/${language.directory}/` : '/';
    const diskDirectory = language.directory ? path.join(siteRoot, language.directory) : siteRoot;

    const searchPage = await browser.newPage();
    await blockExternalRequests(searchPage);
    try {
      await searchPage.goto(`${preview.origin}${prefix}search.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await settleConsent(searchPage);
      await searchPage.waitForFunction(() => (
        document.querySelector('#search-input:not([disabled])')
        && document.querySelectorAll('.search-result-card').length > 0
      ), { timeout: 10000 });
      const initialAccessibility = await searchPage.evaluate(() => ({
        inputLabel: document.getElementById('search-input')?.getAttribute('aria-label') || '',
        inputControls: document.getElementById('search-input')?.getAttribute('aria-controls'),
        countRole: document.getElementById('search-count')?.getAttribute('role'),
        countLive: document.getElementById('search-count')?.getAttribute('aria-live'),
        countAtomic: document.getElementById('search-count')?.getAttribute('aria-atomic'),
        filterGroupRole: document.querySelector('.search-filters')?.getAttribute('role'),
        filterGroupLabel: document.querySelector('.search-filters')?.getAttribute('aria-label') || '',
        pressed: [...document.querySelectorAll('.search-filter-btn')].map((button) => button.getAttribute('aria-pressed')),
      }));
      assert(initialAccessibility.inputLabel, `${language.code}: search input has no accessible name.`);
      assert(initialAccessibility.inputControls === 'search-results', `${language.code}: input does not identify its results region.`);
      assert(initialAccessibility.countRole === 'status' && initialAccessibility.countLive === 'polite' && initialAccessibility.countAtomic === 'true', `${language.code}: result count is not a polite atomic status.`);
      assert(initialAccessibility.filterGroupRole === 'group' && initialAccessibility.filterGroupLabel, `${language.code}: filter controls have no accessible group name.`);
      assert(initialAccessibility.pressed.filter((value) => value === 'true').length === 1, `${language.code}: filters do not expose exactly one selected state.`);

      await searchPage.$eval('#search-input', (input) => { input.value = 'BP-2P-0001'; });
      await clickUnobscured(searchPage, '#search-btn', `${language.code} search button`);
      await searchPage.waitForFunction(() => (
        new URL(window.location.href).searchParams.get('q') === 'BP-2P-0001'
        && document.querySelectorAll('.search-result-card').length > 0
      ), { timeout: 5000 });
      assert(await searchPage.$eval('.search-result-title', (element) => /BP-2P-0001/i.test(element.textContent)), `${language.code}: button-triggered search did not return the expected model.`);

      await clickUnobscured(searchPage, '.search-filter-btn[data-filter="product"]', `${language.code} product filter`);
      const pressedAfterFilter = await searchPage.$$eval('.search-filter-btn', (buttons) => buttons.map((button) => ({
        filter: button.dataset.filter,
        pressed: button.getAttribute('aria-pressed'),
        active: button.classList.contains('active'),
      })));
      assert(pressedAfterFilter.find((item) => item.filter === 'product')?.pressed === 'true', `${language.code}: selected filter did not update aria-pressed.`);
      assert(pressedAfterFilter.filter((item) => item.pressed === 'true' && item.active).length === 1, `${language.code}: visual and accessible filter selection diverged.`);

      const targetLanguage = crossLanguageTarget(language);
      await searchPage.goto(withContext(`${preview.origin}${prefix}search.html`, searchLanguageContext), { waitUntil: 'domcontentloaded', timeout: 15000 });
      await searchPage.waitForFunction(() => typeof window.BegapunkLanguageUrl === 'function', { timeout: 5000 });
      await selectLanguage(searchPage, targetLanguage);
      assertPreservedContext(
        new URL(searchPage.url()),
        publicPath(targetLanguage, 'search.html'),
        searchLanguageContext,
        `${language.code} HTTP search language switch`,
      );
      httpLanguageContextChecks += 1;
      searchChecks += 1;
    } catch (error) {
      failures.push(`${language.code} HTTP search: ${error.message}`);
    } finally {
      await searchPage.close();
    }

    const contactPage = await browser.newPage();
    await blockExternalRequests(contactPage);
    try {
      const targetLanguage = crossLanguageTarget(language);
      await contactPage.goto(withContext(`${preview.origin}${prefix}contact.html`, contactLanguageContext), { waitUntil: 'domcontentloaded', timeout: 15000 });
      await contactPage.waitForFunction(() => typeof window.BegapunkLanguageUrl === 'function', { timeout: 5000 });
      await selectLanguage(contactPage, targetLanguage);
      assertPreservedContext(
        new URL(contactPage.url()),
        publicPath(targetLanguage, 'contact.html'),
        contactLanguageContext,
        `${language.code} HTTP contact language switch`,
      );
      httpLanguageContextChecks += 1;
    } catch (error) {
      failures.push(`${language.code} HTTP contact language context: ${error.message}`);
    } finally {
      await contactPage.close();
    }

    const filePage = await browser.newPage();
    await blockExternalRequests(filePage);
    const siteSearchConsoleErrors = [];
    filePage.on('console', (message) => {
      if (message.type() === 'error' && /SiteSearch|Failed to fetch|CORS/i.test(message.text())) siteSearchConsoleErrors.push(message.text());
    });
    try {
      await filePage.goto(withContext(pathToFileURL(path.join(diskDirectory, 'search.html')).href, searchLanguageContext), { waitUntil: 'domcontentloaded', timeout: 15000 });
      await filePage.waitForSelector('.search-local-preview', { timeout: 5000 });
      const fileState = await filePage.evaluate(() => ({
        guidance: document.querySelector('.search-local-preview')?.textContent || '',
        command: document.querySelector('.search-local-preview code')?.textContent || '',
        countRole: document.getElementById('search-count')?.getAttribute('role'),
        controlsDisabled: [...document.querySelectorAll('#search-input, #search-btn, .search-filter-btn')]
          .every((control) => control.disabled),
      }));
      assert(fileState.guidance && fileState.command === 'npm run preview', `${language.code}: file preview does not show the HTTP-preview command.`);
      assert(fileState.countRole === 'status', `${language.code}: file-preview guidance is not announced as status.`);
      assert(fileState.controlsDisabled, `${language.code}: unavailable file-mode search controls remain interactive.`);
      assert(siteSearchConsoleErrors.length === 0, `${language.code}: file preview still attempts a blocked search fetch (${siteSearchConsoleErrors.join(' | ')}).`);

      const targetLanguage = crossLanguageTarget(language);
      await filePage.waitForFunction(() => typeof window.BegapunkLanguageUrl === 'function', { timeout: 5000 });
      await selectLanguage(filePage, targetLanguage);
      const expectedFileUrl = diskPageUrl(targetLanguage, 'search.html');
      assertPreservedContext(
        new URL(filePage.url()),
        expectedFileUrl.pathname,
        searchLanguageContext,
        `${language.code} file search language switch`,
      );
      assert(new URL(filePage.url()).protocol === 'file:', `${language.code}: file language switch left file preview mode.`);
      fileLanguageContextChecks += 1;
      fileGuidanceChecks += 1;
    } catch (error) {
      failures.push(`${language.code} file guidance: ${error.message}`);
    } finally {
      await filePage.close();
    }

    const noScriptSearchPage = await browser.newPage();
    await noScriptSearchPage.setJavaScriptEnabled(false);
    await noScriptSearchPage.setViewport({ width: 320, height: 568 });
    await blockExternalRequests(noScriptSearchPage);
    try {
      await noScriptSearchPage.goto(diskPageUrl(language, 'search.html').href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const noScriptSearchState = await noScriptSearchPage.evaluate(() => {
        const controls = [...document.querySelectorAll('#search-input, #search-btn, .search-filter-btn')];
        const fallback = document.querySelector('.search-no-js');
        const catalogLink = fallback?.querySelector('a[href]');
        return {
          controlCount: controls.length,
          controlsDisabled: controls.every((control) => control.disabled),
          fallbackText: fallback?.textContent.trim() || '',
          fallbackVisible: Boolean(fallback && getComputedStyle(fallback).display !== 'none' && fallback.getClientRects().length),
          catalogHref: catalogLink?.href || '',
          searchBusy: document.querySelector('.search-box-wrap')?.getAttribute('aria-busy'),
          navigationPosition: getComputedStyle(document.getElementById('mainNav')).position,
          headerPosition: getComputedStyle(document.querySelector('.header')).position,
          mainStartsAfterHeader: document.querySelector('main').getBoundingClientRect().top
            >= document.querySelector('.header').getBoundingClientRect().bottom - 1,
        };
      });
      assert(noScriptSearchState.controlCount === 7 && noScriptSearchState.controlsDisabled, `${language.code}: no-JavaScript search controls look usable.`);
      assert(noScriptSearchState.fallbackVisible && noScriptSearchState.fallbackText.length > 20, `${language.code}: no-JavaScript search guidance is missing.`);
      assert(new URL(noScriptSearchState.catalogHref).pathname === diskPageUrl(language, 'products.html').pathname, `${language.code}: no-JavaScript catalog fallback is not localized.`);
      assert(noScriptSearchState.searchBusy === 'false', `${language.code}: no-JavaScript search is incorrectly left busy.`);
      assert(noScriptSearchState.navigationPosition === 'static' && noScriptSearchState.headerPosition !== 'sticky', `${language.code}: no-JavaScript navigation still overlays the document.`);
      assert(noScriptSearchState.mainStartsAfterHeader, `${language.code}: no-JavaScript navigation covers the search page body.`);
      await noScriptSearchPage.$eval('.search-no-js', (fallback) => {
        fallback.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      const fallbackReachable = await noScriptSearchPage.$eval('.search-no-js', (fallback) => {
        const rect = fallback.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      });
      assert(fallbackReachable, `${language.code}: no-JavaScript search fallback cannot be reached by scrolling.`);
      noScriptSearchChecks += 1;
    } catch (error) {
      failures.push(`${language.code} no-JavaScript search: ${error.message}`);
    } finally {
      await noScriptSearchPage.close();
    }

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 320, height: 844 });
    await blockExternalRequests(mobilePage);
    try {
      await mobilePage.goto(`${preview.origin}${prefix}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await mobilePage.waitForSelector('html.site-navigation-ready #mobileToggle', { visible: true, timeout: 5000 });
      await mobilePage.focus('#mobileToggle');
      await mobilePage.keyboard.press('Enter');
      await mobilePage.waitForFunction(() => (
        document.getElementById('mobileToggle')?.getAttribute('aria-expanded') === 'true'
        && document.getElementById('mainNav')?.contains(document.activeElement)
      ), { timeout: 5000 });
      assert(await mobilePage.evaluate(() => document.activeElement?.matches('#mainNav a[href]')), `${language.code}: opening the menu did not focus its first link.`);

      await mobilePage.keyboard.press('Escape');
      const escapedState = await mobilePage.evaluate(() => ({
        expanded: document.getElementById('mobileToggle')?.getAttribute('aria-expanded'),
        toggleFocused: document.activeElement === document.getElementById('mobileToggle'),
      }));
      assert(escapedState.expanded === 'false' && escapedState.toggleFocused, `${language.code}: Escape did not close the menu and restore toggle focus.`);

      await mobilePage.keyboard.press('Enter');
      await mobilePage.waitForFunction(() => document.getElementById('mainNav')?.contains(document.activeElement), { timeout: 5000 });
      await mobilePage.$eval('.i18n-switcher select', (select) => select.focus());
      assert(await mobilePage.$eval('#mobileToggle', (toggle) => toggle.getAttribute('aria-expanded') === 'false'), `${language.code}: menu remained open after focus left it.`);
      mobileKeyboardChecks += 1;
    } catch (error) {
      failures.push(`${language.code} mobile keyboard menu: ${error.message}`);
    } finally {
      await mobilePage.close();
    }
  }

  const loadingPage = await browser.newPage();
  await loadingPage.setRequestInterception(true);
  let heldIndexRequest = null;
  let releaseHeldIndex;
  const heldIndexPromise = new Promise((resolve) => { releaseHeldIndex = resolve; });
  loadingPage.on('request', (request) => {
    const url = request.url();
    if (/^http:\/\/127\.0\.0\.1:/i.test(url) && /\/ru\/search-index\.json(?:\?|$)/i.test(url)) {
      heldIndexRequest = request;
      releaseHeldIndex(request);
      return;
    }
    if (/^(?:file|data|blob):/i.test(url) || /^http:\/\/127\.0\.0\.1:/i.test(url)) request.continue();
    else request.abort();
  });
  try {
    const navigationPromise = loadingPage.goto(`${preview.origin}/ru/search.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timed out waiting to hold the search index request.')), 5000);
    });
    await Promise.race([heldIndexPromise, timeoutPromise]);
    await navigationPromise;
    const loadingState = await loadingPage.evaluate(() => ({
      controlsDisabled: [...document.querySelectorAll('#search-input, #search-btn, .search-filter-btn')]
        .every((control) => control.disabled),
      busy: document.querySelector('.search-box-wrap')?.getAttribute('aria-busy'),
    }));
    assert(loadingState.controlsDisabled && loadingState.busy === 'true', 'Slow search load exposes interactive controls before handlers are ready.');
    await loadingPage.$eval('#search-input', (input) => { input.value = 'BP-2P-0001'; });
    await heldIndexRequest.continue();
    heldIndexRequest = null;
    await loadingPage.waitForFunction(() => (
      !document.querySelector('#search-input')?.disabled
      && document.querySelector('.search-box-wrap')?.getAttribute('aria-busy') === 'false'
      && document.querySelector('#search-input')?.value === 'BP-2P-0001'
      && new URL(window.location.href).searchParams.get('q') === 'BP-2P-0001'
      && document.querySelectorAll('.search-result-card').length > 0
    ), { timeout: 10000 });
    await loadingPage.$eval('#search-input', (input) => { input.value = 'BP-3P-0004'; });
    await loadingPage.click('#search-btn');
    await loadingPage.waitForFunction(() => (
      new URL(window.location.href).searchParams.get('q') === 'BP-3P-0004'
      && /BP-3P-0004/i.test(document.querySelector('.search-result-title')?.textContent || '')
    ), { timeout: 5000 });
    loadingStateChecks += 1;
  } catch (error) {
    failures.push(`slow search initialization: ${error.message}`);
  } finally {
    if (heldIndexRequest) {
      try { await heldIndexRequest.continue(); } catch { /* Page may already be closing. */ }
    }
    await loadingPage.close();
  }

  const noScriptPage = await browser.newPage();
  await noScriptPage.setJavaScriptEnabled(false);
  await noScriptPage.setViewport({ width: 320, height: 844 });
  try {
    await noScriptPage.goto(`${preview.origin}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const noScriptState = await noScriptPage.evaluate(() => {
      const nav = document.getElementById('mainNav');
      const toggle = document.getElementById('mobileToggle');
      const header = document.querySelector('.header');
      const main = document.querySelector('main');
      const firstLink = nav?.querySelector('a[href]');
      const navStyle = nav ? getComputedStyle(nav) : null;
      const toggleStyle = toggle ? getComputedStyle(toggle) : null;
      return {
        enhancedClass: document.documentElement.classList.contains('site-navigation-ready'),
        navVisible: Boolean(nav && navStyle?.display !== 'none' && nav.getClientRects().length),
        navPosition: navStyle?.position,
        headerPosition: header ? getComputedStyle(header).position : '',
        mainStartsAfterHeader: Boolean(header && main && main.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1),
        toggleHidden: toggleStyle?.display === 'none',
        firstLinkVisible: Boolean(firstLink && getComputedStyle(firstLink).display !== 'none' && firstLink.getClientRects().length),
      };
    });
    assert(!noScriptState.enhancedClass, 'No-JavaScript page was incorrectly marked as enhanced.');
    assert(noScriptState.navVisible && noScriptState.firstLinkVisible, 'No-JavaScript mobile navigation is not visible and usable.');
    assert(noScriptState.navPosition === 'static' && noScriptState.headerPosition !== 'sticky', 'No-JavaScript mobile navigation remains an overlay.');
    assert(noScriptState.mainStartsAfterHeader, 'No-JavaScript mobile navigation covers the page body.');
    assert(noScriptState.toggleHidden, 'No-JavaScript page still shows a non-functional menu button.');
  } catch (error) {
    failures.push(`no-JavaScript mobile menu: ${error.message}`);
  } finally {
    await noScriptPage.close();
  }
} finally {
  await preview.close();
  await browser.close();
}

if (failures.length) {
  console.error(`Search/navigation interaction verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Search/navigation interactions passed: ${searchChecks} HTTP button searches, ${httpLanguageContextChecks} HTTP language-context switches, ${fileGuidanceChecks} file-preview guidance checks, ${fileLanguageContextChecks} file language-context switches, ${noScriptSearchChecks} no-JavaScript search fallbacks, ${loadingStateChecks} held-index loading-state check, ${mobileKeyboardChecks} keyboard-menu checks, and 1 no-JavaScript mobile-navigation check.`);
