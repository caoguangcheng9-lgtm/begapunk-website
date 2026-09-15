import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import {
  collectPageErrors,
  inspectPointerActionability,
  openMobileNavigationWithPointer,
  requireFreshNavigationResponses,
} from '../scripts/lib/browser-interaction-gate.mjs';

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
      // Try the next browser.
    }
  }
  throw new Error('No supported local Chrome or Edge executable was found.');
}

let browser;
let fixturePhase = 'browser startup';
// A wedged browser or shutdown must fail this isolated fixture, not consume the
// entire CI job without diagnostics. This never turns an unrun check into PASS.
const fixtureDeadline = setTimeout(() => {
  console.error(`Browser interaction fixture timed out during ${fixturePhase}.`);
  browser?.process()?.kill('SIGKILL');
  process.exit(1);
}, 60_000);
fixtureDeadline.unref();

before(async () => {
  const executablePath = await findBrowser();
  if (process.platform === 'linux') {
    console.info(`Fixture browser: ${execFileSync(executablePath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim()}`);
  }
  console.info('Starting browser interaction fixture.');
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    timeout: 30_000,
    protocolTimeout: 30_000,
    dumpio: process.env.GITHUB_ACTIONS === 'true',
    args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
  });
  fixturePhase = 'browser fixture execution';
  console.info(`Browser connected: ${await browser.version()}`);
});

after(async () => {
  fixturePhase = 'browser shutdown';
  if (browser) {
    await browser.close();
    clearTimeout(fixtureDeadline);
  }
});

test('release navigation disables conditional cache while preserving real status and body checks', async () => {
  const requests = [];
  const expectedBody = '<!doctype html><title>Fresh artifact</title><a href="/">Home</a>';
  const server = http.createServer((request, response) => {
    if (request.url !== '/') {
      response.writeHead(404).end('Not found');
      return;
    }
    const conditional = request.headers['if-none-match'];
    requests.push(conditional || null);
    if (conditional === '"fixture-v1"') {
      response.writeHead(304, { ETag: '"fixture-v1"' }).end();
    } else {
      response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache', ETag: '"fixture-v1"' }).end(expectedBody);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on('request', request => request.continue());
    assert.equal((await page.goto(url)).status(), 200);
    const cachedResponse = await page.reload();
    assert.ok(requests.includes('"fixture-v1"'), 'fixture must reproduce conditional revalidation');
    assert.equal(cachedResponse.status(), 304, 'reproduce the strict-status gate failure');
    await requireFreshNavigationResponses(page);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await page.goto(url);
      assert.equal(response.status(), 200);
      assert.equal((await response.buffer()).toString(), expectedBody);
      assert.equal(requests.at(-1), null);
    }
    assert.equal((await page.goto(`${url}missing`)).status(), 404);
    const source = await fs.readFile(new URL('../scripts/verify-localized-render-qa.mjs', import.meta.url), 'utf8');
    assert.match(source, /await requireFreshNavigationResponses\(page\)/u);
    assert.ok(source.indexOf('await requireFreshNavigationResponses(page)') < source.indexOf('await page.goto('));
    assert.match(source, /response\.status\(\) !== 200/u);
    assert.match(source, /await verifyExactArtifactResponse\(response/u);
  } finally {
    await page.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('disabled language selector is rejected', async () => {
  const page = await browser.newPage();
  try {
    await page.setContent('<select id="language" disabled><option>English</option><option>Français</option></select>');
    const select = await page.$('#language');
    const state = await inspectPointerActionability(select);
    assert.equal(state.rendered, true);
    assert.equal(state.disabled, true);
    assert.equal(state.actionable, false);
  } finally {
    await page.close();
  }
});

test('fully overlaid language selector is rejected', async () => {
  const page = await browser.newPage();
  try {
    await page.setContent(`
      <style>
        #wrap { position: relative; width: 240px; height: 60px; }
        #language, #overlay { position: absolute; inset: 0; width: 240px; height: 60px; }
        #overlay { z-index: 2; background: transparent; }
      </style>
      <div id="wrap">
        <select id="language"><option>English</option><option>Français</option></select>
        <div id="overlay"></div>
      </div>
    `);
    const select = await page.$('#language');
    const state = await inspectPointerActionability(select);
    assert.equal(state.rendered, true);
    assert.equal(state.clickPoint, null);
    assert.equal(state.actionable, false);
    assert.ok(state.probePoints.every((point) => point.hitTarget === 'div#overlay'));
  } finally {
    await page.close();
  }
});

test('uncaught page errors are collected for a blocking result', async () => {
  const page = await browser.newPage();
  try {
    const pageErrors = collectPageErrors(page);
    await page.setContent('<script>setTimeout(() => { throw new Error("gate-fixture-pageerror"); }, 0);</script>');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(pageErrors.length, 1);
    assert.match(pageErrors[0], /gate-fixture-pageerror/u);
  } finally {
    await page.close();
  }
});

test('menu focus settles before a lower menu item is scrolled and actually clicked', async () => {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 390, height: 844 });
    await page.setContent(`
      <style>
        #mainNav { display: none; height: 300px; overflow: auto; }
        #mainNav.mobile-open { display: block; }
        #mainNav a { display: block; min-height: 44px; }
        .spacer { height: 1200px; }
      </style>
      <a id="mobileToggle" href="#mainNav">Menu</a>
      <nav id="mainNav"><a id="first" href="#home">Home</a>
        <div class="spacer"></div><a id="quote" href="#contact">Contact</a></nav>
      <script>
        const originalFrame = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => setTimeout(() => originalFrame(callback), 150);
        window.quoteClicks = 0;
        document.querySelector('#quote').addEventListener('click', event => {
          event.preventDefault(); window.quoteClicks += 1;
        });
      </script>
    `);
    await page.addScriptTag({ path: fileURLToPath(new URL('../js/site-navigation.js', import.meta.url)) });
    const quote = await page.$('#quote');
    // Reproduce the old race: inspect/scroll immediately, then the application
    // focuses Home and scrolls the lower Contact link back outside its viewport.
    await page.click('#mobileToggle');
    await quote.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForFunction(() => document.activeElement?.id === 'first');
    assert.equal((await inspectPointerActionability(quote)).actionable, false);
    await page.keyboard.press('Escape');

    await openMobileNavigationWithPointer(page);
    const state = await inspectPointerActionability(quote, { scroll: true });
    assert.equal(state.actionable, true);
    await page.mouse.click(state.clickPoint.x, state.clickPoint.y);
    assert.equal(await page.evaluate(() => window.quoteClicks), 1);
  } finally {
    await page.close();
  }
});

test('menu opening still fails closed if the actual application never opens it', async () => {
  const page = await browser.newPage();
  try {
    await page.setContent('<button id="mobileToggle" aria-expanded="false">Menu</button><nav id="mainNav" hidden><a href="#home">Home</a></nav>');
    await assert.rejects(openMobileNavigationWithPointer(page, { timeout: 200 }), /Waiting failed|timeout/iu);
  } finally {
    await page.close();
  }
});
