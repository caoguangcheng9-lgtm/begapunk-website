import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'audit', 'image-optimization', 'manifest.json');
const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
const errors = [];

for (const image of manifest.images) {
  const files = [image.output, ...(image.variants ?? []).map((variant) => variant.output)];
  for (const webPath of files) {
    const filePath = path.join(ROOT, ...webPath.split('/'));
    try {
      const metadata = await sharp(filePath).metadata();
      if (metadata.format !== 'webp') errors.push(`${webPath}: expected WebP, got ${metadata.format}`);
    } catch (error) {
      errors.push(`${webPath}: ${error.message}`);
    }
  }
}

const htmlFiles = (await fs.readdir(ROOT)).filter(
  (file) => file.endsWith('.html') && !file.endsWith('.backup'),
);
let imgTags = 0;
let optimizedTags = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(path.join(ROOT, file), 'utf8');
  for (const match of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    imgTags += 1;
    const tag = match[0];
    const source = match[1].split(/[?#]/)[0];
    if (source.startsWith('images/optimized/')) optimizedTags += 1;
    if (source.startsWith('images/')) {
      const filePath = path.join(ROOT, ...source.split('/'));
      try {
        await fs.access(filePath);
      } catch {
        errors.push(`${file}: missing image ${source}`);
      }
    }
    if (!/\bwidth=["']?\d+/i.test(tag) || !/\bheight=["']?\d+/i.test(tag)) {
      errors.push(`${file}: local image is missing width/height: ${source}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    pages: htmlFiles.length,
    manifestImages: manifest.images.length,
    imgTags,
    optimizedTags,
    status: 'ok',
  }, null, 2));
}
