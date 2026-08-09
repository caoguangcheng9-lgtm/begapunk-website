export const DISCOVERY_ROBOTS_MARKER = 'p1-unsupported-claims';

const robotsMetaPattern = /<meta\b(?=[^>]*\bname\s*=\s*(?:"robots"|'robots'|robots)(?:\s|\/?>))[^>]*>/gi;
const managedRobotsMetaPattern = /<meta\b(?=[^>]*\bname\s*=\s*(?:"robots"|'robots'|robots)(?:\s|\/?>))(?=[^>]*\bdata-discovery-exclusion\s*=\s*(?:"p1-unsupported-claims"|'p1-unsupported-claims'|p1-unsupported-claims)(?:\s|\/?>))[^>]*>/gi;
const managedRobotsLinePattern = new RegExp(`^[ \\t]*${managedRobotsMetaPattern.source}[ \\t]*(?:\\r?\\n)?`, 'gim');

export function discoveryExcludedPageSet(config) {
  const configured = config.discoveryExcludedPages || [];
  if (!Array.isArray(configured) || configured.some((pageName) => typeof pageName !== 'string' || !pageName)) {
    throw new Error('discoveryExcludedPages must be an array of non-empty page names.');
  }
  const excluded = new Set(configured);
  if (excluded.size !== configured.length) throw new Error('discoveryExcludedPages must not contain duplicates.');
  const configuredPages = new Set(config.pages || []);
  for (const pageName of excluded) {
    if (!configuredPages.has(pageName)) throw new Error(`discoveryExcludedPages contains an unconfigured page: ${pageName}`);
  }
  const sitemapExcluded = new Set(config.sitemapExcludedPages || []);
  for (const pageName of excluded) {
    if (sitemapExcluded.has(pageName)) throw new Error(`Discovery and sitemap exclusions must not overlap: ${pageName}`);
  }
  return excluded;
}

export function publicPageUrl(config, languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  return languageCode === config.sourceLanguage.code
    ? `${config.siteUrl}/${suffix}`
    : `${config.siteUrl}/${languageCode}/${suffix}`;
}

export function patchDiscoveryRobotsMeta(html, shouldExclude) {
  if (!shouldExclude) return html.replace(managedRobotsLinePattern, '');

  const managedTag = `<meta name="robots" content="noindex,follow" data-discovery-exclusion="${DISCOVERY_ROBOTS_MARKER}">`;
  let replaced = false;
  const withNormalizedRobots = html.replace(robotsMetaPattern, () => {
    if (replaced) return '';
    replaced = true;
    return managedTag;
  });
  if (replaced) return withNormalizedRobots;

  const charsetLinePattern = /(^[ \t]*<meta\b[^>]*\bcharset\b[^>]*>)/im;
  const charsetMatch = html.match(charsetLinePattern);
  if (charsetMatch) {
    const indentation = charsetMatch[1].match(/^[ \t]*/)?.[0] || '';
    return html.replace(charsetLinePattern, `$1\n${indentation}${managedTag}`);
  }
  const headPattern = /(<head\b[^>]*>)/i;
  if (!headPattern.test(html)) throw new Error('Cannot add discovery robots metadata because <head> is missing.');
  return html.replace(headPattern, `$1\n  ${managedTag}`);
}

export function filterDiscoverySearchRecords(records, excludedPages) {
  if (!Array.isArray(records)) throw new Error('Search index must be a JSON array.');
  return records.filter((record) => !excludedPages.has(record?.url));
}

export function filterDiscoveryLlms(source, excludedUrls) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const exactUrls = [...excludedUrls];
  return source.split(/\r?\n/)
    .filter((line) => !exactUrls.some((url) => line.includes(url)))
    .join(eol);
}

export function filterDiscoverySitemap(source, excludedUrls) {
  const urlBlockPattern = /^[ \t]*<url>\s*[\s\S]*?^[ \t]*<\/url>[ \t]*(?:\r?\n)?/gim;
  return source.replace(urlBlockPattern, (block) => {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1];
    return loc && excludedUrls.has(loc) ? '' : block;
  });
}
