import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import { COMPANY_IDENTITY } from '../scripts/lib/company-identity.mjs';
import { readProtectedHoseState } from '../scripts/lib/protected-hose-article-output.mjs';
const root=path.resolve(import.meta.dirname,'..');
const baseline=process.env.SOCIAL_BASELINE_ROOT;
assert.ok(baseline);
const read=(rel,base=root)=>fs.readFileSync(path.join(base,rel),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const article=read('scripts/sync-hose-article-localizations.mjs');
const oldArticle=read('scripts/sync-hose-article-localizations.mjs',baseline);
const statement=source=>source.split('\n').find(line=>line.startsWith(' const graph='));
function graph(source,language,identity=COMPANY_IDENTITY) {
 const prefix=language==='en'?'':language+'/';
 const $=load(read(prefix+'blog-prevent-air-hose-twisting.html'));
 return plain(vm.runInNewContext(statement(source)+'; graph',{
  $,approvedState:readProtectedHoseState(read(prefix+'blog-prevent-air-hose-twisting.html')),COMPANY_IDENTITY:identity,canonical:'https://www.begapunk.com/'+prefix+'blog-prevent-air-hose-twisting.html',
  headline:$('h1').text(),m:{description:$('meta[name="description"]').attr('content')},lang:language,
  hero:'https://www.begapunk.com/images/optimized/products/bp-10p-0001-hero.webp',
  base:'https://www.begapunk.com/',prefix,d:JSON.parse(read('i18n/manual/hose-article-'+language+'.json'))
 }));
}
for(const language of ['en','de','fr','ja','ru'])test(language+': execute actual article graph expression, preserve all non-social fields',()=>{
 const before=graph(oldArticle,language),after=graph(article,language);
 assert.deepEqual(after[0].author.sameAs,plain(COMPANY_IDENTITY.brandSocialProfiles));
 assert.equal(Object.hasOwn(after[0].author,'@id'),false);
 const prefix=language==='en'?'':language+'/';
 const approved=readProtectedHoseState(read(prefix+'blog-prevent-air-hose-twisting.html',baseline));
 before[0].author=plain(approved.author);before[1]=plain(approved.breadcrumb);
 delete before[0].author.sameAs;delete after[0].author.sameAs;assert.deepEqual(after,before);
 const injected={...COMPANY_IDENTITY,brandSocialProfiles:['shared-source-test-sentinel']};
 assert.deepEqual(graph(article,language,injected)[0].author.sameAs,['shared-source-test-sentinel']);
});
test('article imports the shared identity; no author hardcoded account URLs',()=>{
 assert.match(article,/import \{ COMPANY_IDENTITY \} from '\.\/lib\/company-identity\.mjs';/);
 assert.match(statement(article),/sameAs:COMPANY_IDENTITY\.brandSocialProfiles/);
 assert.doesNotMatch(statement(article),/linkedin|facebook|instagram|youtube|x\.com/);
});
const build=read('scripts/build-localized-site.mjs');
const resolver=build.slice(build.indexOf('function resolveTranslation({'),build.indexOf('async function loadTranslationCaches()'));
const nav=read('scripts/sync-site-navigation.mjs');
const footerCopy=plain(vm.runInNewContext(nav.slice(nav.indexOf('const footerCopy = {'),nav.indexOf('const breadcrumbCopy = {'))+';footerCopy'));
const source='Begapunk on Instagram';
const catalog=JSON.parse(read('i18n/source-catalog.json'));
const oldCatalog=JSON.parse(read('i18n/source-catalog.json',baseline));
const entry=catalog.entries.find(x=>x.source===source);
test('one catalog entry, original IDs/records/metadata untouched, only actual translated-source pages linked',()=>{
 assert.ok(entry);assert.equal(entry.id,crypto.createHash('sha256').update(source).digest('hex').slice(0,16));
 assert.deepEqual(entry.pages,JSON.parse(read('i18n/config.json')).translationManagedPages.slice().sort());
 const remainder=plain(catalog);remainder.entries=remainder.entries.filter(e=>e.source!==source);
 assert.deepEqual(remainder,oldCatalog);
 const config=JSON.parse(read('i18n/config.json'));
 const actual=config.translationManagedPages.filter(p=>load(read(p))('.footer-social-links a[aria-label="'+source+'"]').length).sort();
 assert.deepEqual(actual,entry.pages);
 assert.equal(footerCopy.en.socialLabels.Instagram,source);
});
for(const lang of ['de','fr','ja','ru'])test(lang+': actual translation resolver returns exact generated footer label',()=>{
 const overrides=JSON.parse(read('i18n/overrides/'+lang+'.json'));
 const original=JSON.parse(read('i18n/overrides/'+lang+'.json',baseline));
 const remainder={...overrides};delete remainder[source];assert.deepEqual(remainder,original);
 const context={args:{id:entry.id,source,pageEditorialOverrides:{},generatedPageOverrides:{},sharedEditorialOverrides:{},overrides,cache:{translations:{}}}};
 const translated=vm.runInNewContext(resolver+';resolveTranslation(args)',context);
 assert.equal(translated,footerCopy[lang].socialLabels.Instagram);
 for(const page of JSON.parse(read('i18n/config.json')).pages) {
  const $=load(read(lang+'/'+page));assert.equal($('.footer-social-links a').last().attr('aria-label'),translated);
 }
 delete context.args.overrides[source];
 assert.equal(vm.runInNewContext(resolver+';resolveTranslation(args)',context),undefined,'missing mapping must remain unresolved, never silently English');
});

// Execute the real bounded writer against the differently serialized product
// icon that was not in the original 25-page sample; preserve all prior checks.
const socialWriter=nav.slice(nav.indexOf('function socialMarkup('),nav.indexOf('function footerMarkup('));
const iconFunction=nav.slice(nav.indexOf('function icon('),nav.indexOf('function footerColumn('));
const runSocial=sample=>vm.runInNewContext(iconFunction+socialWriter+";socialOnlyMarkup(sample, 'en')",{load,URL,COMPANY_IDENTITY,socialLinks:COMPANY_IDENTITY.officialSocialChannels,footerCopy,sample});
test('bounded writer preserves actual BP-10P-0001 original SVG serialization and is stable',()=>{
 const original=read('BP-10P-0001.html',baseline);
 const generated=runSocial(original),b=load(original),a=load(generated);
 b('.footer-social-links a').each((i,el)=>assert.equal(b(el).html(),a('.footer-social-links a').eq(i).html()));
 assert.equal(runSocial(generated),generated);
});
test('bounded writer rejects unknown corporate URL, duplicate platform and missing icon',()=>{
 const original=read('BP-10P-0001.html',baseline);
 assert.throws(()=>runSocial(original.replace('https://www.linkedin.com/company/144021127/','https://www.linkedin.com/in/unauthorized/')));
 assert.throws(()=>runSocial(original.replace('aria-label="Begapunk on YouTube"','aria-label="Begapunk on LinkedIn"')));
 assert.throws(()=>runSocial(original.replaceAll('class="footer-icon"','class="missing-footer-icon"')));
});

test('legacy profile guard allows exact approved URL only, preserving obsolete/near-match rejection',()=>{
 const verifier=read('scripts/verify-localized-site.mjs');
 const fn=verifier.slice(verifier.indexOf('function hasObsoleteSocialProfile('),verifier.indexOf('const footerExpected = {'));
 const check=url=>vm.runInNewContext(fn+';hasObsoleteSocialProfile(html, obsolete)',{COMPANY_IDENTITY,html:'<a href="'+url+'">link</a>',obsolete:'https://www.linkedin.com/company/begapunk'});
 const approved=COMPANY_IDENTITY.officialSocialChannels.find(x=>x.platform==='LinkedIn').url;
 assert.equal(check(approved),false);
 for(const url of ['https://www.linkedin.com/company/begapunk','https://www.linkedin.com/company/begapunk/','https://www.linkedin.com/company/begapunk-fake/',approved+'?unapproved=1',approved+'other/'])assert.equal(check(url),true,url);
});
