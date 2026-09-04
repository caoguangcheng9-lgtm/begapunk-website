import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const siteRootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const languagesArgument = process.argv.find((argument) => argument.startsWith('--languages='));
const pagesArgument = process.argv.find((argument) => argument.startsWith('--pages='));
const siteRoot = path.resolve(siteRootArgument || sourceRoot);
const languages = languagesArgument
  ? languagesArgument.slice('--languages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [config.sourceLanguage.code, ...config.activeLanguageCodes];
const pages = pagesArgument
  ? pagesArgument.slice('--pages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : config.pages;
const configuredLanguages = new Set([config.sourceLanguage.code, ...config.activeLanguageCodes]);
const switcherLanguages = [config.sourceLanguage, ...config.activeLanguageCodes.map((code) => {
  const language = config.languages.find((candidate) => candidate.code === code);
  if (!language) throw new Error(`Missing language metadata for ${code}.`);
  return language;
})];
const expectedSwitcherLabels = switcherLanguages.map((language) => language.label);

for (const language of languages) {
  if (!configuredLanguages.has(language)) throw new Error(`Unsupported language: ${language}.`);
}
for (const page of pages) {
  if (!config.pages.includes(page)) throw new Error(`Unsupported page: ${page}.`);
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

const browser = await puppeteer.launch({
  executablePath: await findBrowser(),
  headless: true,
  args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--no-first-run'],
});
const failures = [];
let pageChecks = 0;
let homeNavigationChecks = 0;
let logoNavigationChecks = 0;
let languageNavigationChecks = 0;

function localizedFileUrl(language, pageName) {
  const directory = language === config.sourceLanguage.code ? siteRoot : path.join(siteRoot, language);
  return pathToFileURL(path.join(directory, pageName)).href;
}

async function loadLocalPage(page, owner, pageName) {
  await page.goto(pathToFileURL(owner).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    (homepage) => {
      const logoReady = document.querySelector('header a.logo')?.getAttribute('href')?.endsWith('index.html');
      const homeReady = document.querySelector('.nav-home-mobile')?.getAttribute('href')?.endsWith('index.html');
      if (!logoReady || !homeReady) return false;
      if (!homepage) return true;
      return [...document.querySelectorAll('.i18n-switcher option[value]')]
        .every((option) => option.getAttribute('value')?.endsWith('index.html'));
    },
    { timeout: 5000 },
    pageName === 'index.html',
  );
}

async function selectLanguage(page, targetLabel) {
  const targetValue = await page.$eval('.i18n-switcher select', (select, label) => {
    const option = [...select.options].find((candidate) => candidate.textContent.trim() === label);
    if (!option) throw new Error(`Language option is missing: ${label}`);
    return option.value;
  }, targetLabel);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
    page.select('.i18n-switcher select', targetValue),
  ]);
}

try {
  for (const language of languages) {
    const languageDirectory = language === config.sourceLanguage.code ? siteRoot : path.join(siteRoot, language);
    const expectedHomepage = pathToFileURL(path.join(languageDirectory, 'index.html')).href;
    for (const pageName of pages) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (/^(?:file|data|blob):/i.test(url)) request.continue();
        else request.abort();
      });
      const owner = path.join(languageDirectory, pageName);
      try {
        await loadLocalPage(page, owner, pageName);
        const switcherState = await page.$eval('.i18n-switcher select', (select) => ({
          labels: [...select.options].map((option) => option.textContent.trim()),
          frenchCount: [...select.options].filter((option) => option.textContent.trim() === 'Français').length,
          selectedLabels: [...select.selectedOptions].map((option) => option.textContent.trim()),
          values: [...select.options].map((option) => option.getAttribute('value')),
          resolvedUrls: [...select.options].map((option) => new URL(option.getAttribute('value'), window.location.href).href),
        }));
        if (JSON.stringify(switcherState.labels) !== JSON.stringify(expectedSwitcherLabels)) {
          throw new Error(`Language options are ${JSON.stringify(switcherState.labels)}, expected ${JSON.stringify(expectedSwitcherLabels)}.`);
        }
        if (switcherState.frenchCount !== 1) {
          throw new Error(`Expected exactly one Français option, found ${switcherState.frenchCount}.`);
        }
        const currentLanguageLabel = switcherLanguages.find((candidate) => candidate.code === language)?.label;
        if (switcherState.selectedLabels.length !== 1 || switcherState.selectedLabels[0] !== currentLanguageLabel) {
          throw new Error(`Selected language is ${JSON.stringify(switcherState.selectedLabels)}, expected ${currentLanguageLabel}.`);
        }
        const expectedLanguageUrls = switcherLanguages.map((candidate) => localizedFileUrl(candidate.code, pageName));
        if (JSON.stringify(switcherState.resolvedUrls) !== JSON.stringify(expectedLanguageUrls)) {
          throw new Error(`Language targets are ${JSON.stringify(switcherState.resolvedUrls)}, expected ${JSON.stringify(expectedLanguageUrls)}.`);
        }
        if (pageName === 'index.html' && switcherState.values.some((value) => !value?.endsWith('index.html'))) {
          throw new Error(`Homepage language values were not adapted for file preview: ${JSON.stringify(switcherState.values)}.`);
        }

        const primaryTarget = language === 'fr' ? config.sourceLanguage : switcherLanguages.find((candidate) => candidate.code === 'fr');
        if (!primaryTarget) throw new Error('Primary cross-language test target is unavailable.');
        await selectLanguage(page, primaryTarget.label);
        const expectedPrimaryTarget = localizedFileUrl(primaryTarget.code, pageName);
        if (page.url() !== expectedPrimaryTarget) {
          throw new Error(`Language selector went to ${page.url()}, expected ${expectedPrimaryTarget}.`);
        }
        languageNavigationChecks += 1;

        if (pageName === 'index.html') {
          for (const target of switcherLanguages) {
            if (target.code === language || target.code === primaryTarget.code) continue;
            await loadLocalPage(page, owner, pageName);
            await selectLanguage(page, target.label);
            const expectedTarget = localizedFileUrl(target.code, pageName);
            if (page.url() !== expectedTarget) {
              throw new Error(`${target.label} homepage selection went to ${page.url()}, expected ${expectedTarget}.`);
            }
            languageNavigationChecks += 1;
          }
        }

        await loadLocalPage(page, owner, pageName);
        const homeLink = await page.$('.nav-home-mobile');
        if (!homeLink) throw new Error('Explicit Home navigation link is missing.');
        const homeVisible = await homeLink.evaluate((element) => {
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
        });
        if (!homeVisible) throw new Error('Explicit Home navigation link is not visible at desktop width.');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
          homeLink.click(),
        ]);
        if (page.url() !== expectedHomepage) {
          throw new Error(`Home navigation link went to ${page.url()}, expected ${expectedHomepage}.`);
        }
        homeNavigationChecks += 1;

        await loadLocalPage(page, owner, pageName);
        const logo = await page.$('header a.logo');
        if (!logo) throw new Error('Header logo link is missing.');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
          logo.click(),
        ]);
        if (page.url() !== expectedHomepage) {
          throw new Error(`Logo navigated to ${page.url()}, expected ${expectedHomepage}.`);
        }
        logoNavigationChecks += 1;
      } catch (error) {
        failures.push(`${language}/${pageName}: ${error.message}`);
      } finally {
        pageChecks += 1;
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Local-file homepage navigation failed with ${failures.length} issue(s) across ${pageChecks} page checks:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Local-file navigation passed: ${pageChecks} page checks, ${languageNavigationChecks} real language selections, ${homeNavigationChecks} real Home-link clicks, and ${logoNavigationChecks} real logo clicks across ${pages.length} page(s) and ${languages.length} language(s).`);
