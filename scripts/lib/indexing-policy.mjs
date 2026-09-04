import { readFile } from 'node:fs/promises';
import path from 'node:path';

const robotsMetaPattern = /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/gi;
const contentAttributePattern = /\bcontent\s*=\s*["']([^"']*)["']/i;

export function robotsDirectives(html) {
  const directives = new Set();
  for (const match of String(html).matchAll(robotsMetaPattern)) {
    const content = match[0].match(contentAttributePattern)?.[1] || '';
    for (const directive of content.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)) {
      directives.add(directive);
    }
  }
  return directives;
}

export function isNoindexHtml(html) {
  return robotsDirectives(html).has('noindex');
}

export async function filterExistingNoindexUrls(values, { siteOrigin, contentRoot }) {
  const filtered = new Set(values);
  for (const value of filtered) {
    const url = new URL(value);
    if (url.origin !== siteOrigin) continue;
    let publicPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!publicPath || publicPath.endsWith('/')) publicPath += 'index.html';
    if (!publicPath.toLowerCase().endsWith('.html')) continue;
    const absolute = path.resolve(contentRoot, ...publicPath.split('/'));
    const relative = path.relative(contentRoot, absolute);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
      throw new Error(`Refusing unsafe IndexNow page path: ${value}`);
    }
    try {
      const html = await readFile(absolute, 'utf8');
      if (isNoindexHtml(html)) filtered.delete(value);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // A removed URL remains eligible so IndexNow can learn that it disappeared.
    }
  }
  return filtered;
}
