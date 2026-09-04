import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const write = process.argv.includes('--write');
const languagesArgument = process.argv.find((argument) => argument.startsWith('--languages='));
const languages = languagesArgument
  ? languagesArgument.slice('--languages='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [...config.activeLanguageCodes];

for (const language of languages) {
  if (!config.activeLanguageCodes.includes(language)) throw new Error(`Unsupported active language: ${language}.`);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceUnique(source, pattern, replacement, label, relativePath) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) throw new Error(`${relativePath}: expected one ${label}, found ${matches.length}.`);
  return source.replace(pattern, replacement);
}

function replaceMeta(source, selectorAttribute, selectorValue, content, relativePath) {
  const tagPattern = /<meta\b[^>]*>/gi;
  const selectorPattern = new RegExp(`\\b${selectorAttribute}\\s*=\\s*(["'])${selectorValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'i');
  const matches = [...source.matchAll(tagPattern)].filter((match) => selectorPattern.test(match[0]));
  if (matches.length !== 1) {
    throw new Error(`${relativePath}: expected one meta ${selectorAttribute}=${selectorValue}, found ${matches.length}.`);
  }
  const original = matches[0][0];
  const encoded = escapeAttribute(content);
  const updated = /\bcontent\s*=\s*(["'])[^"']*\1/i.test(original)
    ? original.replace(/\bcontent\s*=\s*(["'])[^"']*\1/i, `content="${encoded}"`)
    : original.replace(/\s*\/?\s*>$/, ` content="${encoded}">`);
  return source.slice(0, matches[0].index) + updated + source.slice(matches[0].index + original.length);
}

function removeKeywordsMeta(source) {
  return source.replace(/^[ \t]*<meta\b(?=[^>]*\bname\s*=\s*(["'])keywords\1)[^>]*>\s*\r?\n?/gim, '');
}

function synchronizeMarkup(source, seo, relativePath) {
  let output = source;
  output = replaceUnique(output, /(<title\b[^>]*>)[\s\S]*?(<\/title>)/i, `$1${escapeText(seo.title)}$2`, 'title', relativePath);
  output = replaceUnique(output, /(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${escapeText(seo.h1)}$2`, 'H1', relativePath);
  output = replaceMeta(output, 'name', 'description', seo.description, relativePath);
  output = replaceMeta(output, 'property', 'og:title', seo.title, relativePath);
  output = replaceMeta(output, 'property', 'og:description', seo.description, relativePath);
  output = replaceMeta(output, 'name', 'twitter:title', seo.title, relativePath);
  output = replaceMeta(output, 'name', 'twitter:description', seo.description, relativePath);
  return removeKeywordsMeta(output);
}

const failures = [];
let checked = 0;
let changed = 0;

for (const language of languages) {
  const seoPath = path.join(root, 'i18n', 'seo', `${language}.json`);
  const seo = JSON.parse(await fs.readFile(seoPath, 'utf8'));
  for (const pageName of config.manualLocalizedPages) {
    const relativePath = `${language}/${pageName}`;
    const filePath = path.join(root, language, pageName);
    const source = await fs.readFile(filePath, 'utf8');
    const entry = seo[pageName];
    if (!entry) throw new Error(`${relativePath}: governed SEO entry is missing.`);
    const expected = synchronizeMarkup(source, entry, relativePath);
    const $ = load(source, { decodeEntities: false });
    const meta = (attribute, value) => $('meta').filter((_, element) => $(element).attr(attribute) === value).attr('content') || '';
    const actual = {
      title: $('title').text().trim(),
      description: meta('name', 'description'),
      h1: $('h1').text().replace(/\s+/g, ' ').trim(),
      ogTitle: meta('property', 'og:title'),
      ogDescription: meta('property', 'og:description'),
      twitterTitle: meta('name', 'twitter:title'),
      twitterDescription: meta('name', 'twitter:description'),
      keywords: $('meta[name="keywords"]').length,
    };
    const governed = {
      title: entry.title,
      description: entry.description,
      h1: entry.h1,
      ogTitle: entry.title,
      ogDescription: entry.description,
      twitterTitle: entry.title,
      twitterDescription: entry.description,
      keywords: 0,
    };
    const mismatches = Object.keys(governed).filter((key) => actual[key] !== governed[key]);
    if (mismatches.length && !write) failures.push(`${relativePath}: ${mismatches.join(', ')} differ from governed SEO.`);
    if (expected !== source) {
      changed += 1;
      if (write) await fs.writeFile(filePath, expected, 'utf8');
    }
    checked += 1;
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Manual localized SEO ${write ? 'synchronized' : 'verified'}: ${checked} pages; ${write ? changed : 0} file(s) changed.`);
}
