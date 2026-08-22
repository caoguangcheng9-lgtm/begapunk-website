import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOCIAL_ROOT = path.join(ROOT, 'images', 'social');
const AUDIT_ROOT = path.join(ROOT, 'audit', 'social-sharing');
const MANIFEST_PATH = path.join(AUDIT_ROOT, 'manifest.json');
const REPORT_PATH = path.join(AUDIT_ROOT, 'report.md');
const IMAGE_MANIFEST_PATH = path.join(ROOT, 'audit', 'image-optimization', 'manifest.json');
const DRAWING_FACTS_PATH = path.join(ROOT, 'data', 'product-drawing-facts.json');
const SITE_ORIGIN = 'https://www.begapunk.com/';

const drawingFacts = JSON.parse(await fs.readFile(DRAWING_FACTS_PATH, 'utf8'));
const productModels = Object.keys(drawingFacts.products || {}).sort();
const modelArgument = process.argv.find((argument) => argument.startsWith('--model='));
const requestedModel = modelArgument?.slice('--model='.length) || null;
const unexpectedArguments = process.argv.slice(2).filter((argument) => !argument.startsWith('--model='));
if (unexpectedArguments.length) throw new Error(`Unsupported argument(s): ${unexpectedArguments.join(', ')}`);
if (requestedModel && !productModels.includes(requestedModel)) {
  throw new Error(`Unknown drawing-backed product model: ${requestedModel}`);
}
const productPages = (requestedModel ? [requestedModel] : productModels)
  .map((model) => `${model}.html`);

const imageManifest = JSON.parse(await fs.readFile(IMAGE_MANIFEST_PATH, 'utf8'));
const originalByOptimized = new Map(
  imageManifest.images.map((image) => [image.output, image.source]),
);

const xmlEscape = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const htmlEscape = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function decodeHtml(value) {
  return value
    .replace(/&Oslash;/gi, 'Ø')
    .replace(/&middot;/gi, '·')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function getMeta(html, attribute, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<meta\\s+${attribute}=["']${escaped}["']\\s+content=["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

function setMeta(html, attribute, key, value, insertAfterKey) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replacement = `<meta ${attribute}="${key}" content="${htmlEscape(value)}">`;
  const existing = new RegExp(`<meta\\s+${attribute}=["']${escapedKey}["']\\s+content=["'][^"']*["']\\s*\\/?>`, 'i');
  if (existing.test(html)) return html.replace(existing, replacement);

  const escapedAfter = insertAfterKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const after = new RegExp(`(<meta\\s+${attribute}=["']${escapedAfter}["']\\s+content=["'][^"']*["']\\s*\\/?>)`, 'i');
  return html.replace(after, `$1\n ${replacement}`);
}

function wrapText(value, maxLength = 27, maxLines = 3) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxLength || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines[maxLines - 1] = `${lines.slice(maxLines - 1).join(' ')}`;
  }
  return lines.slice(0, maxLines);
}

async function createCard({ model, descriptor, sourceImage }) {
  const titleLines = wrapText(descriptor, 28, 3);
  const lineElements = titleLines
    .map((line, index) => `<text x="72" y="${310 + index * 45}" class="title">${xmlEscape(line)}</text>`)
    .join('');

  const background = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0c1727"/>
          <stop offset="1" stop-color="#173c65"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#07111f" flood-opacity="0.38"/>
        </filter>
        <style>
          .eyebrow { font: 700 20px Arial, sans-serif; letter-spacing: 2px; fill: #6bb8ff; }
          .model { font: 700 52px Arial, sans-serif; fill: #ffffff; }
          .title { font: 700 34px Arial, sans-serif; fill: #ffffff; }
          .detail { font: 400 21px Arial, sans-serif; fill: #c9d7e8; }
          .url { font: 700 22px Arial, sans-serif; fill: #ffffff; }
          .panel-label { font: 700 16px Arial, sans-serif; letter-spacing: 1.5px; fill: #326da8; }
        </style>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect x="0" y="0" width="12" height="630" fill="#2588dd"/>
      <circle cx="585" cy="80" r="190" fill="#1d578c" opacity="0.22"/>
      <circle cx="530" cy="590" r="250" fill="#07111f" opacity="0.18"/>
      <rect x="675" y="45" width="480" height="540" rx="28" fill="#ffffff" filter="url(#shadow)"/>
      <rect x="695" y="65" width="440" height="500" rx="20" fill="#f4f6f8"/>
      <text x="72" y="195" class="eyebrow">PRECISION ROTARY JOINT</text>
      <text x="72" y="260" class="model">${xmlEscape(model)}</text>
      ${lineElements}
      <line x1="72" y1="485" x2="605" y2="485" stroke="#4a78a4" stroke-width="1"/>
      <text x="72" y="526" class="detail">Product specifications · drawings · RFQ</text>
      <text x="72" y="570" class="url">www.begapunk.com</text>
      <text x="715" y="96" class="panel-label">PRODUCT VIEW</text>
    </svg>`);

  const product = await sharp(sourceImage)
    .rotate()
    .resize({ width: 410, height: 410, fit: 'contain', background: '#f4f6f8' })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const logo = await sharp(path.join(ROOT, 'images', 'begapunk-logo-header.png'))
    .resize({ width: 260, withoutEnlargement: false })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([
      { input: logo, left: 72, top: 60 },
      { input: product, left: 710, top: 115 },
    ])
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

await fs.mkdir(SOCIAL_ROOT, { recursive: true });
await fs.mkdir(AUDIT_ROOT, { recursive: true });

const previousManifest = requestedModel
  ? JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'))
  : { images: [] };
const generatedImages = [];
for (const file of productPages) {
  const filePath = path.join(ROOT, file);
  let html = await fs.readFile(filePath, 'utf8');
  const model = path.basename(file, '.html');
  const ogTitle = decodeHtml(getMeta(html, 'property', 'og:title') ?? model);
  const descriptor = ogTitle
    .replace(new RegExp(`^${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '')
    .replace(/\s*\|\s*Begapunk\s*$/i, '')
    .trim();
  const currentMainImage = html.match(/<img\s+id=["']main-img["'][^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  if (!currentMainImage) throw new Error(`${file}: main product image was not found.`);
  const originalImage = originalByOptimized.get(currentMainImage) ?? currentMainImage;
  const sourceImage = path.join(ROOT, ...originalImage.split('/'));
  const card = await createCard({ model, descriptor, sourceImage });
  const digest = crypto.createHash('sha256').update(card).digest('hex');
  const outputRelative = `images/social/${model}-social.jpg`;
  const outputPath = path.join(ROOT, ...outputRelative.split('/'));
  await fs.writeFile(outputPath, card);

  const imageUrl = `${SITE_ORIGIN}${outputRelative}?v=${digest.slice(0, 12)}`;
  const alt = decodeHtml(getMeta(html, 'property', 'og:image:alt') ?? `${ogTitle} product overview`);
  html = setMeta(html, 'property', 'og:image', imageUrl, 'og:type');
  html = setMeta(html, 'property', 'og:image:secure_url', imageUrl, 'og:image');
  html = setMeta(html, 'property', 'og:image:type', 'image/jpeg', 'og:image:secure_url');
  html = setMeta(html, 'property', 'og:image:width', '1200', 'og:image:type');
  html = setMeta(html, 'property', 'og:image:height', '630', 'og:image:width');
  html = setMeta(html, 'property', 'og:image:alt', alt, 'og:image:height');
  html = setMeta(html, 'name', 'twitter:image', imageUrl, 'twitter:description');
  html = setMeta(html, 'name', 'twitter:image:alt', alt, 'twitter:image');
  await fs.writeFile(filePath, html, 'utf8');

  generatedImages.push({
    page: file,
    model,
    title: ogTitle,
    sourceImage: originalImage,
    output: outputRelative,
    url: imageUrl,
    width: 1200,
    height: 630,
    bytes: card.length,
    sha256: digest,
  });
}

const replacedModels = new Set(generatedImages.map((image) => image.model));
const manifest = [
  ...previousManifest.images.filter((image) => productModels.includes(image.model) && !replacedModels.has(image.model)),
  ...generatedImages,
].sort((left, right) => left.page.localeCompare(right.page));

await fs.writeFile(MANIFEST_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), images: manifest }, null, 2)}\n`, 'utf8');
const totalBytes = manifest.reduce((sum, image) => sum + image.bytes, 0);
const report = [
  '# Begapunk Social Sharing Image Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Product pages updated: ${manifest.length}`,
  '- Card dimensions: 1200 × 630 pixels',
  '- Format: JPEG',
  `- Total generated size: ${(totalBytes / 1024).toFixed(1)} KB`,
  '- Product imagery is placed with contain-fit and safe margins; no AI redrawing is used.',
  '- Each page uses a product-specific URL plus a content hash query for social-cache invalidation.',
  '',
  '| Page | Share image | Size |',
  '| --- | --- | ---: |',
  ...manifest.map((image) => `| \`${image.page}\` | \`${image.output}\` | ${(image.bytes / 1024).toFixed(1)} KB |`),
  '',
].join('\n');
await fs.writeFile(REPORT_PATH, report, 'utf8');

console.log(JSON.stringify({
  pages: manifest.length,
  generatedPages: generatedImages.length,
  dimensions: '1200x630',
  outputBytes: totalBytes,
  outputDirectory: 'images/social',
  report: 'audit/social-sharing/report.md',
}, null, 2));
