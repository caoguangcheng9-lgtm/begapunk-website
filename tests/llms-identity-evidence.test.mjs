import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llmsIdentity, assertLlmsIdentity, llmsSections, officialSocialUrls } from '../scripts/lib/llms-document.mjs';

test('actual archived ownership evidence and owner-reported screenshot boundary are valid', () => {
  assert.doesNotThrow(()=>assertLlmsIdentity(llmsIdentity));
  for(const locale of ['en','de','fr','ja','ru']) {
    const sections=llmsSections(locale);
    for(const [platform,url] of Object.entries(officialSocialUrls)) assert.ok(sections.social.includes(`[${platform}](${url})`));
    // Reported screenshot date/status remain internal evidence, not public claims.
    assert.equal(llmsIdentity.source.governmentScreenshotSupplement.providedDate, '2026-11-14');
    assert.equal(llmsIdentity.governmentQueryScreenshots[0].reportedFields.enterpriseStatusZh, '存续');
    assert.equal(llmsIdentity.source.governmentScreenshotSupplement.contentBasis, 'OWNER_REPORTED_CONTENT_NOT_DIRECTLY_INSPECTED');
    const publicIdentity = [sections.identity, sections.sources, sections.social].join('\n');
    assert.doesNotMatch(publicIdentity, /Codex|2026-11-14|存续|PENDING_VERIFICATION|LOOKUP_PORTAL_ONLY|OWNER_REPORTED|ARCHIVE_REQUIRED|Tianyancha|Made-in-China|AEO|ISO|badge|certification|Zertifizierung|認証|сертификац/iu);
    assert.deepEqual([...sections.sources.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)$/gm)].map(m => m[2]), llmsIdentity.verificationSources.map(s=>s.url));
  }
});

const cases = [
  ['independent online verification fabrication', d=>{d.source.independentlyVerified=true;}],
  ['portal used as sameAs', d=>{d.sameAs=['https://www.gsxt.gov.cn/'];}],
  ['lookup portal upgraded to verified entity', d=>{d.verificationSources[0].entityRecordStatus='VERIFIED';}],
  ['owner evidence upgraded to document verification', d=>{d.source.customsCodeAndEntity='DOCUMENT_VERIFIED';}],
  ['unreviewed screenshot marked independently inspected', d=>{d.governmentQueryScreenshots[0].imageInspectedByCodex=true;}],
  ['unarchived screenshot marked archived', d=>{d.governmentQueryScreenshots[0].archiveStatus='ARCHIVED';}],
  ['invented screenshot path', d=>{d.governmentQueryScreenshots[0].assetPath='made-up.png';}],
  ['invented screenshot hash', d=>{d.governmentQueryScreenshots[0].assetSha256='a'.repeat(64);}],
  ['AEO added beyond screenshot scope', d=>{d.governmentQueryScreenshots[1].reportedFields.AEO=true;}],
  ['account ownership changed into platform badge', d=>{d.officialSocialChannels[0].platformBadgeStatus='VERIFIED';}],
  ['platform certification falsely asserted', d=>{d.officialSocialChannels[0].platformCertificationClaimed=true;}],
  ['product certification falsely asserted', d=>{d.officialSocialChannels[0].productCertificationClaimed=true;}],
  ['lookalike profile URL', d=>{d.officialSocialChannels[0].url='https://www.linkedin.com/company/begapunk/';}],
  ['missing account', d=>{d.officialSocialChannels.pop();}],
  ['additional account', d=>{d.officialSocialChannels.push(d.officialSocialChannels[0]);}],
  ['duplicate account while count stays five', d=>{d.officialSocialChannels[1]=d.officialSocialChannels[0];}],
  ['tampered archived audit hash', d=>{d.officialSocialChannels[0].evidence.sha256='a'.repeat(64);}],
  ['unsafe evidence path', d=>{d.officialSocialChannels[0].evidence.path='../elsewhere.md';}],
  ['owner source record hash replaced', d=>{d.source.governmentScreenshotSupplement.sourceRecord.sha256='0'.repeat(64);}],
];
for(const [name,mutate] of cases) test(`reject ${name}`,()=>{
  const changed=structuredClone(llmsIdentity);mutate(changed);
  assert.throws(()=>assertLlmsIdentity(changed));
});
test('missing evidence file is rejected',()=>{
  assert.throws(()=>assertLlmsIdentity(llmsIdentity,()=>{throw new Error('ENOENT: evidence absent');}),/evidence absent/);
});

test('public identity copy retains supplied-information, general-portal and separate-entity boundaries in five languages', () => {
  const required = {
    en: ['information provided by the company', 'confirmed by the company', 'international business communications', 'distinct from', 'general search portals', 'do not constitute independently verified company-specific records', 'official company-managed'],
    de: ['vom Unternehmen bereitgestellten', 'vom Unternehmen bestätigt', 'internationale Geschäftskommunikation', 'zu unterscheiden', 'allgemeinen Suchportalen', 'keine unabhängig verifizierten', 'von BEGAPUNK verwalteten'],
    fr: ['fournies par l’entreprise', 'confirmé par l’entreprise', 'communications commerciales internationales', 'distincte de', 'portails de recherche généraux', 'ne constituent pas', 'gérés par BEGAPUNK'],
    ja: ['当社が提供した工商登録情報', '当社が確認した', '国際的な商取引', '別の法人', '一般的な検索ポータル', '示すものではありません', 'BEGAPUNKが管理する公式'],
    ru: ['предоставленных компанией', 'подтверждён компанией', 'международной деловой переписки', 'отдельным юридическим лицом', 'общие поисковые порталы', 'не являются независимо проверенными', 'которыми управляет компания'],
  };
  for (const [locale, phrases] of Object.entries(required)) {
    const sections = llmsSections(locale);
    const text = [sections.identity, sections.sources, sections.social].join('\n');
    for (const phrase of phrases) assert.ok(text.includes(phrase), `${locale}: missing public boundary ${phrase}`);
  }
});

test('owner-supplied establishment, registered address and contact fields are exact', () => {
  assert.equal(llmsIdentity.establishedDate, '2022-04-28');
  assert.equal(llmsIdentity.registeredAddress, 'No. 665 Youdian Road, Andong Town, Hangzhou Bay New Area, Ningbo, Zhejiang 315327, China.');
  assert.equal(llmsIdentity.businessEmail, 'sales@begapunk.com');
  assert.equal(llmsIdentity.businessPhone, '+86 183 6842 5342');
  assert.deepEqual(llmsIdentity.businessHours, {weekdays:['Monday','Tuesday','Wednesday','Thursday','Friday'], opens:'08:30',closes:'17:30',timeZone:'Asia/Shanghai',utcOffset:'+08:00'});
  assert.equal(llmsIdentity.source.identityContactSupplement.governmentScreenshotReview, 'OWNER_CONFIRMS_SCREENSHOTS_PROVIDED_AND_CONTENT_CHECKED');
  assert.equal(llmsIdentity.source.identityContactSupplement.independentOnlineVerification, false);
});

test('five language identity and contact sections label the registered address and normal business hours', () => {
  const dates = {en:'April 28, 2022',de:'28. April 2022',fr:'28 avril 2022',ja:'2022年4月28日',ru:'28 апреля 2022 г.'};
  const addressLabels = {en:'Registered address',de:'Registrierte Anschrift',fr:'Adresse enregistrée',ja:'登記上の住所',ru:'Юридический адрес'};
  const weekdays = {en:'Monday–Friday',de:'Montag–Freitag',fr:'Lundi–vendredi',ja:'月曜日–金曜日',ru:'Понедельник–пятница'};
  for (const locale of Object.keys(dates)) {
    const s = llmsSections(locale);
    assert.ok(s.identity.includes(dates[locale]), `${locale}: exact establishment date`);
    for (const text of [s.identity,s.contactDetails]) {
      assert.equal(text.split(llmsIdentity.registeredAddress).length-1,1, `${locale}: registered address once per relevant section`);
      assert.ok(text.includes(`${addressLabels[locale]}: ${llmsIdentity.registeredAddress}`));
    }
    assert.ok(s.contactDetails.includes('[sales@begapunk.com](mailto:sales@begapunk.com)'));
    assert.ok(s.contactDetails.includes('+86 183 6842 5342'));
    assert.ok(s.contactDetails.includes(`${weekdays[locale]}, 08:30–17:30`));
    assert.ok(s.contactDetails.includes('UTC+08:00'));
  }
});
