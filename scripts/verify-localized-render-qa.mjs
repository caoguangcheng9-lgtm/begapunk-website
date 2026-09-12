import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';
import {
  chooseSelectOptionWithPointerAndKeyboard,
  collectPageErrors,
  openMobileNavigationWithPointer,
  requireFreshNavigationResponses,
} from './lib/browser-interaction-gate.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const releaseInventory = JSON.parse(await fs.readFile(
  path.join(sourceRoot, 'audit', 'policy', 'release-html-inventory.json'),
  'utf8',
));
const errorPages = new Set(releaseInventory.errorPages || []);
const argumentsList = process.argv.slice(2);
const positionalRoot = argumentsList.find((argument) => !argument.startsWith('--'));
const siteRoot = path.resolve(positionalRoot || sourceRoot);
const languageArgument = argumentsList.find((argument) => argument.startsWith('--languages='));
const pagesArgument = argumentsList.find((argument) => argument.startsWith('--pages='));
const reportArgument = argumentsList.find((argument) => argument.startsWith('--report='));
const baseUrlArgument = argumentsList.find((argument) => argument.startsWith('--base-url='));
const expectedRootArgument = argumentsList.find((argument) => argument.startsWith('--expected-root='));
const externalBaseUrl = baseUrlArgument
  ? baseUrlArgument.slice('--base-url='.length).replace(/\/+$/u, '')
  : null;
const expectedArtifactRoot = expectedRootArgument
  ? path.resolve(expectedRootArgument.slice('--expected-root='.length))
  : null;
const requestedLanguages = languageArgument
  ? languageArgument.slice('--languages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [config.sourceLanguage.code, ...config.activeLanguageCodes];
const configuredLanguages = new Set([config.sourceLanguage.code, ...config.activeLanguageCodes]);
const switcherLanguages = [config.sourceLanguage, ...config.activeLanguageCodes.map((code) => {
  const language = config.languages.find((candidate) => candidate.code === code);
  if (!language) throw new Error(`Missing language metadata for ${code}.`);
  return language;
})];
const expectedSwitcherLabels = switcherLanguages.map((language) => language.label);
const requestedPages = pagesArgument
  ? pagesArgument.slice('--pages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [...config.pages];

for (const language of requestedLanguages) {
  if (!configuredLanguages.has(language)) throw new Error(`Unsupported localized language: ${language}.`);
}
for (const pageName of requestedPages) {
  if (!config.pages.includes(pageName)) throw new Error(`Unsupported localized page: ${pageName}.`);
}
if (externalBaseUrl) {
  const target = new URL(externalBaseUrl);
  if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('--base-url must be a clean HTTPS origin without credentials, path, query, or fragment.');
  }
}
if (expectedArtifactRoot && !externalBaseUrl) {
  throw new Error('--expected-root is only valid with --base-url production verification.');
}
const expectedReleaseManifestSha256 = expectedArtifactRoot
  ? sha256(await fs.readFile(path.join(expectedArtifactRoot, 'manifest.sha256')))
  : null;

const viewports = Object.freeze([
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]);

const contentTypes = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
});

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function contentType(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function publicPathname(language, pageName) {
  if (language === config.sourceLanguage.code) return pageName === 'index.html' ? '/' : `/${pageName}`;
  return pageName === 'index.html' ? `/${language}/` : `/${language}/${pageName}`;
}

function artifactRelativePath(language, pageName) {
  return language === config.sourceLanguage.code ? pageName : `${language}/${pageName}`;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function verifyExactArtifactResponse(response, language, pageName, route, viewportName) {
  if (!expectedArtifactRoot) return null;
  const relativePath = artifactRelativePath(language, pageName);
  const expectedBytes = await fs.readFile(path.join(expectedArtifactRoot, ...relativePath.split('/')));
  const actualBytes = await response.buffer();
  const expectedDigest = sha256(expectedBytes);
  const actualDigest = sha256(actualBytes);
  if (actualDigest !== expectedDigest) {
    failures.push(`${route} @ ${viewportName}: public HTML SHA-256 ${actualDigest} does not match audited artifact ${expectedDigest}.`);
  }
  return { relativePath, expectedDigest, actualDigest };
}

async function settleOptionalConsent(page) {
  const declineButton = await page.$('#bp-decline-btn');
  if (!declineButton) return false;
  const rendered = await declineButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') !== 0
      && element.getClientRects().length > 0;
  });
  if (!rendered) return false;
  await declineButton.click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-bp-consent-ui') === 'settled'
      && !document.querySelector('#bp-consent-banner'),
    { timeout: 3000 },
  );
  return true;
}

async function inspectClickableElement(element, { scroll = false } = {}) {
  if (scroll) {
    await element.evaluate((candidate) => {
      const root = document.documentElement;
      const previousInlineBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      candidate.scrollIntoView({ block: 'center', inline: 'center' });
      root.style.scrollBehavior = previousInlineBehavior;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return element.evaluate((candidate) => {
    const style = getComputedStyle(candidate);
    const rect = candidate.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const centerInsideViewport = centerX >= 0
      && centerX <= document.documentElement.clientWidth
      && centerY >= 0
      && centerY <= document.documentElement.clientHeight;
    const hitTarget = centerInsideViewport ? document.elementFromPoint(centerX, centerY) : null;
    return {
      rendered: style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') !== 0
        && style.pointerEvents !== 'none'
        && rect.width > 0
        && rect.height > 0
        && centerInsideViewport
        && Boolean(hitTarget && candidate.contains(hitTarget)),
      disabled: Boolean(candidate.disabled) || candidate.getAttribute('aria-disabled') === 'true',
      href: candidate.getAttribute('href'),
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      hitTarget: hitTarget
        ? `${hitTarget.tagName.toLowerCase()}${hitTarget.id ? `#${hitTarget.id}` : ''}${[...hitTarget.classList].map((name) => `.${name}`).join('')}`
        : null,
    };
  });
}

async function createServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname).replace(/^\/+/, '');
      const requested = path.resolve(siteRoot, pathname || 'index.html');
      if (!isInside(siteRoot, requested)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = await fs.stat(requested);
      const filePath = stat.isDirectory() ? path.join(requested, 'index.html') : requested;
      const body = await fs.readFile(filePath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': body.length,
        'Content-Type': contentType(filePath),
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
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
      // Try the next local browser.
    }
  }
  throw new Error('No supported local Chrome or Edge executable was found.');
}

const suspiciousByLanguage = Object.freeze({
  fr: /union rotative pneumatique|syndicat rotatif|autorisation de ne pas communiquer|joint d['’]évacuation|C['’]est pas vrai|croquis de circuit aérien|\bclampage\b|\bdéclamp\b|\bdessin approuvé\b|\bEnquête reçue\b/iu,
  de: /Erzeugnisse|Sonderanfrage|uns benachrichtigen|through-Bohrung|Air Kanäle|Rutschring/iu,
  ja: /据え付け品|密集した|回転式移動|気圧電気|チャネルカウント|工具細工/iu,
  ru: /Пользователь RFQ|Пользовательский дизайн|Ротари|радиальный клиренс|счет станции/iu,
});
const genericGarbled = /\uFFFD|__(?:PH|TR|Ф|ТР)?[A-ZА-ЯЁ]{4,8}__|(?:\bX\s+){5,}\bX\b/u;

const server = externalBaseUrl ? null : await createServer();
const address = server?.address();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${address.port}`;
const allowedOrigin = new URL(baseUrl).origin;
const executablePath = await findBrowser();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
});
const browserVersion = await browser.version();

const startedAt = new Date().toISOString();
const failures = [];
let checks = 0;
let logoNavigationChecks = 0;
let homeNavigationChecks = 0;
let languageNavigationChecks = 0;
let quoteNavigationChecks = 0;
let quoteFormChecks = 0;
let exactArtifactChecks = 0;
let consentSettlementChecks = 0;

try {
  for (const language of requestedLanguages) {
    for (const pageName of requestedPages) {
      for (const viewport of viewports) {
        const page = await browser.newPage();
        await requireFreshNavigationResponses(page);
        const consoleErrors = [];
        const pageErrors = collectPageErrors(page);
        page.on('console', (message) => {
          if (message.type() === 'error' && !/net::ERR_FAILED/u.test(message.text())) consoleErrors.push(message.text());
        });
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const url = request.url();
          try {
            if (new URL(url).origin === allowedOrigin || url.startsWith('data:') || url.startsWith('blob:')) request.continue();
            else request.abort();
          } catch {
            request.abort();
          }
        });
        const route = `${language}/${pageName}`;
        const pathname = publicPathname(language, pageName);
        try {
          const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle0', timeout: 30000 });
          if (!response || response.status() !== 200) {
            failures.push(`${route} @ ${viewport.name}: HTTP ${response?.status() ?? 'no response'}.`);
            continue;
          }
          if (await verifyExactArtifactResponse(response, language, pageName, route, viewport.name)) {
            exactArtifactChecks += 1;
          }
          if (await settleOptionalConsent(page)) consentSettlementChecks += 1;
          await page.evaluate(async () => {
            document.querySelectorAll('img[loading="lazy"]').forEach((image) => { image.loading = 'eager'; });
            if (document.fonts?.ready) await document.fonts.ready;
            const pendingImages = [...document.images]
              .filter((image) => !image.complete)
              .map((image) => new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              }));
            await Promise.race([
              Promise.all(pendingImages),
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
          });
          const result = await page.evaluate(({ expectedLanguage, garbledSource, localizedSource }) => {
            const isRendered = (element) => {
              if (!element) return false;
              const style = getComputedStyle(element);
              return style.display !== 'none'
                && style.visibility !== 'hidden'
                && Number.parseFloat(style.opacity || '1') !== 0
                && element.getClientRects().length > 0;
            };
            const visibleH1 = [...document.querySelectorAll('h1')].filter(isRendered);
            const headerItems = [...document.querySelectorAll('.header-inner > .logo, .header-inner > .nav, .header-inner > .i18n-switcher, .header-inner > .mobile-toggle')]
              .filter(isRendered)
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return { className: element.className, left: rect.left, right: rect.right };
              })
              .sort((left, right) => left.left - right.left);
            const headerOverlaps = headerItems.slice(1).flatMap((item, index) => (
              item.left < headerItems[index].right - 1
                ? [`${headerItems[index].className} / ${item.className}`]
                : []
            ));
            const brokenImages = [...document.images]
              .filter(isRendered)
              .filter((image) => image.complete && image.naturalWidth === 0)
              .map((image) => image.getAttribute('src') || image.getAttribute('alt') || '(unknown image)');
            const root = document.documentElement;
            const bodyText = document.body?.innerText || '';
            const garbled = new RegExp(garbledSource, 'u').test(bodyText);
            const unnatural = localizedSource ? new RegExp(localizedSource, 'iu').test(bodyText) : false;
            return {
              htmlLanguage: root.lang,
              totalH1: document.querySelectorAll('h1').length,
              visibleH1: visibleH1.length,
              overflow: Math.max(root.scrollWidth, document.body?.scrollWidth || 0) - root.clientWidth,
              brokenImages,
              garbled,
              unnatural,
              headerOverlaps,
              homeLinkVisible: isRendered(document.querySelector('.nav-home-mobile')),
              mobileToggleVisible: isRendered(document.querySelector('#mobileToggle')),
              switcherLabels: [...document.querySelectorAll('.i18n-switcher option')]
                .map((option) => option.textContent.trim()),
              selectedLanguageLabels: [...document.querySelectorAll('.i18n-switcher option:checked')]
                .map((option) => option.textContent.trim()),
              canonicalHrefs: [...document.querySelectorAll('link[rel="canonical"]')]
                .map((link) => link.href),
              hreflangEntries: [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
                .map((link) => ({ language: link.getAttribute('hreflang'), href: link.href })),
              title: document.title,
              expectedLanguage,
            };
          }, {
            expectedLanguage: language,
            garbledSource: genericGarbled.source,
            localizedSource: suspiciousByLanguage[language]?.source || '',
          });
          if (result.htmlLanguage !== language) failures.push(`${route} @ ${viewport.name}: html lang is ${JSON.stringify(result.htmlLanguage)}.`);
          if (result.totalH1 !== 1 || result.visibleH1 !== 1) {
            failures.push(`${route} @ ${viewport.name}: expected one visible H1, found ${result.visibleH1}/${result.totalH1}.`);
          }
          if (result.overflow > 1) failures.push(`${route} @ ${viewport.name}: horizontal overflow is ${result.overflow}px.`);
          if (result.brokenImages.length) failures.push(`${route} @ ${viewport.name}: broken rendered images: ${result.brokenImages.join(', ')}.`);
          if (result.garbled) failures.push(`${route} @ ${viewport.name}: garbled or placeholder text detected.`);
          if (result.unnatural) failures.push(`${route} @ ${viewport.name}: known unnatural localized phrase detected.`);
          if (result.headerOverlaps.length) failures.push(`${route} @ ${viewport.name}: Header controls overlap (${result.headerOverlaps.join(', ')}).`);
          if (viewport.name === 'desktop' && !result.homeLinkVisible) failures.push(`${route} @ desktop: explicit Home navigation link is not visible.`);
          if (viewport.name === 'mobile' && !result.mobileToggleVisible) failures.push(`${route} @ mobile: menu button is not visible.`);
          if (JSON.stringify(result.switcherLabels) !== JSON.stringify(expectedSwitcherLabels)) {
            failures.push(`${route} @ ${viewport.name}: language options are ${JSON.stringify(result.switcherLabels)}, expected ${JSON.stringify(expectedSwitcherLabels)}.`);
          }
          const currentLanguageLabel = switcherLanguages.find((candidate) => candidate.code === language)?.label;
          if (result.selectedLanguageLabels.length !== 1 || result.selectedLanguageLabels[0] !== currentLanguageLabel) {
            failures.push(`${route} @ ${viewport.name}: selected language is ${JSON.stringify(result.selectedLanguageLabels)}, expected ${currentLanguageLabel}.`);
          }
          if (!result.title.trim()) failures.push(`${route} @ ${viewport.name}: document title is empty.`);
          if (errorPages.has(pageName)) {
            if (result.canonicalHrefs.length || result.hreflangEntries.length) {
              failures.push(`${route} @ ${viewport.name}: error pages must not advertise canonical or hreflang index targets.`);
            }
          } else {
            const expectedCanonical = `${config.siteUrl}${publicPathname(language, pageName)}`;
            if (result.canonicalHrefs.length !== 1 || result.canonicalHrefs[0] !== expectedCanonical) {
              failures.push(`${route} @ ${viewport.name}: canonical links are ${JSON.stringify(result.canonicalHrefs)}, expected exactly ${expectedCanonical}.`);
            }
            const expectedHreflangEntries = [
              ...switcherLanguages.map((candidate) => ({
                language: candidate.code,
                href: `${config.siteUrl}${publicPathname(candidate.code, pageName)}`,
              })),
              {
                language: 'x-default',
                href: `${config.siteUrl}${publicPathname(config.sourceLanguage.code, pageName)}`,
              },
            ];
            const hreflangSortKey = (entry) => `${entry.language}\u0000${entry.href}`;
            const actualHreflangEntries = result.hreflangEntries.toSorted((left, right) => (
              hreflangSortKey(left) < hreflangSortKey(right) ? -1 : hreflangSortKey(left) > hreflangSortKey(right) ? 1 : 0
            ));
            const sortedExpectedHreflangEntries = expectedHreflangEntries.toSorted((left, right) => (
              hreflangSortKey(left) < hreflangSortKey(right) ? -1 : hreflangSortKey(left) > hreflangSortKey(right) ? 1 : 0
            ));
            if (JSON.stringify(actualHreflangEntries) !== JSON.stringify(sortedExpectedHreflangEntries)) {
              failures.push(`${route} @ ${viewport.name}: hreflang entries do not exactly match the configured reciprocal cluster.`);
            }
          }
          if (consoleErrors.length) failures.push(`${route} @ ${viewport.name}: console errors: ${consoleErrors.join(' | ')}.`);
          const primaryLanguageTarget = language === 'fr'
            ? config.sourceLanguage
            : switcherLanguages.find((candidate) => candidate.code === 'fr');
          if (!primaryLanguageTarget) {
            failures.push(`${route} @ ${viewport.name}: cross-language test target is unavailable.`);
          } else {
            const languageTargets = pageName === 'index.html'
              ? switcherLanguages.filter((candidate) => candidate.code !== language)
              : [primaryLanguageTarget];
            for (const [targetIndex, languageTarget] of languageTargets.entries()) {
              if (targetIndex > 0) {
                await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
              }
              const { response: languageResponse } = await chooseSelectOptionWithPointerAndKeyboard(
                page,
                languageTarget.label,
              );
              const languageLanding = new URL(page.url());
              const expectedLanguagePathname = publicPathname(languageTarget.code, pageName);
              if (languageLanding.pathname !== expectedLanguagePathname) {
                failures.push(`${route} @ ${viewport.name}: ${languageTarget.label} selection landed on ${languageLanding.pathname}, expected ${expectedLanguagePathname}.`);
              }
              if (!languageResponse || languageResponse.status() !== 200) {
                failures.push(`${route} @ ${viewport.name}: ${languageTarget.label} destination returned HTTP ${languageResponse?.status() ?? 'no response'}.`);
              }
              const destinationState = await page.evaluate(() => ({
                language: document.documentElement.lang,
                headerPresent: Boolean(document.querySelector('header a.logo')),
              }));
              if (destinationState.language !== languageTarget.code || !destinationState.headerPresent) {
                failures.push(`${route} @ ${viewport.name}: ${languageTarget.label} destination content is incomplete or has lang=${JSON.stringify(destinationState.language)}.`);
              }
              languageNavigationChecks += 1;
            }
            await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          }
          const expectedPathname = publicPathname(language, 'index.html');
          const expectedContactPathname = publicPathname(language, 'contact.html');
          if (pageName === 'contact.html') {
            const submitButton = await page.$('form#quoteForm button[type="submit"]');
            if (!submitButton) {
              failures.push(`${route} @ ${viewport.name}: quote form submit control is missing.`);
            } else {
              const submitState = await inspectClickableElement(submitButton, { scroll: true });
              if (!submitState.rendered || submitState.disabled) {
                failures.push(`${route} @ ${viewport.name}: quote form submit control is not visibly actionable (${JSON.stringify(submitState)}).`);
              } else {
                quoteFormChecks += 1;
              }
            }
          } else {
            const quoteCandidates = await page.$$('a.nav-cta[href], a.floating-btn.quote[href], a.footer-quote[href], a.btn[href*="contact.html"]');
            let quoteLink = null;
            let quoteState = null;
            const inspectedStates = [];
            for (const candidate of quoteCandidates) {
              const state = await inspectClickableElement(candidate);
              inspectedStates.push(state);
              if (state.rendered && !state.disabled && state.href) {
                quoteLink = candidate;
                quoteState = state;
                break;
              }
            }
            if (!quoteLink) {
              for (const candidate of quoteCandidates) {
                const state = await inspectClickableElement(candidate, { scroll: true });
                inspectedStates.push(state);
                if (state.rendered && !state.disabled && state.href) {
                  quoteLink = candidate;
                  quoteState = state;
                  break;
                }
              }
            }
            // The success page intentionally offers products/WhatsApp rather
            // than asking for another inquiry. Its contact route is in Menu.
            // Exercise that real route instead of requiring a duplicate CTA.
            if (!quoteLink && pageName === 'thank-you.html' && viewport.name === 'mobile') {
              await openMobileNavigationWithPointer(page);
              const candidate = await page.$('#mainNav a.nav-cta[href]');
              if (candidate) {
                const state = await inspectClickableElement(candidate, { scroll: true });
                inspectedStates.push(state);
                if (state.rendered && !state.disabled && state.href) {
                  quoteLink = candidate;
                  quoteState = state;
                }
              }
            }
            if (!quoteLink || !quoteState) {
              failures.push(`${route} @ ${viewport.name}: no quote/contact CTA is visibly clickable (${JSON.stringify(inspectedStates)}).`);
            } else {
              const [quoteResponse] = await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
                page.mouse.click(
                  quoteState.rect.left + quoteState.rect.width / 2,
                  quoteState.rect.top + quoteState.rect.height / 2,
                ),
              ]);
              const quoteLanding = new URL(page.url());
              if (quoteLanding.pathname !== expectedContactPathname) {
                failures.push(`${route} @ ${viewport.name}: quote navigation landed on ${quoteLanding.pathname}, expected ${expectedContactPathname}.`);
              }
              if (!quoteResponse || quoteResponse.status() !== 200) {
                failures.push(`${route} @ ${viewport.name}: quote destination returned HTTP ${quoteResponse?.status() ?? 'no response'}.`);
              }
              const quoteDestination = await page.evaluate(() => ({
                language: document.documentElement.lang,
                formPresent: Boolean(document.querySelector('form#quoteForm')),
              }));
              if (quoteDestination.language !== language || !quoteDestination.formPresent) {
                failures.push(`${route} @ ${viewport.name}: quote destination is incomplete or has lang=${JSON.stringify(quoteDestination.language)}.`);
              }
              quoteNavigationChecks += 1;
            }
          }
          await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (viewport.name === 'mobile') {
            await page.click('#mobileToggle');
            const mobileMenuState = await page.evaluate(() => ({
              expanded: document.querySelector('#mobileToggle')?.getAttribute('aria-expanded'),
              homeVisible: (() => {
                const home = document.querySelector('.nav-home-mobile');
                if (!home) return false;
                const style = getComputedStyle(home);
                return style.display !== 'none' && style.visibility !== 'hidden' && home.getClientRects().length > 0;
              })(),
            }));
            if (mobileMenuState.expanded !== 'true' || !mobileMenuState.homeVisible) {
              failures.push(`${route} @ mobile: opening the menu must expose the Home navigation link and set aria-expanded="true".`);
            }
          }
          const homeLink = await page.$('.nav-home-mobile');
          if (!homeLink) {
            failures.push(`${route} @ ${viewport.name}: explicit Home navigation link is missing.`);
          } else {
            const rawHomeHref = await homeLink.evaluate((element) => element.getAttribute('href'));
            if (rawHomeHref !== './') failures.push(`${route} @ ${viewport.name}: Home navigation href is ${JSON.stringify(rawHomeHref)}, expected "./".`);
            const [homeResponse] = await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
              homeLink.click(),
            ]);
            const homeLandingUrl = new URL(page.url());
            if (homeLandingUrl.pathname !== expectedPathname) {
              failures.push(`${route} @ ${viewport.name}: Home navigation link landed on ${homeLandingUrl.pathname}, expected ${expectedPathname}.`);
            }
            if (!homeResponse || homeResponse.status() !== 200) {
              failures.push(`${route} @ ${viewport.name}: Home navigation destination returned HTTP ${homeResponse?.status() ?? 'no response'}.`);
            }
            homeNavigationChecks += 1;
          }
          await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const logo = await page.$('header a.logo');
          if (!logo) {
            failures.push(`${route} @ ${viewport.name}: Header logo link is missing.`);
          } else {
            const rawHref = await logo.evaluate((element) => element.getAttribute('href'));
            if (rawHref !== './') failures.push(`${route} @ ${viewport.name}: Header logo href is ${JSON.stringify(rawHref)}, expected "./".`);
            const [logoResponse] = await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
              logo.click(),
            ]);
            const landingUrl = new URL(page.url());
            if (landingUrl.pathname !== expectedPathname) {
              failures.push(`${route} @ ${viewport.name}: Header logo navigated to ${landingUrl.pathname}, expected ${expectedPathname}.`);
            }
            if (!logoResponse || logoResponse.status() !== 200) {
              failures.push(`${route} @ ${viewport.name}: Header logo destination returned HTTP ${logoResponse?.status() ?? 'no response'}.`);
            }
            logoNavigationChecks += 1;
          }
        } catch (error) {
          failures.push(`${route} @ ${viewport.name}: browser check failed (${error.message}).`);
        } finally {
          if (pageErrors.length) {
            failures.push(`${route} @ ${viewport.name}: uncaught page errors: ${pageErrors.join(' | ')}.`);
          }
          checks += 1;
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}

const report = {
  schemaVersion: 1,
  startedAt,
  completedAt: new Date().toISOString(),
  mode: externalBaseUrl ? 'production-https' : 'local-http',
  baseUrl,
  siteRoot,
  expectedArtifactRoot,
  expectedReleaseManifestSha256,
  browserExecutable: executablePath,
  browserVersion,
  languages: requestedLanguages,
  pagesPerLanguage: requestedPages.length,
  viewports,
  checkedViewports: checks,
  languageNavigationChecks,
  quoteNavigationChecks,
  quoteFormChecks,
  logoNavigationChecks,
  homeNavigationChecks,
  exactArtifactChecks,
  consentSettlementChecks,
  failures,
};

if (reportArgument) {
  const reportPath = path.resolve(reportArgument.slice('--report='.length));
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (failures.length) {
  console.error(`Localized render QA failed: ${failures.length} issue(s) across ${checks} viewport checks.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  const artifactSummary = expectedArtifactRoot ? `, ${exactArtifactChecks} exact public artifact byte checks` : '';
  console.log(`Localized render QA passed: ${checks} viewport checks, ${languageNavigationChecks} real language selections, ${quoteNavigationChecks} real quote-link clicks, ${quoteFormChecks} visible quote-form submit checks, ${homeNavigationChecks} real Home-link clicks, and ${logoNavigationChecks} real logo clicks${artifactSummary} (${requestedPages.length} pages × ${requestedLanguages.length} languages × ${viewports.length} viewports).`);
}
