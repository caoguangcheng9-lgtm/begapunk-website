import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const siteRoot = path.resolve(rootArgument || sourceRoot);

const languages = Object.freeze([
  { code: 'en', route: '/index.html', label: 'Optional measurement consent', title: 'Analytics and advertising measurement', privacyPath: '/privacy.html' },
  { code: 'de', route: '/de/index.html', label: 'Optionale Messung', title: 'Analyse und Werbeerfolg messen', privacyPath: '/de/privacy.html' },
  { code: 'fr', route: '/fr/index.html', label: 'Mesure facultative', title: 'Analyse et mesure de l’efficacité publicitaire', privacyPath: '/fr/privacy.html' },
  { code: 'ja', route: '/ja/index.html', label: '任意の計測設定', title: 'アクセス解析と広告効果の計測', privacyPath: '/ja/privacy.html' },
  { code: 'ru', route: '/ru/index.html', label: 'Необязательные измерения', title: 'Аналитика и оценка эффективности рекламы', privacyPath: '/ru/privacy.html' },
]);

const viewports = Object.freeze([
  { name: 'zoomed-200x400', width: 200, height: 400 },
  { name: 'mobile-320', width: 320, height: 568 },
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
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
});

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function contentType(filePath) {
  return contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
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
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    ...(configured ? [configured] : []),
    ...(process.platform === 'win32'
      ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']),
  ];
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

function addFailure(failures, language, viewport, detail) {
  failures.push(`${language.code} ${language.route} @ ${viewport.name}: ${detail}`);
}

const executablePath = await findBrowser();
const server = await createServer();
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const failures = [];
let checks = 0;
let exercisedOverflow = 0;
let browser;

try {
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--no-first-run',
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    ],
  });

  for (const language of languages) {
    for (const viewport of viewports) {
      const page = await browser.newPage();
      const runtimeErrors = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith(baseUrl) || url.startsWith('data:') || url.startsWith('blob:')) request.continue();
        else request.abort();
      });

      try {
        const response = await page.goto(`${baseUrl}${language.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (!response || response.status() !== 200) {
          addFailure(failures, language, viewport, `HTTP ${response?.status() ?? 'no response'}.`);
          continue;
        }
        await page.waitForFunction(() => {
          const banner = document.querySelector('#bp-consent-banner.bp-visible');
          return document.documentElement.getAttribute('data-bp-consent-ui') === 'open' && Boolean(banner);
        }, { timeout: 10_000 });

        const result = await page.evaluate(async ({ expectedLanguage, expectedLabel, expectedTitle }) => {
          const banner = document.getElementById('bp-consent-banner');
          const inner = banner?.querySelector('.bp-inner');
          const title = banner?.querySelector('.bp-text strong');
          const privacy = banner?.querySelector('.bp-text a');
          const decline = banner?.querySelector('#bp-decline-btn');
          const accept = banner?.querySelector('#bp-accept-btn');
          const styleSource = document.getElementById('bp-consent-styles')?.textContent || '';
          if (!banner || !inner || !title || !privacy || !decline || !accept) {
            return { missingStructure: true };
          }

          const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
          const bannerRect = () => banner.getBoundingClientRect();
          const fullyReachable = async (element) => {
            element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            await nextFrame();
            const clip = bannerRect();
            const rect = element.getBoundingClientRect();
            const top = Math.max(0, clip.top);
            const bottom = Math.min(window.innerHeight, clip.bottom);
            return rect.top >= top - 1
              && rect.bottom <= bottom + 1
              && rect.left >= Math.max(0, clip.left) - 1
              && rect.right <= Math.min(window.innerWidth, clip.right) + 1;
          };

          banner.scrollTop = 0;
          await nextFrame();
          const topRect = bannerRect();
          const initialTitleReachable = await fullyReachable(title);
          const privacyReachable = await fullyReachable(privacy);
          const declineReachable = await fullyReachable(decline);
          const acceptReachable = await fullyReachable(accept);
          banner.scrollTop = banner.scrollHeight;
          await nextFrame();

          const finalRect = bannerRect();
          const bannerStyle = getComputedStyle(banner);
          const innerStyle = getComputedStyle(inner);
          const horizontalOverflow = Math.max(
            0,
            banner.scrollWidth - banner.clientWidth,
            inner.scrollWidth - inner.clientWidth,
          );
          const maximumScrollTop = Math.max(0, banner.scrollHeight - banner.clientHeight);

          return {
            missingStructure: false,
            htmlLanguage: document.documentElement.lang,
            ariaLabel: banner.getAttribute('aria-label'),
            title: title.textContent.trim(),
            expectedLanguage,
            expectedLabel,
            expectedTitle,
            privacyHref: privacy.getAttribute('href'),
            declineText: decline.textContent.trim(),
            acceptText: accept.textContent.trim(),
            top: finalRect.top,
            bottom: finalRect.bottom,
            initialTop: topRect.top,
            initialBottom: topRect.bottom,
            bannerHeight: finalRect.height,
            viewportHeight: window.innerHeight,
            overflowY: bannerStyle.overflowY,
            bannerBoxSizing: bannerStyle.boxSizing,
            innerBoxSizing: innerStyle.boxSizing,
            horizontalOverflow,
            maximumScrollTop,
            reachedScrollBottom: Math.abs(banner.scrollTop - maximumScrollTop) <= 1,
            initialTitleReachable,
            privacyReachable,
            declineReachable,
            acceptReachable,
            safeAreaRulesPresent: [
              /padding-top\s*:[^;]*safe-area-inset-top/i,
              /padding-right\s*:[^;]*safe-area-inset-right/i,
              /padding-bottom\s*:[^;]*safe-area-inset-bottom/i,
              /padding-left\s*:[^;]*safe-area-inset-left/i,
            ].every((pattern) => pattern.test(styleSource)),
            dynamicViewportRulePresent: /max-height\s*:\s*100dvh/i.test(styleSource),
          };
        }, {
          expectedLanguage: language.code,
          expectedLabel: language.label,
          expectedTitle: language.title,
        });

        if (result.missingStructure) {
          addFailure(failures, language, viewport, 'consent banner structure is incomplete.');
          continue;
        }
        if (result.htmlLanguage !== language.code) addFailure(failures, language, viewport, `html lang is ${JSON.stringify(result.htmlLanguage)}.`);
        if (result.ariaLabel !== language.label) addFailure(failures, language, viewport, `dialog label is ${JSON.stringify(result.ariaLabel)}.`);
        if (result.title !== language.title) addFailure(failures, language, viewport, `banner title is ${JSON.stringify(result.title)}.`);
        if (new URL(result.privacyHref, `${baseUrl}${language.route}`).pathname !== language.privacyPath) {
          addFailure(failures, language, viewport, `privacy link resolves from ${JSON.stringify(result.privacyHref)} to the wrong locale.`);
        }
        if (!result.declineText || !result.acceptText) addFailure(failures, language, viewport, 'one or more consent actions have no accessible text.');
        if (result.top < -1 || result.bottom > result.viewportHeight + 1 || result.bannerHeight > result.viewportHeight + 1) {
          addFailure(failures, language, viewport, `banner is clipped vertically (top=${result.top}, bottom=${result.bottom}, height=${result.bannerHeight}, viewport=${result.viewportHeight}).`);
        }
        if (result.initialTop < -1 || result.initialBottom > result.viewportHeight + 1) {
          addFailure(failures, language, viewport, 'banner leaves the viewport before scrolling begins.');
        }
        if (!['auto', 'scroll'].includes(result.overflowY)) addFailure(failures, language, viewport, `overflow-y is ${JSON.stringify(result.overflowY)}.`);
        if (result.bannerBoxSizing !== 'border-box' || result.innerBoxSizing !== 'border-box') {
          addFailure(failures, language, viewport, 'banner sizing is not border-box safe.');
        }
        if (result.horizontalOverflow > 1) addFailure(failures, language, viewport, `banner has ${result.horizontalOverflow}px horizontal overflow.`);
        if (viewport.width === 200 && result.maximumScrollTop >= 1) exercisedOverflow += 1;
        if (!result.reachedScrollBottom) addFailure(failures, language, viewport, 'banner cannot reach its scroll bottom.');
        if (!result.initialTitleReachable || !result.privacyReachable || !result.declineReachable || !result.acceptReachable) {
          addFailure(failures, language, viewport, 'title, privacy copy, or consent buttons cannot be fully reached by vertical scrolling.');
        }
        if (!result.safeAreaRulesPresent) addFailure(failures, language, viewport, 'four-edge safe-area padding is incomplete.');
        if (!result.dynamicViewportRulePresent) addFailure(failures, language, viewport, 'dynamic viewport height protection is missing.');
        if (runtimeErrors.length) addFailure(failures, language, viewport, `runtime errors: ${runtimeErrors.join(' | ')}.`);
      } catch (error) {
        addFailure(failures, language, viewport, `browser check failed (${error.message}).`);
      } finally {
        checks += 1;
        await page.close();
      }
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (exercisedOverflow === 0) {
  failures.push('The 200x400 stress matrix did not exercise a genuinely scrollable banner in any language.');
}

if (failures.length) {
  console.error(`Cookie banner layout verification failed: ${failures.length} issue(s) across ${checks} checks.`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Cookie banner layout verified: ${checks} checks (${languages.length} languages × ${viewports.length} constrained viewports), with reachable copy/actions, vertical scrolling, dynamic-height containment, and four-edge safe-area rules.`);
}
