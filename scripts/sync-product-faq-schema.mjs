#!/usr/bin/env node
/**
 * Add a FAQPage node to product pages that already render FAQ content.
 *
 * Every product page ships five <details class="faq-item"> blocks, but only the
 * application pages carry matching FAQPage structured data. AI answer engines
 * read that graph, so the product pages were invisible to them even though the
 * answers were on the page.
 *
 * This script derives the schema from the visible markup, so the structured
 * data can never drift from what a human reads. It rewrites only the existing
 * application/ld+json block; every other byte of the file is preserved.
 *
 *   node scripts/sync-product-faq-schema.mjs            # write
 *   node scripts/sync-product-faq-schema.mjs --check    # verify only
 *   node scripts/sync-product-faq-schema.mjs --file=BP-1P-0006.html
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');
const FILE_FILTER = (process.argv.find((arg) => arg.startsWith('--file=')) || '').slice('--file='.length);

const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&times;/g, '×')
    .replace(/&middot;/g, '·')
    .replace(/&Oslash;/g, 'Ø')
    .replace(/&deg;/g, '°');
}

function toPlainText(html) {
  // Decorative toggle glyphs (the "+" in <span aria-hidden="true">) are not
  // part of the question wording.
  const withoutDecorative = html.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/gi, ' ');
  return decodeEntities(withoutDecorative.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * Pull question/answer pairs out of the rendered FAQ markup.
 *
 * Deliberately structure-based rather than class-based: the shipped pages use
 * <details class="faq-item"> + <div class="faq-answer">, while the redesign
 * draft uses <details class="bp1-faq-item"> + <p>. Matching on "any <details>
 * whose class mentions faq, with a <summary> for the question and the rest of
 * the block for the answer" survives both, and skips unrelated <details> such
 * as the video transcript.
 */
function extractFaq(html) {
  const pairs = [];
  const blockPattern = /<details[^>]*class="[^"]*faq[^"]*"[^>]*>([\s\S]*?)<\/details>/gi;
  for (const block of html.matchAll(blockPattern)) {
    const inner = block[1];
    const summaryMatch = inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (!summaryMatch) continue;
    const name = toPlainText(summaryMatch[1]);
    // Everything after the summary, minus the closing detail wrapper, is the answer.
    const answerHtml = inner.slice(summaryMatch.index + summaryMatch[0].length);
    const text = toPlainText(answerHtml);
    if (name && text) pairs.push({ name, text });
  }
  return pairs;
}

function desiredGraph(graph, faqPairs, language) {
  const withoutFaq = graph.filter((node) => node?.['@type'] !== 'FAQPage');
  if (!faqPairs.length) return withoutFaq;
  const faq = {
    '@type': 'FAQPage',
    mainEntity: faqPairs.map((pair) => ({
      '@type': 'Question',
      name: pair.name,
      acceptedAnswer: { '@type': 'Answer', text: pair.text },
    })),
  };
  // Localized pages must declare their language; the English source omits it,
  // matching the convention already used by the application pages.
  if (language && language !== 'en') faq.inLanguage = language;
  return [...withoutFaq, faq];
}

function processFile(file) {
  const fullPath = path.join(ROOT, file);
  if (!existsSync(fullPath)) return { file, status: 'missing' };

  const source = readFileSync(fullPath, 'utf8');
  const block = source.match(LD_BLOCK);
  if (!block) return { file, status: 'no-jsonld' };

  const faqPairs = extractFaq(source);
  if (!faqPairs.length) return { file, status: 'no-faq' };

  let data;
  try {
    data = JSON.parse(block[1]);
  } catch (error) {
    return { file, status: 'invalid-json', detail: error.message };
  }
  if (!Array.isArray(data['@graph'])) return { file, status: 'no-graph' };

  const before = JSON.stringify(data['@graph']);
  const language = (source.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || 'en';
  data['@graph'] = desiredGraph(data['@graph'], faqPairs, language);
  const after = JSON.stringify(data['@graph']);

  if (before === after) return { file, status: 'unchanged', questions: faqPairs.length };

  if (CHECK_ONLY) return { file, status: 'needs-update', questions: faqPairs.length };

  const replacement = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  const updated = source.replace(LD_BLOCK, replacement);
  writeFileSync(fullPath, updated, 'utf8');
  return { file, status: 'updated', questions: faqPairs.length };
}

const files = FILE_FILTER
  ? [FILE_FILTER]
  : globSync('**/BP-*.html', { cwd: ROOT })
      .map((f) => f.split(path.sep).join('/'))
      .filter((f) => !f.startsWith('dist/') && !f.startsWith('output/') && !f.startsWith('tmp/'))
      .sort();

const results = files.map(processFile);
const counts = results.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});

console.log(`${CHECK_ONLY ? 'Checking' : 'Syncing'} ${results.length} product page(s)`);
for (const [status, count] of Object.entries(counts)) {
  console.log(`  ${status}: ${count}`);
}

const problems = results.filter((r) => ['invalid-json', 'no-graph', 'missing'].includes(r.status));
for (const problem of problems.slice(0, 20)) {
  console.log(`  ! ${problem.file}: ${problem.status}${problem.detail ? ' — ' + problem.detail : ''}`);
}

if (CHECK_ONLY) {
  const stale = results.filter((r) => r.status === 'needs-update');
  if (stale.length) {
    console.log(`\nRESULT: FAIL — ${stale.length} page(s) have FAQ markup without matching schema.`);
    for (const s of stale.slice(0, 10)) console.log(`  ${s.file} (${s.questions} questions)`);
    process.exitCode = 1;
  } else {
    console.log('\nRESULT: PASS — every product page with FAQ markup carries matching schema.');
  }
}
