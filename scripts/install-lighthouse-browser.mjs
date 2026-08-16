import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import {
  Browser,
  BrowserPlatform,
  detectBrowserPlatform,
  getDownloadUrl,
  install,
} from '@puppeteer/browsers';

const buildId = '152.0.7977.42';
const cacheDir = path.resolve(import.meta.dirname, '..', 'dist', 'tools', 'chrome-for-testing');
const expectedArchiveSha256 = Object.freeze({
  [BrowserPlatform.WIN64]: '5093f03a401b5579da490d281aba80b687d92fe6fdfec47ee522920918d6e327',
  [BrowserPlatform.LINUX]: 'cb77f4781cad7d5e06fcc78b4476e6a6375616e7278dc313abaa9db22ed4674e',
});
const expectedArchiveMd5 = Object.freeze({
  [BrowserPlatform.WIN64]: 'c3023b6c0c5253c8206e13995b20793e',
  [BrowserPlatform.LINUX]: '0e016ddfdd999d29739a07f583238e30',
});

async function runHeadlessLaunchCheck(executablePath, profilePath, expectedVersion) {
  const chrome = await chromeLauncher.launch({
    chromePath: executablePath,
    userDataDir: profilePath,
    chromeFlags: ['--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run'],
    logLevel: 'silent',
  });
  try {
    const response = await fetch(`http://127.0.0.1:${chrome.port}/json/version`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`DevTools version endpoint returned HTTP ${response.status}`);
    const version = await response.json();
    const reportedVersion = String(version.Browser || '');
    if (!reportedVersion.includes(expectedVersion)) throw new Error(`expected Chrome ${expectedVersion}, received ${reportedVersion || 'no version'}`);
    return reportedVersion;
  } finally {
    await chrome.kill();
  }
}

const platform = detectBrowserPlatform();
if (!platform || !expectedArchiveSha256[platform]) {
  throw new Error(`Unsupported Lighthouse browser platform: ${platform || process.platform}.`);
}
const downloadUrl = getDownloadUrl(Browser.CHROME, platform, buildId);
if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'storage.googleapis.com') {
  throw new Error(`Unexpected Chrome for Testing download origin: ${downloadUrl.href}`);
}

const installed = await install({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  platform,
  expectedHash: expectedArchiveSha256[platform],
  downloadProgressCallback: 'default',
});
const healthProfile = await fs.mkdtemp(path.join(os.tmpdir(), 'begapunk-cft-health-'));
let reportedVersion;
try {
  reportedVersion = await runHeadlessLaunchCheck(installed.executablePath, healthProfile, buildId);
} finally {
  await fs.rm(healthProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

console.log(JSON.stringify({
  result: 'Pinned Lighthouse browser is available',
  browser: Browser.CHROME,
  buildId,
  platform,
  executablePath: installed.executablePath,
  downloadUrl: downloadUrl.href,
  archiveSha256: expectedArchiveSha256[platform],
  officialObjectMd5: expectedArchiveMd5[platform],
  launchCheck: 'passed',
  reportedVersion,
  cacheDir,
  trackedSourceWrites: false,
}));
