import { createHash } from 'node:crypto';
import { load } from 'cheerio';

export const EDITORIAL_MANIFEST_SCHEMA_VERSION = 2;
export const EDITORIAL_STATUS_SNAPSHOT_SCHEMA_VERSION = 3;
export const SEMANTIC_ALGORITHM = 'sha256-semantic-html-v1';
export const MECHANICAL_ALGORITHM = 'sha256-lf-text-v1';
export const LEGACY_ALGORITHM = 'sha256-bytes-v1';
export const SNAPSHOT_QUALITY_BOUNDARY =
  'semantic-change-detection-plus-mechanical-integrity-not-native-speaker-or-new-editorial-proof';

const TRANSLATABLE_ATTRIBUTES = [
  'abbr',
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'data-label',
  'label',
  'placeholder',
  'srcdoc',
  'title',
];

const EDITORIAL_META_KEYS = new Set([
  'http-equiv:refresh',
  'name:description',
  'name:robots',
  'name:twitter:card',
  'name:twitter:creator',
  'name:twitter:description',
  'name:twitter:image',
  'name:twitter:image:alt',
  'name:twitter:site',
  'name:twitter:title',
  'property:og:description',
  'property:og:image',
  'property:og:image:alt',
  'property:og:image:height',
  'property:og:image:secure_url',
  'property:og:image:type',
  'property:og:image:width',
  'property:og:locale',
  'property:og:site_name',
  'property:og:title',
  'property:og:type',
  'property:og:url',
]);

const ASSET_META_KEYS = new Set([
  'name:twitter:image',
  'property:og:image',
  'property:og:image:secure_url',
]);

const TEXT_CONTEXT_TAGS = new Set([
  'a', 'address', 'blockquote', 'button', 'caption', 'code', 'dd', 'del', 'dt',
  'em', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ins', 'label',
  'legend', 'li', 'mark', 'option', 'p', 'pre', 'small', 'strong', 'summary',
  'td', 'textarea', 'th', 'title',
]);

const VISIBILITY_CLASS_PATTERN = /^(?:d-none|hidden|invisible|is-hidden|screen-reader-only|sr-only|u-hidden|visually-hidden)$/i;

function asUtf8Text(source) {
  if (typeof source === 'string') return source;
  if (Buffer.isBuffer(source) || source instanceof Uint8Array) {
    return new TextDecoder('utf-8', { fatal: true }).decode(source);
  }
  throw new TypeError('Localized HTML source must be a string, Buffer, or Uint8Array.');
}

export function normalizeLfText(source) {
  return asUtf8Text(source).replace(/\r\n?/g, '\n');
}

export function normalizeSemanticText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\t\n\f\r ]+/g, ' ')
    .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableJsonValue(value[key])]),
    );
  }
  return typeof value === 'string'
    ? normalizeLfText(value)
        .normalize('NFC')
        .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')
    : value;
}

function sortedRecords(records) {
  return records.sort((left, right) => {
    const leftJson = JSON.stringify(left);
    const rightJson = JSON.stringify(right);
    return leftJson < rightJson ? -1 : leftJson > rightJson ? 1 : 0;
  });
}

function normalizeAssetReference(value) {
  const source = normalizeSemanticText(value);
  const hashIndex = source.indexOf('#');
  const fragment = hashIndex >= 0 ? source.slice(hashIndex) : '';
  const withoutFragment = hashIndex >= 0 ? source.slice(0, hashIndex) : source;
  const queryIndex = withoutFragment.indexOf('?');
  if (queryIndex < 0) return source;
  const pathname = withoutFragment.slice(0, queryIndex);
  const parameters = new URLSearchParams(withoutFragment.slice(queryIndex + 1));
  for (const key of [...parameters.keys()]) {
    if (/^(?:v|ver|version|cb|cache|cachebust)$/i.test(key)) parameters.delete(key);
  }
  parameters.sort();
  const query = parameters.toString();
  return `${pathname}${query ? `?${query}` : ''}${fragment}`;
}

function normalizeSrcset(value) {
  return String(value ?? '')
    .split(',')
    .map((candidate) => {
      const [source, ...descriptor] = candidate.trim().split(/[\t\n\f\r ]+/);
      return [normalizeAssetReference(source), ...descriptor].join(' ');
    })
    .join(', ');
}

function textContext($, element) {
  let current = element;
  while (current && current.type !== 'root') {
    const tag = String(current.tagName ?? current.name ?? '').toLowerCase();
    if (TEXT_CONTEXT_TAGS.has(tag)) {
      const role = normalizeSemanticText($(current).attr('role')).toLowerCase();
      return role ? `${tag}[role=${role}]` : tag;
    }
    current = current.parent;
  }
  return 'body';
}

function visibleTextAtoms($) {
  const atoms = [];
  $('body').find('*').addBack().contents().each((_index, node) => {
    if (node.type !== 'text') return;
    const parent = node.parent;
    const ancestors = $(parent).parentsUntil('body').addBack();
    if (ancestors.is('script, style, template')) return;
    if (ancestors.is('[aria-hidden="true"]')) return;
    const inSvg = ancestors.is('svg');
    const parentTag = String(parent?.tagName ?? parent?.name ?? '').toLowerCase();
    if (inSvg && !['desc', 'text', 'title'].includes(parentTag)) return;
    const value = normalizeSemanticText(node.data);
    if (!value) return;
    atoms.push({
      context: textContext($, parent),
      value,
    });
  });
  return atoms;
}

function decodeSimpleJavascriptString(raw) {
  return raw
    .replace(/\\u\{([a-f0-9]+)\}/giu, (_match, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/\\u([a-f0-9]{4})/giu, (_match, value) => String.fromCharCode(Number.parseInt(value, 16)))
    .replace(/\\x([a-f0-9]{2})/giu, (_match, value) => String.fromCharCode(Number.parseInt(value, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\(['"`\\])/g, '$1');
}

function assignedUiLiterals($, javascript) {
  const literals = [];
  const assignment = /\.(textContent|innerText|innerHTML)\s*=\s*(['"`])/g;
  let match;
  while ((match = assignment.exec(javascript)) !== null) {
    const sink = match[1];
    const quote = match[2];
    let cursor = assignment.lastIndex;
    let raw = '';
    let escaped = false;
    for (; cursor < javascript.length; cursor += 1) {
      const character = javascript[cursor];
      if (!escaped && character === quote) break;
      raw += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
    }
    if (cursor >= javascript.length) continue;
    assignment.lastIndex = cursor + 1;
    let value = decodeSimpleJavascriptString(raw);
    if (sink === 'innerHTML') {
      const fragment = load(value, {}, false);
      fragment('script, style, template').remove();
      value = fragment.root().text();
    }
    value = normalizeSemanticText(value);
    if (value) literals.push({ sink, value });
  }
  return literals;
}

/**
 * Build the stable editorial projection governed by the localized review gate.
 *
 * It intentionally excludes HTML formatting, comments, unrelated executable code,
 * cache-query parameters, element ids/classes, and other implementation details.
 * Media identity and inline code that writes user-facing content remain governed.
 * Canonical/hreflang links, metadata and JSON-LD are included explicitly because
 * they are part of the reviewed SEO/editorial contract.
 */
export function createSemanticProjection(source) {
  const html = normalizeLfText(source);
  const $ = load(html);
  const textAtoms = visibleTextAtoms($);

  const translatedAttributes = [];
  $('body *').each((_index, element) => {
    const tag = String(element.tagName ?? element.name ?? '').toLowerCase();
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      const rawValue = $(element).attr(attribute);
      if (rawValue === undefined) continue;
      translatedAttributes.push({
        tag,
        attribute,
        value: normalizeSemanticText(rawValue),
      });
    }

    if (tag === 'input' && ['button', 'reset', 'submit'].includes(String($(element).attr('type') ?? '').toLowerCase())) {
      const rawValue = $(element).attr('value');
      if (rawValue !== undefined) {
        translatedAttributes.push({
          tag,
          attribute: 'value',
          value: normalizeSemanticText(rawValue),
        });
      }
    }
  });

  const localizationContext = [];
  $('[lang], [dir], [translate]').each((_index, element) => {
    const tag = String(element.tagName ?? element.name ?? '').toLowerCase();
    if (tag === 'html') return;
    localizationContext.push({
      tag,
      lang: normalizeSemanticText($(element).attr('lang')).toLowerCase(),
      dir: normalizeSemanticText($(element).attr('dir')).toLowerCase(),
      translate: normalizeSemanticText($(element).attr('translate')).toLowerCase(),
    });
  });

  const metadata = [];
  $('meta').each((_index, element) => {
    const meta = $(element);
    const keyAttribute = ['name', 'property', 'itemprop', 'http-equiv']
      .find((attribute) => meta.attr(attribute) !== undefined);
    if (keyAttribute) {
      const key = normalizeSemanticText(meta.attr(keyAttribute)).toLowerCase();
      if (!EDITORIAL_META_KEYS.has(`${keyAttribute}:${key}`)) return;
      metadata.push({
        keyType: keyAttribute,
        key,
        content: ASSET_META_KEYS.has(`${keyAttribute}:${key}`)
          ? normalizeAssetReference(meta.attr('content'))
          : normalizeSemanticText(meta.attr('content')),
      });
    }
  });

  const seoLinks = [];
  $('link').each((_index, element) => {
    const link = $(element);
    const relTokens = String(link.attr('rel') ?? '')
      .toLowerCase()
      .split(/\s+/u)
      .filter(Boolean);
    if (relTokens.includes('canonical')) {
      seoLinks.push({
        rel: 'canonical',
        href: normalizeSemanticText(link.attr('href')),
      });
    }
    if (relTokens.includes('alternate') && link.attr('hreflang') !== undefined) {
      seoLinks.push({
        rel: 'alternate',
        hreflang: normalizeSemanticText(link.attr('hreflang')).toLowerCase(),
        href: normalizeSemanticText(link.attr('href')),
      });
    }
  });

  const jsonLd = [];
  $('script[type="application/ld+json"]').each((index, element) => {
    const rawJson = $(element).html() ?? '';
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      throw new Error(`JSON-LD block ${index + 1} is invalid: ${error.message}`);
    }
    jsonLd.push(stableJsonValue(parsed));
  });

  const embeddedJson = [];
  $('script[type="application/json"]').each((index, element) => {
    const rawJson = $(element).html() ?? '';
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (error) {
      throw new Error(`Embedded application/json block ${index + 1} is invalid: ${error.message}`);
    }
    embeddedJson.push({
      id: normalizeSemanticText($(element).attr('id')),
      dataIdentity: Object.fromEntries(
        Object.entries(element.attribs ?? {})
          .filter(([attribute]) => attribute.toLowerCase().startsWith('data-'))
          .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
          .map(([attribute, value]) => [attribute.toLowerCase(), normalizeSemanticText(value)]),
      ),
      value: stableJsonValue(parsed),
    });
  });

  const dynamicUiText = [];
  const dynamicUiCode = [];
  $('script:not([src])').not('[type="application/ld+json"], [type="application/json"]').each((_index, element) => {
    const javascript = $(element).html() ?? '';
    dynamicUiText.push(...assignedUiLiterals($, javascript));
    dynamicUiCode.push(sha256(normalizeLfText(javascript).normalize('NFC')));
  });
  $('*').each((_index, element) => {
    const handlers = Object.entries(element.attribs ?? {})
      .filter(([attribute]) => /^on[a-z]+$/i.test(attribute))
      .map(([attribute, value]) => ({
        attribute: attribute.toLowerCase(),
        sha256: sha256(normalizeLfText(value).normalize('NFC')),
      }));
    if (handlers.length) dynamicUiCode.push(...handlers);
  });

  const navigationTargets = [];
  const governedTargets = [
    ['a[href]', 'href'],
    ['area[href]', 'href'],
    ['form[action]', 'action'],
    ['button[formaction]', 'formaction'],
    ['input[formaction]', 'formaction'],
    ['option[value]', 'value'],
    ['[data-href]', 'data-href'],
  ];
  for (const [selector, attribute] of governedTargets) {
    $(selector).each((_index, element) => {
      navigationTargets.push({
        tag: String(element.tagName ?? element.name ?? '').toLowerCase(),
        attribute,
        value: normalizeSemanticText($(element).attr(attribute)),
      });
    });
  }

  const mediaSources = [];
  const governedMedia = [
    ['img[src]', 'src'],
    ['img[srcset]', 'srcset'],
    ['input[type="image"][src]', 'src'],
    ['source[src]', 'src'],
    ['source[srcset]', 'srcset'],
    ['video[src]', 'src'],
    ['video[poster]', 'poster'],
    ['audio[src]', 'src'],
    ['track[src]', 'src'],
    ['iframe[src]', 'src'],
    ['object[data]', 'data'],
    ['embed[src]', 'src'],
    ['svg image[href]', 'href'],
    ['svg image[xlink\\:href]', 'xlink:href'],
  ];
  for (const [selector, attribute] of governedMedia) {
    $(selector).each((_index, element) => {
      const rawValue = $(element).attr(attribute);
      mediaSources.push({
        tag: String(element.tagName ?? element.name ?? '').toLowerCase(),
        attribute,
        label: normalizeSemanticText($(element).attr('alt') ?? $(element).attr('title')),
        value: attribute === 'srcset' ? normalizeSrcset(rawValue) : normalizeAssetReference(rawValue),
      });
    });
  }

  const externalResources = [];
  $('script[src], link[href]').each((_index, element) => {
    const node = $(element);
    const tag = String(element.tagName ?? element.name ?? '').toLowerCase();
    const relTokens = String(node.attr('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (tag === 'link' && !relTokens.some((token) => ['stylesheet', 'modulepreload', 'preload'].includes(token))) return;
    const attribute = tag === 'script' ? 'src' : 'href';
    externalResources.push({
      tag,
      rel: relTokens.sort(),
      attribute,
      value: normalizeAssetReference(node.attr(attribute)),
      as: normalizeSemanticText(node.attr('as')).toLowerCase(),
      media: normalizeSemanticText(node.attr('media')),
      type: normalizeSemanticText(node.attr('type')).toLowerCase(),
    });
  });

  const hiddenContent = [];
  $('body *').each((_index, element) => {
    const node = $(element);
    const inlineStyle = String(node.attr('style') ?? '');
    const hiddenDeclarations = inlineStyle
      .split(';')
      .map((declaration) => declaration.trim())
      .filter((declaration) => /^(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0*)?)(?:\s*!important)?$/i.test(declaration))
      .map((declaration) => declaration.toLowerCase().replace(/[\t\n\f\r ]+/g, ''))
      .sort();
    const hiddenAttribute = node.attr('hidden') !== undefined;
    const ariaHidden = normalizeSemanticText(node.attr('aria-hidden')).toLowerCase();
    const visibilityClasses = String(node.attr('class') ?? '')
      .split(/[\t\n\f\r ]+/)
      .filter((className) => VISIBILITY_CLASS_PATTERN.test(className))
      .map((className) => className.toLowerCase())
      .sort();
    if (!hiddenAttribute
      && ariaHidden !== 'true'
      && !hiddenDeclarations.length
      && !visibilityClasses.length) return;
    const content = node.clone();
    content.find('script, style, template').remove();
    hiddenContent.push({
      tag: String(element.tagName ?? element.name ?? '').toLowerCase(),
      hidden: hiddenAttribute,
      ariaHidden,
      inlineStyle: hiddenDeclarations,
      visibilityClasses,
      content: normalizeSemanticText(content.text()),
    });
  });

  const presentationState = [];
  $('*').each((_index, element) => {
    const node = $(element);
    const classValue = node.attr('class');
    const styleValue = node.attr('style');
    if (classValue === undefined && styleValue === undefined) return;
    presentationState.push({
      tag: String(element.tagName ?? element.name ?? '').toLowerCase(),
      classes: String(classValue ?? '')
        .split(/[\t\n\f\r ]+/)
        .filter(Boolean)
        .sort(),
      inlineStyle: normalizeSemanticText(styleValue),
    });
  });

  const inlineStyleSheets = $('style').map((_index, element) => (
    sha256(normalizeLfText($(element).html() ?? '').normalize('NFC'))
  )).get();

  const projection = {
    projectionVersion: 1,
    documentLanguage: normalizeSemanticText($('html').attr('lang')).toLowerCase(),
    documentDirection: normalizeSemanticText($('html').attr('dir')).toLowerCase(),
    titles: $('title').map((_index, element) => normalizeSemanticText($(element).text())).get(),
    metadata: sortedRecords(metadata),
    seoLinks: sortedRecords(seoLinks),
    textAtoms,
    translatedAttributes,
    localizationContext,
    navigationTargets,
    mediaSources,
    externalResources,
    hiddenContent,
    presentationState,
    inlineStyleSheets,
    jsonLd: jsonLd
      .map((value) => JSON.stringify(value))
      .sort()
      .map((value) => JSON.parse(value)),
    embeddedJson,
    dynamicUiText,
    dynamicUiCode,
  };

  return JSON.stringify(projection);
}

export function semanticSha256(source) {
  return sha256(createSemanticProjection(source));
}

export function mechanicalSha256(source) {
  if (typeof source === 'string') return sha256(normalizeLfText(source));
  const input = Buffer.from(source);
  const output = Buffer.allocUnsafe(input.length);
  let outputIndex = 0;
  for (let inputIndex = 0; inputIndex < input.length; inputIndex += 1) {
    if (input[inputIndex] === 0x0d) {
      if (inputIndex + 1 < input.length && input[inputIndex + 1] === 0x0a) inputIndex += 1;
      output[outputIndex] = 0x0a;
      outputIndex += 1;
      continue;
    }
    output[outputIndex] = input[inputIndex];
    outputIndex += 1;
  }
  const normalized = output.subarray(0, outputIndex);
  new TextDecoder('utf-8', { fatal: true }).decode(normalized);
  return createHash('sha256').update(normalized).digest('hex');
}

export function createArtifactSnapshot(relativePath, source) {
  return {
    path: relativePath,
    semanticSha256: semanticSha256(source),
    mechanicalSha256: mechanicalSha256(source),
  };
}

function artifactsByPath(artifacts, label) {
  const map = new Map();
  for (const artifact of artifacts) {
    if (!artifact || typeof artifact.path !== 'string') {
      throw new Error(`${label} contains an artifact without a valid path.`);
    }
    if (map.has(artifact.path)) throw new Error(`${label} contains duplicate path ${artifact.path}.`);
    map.set(artifact.path, artifact);
  }
  return map;
}

export function compareArtifactSnapshots(previousArtifacts, currentArtifacts) {
  const previous = artifactsByPath(previousArtifacts, 'Previous manifest');
  const current = artifactsByPath(currentArtifacts, 'Current snapshot');
  const missingPaths = [...previous.keys()].filter((artifactPath) => !current.has(artifactPath));
  const extraPaths = [...current.keys()].filter((artifactPath) => !previous.has(artifactPath));
  if (missingPaths.length || extraPaths.length) {
    throw new Error(
      `Artifact scope changed (missing: ${missingPaths.join(', ') || 'none'}; extra: ${extraPaths.join(', ') || 'none'}).`,
    );
  }

  const semanticChangedPaths = [];
  const mechanicalChangedPaths = [];
  for (const [artifactPath, prior] of previous) {
    const next = current.get(artifactPath);
    if (prior.semanticSha256 !== next.semanticSha256) semanticChangedPaths.push(artifactPath);
    if (prior.mechanicalSha256 !== next.mechanicalSha256) mechanicalChangedPaths.push(artifactPath);
  }
  return {
    semanticChangedPaths: semanticChangedPaths.sort(),
    mechanicalChangedPaths: mechanicalChangedPaths.sort(),
  };
}

export function assertMechanicalOnlyUpdate(previousArtifacts, currentArtifacts) {
  const comparison = compareArtifactSnapshots(previousArtifacts, currentArtifacts);
  if (comparison.semanticChangedPaths.length) {
    throw new Error(
      `Mechanical-only refresh refused because editorial semantics changed: ${comparison.semanticChangedPaths.join(', ')}.`,
    );
  }
  return comparison;
}

export function applyMechanicalOnlySnapshots(previousArtifacts, currentArtifacts, mechanicalProvenance) {
  const comparison = assertMechanicalOnlyUpdate(previousArtifacts, currentArtifacts);
  const current = artifactsByPath(currentArtifacts, 'Current snapshot');
  return {
    comparison,
    artifacts: previousArtifacts.map((prior) => {
      const next = current.get(prior.path);
      if (prior.mechanicalSha256 === next.mechanicalSha256) return prior;
      return {
        ...prior,
        mechanicalSha256: next.mechanicalSha256,
        mechanicalProvenance: { ...mechanicalProvenance },
      };
    }),
  };
}
