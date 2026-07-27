import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  await fs.readFile(path.join(ROOT, 'audit', 'social-sharing', 'manifest.json'), 'utf8'),
);
const errors = [];
const urls = new Set();

for (const image of manifest.images) {
  const html = await fs.readFile(path.join(ROOT, image.page), 'utf8');
  const outputPath = path.join(ROOT, ...image.output.split('/'));
  const metadata = await sharp(outputPath).metadata();
  if (metadata.width !== 1200 || metadata.height !== 630 || metadata.format !== 'jpeg') {
    errors.push(`${image.output}: expected 1200x630 JPEG, got ${metadata.width}x${metadata.height} ${metadata.format}`);
  }
  if (urls.has(image.url)) errors.push(`${image.page}: duplicate social image URL ${image.url}`);
  urls.add(image.url);

  const required = [
    ['property', 'og:image', image.url],
    ['property', 'og:image:secure_url', image.url],
    ['property', 'og:image:type', 'image/jpeg'],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:image', image.url],
  ];
  for (const [attribute, key, expected] of required) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const value = html.match(new RegExp(`<meta\\s+${attribute}=["']${escaped}["']\\s+content=["']([^"']*)["']`, 'i'))?.[1];
    if (value !== expected) errors.push(`${image.page}: ${key} is ${value ?? 'missing'}, expected ${expected}`);
  }
  if (!/<meta\s+property=["']og:image:alt["']\s+content=["'][^"']+["']/i.test(html)) {
    errors.push(`${image.page}: og:image:alt is missing`);
  }
  if (!/<meta\s+name=["']twitter:image:alt["']\s+content=["'][^"']+["']/i.test(html)) {
    errors.push(`${image.page}: twitter:image:alt is missing`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    pages: manifest.images.length,
    uniqueUrls: urls.size,
    dimensions: '1200x630',
    status: 'ok',
  }, null, 2));
}
