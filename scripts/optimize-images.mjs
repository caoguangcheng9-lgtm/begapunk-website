import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMAGE_ROOT = path.join(ROOT, 'images');
const OUTPUT_ROOT = path.join(IMAGE_ROOT, 'optimized');
const REPORT_ROOT = path.join(ROOT, 'audit', 'image-optimization');
const MANIFEST_PATH = path.join(REPORT_ROOT, 'manifest.json');
const REPORT_PATH = path.join(REPORT_ROOT, 'report.md');
const mode = process.argv.includes('--write') ? 'write' : 'audit';

const htmlFiles = (await fs.readdir(ROOT))
  .filter((file) => file.endsWith('.html') && !file.endsWith('.backup'))
  .sort();

const toFsPath = (webPath) => path.join(ROOT, ...webPath.split('/'));
const toWebPath = (fsPath) => path.relative(ROOT, fsPath).split(path.sep).join('/');
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const prettyBytes = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

function outputPathFor(source) {
  const relative = source.slice('images/'.length).replace(/\.(?:jpe?g|png|webp)$/i, '.webp');
  return `images/optimized/${relative}`;
}

function qualityFor(source) {
  return /(?:logo|diagram|working-principle|structure)/i.test(source) ? 90 : 82;
}

async function discoverSources() {
  const sources = new Set();
  for (const file of htmlFiles) {
    const html = await fs.readFile(path.join(ROOT, file), 'utf8');
    for (const match of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      const source = match[1].split(/[?#]/)[0];
      if (source.startsWith('images/') && !source.startsWith('images/optimized/')) {
        sources.add(source);
      }
    }
  }
  return [...sources].sort();
}

async function loadKnownSources() {
  const sources = new Set(await discoverSources());
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
    for (const image of manifest.images) sources.add(image.source);
  } catch {
    // The first run has no manifest yet; discovered HTML sources are sufficient.
  }
  return [...sources].sort();
}

async function encode(source) {
  const sourcePath = toFsPath(source);
  const input = await fs.readFile(sourcePath);
  const metadata = await sharp(input).metadata();
  const quality = qualityFor(source);
  const output = await sharp(input)
    .rotate()
    .webp({ quality, alphaQuality: 95, effort: 6, smartSubsample: true })
    .toBuffer();

  return {
    source,
    output: outputPathFor(source),
    width: metadata.width,
    height: metadata.height,
    quality,
    inputBytes: input.length,
    outputBytes: output.length,
    savedBytes: input.length - output.length,
    sourceSha256: hash(input),
    outputSha256: hash(output),
    buffer: output,
  };
}

async function createHeroVariants(entry) {
  if (entry.source !== 'images/hero-products-clean.webp') return [];
  const input = await fs.readFile(toFsPath(entry.source));
  const widths = [640, 960, 1440, entry.width].filter(
    (width, index, values) => width <= entry.width && values.indexOf(width) === index,
  );
  const variants = [];
  for (const width of widths) {
    const relative = entry.output.replace(/\.webp$/i, `-${width}.webp`);
    const buffer = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: entry.quality, alphaQuality: 95, effort: 6, smartSubsample: true })
      .toBuffer();
    variants.push({ width, output: relative, bytes: buffer.length, sha256: hash(buffer), buffer });
  }
  return variants;
}

function updateImageTag(tag, entriesBySource) {
  const srcMatch = tag.match(/\bsrc=(["'])([^"']+)\1/i);
  if (!srcMatch) return tag;
  const current = srcMatch[2].split(/[?#]/)[0];
  const entry = entriesBySource.get(current)
    ?? [...entriesBySource.values()].find((item) => item.output === current);
  if (!entry) return tag;

  let updated = tag.replace(srcMatch[0], `src=${srcMatch[1]}${entry.output}${srcMatch[1]}`);
  if (!/\bwidth=["']?\d+/i.test(updated)) {
    updated = updated.replace(/\s*\/?\s*>$/, ` width="${entry.width}"$&`);
  }
  if (!/\bheight=["']?\d+/i.test(updated)) {
    updated = updated.replace(/\s*\/?\s*>$/, ` height="${entry.height}"$&`);
  }

  if (entry.variants?.length) {
    const srcset = entry.variants.map((variant) => `${variant.output} ${variant.width}w`).join(', ');
    if (/\bsrcset=/i.test(updated)) {
      updated = updated.replace(/\bsrcset=(["'])[^"']*\1/i, `srcset="${srcset}"`);
    } else {
      updated = updated.replace(/\s*\/?\s*>$/, ` srcset="${srcset}"$&`);
    }
    if (!/\bsizes=/i.test(updated)) {
      updated = updated.replace(/\s*\/?\s*>$/, ' sizes="(max-width: 900px) 100vw, 50vw"$&');
    }
    const preferred = entry.variants.find((variant) => variant.width === 960) ?? entry.variants.at(-1);
    updated = updated.replace(/\bsrc=(["'])[^"']*\1/i, `src="${preferred.output}"`);
  }
  return updated;
}

async function updateHtml(entries) {
  const entriesBySource = new Map(entries.map((entry) => [entry.source, entry]));
  let changedFiles = 0;
  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    const before = await fs.readFile(filePath, 'utf8');
    let after = before.replace(/<img\b[^>]*>/gi, (tag) => updateImageTag(tag, entriesBySource));

    const hero = entriesBySource.get('images/hero-products-clean.webp');
    if (hero?.variants?.length) {
      const srcset = hero.variants.map((variant) => `${variant.output} ${variant.width}w`).join(', ');
      after = after.replace(
        /<source\s+srcset=["'](?:images\/hero-products-clean\.webp|images\/optimized\/hero-products-clean[^"']*)["']\s+type=["']image\/webp["']\s*\/?>/i,
        `<source srcset="${srcset}" sizes="(max-width: 900px) 100vw, 50vw" type="image/webp">`,
      );
    }

    if (after !== before) {
      await fs.writeFile(filePath, after, 'utf8');
      changedFiles += 1;
    }
  }
  return changedFiles;
}

function publicEntry(entry) {
  const { buffer, variants = [], ...rest } = entry;
  return {
    ...rest,
    variants: variants.map(({ buffer: variantBuffer, ...variant }) => variant),
  };
}

function buildReport(entries, changedFiles) {
  const inputBytes = entries.reduce((sum, entry) => sum + entry.inputBytes, 0);
  const outputBytes = entries.reduce((sum, entry) => sum + entry.outputBytes, 0);
  const savedBytes = inputBytes - outputBytes;
  const top = [...entries].sort((a, b) => b.savedBytes - a.savedBytes).slice(0, 15);
  const lines = [
    '# Begapunk Image Optimization Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `- HTML pages scanned: ${htmlFiles.length}`,
    `- Unique content images optimized: ${entries.length}`,
    `- Original referenced image weight: ${prettyBytes(inputBytes)}`,
    `- Optimized referenced image weight: ${prettyBytes(outputBytes)}`,
    `- Estimated unique-asset saving: ${prettyBytes(savedBytes)} (${((savedBytes / inputBytes) * 100).toFixed(1)}%)`,
    `- HTML files updated: ${changedFiles}`,
    '- Originals retained under `images/`; optimized derivatives are under `images/optimized/`.',
    '',
    '## Largest savings',
    '',
    '| Source | Before | After | Saving |',
    '| --- | ---: | ---: | ---: |',
    ...top.map((entry) => `| \`${entry.source}\` | ${prettyBytes(entry.inputBytes)} | ${prettyBytes(entry.outputBytes)} | ${prettyBytes(entry.savedBytes)} |`),
    '',
    'The homepage hero also has responsive 640, 960, 1440, and 1920 pixel derivatives so the browser can avoid downloading the desktop-width image on smaller screens.',
    '',
  ];
  return lines.join('\n');
}

const sources = await loadKnownSources();
if (sources.length === 0) {
  throw new Error('No local HTML image sources were discovered and no manifest exists.');
}

const entries = [];
for (const source of sources) {
  const entry = await encode(source);
  entry.variants = await createHeroVariants(entry);
  entries.push(entry);
}

let changedFiles = 0;
if (mode === 'write') {
  for (const entry of entries) {
    const outputPath = toFsPath(entry.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, entry.buffer);
    for (const variant of entry.variants) {
      const variantPath = toFsPath(variant.output);
      await fs.mkdir(path.dirname(variantPath), { recursive: true });
      await fs.writeFile(variantPath, variant.buffer);
    }
  }
  changedFiles = await updateHtml(entries);
  await fs.mkdir(REPORT_ROOT, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    sharpVersion: sharp.versions.sharp,
    images: entries.map(publicEntry),
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, buildReport(entries, changedFiles), 'utf8');
}

const inputBytes = entries.reduce((sum, entry) => sum + entry.inputBytes, 0);
const outputBytes = entries.reduce((sum, entry) => sum + entry.outputBytes, 0);
console.log(JSON.stringify({
  mode,
  pages: htmlFiles.length,
  images: entries.length,
  inputBytes,
  outputBytes,
  savedBytes: inputBytes - outputBytes,
  savingPercent: Number((((inputBytes - outputBytes) / inputBytes) * 100).toFixed(1)),
  changedFiles,
  report: mode === 'write' ? toWebPath(REPORT_PATH) : null,
}, null, 2));
