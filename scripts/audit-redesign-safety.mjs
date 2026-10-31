#!/usr/bin/env node
/**
 * Redesign safety audit.
 *
 * The site's rankings come from things that are easy to break by accident while
 * restyling: URLs, internal links, titles, canonicals, hreflang pairs, anchors
 * that outside pages and AI answers link to, the robots directive, and the
 * analytics script that attributes every inquiry.
 *
 * This tool snapshots all of that, then compares the working tree against the
 * snapshot and fails on anything that would cost traffic. It is deliberately
 * static: it reads the repository, never the network, so it stays deterministic
 * and runs in CI.
 *
 *   node scripts/audit-redesign-safety.mjs --capture   # write the baseline
 *   node scripts/audit-redesign-safety.mjs             # compare against it
 *
 * Exit codes: 0 = no blockers, 1 = blockers found, 2 = tooling problem.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { globSync } from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'audit', 'redesign-safety', 'baseline.json');

// Directories that are build output, scratch space or vendored copies. Their
// HTML is not part of the published URL space.
const EXCLUDED_PREFIXES = [
  'dist/',
  'output/',
  'tmp/',
  'node_modules/',
  'catalog-project/',
  'audit/',
  'docs/',
  '.git/',
];

// Pages that legitimately carry a noindex directive in the repository.
// Keep this empty unless a page is intentionally kept out of search.
const ALLOWED_NOINDEX = new Set();

const ANALYTICS_HINT = /analytics\.js/i;

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function listHtmlFiles() {
  return globSync('**/*.html', { cwd: ROOT })
    .map(toPosix)
    .filter((file) => !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .filter((file) => !file.endsWith('.backup'))
    .sort();
}

/** Public URL for a repository file: index.html collapses to its directory. */
function urlForFile(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return '/' + file.slice(0, -'index.html'.length);
  return '/' + file;
}

function extract(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1 = h1Matches
    .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const canonicalHref = canonicalMatch ? (canonicalMatch[0].match(/href=["']([^"']+)["']/i) || [])[1] || '' : '';

  const hreflangs = {};
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/hreflang=/i.test(tag)) continue;
    const lang = (tag.match(/hreflang=["']([^"']+)["']/i) || [])[1];
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (lang && href) hreflangs[lang.toLowerCase()] = href;
  }

  const robotsMeta = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/name=["']robots["']/i.test(tag)) continue;
    const content = (tag.match(/content=["']([^"']+)["']/i) || [])[1] || '';
    robotsMeta.push(content.toLowerCase());
  }

  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1].split('?')[0])
    .sort();

  const anchors = [...new Set(
    [...html.matchAll(/\bid=["']([A-Za-z][^"']*)["']/gi)].map((match) => match[1]),
  )].sort();

  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);

  return { title, h1, canonical: canonicalHref, hreflangs, robotsMeta, scripts, anchors, hrefs };
}

function isCheckableLink(href) {
  if (!href) return false;
  const value = href.trim();
  if (value === '' || value.startsWith('#')) return false;
  if (/^(?:https?:|mailto:|tel:|javascript:|data:|ftp:)/i.test(value)) return false;
  return true;
}

/** Resolve an internal href to a repository file, or null when it cannot map. */
function resolveLink(href, fromFile) {
  const cleaned = href.split('#')[0].split('?')[0];
  if (!cleaned) return null;
  let target;
  if (cleaned.startsWith('/')) {
    target = cleaned.slice(1);
  } else {
    target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), cleaned));
  }
  if (target.startsWith('..')) return null;
  if (target === '' || target.endsWith('/')) return target + 'index.html';
  return target;
}

function capture() {
  const files = listHtmlFiles();
  const pages = {};
  const brokenLinks = [];

  for (const file of files) {
    const html = readFileSync(path.join(ROOT, file), 'utf8');
    const data = extract(html);
    const links = new Set();

    for (const href of data.hrefs) {
      if (!isCheckableLink(href)) continue;
      const target = resolveLink(href, file);
      if (!target) continue;
      links.add(target);
      if (!existsSync(path.join(ROOT, target))) {
        brokenLinks.push({ page: file, href, target });
      }
    }

    pages[urlForFile(file)] = {
      file,
      title: data.title,
      h1: data.h1,
      canonical: data.canonical,
      hreflangs: data.hreflangs,
      robotsMeta: data.robotsMeta,
      scripts: data.scripts,
      hasAnalytics: data.scripts.some((src) => ANALYTICS_HINT.test(src)),
      anchors: data.anchors,
      links: [...links].sort(),
    };
  }

  const snapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    pageCount: files.length,
    pages,
    brokenLinks,
  };

  mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Baseline captured: ${files.length} pages -> ${path.relative(ROOT, BASELINE_PATH)}`);
  if (brokenLinks.length) {
    console.log(`Note: ${brokenLinks.length} internal link(s) were already broken at capture time.`);
    for (const item of brokenLinks.slice(0, 10)) {
      console.log(`  - ${item.page}: ${item.href}`);
    }
  }
  return 0;
}

function compareSets(before, after) {
  const removed = before.filter((value) => !after.includes(value));
  const added = after.filter((value) => !before.includes(value));
  return { removed, added };
}

function verify() {
  if (!existsSync(BASELINE_PATH)) {
    console.error(`No baseline at ${path.relative(ROOT, BASELINE_PATH)}.`);
    console.error('Run: node scripts/audit-redesign-safety.mjs --capture');
    return 2;
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const blockers = [];
  const warnings = [];
  const notes = [];

  const files = listHtmlFiles();
  const current = {};
  for (const file of files) {
    const html = readFileSync(path.join(ROOT, file), 'utf8');
    const data = extract(html);
    current[urlForFile(file)] = {
      file,
      title: data.title,
      h1: data.h1,
      canonical: data.canonical,
      hreflangs: data.hreflangs,
      robotsMeta: data.robotsMeta,
      scripts: data.scripts,
      hasAnalytics: data.scripts.some((src) => ANALYTICS_HINT.test(src)),
      anchors: data.anchors,
      hrefs: data.hrefs,
    };
  }

  // 1. URL stability: a removed URL abandons every ranking signal it earned.
  const { removed: removedUrls, added: addedUrls } = compareSets(Object.keys(baseline.pages), Object.keys(current));
  for (const url of removedUrls) {
    blockers.push(`URL removed: ${url} (was ${baseline.pages[url].file})`);
  }
  for (const url of addedUrls) {
    notes.push(`URL added: ${url}`);
  }

  // 2. Internal links must resolve, and links that existed must survive.
  const brokenNow = [];
  const linkLosses = [];
  for (const [url, page] of Object.entries(current)) {
    const resolved = new Set();
    for (const href of page.hrefs) {
      if (!isCheckableLink(href)) continue;
      const target = resolveLink(href, page.file);
      if (!target) continue;
      resolved.add(target);
      if (!existsSync(path.join(ROOT, target))) {
        brokenNow.push({ url, href, target });
      }
    }
    const before = baseline.pages[url];
    if (before) {
      for (const target of before.links) {
        if (!resolved.has(target)) linkLosses.push({ url, target });
      }
    }
  }
  for (const item of brokenNow) {
    blockers.push(`Broken internal link on ${item.url}: ${item.href} -> ${item.target}`);
  }
  for (const item of linkLosses) {
    warnings.push(`Internal link dropped on ${item.url}: ${item.target}`);
  }

  // 3. Per-page search-critical metadata.
  for (const [url, before] of Object.entries(baseline.pages)) {
    const after = current[url];
    if (!after) continue; // already reported as removed

    if (before.title !== after.title) {
      warnings.push(`Title changed on ${url}\n      before: ${before.title}\n      after:  ${after.title}`);
    }
    if (before.canonical !== after.canonical) {
      blockers.push(`Canonical changed on ${url}: ${JSON.stringify(before.canonical)} -> ${JSON.stringify(after.canonical)}`);
    }
    const beforeH1 = JSON.stringify(before.h1);
    const afterH1 = JSON.stringify(after.h1);
    if (beforeH1 !== afterH1) {
      warnings.push(`H1 changed on ${url}\n      before: ${beforeH1}\n      after:  ${afterH1}`);
    }

    const beforeLangs = Object.keys(before.hreflangs).sort().join(',');
    const afterLangs = Object.keys(after.hreflangs).sort().join(',');
    if (beforeLangs !== afterLangs) {
      blockers.push(`hreflang set changed on ${url}: [${beforeLangs}] -> [${afterLangs}]`);
    } else {
      for (const lang of Object.keys(before.hreflangs)) {
        if (before.hreflangs[lang] !== after.hreflangs[lang]) {
          blockers.push(`hreflang ${lang} target changed on ${url}: ${before.hreflangs[lang]} -> ${after.hreflangs[lang]}`);
        }
      }
    }

    // 4. A noindex directive that appears after this point deindexes the page
    //    silently; it is the single most expensive accident in a redesign.
    const beforeNoindex = before.robotsMeta.some((value) => value.includes('noindex'));
    const afterNoindex = after.robotsMeta.some((value) => value.includes('noindex'));
    if (!beforeNoindex && afterNoindex && !ALLOWED_NOINDEX.has(url)) {
      blockers.push(`noindex appeared on ${url}`);
    }

    // 5. Analytics loss breaks inquiry attribution, including paid clicks.
    if (before.hasAnalytics && !after.hasAnalytics) {
      blockers.push(`Analytics script dropped on ${url} (had ${before.scripts.filter((s) => ANALYTICS_HINT.test(s)).join(', ')})`);
    }

    // 6. Anchors are cited externally and by AI answers; losing one breaks
    //    those references even though the page still loads.
    const { removed: lostAnchors } = compareSets(before.anchors, after.anchors);
    const worthKeeping = lostAnchors.filter((anchor) => !/^(?:main-img|honeypot)$/.test(anchor));
    if (worthKeeping.length) {
      warnings.push(`Anchors removed on ${url}: ${worthKeeping.join(', ')}`);
    }
  }

  const report = [];
  report.push('Redesign safety audit');
  report.push(`  baseline: ${baseline.capturedAt} (${baseline.pageCount} pages)`);
  report.push(`  current : ${files.length} pages`);
  report.push('');

  if (blockers.length) {
    report.push(`BLOCKERS (${blockers.length}) — do not publish:`);
    for (const line of blockers) report.push(`  ✗ ${line}`);
    report.push('');
  }
  if (warnings.length) {
    report.push(`WARNINGS (${warnings.length}) — review before publishing:`);
    for (const line of warnings) report.push(`  ! ${line}`);
    report.push('');
  }
  if (notes.length) {
    report.push(`NOTES (${notes.length}):`);
    for (const line of notes.slice(0, 20)) report.push(`  · ${line}`);
    if (notes.length > 20) report.push(`  · … ${notes.length - 20} more`);
    report.push('');
  }

  report.push(
    blockers.length
      ? `RESULT: FAIL — ${blockers.length} blocker(s).`
      : `RESULT: PASS — 0 blockers, ${warnings.length} warning(s) to review.`,
  );

  console.log(report.join('\n'));
  return blockers.length ? 1 : 0;
}

const mode = process.argv.includes('--capture') ? 'capture' : 'verify';
process.exitCode = mode === 'capture' ? capture() : verify();
