import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const i18nConfig = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const partialSitemapFiles = Object.keys(i18nConfig.partialLanguagePages || {})
  .map((code) => `sitemap-${code}.xml`);

function readOutputArgument() {
  const index = process.argv.indexOf('--output');
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error('Usage: npm run build:minify -- --output <release-directory>');
  }
  return path.resolve(process.argv[index + 1]);
}

const outputRoot = readOutputArgument();
const siteRoot = path.join(outputRoot, 'site');
const relativeOutput = path.relative(sourceRoot, outputRoot);

if (!relativeOutput || (!relativeOutput.startsWith('..' + path.sep) && relativeOutput !== '..')) {
  throw new Error('The minified release must be generated outside the source repository.');
}

try {
  await fs.access(outputRoot);
  throw new Error(`Output path already exists: ${outputRoot}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await fs.mkdir(siteRoot, { recursive: true });

const htmlOptions = {
  caseSensitive: true,
  collapseBooleanAttributes: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  continueOnParseError: false,
  decodeEntities: false,
  keepClosingSlash: true,
  minifyCSS: true,
  minifyJS: {
    compress: { passes: 2 },
    mangle: false,
  },
  processConditionalComments: true,
  removeComments: true,
  removeEmptyAttributes: false,
  removeOptionalTags: false,
  removeRedundantAttributes: false,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  sortAttributes: false,
  sortClassName: false,
  useShortDoctype: true,
};

const records = [];

function record(relativePath, type, sourceBuffer, outputBuffer) {
  records.push({
    path: relativePath.replaceAll('\\', '/'),
    type,
    sourceBytes: sourceBuffer.length,
    outputBytes: outputBuffer.length,
    sourceGzipBytes: gzipSync(sourceBuffer, { level: 9 }).length,
    outputGzipBytes: gzipSync(outputBuffer, { level: 9 }).length,
  });
}

async function writeMinified(relativePath, type, transform) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const outputPath = path.join(siteRoot, relativePath);
  const sourceBuffer = await fs.readFile(sourcePath);
  const outputText = await transform(sourceBuffer.toString('utf8'));
  const outputBuffer = Buffer.from(outputText, 'utf8');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, outputBuffer);
  record(relativePath, type, sourceBuffer, outputBuffer);
}

const rootEntries = await fs.readdir(sourceRoot, { withFileTypes: true });
const htmlFiles = rootEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .sort();

for (const entry of rootEntries.filter((item) => item.isDirectory())) {
  const directory = path.join(sourceRoot, entry.name);
  let localizedFiles = [];
  try {
    localizedFiles = (await fs.readdir(directory, { withFileTypes: true }))
      .filter((item) => item.isFile() && item.name.endsWith('.html'))
      .map((item) => path.join(entry.name, item.name));
  } catch {
    localizedFiles = [];
  }
  if (localizedFiles.some((file) => path.basename(file) === 'index.html')) htmlFiles.push(...localizedFiles);
}
htmlFiles.sort();

for (const relativePath of htmlFiles) {
  await writeMinified(relativePath, 'html', (source) => minifyHtml(source, htmlOptions));
}

const cssFiles = (await fs.readdir(path.join(sourceRoot, 'css'), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => path.join('css', entry.name))
  .sort();

for (const relativePath of cssFiles) {
  await writeMinified(relativePath, 'css', (source) => {
    const result = new CleanCSS({ level: 1, rebase: false, returnPromise: false }).minify(source);
    if (result.errors.length) {
      throw new Error(`${relativePath}: ${result.errors.join('; ')}`);
    }
    return result.styles;
  });
}

const jsFiles = (await fs.readdir(path.join(sourceRoot, 'js'), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => path.join('js', entry.name))
  .sort();

for (const relativePath of jsFiles) {
  await writeMinified(relativePath, 'js', async (source) => {
    const result = await minifyJs(source, {
      compress: { passes: 2 },
      mangle: false,
      format: { comments: false },
    });
    if (!result.code) throw new Error(`${relativePath}: Terser produced no output.`);
    return result.code;
  });
}

await writeMinified('search-index.json', 'json', (source) => JSON.stringify(JSON.parse(source)));

const localizedDirectories = [...new Set(
  htmlFiles
    .map((relativePath) => path.dirname(relativePath))
    .filter((directory) => directory !== '.'),
)];
for (const directory of localizedDirectories) {
  const localizedCssFiles = (await fs.readdir(path.join(sourceRoot, directory), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => path.join(directory, entry.name))
    .sort();
  for (const relativePath of localizedCssFiles) {
    await writeMinified(relativePath, 'css', (source) => {
      const result = new CleanCSS({ level: 1, rebase: false, returnPromise: false }).minify(source);
      if (result.errors.length) throw new Error(`${relativePath}: ${result.errors.join('; ')}`);
      return result.styles;
    });
  }
}
for (const directory of localizedDirectories) {
  const relativePath = path.join(directory, 'search-index.json');
  try {
    await fs.access(path.join(sourceRoot, relativePath));
    await writeMinified(relativePath, 'json', (source) => JSON.stringify(JSON.parse(source)));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const rootCopyFiles = ['.htaccess', 'llms.txt', 'robots.txt', 'send_inquiry.php', 'sitemap.xml'];
for (const relativePath of rootCopyFiles) {
  await fs.copyFile(path.join(sourceRoot, relativePath), path.join(siteRoot, relativePath));
}

for (const relativePath of ['sitemap-i18n.xml', ...partialSitemapFiles]) {
  try {
    await fs.copyFile(path.join(sourceRoot, relativePath), path.join(siteRoot, relativePath));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const copyDirectories = ['downloads', 'fonts', 'images', 'PHPMailer', 'videos'];
for (const relativePath of copyDirectories) {
  await fs.cp(path.join(sourceRoot, relativePath), path.join(siteRoot, relativePath), {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}

const totalsByType = Object.fromEntries(
  [...new Set(records.map((item) => item.type))].map((type) => {
    const items = records.filter((item) => item.type === type);
    return [type, {
      files: items.length,
      sourceBytes: sum(items, 'sourceBytes'),
      outputBytes: sum(items, 'outputBytes'),
      sourceGzipBytes: sum(items, 'sourceGzipBytes'),
      outputGzipBytes: sum(items, 'outputGzipBytes'),
    }];
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  outputRoot,
  siteRoot,
  minifierSettings: {
    html: 'html-minifier-terser; conservative whitespace; inline CSS and JS enabled',
    css: 'clean-css level 1; URL rebasing disabled',
    js: 'terser compression with two passes; name mangling disabled',
    json: 'JSON parse and compact serialization',
  },
  totals: {
    files: records.length,
    sourceBytes: sum(records, 'sourceBytes'),
    outputBytes: sum(records, 'outputBytes'),
    sourceGzipBytes: sum(records, 'sourceGzipBytes'),
    outputGzipBytes: sum(records, 'outputGzipBytes'),
  },
  totalsByType,
  files: records,
};

await fs.writeFile(
  path.join(outputRoot, 'minification-report.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8',
);

console.log(JSON.stringify(report.totals, null, 2));
console.log(`Release site: ${siteRoot}`);
console.log(`Report: ${path.join(outputRoot, 'minification-report.json')}`);
