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

function chromeFlagsForPlatform(platform) {
  const flags = ['--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run'];
  if (platform === BrowserPlatform.LINUX) flags.push('--no-sandbox', '--disable-dev-shm-usage');
  return flags;
}

async function waitForDevToolsVersion(chrome, expectedVersion) {
  const deadline = Date.now() + 15_000;
  let lastConnectionError = null;
  while (Date.now() < deadline) {
    if (chrome.process.exitCode !== null || chrome.process.signalCode !== null) {
      throw new Error(`Chrome exited before DevTools became ready (exit=${chrome.process.exitCode ?? 'none'}, signal=${chrome.process.signalCode ?? 'none'}).`);
    }
    let response;
    try {
      response = await fetch(`http://127.0.0.1:${chrome.port}/json/version`, { signal: AbortSignal.timeout(2_000) });
    } catch (error) {
      lastConnectionError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }
    if (!response.ok) {
      lastConnectionError = new Error(`DevTools version endpoint returned HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }
    const version = await response.json();
    const reportedVersion = String(version.Browser || '');
    if (!reportedVersion.includes(expectedVersion)) throw new Error(`expected Chrome ${expectedVersion}, received ${reportedVersion || 'no version'}`);
    return reportedVersion;
  }
  throw new Error(`Chrome DevTools endpoint did not become ready within 15 seconds (${lastConnectionError?.message || 'no response'}).`);
}

async function runHeadlessLaunchCheck(executablePath, profilePath, expectedVersion, platform) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromePath: executablePath,
      userDataDir: profilePath,
      chromeFlags: chromeFlagsForPlatform(platform),
      logLevel: platform === BrowserPlatform.LINUX ? 'error' : 'silent',
    });
    return await waitForDevToolsVersion(chrome, expectedVersion);
  } catch (error) {
    if (!chrome) {
      const cleanupErrors = chromeLauncher.killAll();
      if (cleanupErrors.length > 0) throw new AggregateError([error, ...cleanupErrors], 'Chrome failed to launch and cleanup was incomplete.');
    }
    throw error;
  } finally {
    if (chrome) await chrome.kill();
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
  reportedVersion = await runHeadlessLaunchCheck(installed.executablePath, healthProfile, buildId, platform);
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
