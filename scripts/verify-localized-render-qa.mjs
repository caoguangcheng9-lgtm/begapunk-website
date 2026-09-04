import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const siteRoot = path.resolve(process.argv[2] || sourceRoot);
const languageArgument = process.argv.find((argument) => argument.startsWith('--languages='));
const pagesArgument = process.argv.find((argument) => argument.startsWith('--pages='));
const reportArgument = process.argv.find((argument) => argument.startsWith('--report='));
const requestedLanguages = languageArgument
  ? languageArgument.slice('--languages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [...config.activeLanguageCodes];
const configuredLanguages = new Set(config.activeLanguageCodes);
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

const server = await createServer();
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const executablePath = await findBrowser();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
});

const startedAt = new Date().toISOString();
const failures = [];
let checks = 0;
let logoNavigationChecks = 0;
let homeNavigationChecks = 0;
let languageNavigationChecks = 0;

try {
  for (const language of requestedLanguages) {
    for (const pageName of requestedPages) {
      for (const viewport of viewports) {
        const page = await browser.newPage();
        const consoleErrors = [];
        page.on('console', (message) => {
          if (message.type() === 'error' && !/net::ERR_FAILED/u.test(message.text())) consoleErrors.push(message.text());
        });
        await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const url = request.url();
          if (url.startsWith(baseUrl) || url.startsWith('data:') || url.startsWith('blob:')) request.continue();
          else request.abort();
        });
        const route = `${language}/${pageName}`;
        try {
          const response = await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
          if (!response || response.status() !== 200) {
            failures.push(`${route} @ ${viewport.name}: HTTP ${response?.status() ?? 'no response'}.`);
            continue;
          }
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
          if (consoleErrors.length) failures.push(`${route} @ ${viewport.name}: console errors: ${consoleErrors.join(' | ')}.`);
          const languageTarget = language === 'fr' ? config.sourceLanguage : switcherLanguages.find((candidate) => candidate.code === 'fr');
          if (!languageTarget) {
            failures.push(`${route} @ ${viewport.name}: cross-language test target is unavailable.`);
          } else {
            const targetValue = await page.$eval('.i18n-switcher select', (select, label) => {
              const option = [...select.options].find((candidate) => candidate.textContent.trim() === label);
              if (!option) throw new Error(`Language option is missing: ${label}`);
              return option.value;
            }, languageTarget.label);
            const [languageResponse] = await Promise.all([
              page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
              page.select('.i18n-switcher select', targetValue),
            ]);
            const languageLanding = new URL(page.url());
            const expectedLanguagePathname = publicPathname(languageTarget.code, pageName);
            if (languageLanding.pathname !== expectedLanguagePathname) {
              failures.push(`${route} @ ${viewport.name}: ${languageTarget.label} selection landed on ${languageLanding.pathname}, expected ${expectedLanguagePathname}.`);
            }
            if (!languageResponse || languageResponse.status() !== 200) {
              failures.push(`${route} @ ${viewport.name}: language destination returned HTTP ${languageResponse?.status() ?? 'no response'}.`);
            }
            const destinationState = await page.evaluate(() => ({
              language: document.documentElement.lang,
              headerPresent: Boolean(document.querySelector('header a.logo')),
            }));
            if (destinationState.language !== languageTarget.code || !destinationState.headerPresent) {
              failures.push(`${route} @ ${viewport.name}: language destination content is incomplete or has lang=${JSON.stringify(destinationState.language)}.`);
            }
            languageNavigationChecks += 1;
            await page.goto(`${baseUrl}/${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          }
          const expectedPathname = `/${language}/`;
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
          await page.goto(`${baseUrl}/${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
          checks += 1;
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const report = {
  schemaVersion: 1,
  startedAt,
  completedAt: new Date().toISOString(),
  siteRoot,
  browserExecutable: executablePath,
  languages: requestedLanguages,
  pagesPerLanguage: requestedPages.length,
  viewports,
  checkedViewports: checks,
  languageNavigationChecks,
  logoNavigationChecks,
  homeNavigationChecks,
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
  console.log(`Localized render QA passed: ${checks} viewport checks, ${languageNavigationChecks} real language selections, ${homeNavigationChecks} real Home-link clicks, and ${logoNavigationChecks} real logo clicks (${requestedPages.length} pages × ${requestedLanguages.length} languages × ${viewports.length} viewports).`);
}
