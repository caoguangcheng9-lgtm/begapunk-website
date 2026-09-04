import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const localeCodes = new Set([
  ...(config.activeLanguageCodes || []),
  ...Object.keys(config.partialLanguagePages || {}),
]);
const directories = [root, ...[...localeCodes].map((code) => path.join(root, code))];
const escapedCodes = [...localeCodes].map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const aliasPattern = new RegExp(`^/(?:index\\.html|(${escapedCodes})/index\\.html)$`);
const eligibleTagPattern = /<(a|option)\b[^>]*>/gi;
const attributePattern = /\b(href|value)=(['"])([^'"]+)\2/gi;
const changedFiles = [];
let replacementCount = 0;

function hasClassToken(tag, className) {
  const classValue = tag.match(/\bclass=(['"])([^'"]*)\1/i)?.[2] || '';
  return classValue.split(/\s+/).includes(className);
}

function canonicalReference(ownerRelative, rawValue, tagName) {
  if (!rawValue || /^(?:mailto:|tel:|data:|blob:|javascript:|#)/i.test(rawValue)) return rawValue;
  const suffixAt = rawValue.search(/[?#]/);
  const pathValue = suffixAt === -1 ? rawValue : rawValue.slice(0, suffixAt);
  const suffix = suffixAt === -1 ? '' : rawValue.slice(suffixAt);
  const ownerLocale = ownerRelative.split('/')[0];
  if (tagName === 'a' && localeCodes.has(ownerLocale) && pathValue === '../') {
    return `./${suffix}`;
  }
  let resolved;
  try {
    resolved = new URL(pathValue, `https://www.begapunk.com/${ownerRelative}`);
  } catch {
    return rawValue;
  }
  if (!/^https?:$/.test(resolved.protocol)
    || !['begapunk.com', 'www.begapunk.com'].includes(resolved.hostname)) return rawValue;
  const match = resolved.pathname.match(aliasPattern);
  if (!match) return rawValue;

  const targetDirectory = match[1] ? `/${match[1]}` : '/';
  const ownerDirectory = path.posix.dirname(`/${ownerRelative}`);
  const relative = path.posix.relative(ownerDirectory, targetDirectory);
  const directoryReference = relative === ''
    ? './'
    : relative === '..'
      ? '../'
      : `${relative}/`;
  return `${directoryReference}${suffix}`;
}

for (const directory of directories) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const fileName = path.join(directory, entry.name);
    const ownerRelative = path.relative(root, fileName).split(path.sep).join('/');
    const current = await fs.readFile(fileName, 'utf8');
    const expected = current.replace(eligibleTagPattern, (tag, rawTagName) => {
      const tagName = rawTagName.toLowerCase();
      const isHeaderLogo = tagName === 'a' && hasClassToken(tag, 'logo');
      return tag.replace(attributePattern, (whole, rawAttributeName, quote, rawValue) => {
        const attributeName = rawAttributeName.toLowerCase();
        if ((tagName === 'a' && attributeName !== 'href')
          || (tagName === 'option' && attributeName !== 'value')) return whole;
        const canonical = isHeaderLogo && attributeName === 'href'
          ? './'
          : canonicalReference(ownerRelative, rawValue, tagName);
        if (canonical !== rawValue) replacementCount += 1;
        return `${rawAttributeName}=${quote}${canonical}${quote}`;
      });
    });
    if (current === expected) continue;
    changedFiles.push(ownerRelative);
    if (write) await fs.writeFile(fileName, expected, 'utf8');
  }
}

if (changedFiles.length && !write) {
  console.error(`Canonical homepage-link drift: ${replacementCount} alias reference(s) in ${changedFiles.length} file(s).`);
  changedFiles.slice(0, 20).forEach((fileName) => console.error(`- ${fileName}`));
  if (changedFiles.length > 20) console.error(`- …and ${changedFiles.length - 20} more`);
  process.exit(1);
}

console.log(`Canonical homepage links ${write ? 'synchronized' : 'verified'}: ${replacementCount} replacement(s) in ${changedFiles.length} file(s).`);
