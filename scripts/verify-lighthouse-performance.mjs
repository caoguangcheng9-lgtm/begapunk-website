import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { Browser, computeExecutablePath, detectBrowserPlatform } from '@puppeteer/browsers';

const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const reportFlagIndex = process.argv.indexOf('--report');
const reportPath = reportFlagIndex >= 0 ? process.argv[reportFlagIndex + 1] : '';
if (reportFlagIndex >= 0 && !reportPath) throw new Error('--report requires a file path.');
const routeFlagIndex = process.argv.indexOf('--route');
const selectedRoute = routeFlagIndex >= 0 ? process.argv[routeFlagIndex + 1] : '';
if (routeFlagIndex >= 0 && !selectedRoute) throw new Error('--route requires a release-relative HTML path.');
const runsFlagIndex = process.argv.indexOf('--runs');
const selectedRunCount = runsFlagIndex >= 0 ? Number.parseInt(process.argv[runsFlagIndex + 1], 10) : 0;
if (runsFlagIndex >= 0 && (!Number.isInteger(selectedRunCount) || selectedRunCount < 1 || selectedRunCount > 5)) {
  throw new Error('--runs must be an integer from 1 through 5.');
}

const routeFamilies = Object.freeze([
  { family: 'home', route: 'index.html', critical: true },
  { family: 'product-catalog', route: 'products.html', critical: false },
  { family: 'product-detail', route: 'BP-3P-S06-0001.html', critical: true },
  { family: 'application-guide', route: 'application-vacuum-packaging-machines.html', critical: true },
  { family: 'verified-case', route: 'case-bp-2p-95-pneumatic-chuck-integration.html', critical: true },
  { family: 'technical-faq', route: 'faq.html', critical: false },
  { family: 'quality-evidence', route: 'manufacturing-quality.html', critical: false },
  { family: 'contact-rfq', route: 'contact.html', critical: true },
]);
const languages = Object.freeze([
  { code: 'en', prefix: '' },
  { code: 'de', prefix: 'de' },
  { code: 'ja', prefix: 'ja' },
  { code: 'ru', prefix: 'ru' },
]);
const thresholds = Object.freeze({
  performanceScore: 90,
  lcpMs: 2500,
  fcpMs: 1800,
  tbtMsExclusive: 200,
  cls: 0.1,
});
const redZone = Object.freeze({
  performanceScore: 50,
  lcpMs: 4000,
  tbtMs: 600,
  cls: 0.25,
});
const throttling = Object.freeze({
  rttMs: 150,
  throughputKbps: 1638.4,
  requestLatencyMs: 562.5,
  downloadThroughputKbps: 1474.56,
  uploadThroughputKbps: 675,
  cpuSlowdownMultiplier: 4,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream';
}

function shouldCompress(filePath) {
  return /\.(?:css|html?|js|json|mjs|php|svg|txt|xml)$/i.test(filePath);
}

function isInsideRoot(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

async function createPreviewServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
      const target = path.resolve(releaseRoot, decoded || 'index.html');
      if (!isInsideRoot(releaseRoot, target)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      const source = await fs.readFile(file);
      const useGzip = shouldCompress(file) && /(?:^|,)\s*gzip(?:\s*;|\s*(?:,|$))/i.test(String(request.headers['accept-encoding'] || ''));
      const body = useGzip ? gzipSync(source, { level: 5 }) : source;
      const headers = {
        'Cache-Control': 'no-store',
        'Content-Type': contentType(file),
        'Content-Length': body.length,
        Vary: 'Accept-Encoding',
      };
      if (useGzip) headers['Content-Encoding'] = 'gzip';
      response.writeHead(200, headers);
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

async function configuredChrome() {
  if (process.env.LIGHTHOUSE_CHROME_PATH) {
    await fs.access(process.env.LIGHTHOUSE_CHROME_PATH);
    return { path: process.env.LIGHTHOUSE_CHROME_PATH, version: 'caller-provided browser path' };
  }
  const pinnedCacheDir = path.resolve(import.meta.dirname, '..', 'dist', 'tools', 'chrome-for-testing');
  const pinnedPath = computeExecutablePath({
    cacheDir: pinnedCacheDir,
    browser: Browser.CHROME,
    buildId: '152.0.7977.42',
    platform: detectBrowserPlatform(),
  });
  try {
    await fs.access(pinnedPath);
    return { path: path.resolve(pinnedPath), version: 'Chrome for Testing 152.0.7977.42' };
  } catch {
    // A local diagnostic may use an existing browser; the release command installs the pinned browser first.
  }
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
      return { path: candidate, version: 'unqueried local browser fallback' };
    } catch {
      // Continue to the next approved local browser path.
    }
  }
  return { path: undefined, version: 'chrome-launcher auto-detected browser' };
}

function extractMetrics(lhr) {
  const audit = (id) => {
    const value = lhr.audits[id]?.numericValue;
    assert(Number.isFinite(value), `${id}: Lighthouse did not return a numeric value.`);
    return value;
  };
  const score = lhr.categories.performance?.score;
  assert(Number.isFinite(score), 'Lighthouse did not return a performance score.');
  return {
    performanceScore: score * 100,
    lcpMs: audit('largest-contentful-paint'),
    fcpMs: audit('first-contentful-paint'),
    tbtMs: audit('total-blocking-time'),
    cls: audit('cumulative-layout-shift'),
    transferredBytes: audit('total-byte-weight'),
  };
}

function extractDiagnostics(lhr) {
  const auditIds = [
    'document-latency-insight', 'font-display-insight', 'lcp-breakdown-insight',
    'lcp-discovery-insight', 'render-blocking-insight', 'image-delivery-insight',
  ];
  return Object.fromEntries(auditIds.map((id) => {
    const audit = lhr.audits[id];
    return [id, audit ? {
      score: audit.score,
      title: audit.title,
      displayValue: audit.displayValue || '',
      details: audit.details || null,
    } : null];
  }));
}

function routePath(language, route) {
  return language.prefix ? `${language.prefix}/${route}` : route;
}

const allTargets = languages.flatMap((language) => routeFamilies.map((item) => ({ language, item })));
const targets = selectedRoute
  ? allTargets.filter(({ language, item }) => routePath(language, item.route) === selectedRoute.replaceAll('\\', '/'))
  : allTargets;
const expectedRouteCount = selectedRoute ? 1 : routeFamilies.length * languages.length;
assert(routeFamilies.length === 8, `Expected eight page families, found ${routeFamilies.length}.`);
assert(new Set(routeFamilies.map((item) => item.family)).size === routeFamilies.length, 'Page-family names must be unique.');
assert(new Set(languages.map((item) => item.code)).size === languages.length, 'Language codes must be unique.');
assert(targets.length === expectedRouteCount, `${selectedRoute}: expected one configured route match, found ${targets.length}.`);
for (const { language, item } of targets) await fs.access(path.join(releaseRoot, routePath(language, item.route)));

const startedAt = new Date().toISOString();
const server = await createPreviewServer();
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const configuredBrowser = await configuredChrome();
const chromePath = configuredBrowser.path;
const browserVersion = configuredBrowser.version;
const browserProfileDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'begapunk-lighthouse-'));
let chrome;
let cleanupError = null;
const routeResults = [];
let configEvidence = null;
try {
  chrome = await chromeLauncher.launch({
    chromePath,
    userDataDir: browserProfileDirectory,
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-background-networking'],
    logLevel: 'silent',
  });
  for (const { language, item } of targets) {
      const publicPath = routePath(language, item.route);
      const runCount = selectedRunCount || (item.critical ? 3 : 1);
      const runs = [];
      for (let run = 1; run <= runCount; run += 1) {
        const result = await lighthouse(`${baseUrl}/${publicPath}`, {
          port: chrome.port,
          logLevel: 'error',
          output: 'json',
          onlyCategories: ['performance'],
          formFactor: 'mobile',
          throttlingMethod: 'simulate',
          throttling,
          screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
          disableStorageReset: false,
        });
        assert(result?.lhr, `${publicPath} run ${run}: Lighthouse returned no result.`);
        configEvidence ||= {
          formFactor: result.lhr.configSettings.formFactor,
          throttlingMethod: result.lhr.configSettings.throttlingMethod,
          throttling: result.lhr.configSettings.throttling,
          screenEmulation: result.lhr.configSettings.screenEmulation,
        };
        runs.push({ run, ...extractMetrics(result.lhr), diagnostics: extractDiagnostics(result.lhr) });
      }
      const medians = Object.fromEntries(
        Object.keys(runs[0]).filter((key) => !['run', 'diagnostics'].includes(key)).map((key) => [key, median(runs.map((entry) => entry[key]))]),
      );
      routeResults.push({
        language: language.code,
        family: item.family,
        route: publicPath,
        critical: item.critical,
        runCount,
        runs,
        medians,
      });
      console.log(`${language.code}/${item.family}: ${runCount} run(s), score ${medians.performanceScore.toFixed(0)}, LCP ${medians.lcpMs.toFixed(0)} ms.`);
  }
} finally {
  if (chrome) {
    try {
      await chrome.kill();
    } catch (error) {
      cleanupError = error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  try {
    await fs.rm(browserProfileDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (error) {
    cleanupError ||= error;
  }
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

if (cleanupError) throw new Error(`Lighthouse browser cleanup failed: ${cleanupError.message}`, { cause: cleanupError });

assert(routeResults.length === expectedRouteCount, `Expected ${expectedRouteCount} route results, found ${routeResults.length}.`);
const failures = [];
for (const result of routeResults) {
  const metrics = result.medians;
  const label = `${result.language}/${result.family} (${result.route})`;
  for (const run of result.runs) {
    if (run.performanceScore < redZone.performanceScore) failures.push(`${label} run ${run.run}: score ${run.performanceScore.toFixed(1)} is in the red zone.`);
    if (run.lcpMs > redZone.lcpMs) failures.push(`${label} run ${run.run}: LCP ${run.lcpMs.toFixed(0)} ms is in the red zone.`);
    if (run.tbtMs > redZone.tbtMs) failures.push(`${label} run ${run.run}: TBT ${run.tbtMs.toFixed(0)} ms is in the red zone.`);
    if (run.cls > redZone.cls) failures.push(`${label} run ${run.run}: CLS ${run.cls.toFixed(3)} is in the red zone.`);
  }
  if (metrics.performanceScore < thresholds.performanceScore) failures.push(`${label}: score ${metrics.performanceScore.toFixed(1)} is below ${thresholds.performanceScore}.`);
  if (metrics.lcpMs > thresholds.lcpMs) failures.push(`${label}: LCP ${metrics.lcpMs.toFixed(0)} ms exceeds ${thresholds.lcpMs} ms.`);
  if (metrics.fcpMs > thresholds.fcpMs) failures.push(`${label}: FCP ${metrics.fcpMs.toFixed(0)} ms exceeds ${thresholds.fcpMs} ms.`);
  if (metrics.tbtMs >= thresholds.tbtMsExclusive) failures.push(`${label}: TBT ${metrics.tbtMs.toFixed(0)} ms is not below ${thresholds.tbtMsExclusive} ms.`);
  if (metrics.cls > thresholds.cls) failures.push(`${label}: CLS ${metrics.cls.toFixed(3)} exceeds ${thresholds.cls}.`);
}

const report = {
  result: failures.length ? 'FAIL' : 'PASS',
  startedAt,
  completedAt: new Date().toISOString(),
  tool: { lighthouse: '13.4.1', node: process.version, browserPath: chromePath || 'auto-detected', browserVersion },
  profile: configEvidence,
  thresholds,
  redZone,
  pageFamilyCount: routeFamilies.length,
  languageCount: languages.length,
  routeCount: routeResults.length,
  totalRuns: routeResults.reduce((sum, item) => sum + item.runCount, 0),
  routeResults,
  failures,
  wroteFiles: Boolean(reportPath),
};
if (reportPath) {
  const absoluteReportPath = path.resolve(reportPath);
  await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await fs.writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
if (failures.length) {
  console.error(`Lighthouse performance verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  result: 'Lighthouse release performance verified',
  tool: report.tool,
  pageFamilyCount: report.pageFamilyCount,
  languageCount: report.languageCount,
  routeCount: report.routeCount,
  totalRuns: report.totalRuns,
  reportPath: reportPath ? path.resolve(reportPath) : null,
  wroteFiles: report.wroteFiles,
}));
