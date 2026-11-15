import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { COMPANY_IDENTITY } from '../scripts/lib/company-identity.mjs';
import { resolveOfficialSocialChannels } from '../scripts/lib/official-social-channels.mjs';

const root = path.resolve(import.meta.dirname, '..');
const identity = JSON.parse(fs.readFileSync(path.join(root, 'data/llms-identity.json'), 'utf8'));
const expected = {
  LinkedIn: 'https://www.linkedin.com/company/begapunk-rotary-joints/',
  YouTube: 'https://www.youtube.com/@BEGAPUNKRotaryJointsTV',
  Facebook: 'https://www.facebook.com/profile.php?id=61595481363231',
  X: 'https://x.com/Begapunk728',
  Instagram: 'https://www.instagram.com/begapunkrotaryjoints/',
};
const labels = {
  en: ['Begapunk on LinkedIn', 'Begapunk on YouTube', 'Begapunk on Facebook', 'Begapunk on X', 'Begapunk on Instagram'],
  de: ['Begapunk auf LinkedIn', 'Begapunk auf YouTube', 'Begapunk auf Facebook', 'Begapunk auf X', 'Begapunk auf Instagram'],
  fr: ['Begapunk sur LinkedIn', 'Begapunk sur YouTube', 'Begapunk sur Facebook', 'Begapunk sur X', 'Begapunk sur Instagram'],
  ja: ['Begapunk公式LinkedIn', 'Begapunk公式YouTube', 'Begapunk公式Facebook', 'Begapunk公式X', 'Begapunk公式Instagram'],
  ru: ['Begapunk в LinkedIn', 'Begapunk на YouTube', 'Begapunk на Facebook', 'Begapunk в X', 'Begapunk в Instagram'],
};

test('approved URLs are mapped by platform, independent of source order', () => {
  assert.deepEqual(Object.fromEntries(COMPANY_IDENTITY.officialSocialChannels.map(c => [c.platform, c.url])), expected);
  assert.deepEqual(resolveOfficialSocialChannels([...identity.officialSocialChannels].reverse()), COMPANY_IDENTITY.officialSocialChannels);
  assert.deepEqual(COMPANY_IDENTITY.brandSocialProfiles, Object.values(expected));
  assert.ok(Object.isFrozen(COMPANY_IDENTITY.officialSocialChannels));
  assert.ok(COMPANY_IDENTITY.officialSocialChannels.every(Object.isFrozen));
});

for (const [name, mutate] of [
  ['missing platform', channels => channels.pop()],
  ['duplicate platform', channels => { channels[0].platform = channels[1].platform; }],
  ['duplicate URL', channels => { channels[0].url = channels[1].url; }],
  ['unconfirmed account', channels => { channels[0].ownershipStatus = 'UNKNOWN'; }],
  ['unknown platform', channels => { channels[0].platform = 'Unconfirmed'; }],
  ['personal LinkedIn', channels => { channels.find(c => c.platform === 'LinkedIn').url = 'https://www.linkedin.com/in/guangcheng-cao/'; }],
  ['government portal', channels => { channels[0].url = 'https://www.gsxt.gov.cn/'; }],
  ['incorrect platform URL', channels => { channels.find(c => c.platform === 'Instagram').url = 'https://www.facebook.com/another-profile/'; }],
  ['non-HTTPS URL', channels => { channels[0].url = channels[0].url.replace('https:', 'http:'); }],
]) test(`reject ${name}`, () => {
  const channels = structuredClone(identity.officialSocialChannels);
  mutate(channels);
  assert.throws(() => resolveOfficialSocialChannels(channels));
});

function normalizeOrganizations(value) {
  if (!value || typeof value !== 'object') return;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('Organization') && !types.includes('LocalBusiness')) value.sameAs = '__ALLOWED_SOCIAL_CHANGE__';
  for (const child of Object.values(value)) normalizeOrganizations(child);
}

function validatePreview(before, after, locale) {
  const b = load(before, { sourceCodeLocationInfo: true });
  const a = load(after, { sourceCodeLocationInfo: true });
  const links = a('#siteFooter .footer-social-links a');
  assert.equal(links.length, 5);
  assert.deepEqual(links.map((_, el) => a(el).attr('href')).get(), Object.values(expected));
  links.each((i, el) => {
    const link = a(el);
    assert.equal(link.attr('aria-label'), labels[locale][i]);
    assert.equal(link.attr('target'), '_blank');
    assert.equal(link.attr('rel'), 'noopener noreferrer');
    assert.equal(link.text().trim(), '');
    assert.equal(link.find('svg.footer-icon[aria-hidden="true"][focusable="false"]').length, 1);
    assert.ok(link.find('svg').html().length > 20);
  });
  const oldLinks = b('#siteFooter .footer-social-links a');
  assert.equal(oldLinks.length, 4);
  oldLinks.each((i, el) => {
    const old = b(el), current = links.eq(i);
    assert.deepEqual({ ...el.attribs, href: Object.values(expected)[i] }, { ...current.get(0).attribs });
    assert.equal(old.html(), current.html(), 'existing icons unchanged');
  });
  const beforeScripts = b('script[type="application/ld+json"]');
  const afterScripts = a('script[type="application/ld+json"]');
  assert.equal(beforeScripts.length, afterScripts.length);
  let organizations = 0;
  afterScripts.each((i, el) => {
    const prior = JSON.parse(beforeScripts.eq(i).html());
    const current = JSON.parse(a(el).html());
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (value['@type'] === 'Organization') {
        organizations++;
        if (value['@id'] !== undefined) assert.equal(value['@id'], 'https://www.begapunk.com/#organization');
        // The recursive baseline equality below preserves absent author IDs too.
        assert.deepEqual(value.sameAs, Object.values(expected));
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(current);
    normalizeOrganizations(prior);
    normalizeOrganizations(current);
    assert.deepEqual(current, prior, 'all non-Organization-sameAs JSON-LD values unchanged, including LocalBusiness and Person');
  });
  // Compare every source byte outside the two allowed edit areas. JSON-LD
  // was compared recursively above; body, contacts, policies and layout remain.
  const mask = (html, $) => {
    const ranges = [];
    $('#siteFooter .footer-social-links, script[type="application/ld+json"]').each((_, el) => {
      const p = el.sourceCodeLocation;
      ranges.push([p.startTag.endOffset, p.endTag.startOffset]);
    });
    for (const [start, end] of ranges.sort((x, y) => y[0] - x[0])) html = html.slice(0, start) + '__ALLOWED__' + html.slice(end);
    return html;
  };
  assert.equal(mask(after, a), mask(before, b), 'all other HTML bytes unchanged');
  return organizations;
}

const baseline = process.env.SOCIAL_BASELINE_ROOT;
assert.ok(baseline, 'SOCIAL_BASELINE_ROOT must point to the preserved pre-patch files');
for (const locale of Object.keys(labels)) {
  for (const name of JSON.parse(fs.readFileSync(path.join(root, 'i18n/config.json'), 'utf8')).pages) {
    const rel = locale === 'en' ? name : `${locale}/${name}`;
    test(`${rel}: five corporate links and strictly bounded diff`, () => {
      const before = fs.readFileSync(path.join(baseline, rel), 'utf8');
      const after = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.equal(validatePreview(before, after, locale), ['index.html', 'about.html', 'blog.html', 'blog-prevent-air-hose-twisting.html'].includes(name) ? 1 : 0);
    });
  }
}

const before = fs.readFileSync(path.join(baseline, 'about.html'), 'utf8');
const after = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
for (const [name, mutate] of [
  ['changed business telephone', html => html.replaceAll('+86 183 6842 5342', '+86 183 6842 0000')],
  ['changed organization ID', html => html.replaceAll('#organization', '#organization-new')],
  ['changed LocalBusiness', html => html.replaceAll('#localbusiness', '#localbusiness-new')],
  ['personal corporate link', html => html.replaceAll(expected.LinkedIn, 'https://www.linkedin.com/in/guangcheng-cao/')],
  ['incorrect accessible platform label', html => html.replace('aria-label="Begapunk on Instagram"', 'aria-label="Begapunk on Facebook"')],
  ['unrelated HTML modification', html => html.replace('</body>', '<p>Unexpected content</p></body>')],
]) test(`scope guard rejects ${name}`, () => assert.throws(() => validatePreview(before, mutate(after), 'en')));

test('LocalBusiness social baseline remains exactly unchanged', () => {
  assert.deepEqual(COMPANY_IDENTITY.localBusinessSocialProfiles, [
    'https://www.linkedin.com/company/144021127/',
    expected.YouTube, expected.Facebook, expected.X,
  ]);
});
