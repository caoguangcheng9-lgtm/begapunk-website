import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { load } from 'cheerio';

const releaseRoot = path.resolve(process.argv[2] || 'dist/production');
const siteOrigin = 'https://www.begapunk.com';
const KiB = 1024;
const budgets = Object.freeze({
  total: 1600 * KiB,
  html: 100 * KiB,
  css: 150 * KiB,
  js: 200 * KiB,
  fonts: 200 * KiB,
  images: 1000 * KiB,
  firstViewImage: 250 * KiB,
  requests: 50,
  thirdPartyRequests: 5,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function toPublicPath(absolutePath) {
  return path.relative(releaseRoot, absolutePath).replaceAll('\\', '/');
}

function publicUrlForPage(relativePath) {
  return `${siteOrigin}/${relativePath === 'index.html' ? '' : relativePath}`;
}

function resolveResource(reference, baseUrl) {
  if (!reference || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(reference)) return null;
  let url;
  try {
    url = new URL(reference, baseUrl);
  } catch {
    return { error: `invalid URL: ${reference}` };
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  if (url.origin !== siteOrigin) return { external: url.href };
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    return { error: `invalid URL encoding: ${reference}` };
  }
  const absolute = path.resolve(releaseRoot, pathname || 'index.html');
  const relative = path.relative(releaseRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return { error: `path escapes release root: ${reference}` };
  return { absolute, publicPath: relative.replaceAll('\\', '/') };
}

function largestSrcsetCandidate(value) {
  const candidates = String(value || '').split(',').map((candidate) => {
    const [reference, descriptor = '1x'] = candidate.trim().split(/\s+/);
    const weight = Number.parseFloat(descriptor) || 1;
    return { reference, weight };
  }).filter((candidate) => candidate.reference);
  return candidates.sort((left, right) => right.weight - left.weight)[0]?.reference || '';
}

function resourceType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.css') return 'css';
  if (extension === '.js' || extension === '.mjs') return 'js';
  if (/^\.(?:woff2?|ttf|otf)$/.test(extension)) return 'fonts';
  if (/^\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(extension)) return 'images';
  return 'other';
}

function transferredBytes(filePath, buffer) {
  return /\.(?:css|html?|js|json|mjs|php|svg|txt|xml)$/i.test(filePath)
    ? gzipSync(buffer).length
    : buffer.length;
}

async function inspectPageBudget(filePath) {
  const relativePath = toPublicPath(filePath);
  const pageUrl = publicUrlForPage(relativePath);
  const html = await fs.readFile(filePath, 'utf8');
  const $ = load(html, { decodeEntities: false });
  const localResources = new Map();
  const externalResources = new Set();
  const firstViewImages = new Set();
  const blockingFailures = [];
  const advisoryFindings = [];

  const addReference = (reference, baseUrl, options = {}) => {
    const resolved = resolveResource(reference, baseUrl);
    if (!resolved) return;
    if (resolved.error) {
      blockingFailures.push(resolved.error);
      return;
    }
    if (resolved.external) {
      externalResources.add(resolved.external);
      return;
    }
    const type = options.type || resourceType(resolved.absolute);
    localResources.set(resolved.publicPath, { ...resolved, type });
    if (options.firstViewImage) firstViewImages.add(resolved.publicPath);
  };

  $('link[href]').each((_, element) => {
    const relation = String($(element).attr('rel') || '').toLowerCase().split(/\s+/);
    if (!relation.some((value) => ['stylesheet', 'icon', 'preload', 'modulepreload', 'manifest'].includes(value))) return;
    addReference($(element).attr('href'), pageUrl);
  });
  $('script[src], iframe[src]').each((_, element) => addReference($(element).attr('src'), pageUrl));
  $('img[src]').each((_, element) => {
    if (String($(element).attr('loading') || '').toLowerCase() === 'lazy') return;
    const pictureSource = $(element).closest('picture').find('source[srcset]').first().attr('srcset');
    const reference = pictureSource
      ? largestSrcsetCandidate(pictureSource)
      : largestSrcsetCandidate($(element).attr('srcset')) || $(element).attr('src');
    addReference(reference, pageUrl, { type: 'images', firstViewImage: true });
  });
  $('video[poster]').each((_, element) => addReference($(element).attr('poster'), pageUrl, { type: 'images', firstViewImage: true }));
  $('video[autoplay] source[src], video[preload="auto"] source[src]').each((_, element) => addReference($(element).attr('src'), pageUrl));

  const inspectedCss = new Set();
  const inspectCss = async (resource) => {
    if (inspectedCss.has(resource.publicPath)) return;
    inspectedCss.add(resource.publicPath);
    let source;
    try {
      source = await fs.readFile(resource.absolute, 'utf8');
    } catch {
      return;
    }
    const baseUrl = `${siteOrigin}/${resource.publicPath}`;
    for (const match of source.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) addReference(match[2], baseUrl);
    for (const match of source.matchAll(/@import\s+(?:url\()?\s*(['"])(.*?)\1/gi)) addReference(match[2], baseUrl, { type: 'css' });
  };
  for (const resource of [...localResources.values()]) if (resource.type === 'css') await inspectCss(resource);
  for (const resource of [...localResources.values()]) if (resource.type === 'css') await inspectCss(resource);

  const totals = { html: transferredBytes(filePath, Buffer.from(html)), css: 0, js: 0, fonts: 0, images: 0, other: 0 };
  const sizes = new Map();
  for (const resource of localResources.values()) {
    let buffer;
    try {
      buffer = await fs.readFile(resource.absolute);
    } catch {
      blockingFailures.push(`missing local resource: ${resource.publicPath}`);
      continue;
    }
    const bytes = transferredBytes(resource.absolute, buffer);
    sizes.set(resource.publicPath, bytes);
    totals[resource.type] = (totals[resource.type] || 0) + bytes;
  }
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const largestFirstViewImage = Math.max(0, ...[...firstViewImages].map((item) => sizes.get(item) || 0));
  const requests = 1 + localResources.size + externalResources.size;
  const comparisons = {
    total: [total, budgets.total], html: [totals.html, budgets.html], css: [totals.css, budgets.css],
    js: [totals.js, budgets.js], fonts: [totals.fonts, budgets.fonts], images: [totals.images, budgets.images],
    firstViewImage: [largestFirstViewImage, budgets.firstViewImage], requests: [requests, budgets.requests],
    thirdPartyRequests: [externalResources.size, budgets.thirdPartyRequests],
  };
  for (const [metric, [actual, limit]] of Object.entries(comparisons)) {
    if (actual > limit) advisoryFindings.push(`${metric} ${actual} exceeds ${limit}`);
  }
  return {
    relativePath, localResources, blockingFailures, advisoryFindings,
    totals: { ...totals, total, largestFirstViewImage, requests, thirdPartyRequests: externalResources.size },
  };
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream';
}

function isApprovedForwardingPage($) {
  const robots = String($('meta[name="robots"]').attr('content') || '').toLowerCase();
  const refresh = String($('meta[http-equiv="refresh" i]').attr('content') || '');
  const canonical = String($('link[rel="canonical"]').attr('href') || '');
  if (!/\bnoindex\b/.test(robots) || !/\bfollow\b/.test(robots)) return false;
  if (!/;\s*url\s*=/i.test(refresh)) return false;
  if (!canonical.startsWith(siteOrigin)) return false;
  return $('a[href]').toArray().some((element) => {
    const href = String($(element).attr('href') || '');
    return href && !/^(?:#|mailto:|tel:|javascript:)/i.test(href);
  });
}

async function createPreviewServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
      const target = path.resolve(releaseRoot, decoded || 'index.html');
      const relative = path.relative(releaseRoot, target);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      const body = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': body.length });
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

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function verifyCaseStylesheetBundle(htmlFiles) {
  const compatibilityPath = path.join(releaseRoot, 'css', 'application-case.css');
  const bundledPath = path.join(releaseRoot, 'css', 'case-studies.css');
  const normalize = (value) => value.replace(/\r\n?/g, '\n').trim();
  const compatibility = normalize(await fs.readFile(compatibilityPath, 'utf8')).replace(/^\/\*[\s\S]*?\*\//, '').trim();
  const bundle = normalize(await fs.readFile(bundledPath, 'utf8'));
  const marker = '/* Application-case refinements are bundled here to avoid a second render-blocking request. */';
  assert(bundle.includes(marker), 'css/case-studies.css: missing application-case bundle marker.');
  assert(bundle.slice(bundle.indexOf(marker) + marker.length).trim() === compatibility, 'css/case-studies.css: application-case bundle does not match its compatibility source.');

  const linkedPages = [];
  for (const filePath of htmlFiles) {
    const source = await fs.readFile(filePath, 'utf8');
    if (/application-case\.css(?:[?"'])/i.test(source)) linkedPages.push(toPublicPath(filePath));
  }
  assert(linkedPages.length === 0, `Application-case pages must use the bundled stylesheet; legacy link found in: ${linkedPages.join(', ')}`);
}

async function verifyHttpAvailability(pages) {
  const server = await createPreviewServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const failures = [];
  let maxResponseMs = 0;
  try {
    const htmlPaths = pages.map((page) => `/${page.relativePath}`);
    htmlPaths.push('/', '/robots.txt', '/sitemap.xml', '/sitemap-i18n.xml');
    const resourcePaths = new Set();
    for (const page of pages) for (const resource of page.localResources.values()) resourcePaths.add(`/${resource.publicPath}`);
    const targets = [...new Set([...htmlPaths, ...resourcePaths])];
    await mapLimit(targets, 16, async (target) => {
      const started = performance.now();
      let response;
      try {
        response = await fetch(`${baseUrl}${target}`, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      } catch (error) {
        failures.push(`${target}: ${error.message}`);
        return;
      }
      maxResponseMs = Math.max(maxResponseMs, performance.now() - started);
      if (response.status !== 200) {
        failures.push(`${target}: expected 200, received ${response.status}`);
        return;
      }
      const body = await response.text();
      if (!body.trim()) failures.push(`${target}: empty response body`);
      if (target === '/' || target.endsWith('.html')) {
        const $ = load(body, { decodeEntities: false });
        const isApprovedLegacyRecovery = target.endsWith('/3-in-3-out-Pneumatic-rotary-joint-P6776400.html');
        const isApprovedModelForwardingPage = isApprovedForwardingPage($);
        if ($('title').length !== 1 || !String($('title').text()).trim()) failures.push(`${target}: missing title`);
        if ($('h1').length !== 1 || !String($('h1').text()).trim()) failures.push(`${target}: missing primary h1`);
        if (!isApprovedLegacyRecovery && !isApprovedModelForwardingPage && String($('body').text()).replace(/\s+/g, ' ').trim().length < 100) {
          failures.push(`${target}: primary content is unexpectedly short`);
        }
        const hasRfqPath = $('a[href]').toArray().some((element) => /(?:^|\/)contact\.html(?:[?#]|$)/i.test(String($(element).attr('href') || '')));
        if (!isApprovedLegacyRecovery && !isApprovedModelForwardingPage && !hasRfqPath) failures.push(`${target}: missing Contact/RFQ path`);
      }
    });

    for (const sitemapName of ['sitemap.xml', 'sitemap-i18n.xml']) {
      const source = await fs.readFile(path.join(releaseRoot, sitemapName), 'utf8');
      for (const match of source.matchAll(/<loc>(.*?)<\/loc>/g)) {
        const resolved = resolveResource(match[1], `${siteOrigin}/${sitemapName}`);
        if (!resolved || resolved.external || resolved.error) {
          failures.push(`${sitemapName}: invalid local URL ${match[1]}`);
          continue;
        }
        try {
          await fs.access(resolved.absolute);
        } catch {
          failures.push(`${sitemapName}: missing release target ${resolved.publicPath}`);
        }
      }
    }
    return { failures, checkedTargets: targets.length, maxResponseMs: Math.round(maxResponseMs) };
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

const files = await listFiles(releaseRoot);
const htmlFiles = files.filter((file) => file.toLowerCase().endsWith('.html'));
assert(htmlFiles.length > 0, `${releaseRoot}: no HTML files found.`);
await verifyCaseStylesheetBundle(htmlFiles);
const pages = await mapLimit(htmlFiles, 12, inspectPageBudget);
const resourceFailures = pages.flatMap((page) => page.blockingFailures.map((failure) => `${page.relativePath}: ${failure}`));
const advisoryFindings = pages.flatMap((page) => page.advisoryFindings.map((finding) => `${page.relativePath}: ${finding}`));
const availability = await verifyHttpAvailability(pages);
const failures = [...resourceFailures, ...availability.failures];
if (failures.length) {
  console.error(`Release experience verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
if (advisoryFindings.length) {
  console.warn(`Release experience advisory findings (${advisoryFindings.length}); classify under BEGAPUNK_WEBSITE_STANDARD.md before treating them as release blockers:`);
  advisoryFindings.forEach((finding) => console.warn(`- ${finding}`));
}
const maxima = {};
for (const key of ['total', 'html', 'css', 'js', 'fonts', 'images', 'largestFirstViewImage', 'requests', 'thirdPartyRequests']) {
  const page = pages.reduce((maximum, candidate) => candidate.totals[key] > maximum.totals[key] ? candidate : maximum, pages[0]);
  maxima[key] = { value: page.totals[key], page: page.relativePath };
}
console.log(JSON.stringify({
  result: 'Release HTTP availability and resource budgets verified',
  releaseRoot,
  htmlPages: pages.length,
  httpTargets: availability.checkedTargets,
  maxLocalResponseMs: availability.maxResponseMs,
  budgets,
  maxima,
  advisoryFindings,
  wroteFiles: false,
}));
