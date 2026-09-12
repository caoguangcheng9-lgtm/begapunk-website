import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import {
  collectPageErrors,
  inspectPointerActionability,
  openMobileNavigationWithPointer,
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

before(async () => {
  browser = await puppeteer.launch({
    executablePath: await findBrowser(),
    headless: true,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
  });
});

after(async () => {
  await browser?.close();
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
