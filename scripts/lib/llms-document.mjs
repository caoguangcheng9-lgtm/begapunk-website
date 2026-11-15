import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { drawingBackedProductModels, drawingBackedProductLinkLabel, drawingBackedProductSummary } from './drawing-backed-product-facts.mjs';
import { productPolicy, policyCopy } from './owner-product-policy.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const readJson = p => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
export const llmsIdentity = readJson('data/llms-identity.json');
const editorial = readJson('i18n/llms-editorial.json');
const base = 'https://www.begapunk.com';
const section = (heading, text) => `## ${heading}\n\n${text}`;

export const officialSocialUrls = Object.freeze({
  LinkedIn: 'https://www.linkedin.com/company/begapunk-rotary-joints/',
  Facebook: 'https://www.facebook.com/profile.php?id=61595481363231',
  Instagram: 'https://www.instagram.com/begapunkrotaryjoints/',
  YouTube: 'https://www.youtube.com/@BEGAPUNKRotaryJointsTV',
  X: 'https://x.com/Begapunk728',
});

export function assertLlmsIdentity(id, readEvidence = p => readFileSync(path.join(root, p))) {
  assert.equal(id.source.independentlyVerified, false, 'No independent registry verification');
  assert.deepEqual(id.sameAs, [], 'Lookup portals/social channels must not silently become sameAs');
  assert.deepEqual(id.verificationSources.map(s => [s.url,s.kind,s.entityRecordStatus]), [
    ['https://www.gsxt.gov.cn/','LOOKUP_PORTAL_ONLY','PENDING_VERIFICATION'],
    ['http://credit.customs.gov.cn/','LOOKUP_PORTAL_ONLY','PENDING_VERIFICATION'],
  ], 'Official portal URLs do not establish verified entity records');
  assert.equal(id.source.legalNameAndUscc, 'OWNER_PROVIDED_BUSINESS_LICENSE_INFORMATION');
  assert.equal(id.source.customsCodeAndEntity, 'OWNER_CONFIRMED');
  const evidence = e => {
    assert.ok(e && /^audit\/llms-social-identity\/2026-11-14\/[A-Z0-9_]+\.md$/.test(e.path), 'Safe archived evidence path required');
    assert.match(e.sha256, /^[a-f0-9]{64}$/, 'Evidence SHA-256 required');
    assert.equal(createHash('sha256').update(readEvidence(e.path)).digest('hex'), e.sha256, `Evidence changed: ${e.path}`);
  };
  const supplement = id.source.governmentScreenshotSupplement;
  assert.equal(supplement.providedDate, '2026-11-14');
  assert.equal(supplement.evidenceType, 'OWNER_PROVIDED_GOVERNMENT_QUERY_SCREENSHOTS');
  assert.equal(supplement.contentBasis, 'OWNER_REPORTED_CONTENT_NOT_DIRECTLY_INSPECTED');
  evidence(supplement.sourceRecord);
  assert.equal(id.governmentQueryScreenshots.length, 2, 'Two reported government screenshots');
  const fields = [
    ['GSXT', {legalNameZh:id.legalNameZh,uscc:id.uscc,enterpriseStatusZh:'存续'}],
    ['CHINA_CUSTOMS', {legalNameZh:id.legalNameZh,uscc:id.uscc,customsRegistration:id.customsRegistration}],
  ];
  for (const [i,screenshot] of id.governmentQueryScreenshots.entries()) {
    assert.equal(screenshot.registry, fields[i][0]);
    assert.deepEqual(screenshot.reportedFields, fields[i][1], 'Do not extend reported screenshot scope');
    assert.equal(screenshot.providedDate, '2026-11-14');
    assert.equal(screenshot.archiveStatus, 'ARCHIVE_REQUIRED', 'Unlocated screenshots cannot be marked archived');
    assert.equal(screenshot.assetPath, null, 'Do not invent screenshot files');
    assert.equal(screenshot.assetSha256, null, 'Do not invent screenshot hashes');
    assert.equal(screenshot.imageInspectedByCodex, false, 'Reported screenshots were not inspected');
    assert.equal(screenshot.independentOnlineVerification, false, 'Screenshots are not independent online checks');
  }
  assert.equal(id.officialSocialChannels.length, 5, 'Exactly five authorized social accounts');
  assert.deepEqual(id.officialSocialChannels.map(s=>s.platform), Object.keys(officialSocialUrls), 'Exact social account set');
  for (const channel of id.officialSocialChannels) {
    assert.equal(channel.url, officialSocialUrls[channel.platform], `Exact ${channel.platform} URL required`);
    assert.equal(channel.ownershipStatus, 'CONFIRMED_OFFICIAL_ACCOUNT');
    assert.equal(channel.ownershipBasis, 'OWNER_CONFIRMATION_AND_ARCHIVED_ACCOUNT_AUDIT');
    assert.equal(channel.ownerConfirmationDate, '2026-11-14');
    assert.equal(channel.platformBadgeStatus, 'NOT_VERIFIED', 'Ownership is not a verified badge');
    assert.equal(channel.platformCertificationClaimed, false, 'No platform certification claim');
    assert.equal(channel.productCertificationClaimed, false, 'No product certification claim');
    evidence(channel.evidence);
  }
}

export function llmsEstablishmentDate(locale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : locale, {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${llmsIdentity.establishedDate}T00:00:00Z`));
}

export function llmsContactDetails(locale) {
  const c = editorial[locale], id = llmsIdentity, h = id.businessHours;
  const values = [`[${id.businessEmail}](mailto:${id.businessEmail})`, id.businessPhone,
    id.registeredAddress, `${c.businessDays}, ${h.opens}–${h.closes} (${c.timeZoneLabel}, UTC${h.utcOffset}).`];
  return c.contactLabels.map((label, i) => `- ${label}: ${values[i]}`).join('\n') + `\n\n${c.businessHoursBoundary}`;
}

export function bp10LlmsCopy(locale) {
  const d = readJson(`i18n/manual/${locale === 'en' ? 'bp10-en-segments' : `bp10-${locale}`}.json`);
  if (!d[3] || !d[34]) throw new Error(`${locale}: approved BP10 llms source missing`);
  return {title:d[3], description:d[34]};
}

export function llmsSections(locale) {
  const c = editorial[locale], p = policyCopy(locale), id = llmsIdentity;
  if (!c) throw new Error(`Unknown llms locale: ${locale}`);
  // Deliberately do not alter the site-wide Organization / sameAs contract.
  // These identity facts retain their supplied/owner-confirmed evidence level.
  assertLlmsIdentity(id);
  const identityValues = [id.legalNameZh, id.externalNameEn, id.brand, `[${id.website}](${id.website})`, id.uscc, id.customsRegistration, llmsEstablishmentDate(locale), id.registeredAddress];
  const identity = section(c.headings[1], c.identityLabels.map((label, i) => `- ${label}: ${identityValues[i]}`).join('\n') + `\n\n${c.identityBoundary}`);
  const sources = section(c.headings[2], `${c.lookup}\n\n` + id.verificationSources.map(s => `- [${s.name}](${s.url})`).join('\n'));
  const social = section(c.socialHeading, `${c.socialBoundary}\n\n` + id.officialSocialChannels.map(s => `- [${s.platform}](${s.url})`).join('\n'));
  const english = readJson('i18n/manual/bp10-en-segments.json');
  // Manual translation files are sparse: shared numerical segments inherit EN,
  // exactly as in the governed manual-page generation pipeline.
  const d = locale === 'en' ? english : {...english, ...readJson(`i18n/manual/bp10-${locale}.json`)};
  const ratings = [50, 52, 54, 56].map(i => `${d[i-1]}: ${d[i]}`).join('; ');
  const engineering = section(c.headings[3], `${c.selection}\n\n- BP-2P-0002: ${p.topology}\n- BP-10P-0001: ${ratings}. ${p.seal} ${p.weight} ${p.weightNote}`);
  const quality = section(c.headings[4], p.quality);
  const prices = Object.entries(productPolicy.prices).map(([model, price]) => `- ${model}: ${p.bulk.replace('{price}', String(price))}`).join('\n');
  const commercial = section(c.headings[5], `${p.warranty}\n\n${p.response}\n\n### ${c.bulk}\n\n${prices}\n\n${p.fob}\n\n${c.fourModels}\n\n- BP-2P-08-0001: ${p.stockConfirm}\n- BP-2P-95-0005, BP-3P-0004, BP-3P-0007: ${p.stock}\n\n${p.lead}\n\n- BP-10P-0001: ${p.bp10Order}\n\n${c.fiveModels}\n\n${p.payment}\n\n${p.commercialScope}`);
  const documents = section(c.headings[6], `${c.docs}\n\n` + ['BP-2P-0002', 'BP-3P-0006', 'BP-10P-0001'].map(model => `- [${model} — ${c.pdf}](${base}/downloads/${model}.pdf)`).join('\n') + `\n- [${c.manual}](${base}/downloads/Begapunk_Rotary_Joint_Installation_Manual.pdf)`);
  return {identity, sources, social, engineering, quality, commercial, documents, contactDetails:llmsContactDetails(locale), contact:section(c.contactHeading, llmsContactDetails(locale)), purpose:c.purpose};
}

export function enrichLocalizedLlms(locale, navigation) {
  const s = llmsSections(locale);
  const offset = navigation.indexOf('\n## ');
  if (offset < 0) throw new Error(`${locale}: llms navigation sections missing`);
  return `${navigation.slice(0, offset).trimEnd()}\n\n${s.identity}\n\n${s.sources}\n\n${s.social}\n${navigation.slice(offset).trimEnd()}\n\n${s.engineering}\n\n${s.quality}\n\n${s.commercial}\n\n${s.documents}\n\n${s.contact}\n\n${s.purpose}\n`;
}

// English-only presentation. Shared facts and the four localized renderers remain unchanged.
export function llmsEnglishSections() {
  const shared = llmsSections('en'), c = editorial.en, p = policyCopy('en'), id = llmsIdentity;
  const link = (title, url, description) => `- [${title}](${url}): ${description}`;
  const identity = shared.identity.replace(`## ${c.headings[1]}`, `**${c.headings[1]}**`)
    .replace(`- ${c.identityLabels[3]}: [${id.website}](${id.website})`,
      `- ${c.identityLabels[3]}: [${id.website}](${id.website}): Official company website.`);
  const contactDetails = shared.contactDetails.replace(`](mailto:${id.businessEmail})`,
    `](mailto:${id.businessEmail}): Business enquiries.`);
  const boundaries = [c.lookup, c.docs, c.purpose].map(text => `> ${text}`).join('\n\n');
  const sources = section(c.headings[2], id.verificationSources.map(s => link(s.name, s.url,
    'General government registry search portal; not an independently verified company-specific record.')).join('\n'));
  const social = section(c.socialHeading, id.officialSocialChannels.map(s => link(s.platform, s.url,
    c.socialBoundary)).join('\n'));
  const manual = readJson('i18n/manual/bp10-en-segments.json');
  const ratings = [50, 52, 54, 56].map(i => `${manual[i-1]}: ${manual[i]}`).join('; ');
  const engineering = section(c.headings[3], [
    link('Model-specific selection limits', `${base}/product-comparison.html`, c.selection),
    link('BP-2P-0002 — passage routing and interfaces', `${base}/BP-2P-0002.html#main-content`, `BP-2P-0002: ${p.topology}`),
    link('BP-10P-0001 — ratings, seal and calculated weight', `${base}/BP-10P-0001.html#main-content`, `BP-10P-0001: ${ratings}. ${p.seal} ${p.weight} ${p.weightNote}`),
  ].join('\n'));
  const quality = `## ${c.headings[4]}`;
  const commercial = section(c.headings[5], [
    link('Warranty coverage', `${base}/terms.html`, p.warranty),
    link('Warranty claim response', `${base}/contact.html`, p.response),
    ...Object.entries(productPolicy.prices).map(([model, price]) => link(`${c.bulk} — ${model}`,
      `${base}/products.html`, `${model}: ${p.bulk.replace('{price}', String(price))}`)),
    link('FOB Ningbo quotation scope', `${base}/terms.html`, p.fob),
    link('Bulk-priced model availability', `${base}/products.html`, c.fourModels),
    link('BP-2P-08-0001 availability', `${base}/products.html`, `BP-2P-08-0001: ${p.stockConfirm}`),
    link('BP-2P-95-0005, BP-3P-0004 and BP-3P-0007 availability', `${base}/products.html`, `BP-2P-95-0005, BP-3P-0004, BP-3P-0007: ${p.stock}`),
    link('Stock and production lead time', `${base}/terms.html`, p.lead),
    link('BP-10P-0001 order terms', `${base}/products.html`, `BP-10P-0001: ${p.bp10Order}`),
    link('Payment model scope', `${base}/terms.html`, c.fiveModels),
    link('Payment terms for the five models above', `${base}/terms.html`, p.payment),
    link('Formal quotation and accepted-order precedence', `${base}/terms.html`, p.commercialScope),
  ].join('\n'));
  const documents = section(c.headings[6], [
    ...['BP-2P-0002', 'BP-3P-0006', 'BP-10P-0001'].map(model => link(`${model} — ${c.pdf}`,
      `${base}/downloads/${model}.pdf`, `Current model-specific ${c.pdf.toLowerCase()}.`)),
    link(c.manual, `${base}/downloads/Begapunk_Rotary_Joint_Installation_Manual.pdf`, 'Installation and handling guidance.'),
  ].join('\n'));
  return {identity, contactDetails, boundaries, sources, social, engineering, quality, qualityCommitment:p.quality, commercial, documents};
}

export function renderEnglishLlms() {
  const template = readFileSync(path.join(root, 'i18n/llms/en.md'), 'utf8');
  const d = readJson('i18n/manual/bp10-en-segments.json');
  const products = [`- [${d[3]}](${base}/BP-10P-0001.html): ${d[34]}`,
    ...drawingBackedProductModels.map(model => `- [${drawingBackedProductLinkLabel('en', model)}](${base}/${model}.html): ${drawingBackedProductSummary('en', model)}`)].join('\n');
  const data = {...llmsEnglishSections(), products};
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in data)) throw new Error(`Unknown llms template key: ${key}`);
    return data[key];
  }).trimEnd() + '\n';
}
