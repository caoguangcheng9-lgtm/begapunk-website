import { assertLlmsV2Structure } from './lib/llms-v2-contract.mjs';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { drawingBackedProductModels, drawingBackedProductLinkLabel, drawingBackedProductSummary } from './lib/drawing-backed-product-facts.mjs';
import { productPolicy, policyCopy } from './lib/owner-product-policy.mjs';
import { llmsIdentity, assertLlmsIdentity, llmsSections, llmsEnglishSections, officialSocialUrls } from './lib/llms-document.mjs';

const root = path.resolve(import.meta.dirname, '..');
const models = [...drawingBackedProductModels, 'BP-10P-0001'].sort();
const sitemap = readFileSync(path.join(root, 'sitemap-i18n.xml'), 'utf8');
assert.equal(llmsIdentity.legalNameZh, '宁波贝加庞克气动元件有限公司');
assert.equal(llmsIdentity.externalNameEn, 'Ningbo Begapunk Pneumatic Components Co., Ltd.');
assert.equal(llmsIdentity.uscc, '91330201MABLQR5K7U');
assert.equal(llmsIdentity.customsRegistration, '3320260A4H');
assert.equal(llmsIdentity.source.legalNameAndUscc, 'OWNER_PROVIDED_BUSINESS_LICENSE_INFORMATION');
assert.equal(llmsIdentity.source.customsCodeAndEntity, 'OWNER_CONFIRMED');
assertLlmsIdentity(llmsIdentity);
// Strip the exponent in reciprocal-minute units before comparing numerical
// values. Repeated values and spelled-out counts differ by language; exact
// per-model source comparison above independently checks the complete wording.
const asciiNumbers = s => [...new Set([...s.replace(/min⁻¹/g,'RPM').normalize('NFKC').replace(/(?<=\d) (?=\d{3}\b)/g,'').replace(/(?<=\d),(?=\d)/g,'.').matchAll(/\d+(?:\.\d+)?/g)].map(m=>String(Number(m[0]))))].sort();
const signatures = new Map();
let links = 0;
for (const locale of ['en','de','fr','ja','ru']) {
  const relative = locale === 'en' ? 'llms.txt' : `${locale}/llms.txt`;
  const bytes = readFileSync(path.join(root, relative));
  const text = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  if (locale === 'en') assertLlmsV2Structure(text);
  assert.ok(!bytes.subarray(0,3).equals(Buffer.from([239,187,191])), `${relative}: no BOM`);
  assert.ok(!/[\u0000\uFFFD\r]/u.test(text), `${relative}: UTF-8/LF format`);
  assert.ok(text.endsWith('\n') && !/\{\{\w+\}\}|undefined/u.test(text), `${relative}: completed Markdown`);
  assert.equal((text.match(/^# /gm)||[]).length,1, `${relative}: one H1`);
  assert.ok(!/^#{4,}|\s+$/m.test(text.split('\n').filter(Boolean).join('\n')), `${relative}: heading/whitespace format`);
  for (const value of [llmsIdentity.legalNameZh,llmsIdentity.externalNameEn,llmsIdentity.brand,llmsIdentity.uscc,llmsIdentity.customsRegistration]) assert.ok(text.includes(value),`${relative}: identity ${value}`);
  assert.ok(!/Codex|OWNER_REPORTED_CONTENT_NOT_DIRECTLY_INSPECTED|PENDING_VERIFICATION|LOOKUP_PORTAL_ONLY|ARCHIVE_REQUIRED|audit\/llms-social-identity|Screenshot files await repository archiving/u.test(text), `${relative}: no internal audit workflow in public copy`);
  assert.equal(llmsIdentity.source.independentlyVerified,false);
  assert.deepEqual(llmsIdentity.sameAs,[]);
  const generated = locale === 'en' ? llmsEnglishSections() : llmsSections(locale);
  assert.ok(text.includes(generated.contactDetails), `${relative}: exact contact details from source`);
  assert.equal((text.match(/\[sales@begapunk\.com\]\(mailto:sales@begapunk\.com\)/g)||[]).length, 1, `${relative}: one business email`);
  assert.equal((text.match(/\+86 183 6842 5342/g)||[]).length, 1, `${relative}: one business phone`);
  assert.ok(text.includes('315327') && text.includes('08:30–17:30') && text.includes('UTC+08:00'), `${relative}: address and business time`);
  for (const key of ['identity','sources','social']) assert.ok(text.includes(generated[key]), `${relative}: exact ${key} evidence boundary`);
  assert.equal((text.match(/^## Official Social Media Channels$/gm)||[]).length, 1, `${relative}: one social section`);
  const socialSection = text.split('## Official Social Media Channels\n')[1].split('\n## ')[0];
  const socialPattern = locale === 'en' ? /^- \[([^\]]+)\]\(([^)]+)\): (.+)$/gm : /^- \[([^\]]+)\]\(([^)]+)\)$/gm;
  const socialLinks = [...socialSection.matchAll(socialPattern)].map(m=>[m[1],m[2]]);
  assert.deepEqual(socialLinks, Object.entries(officialSocialUrls), `${relative}: exact five social URLs`);
  const prefix = `https://www.begapunk.com/${locale==='en'?'':locale+'/'}`;
  const lines = text.split('\n').filter(line => models.some(m=>line.includes(`](${prefix}${m}.html):`)));
  assert.equal(lines.length,17,`${relative}: exactly 17 model summaries`);
  const english = JSON.parse(readFileSync(path.join(root,'i18n/manual/bp10-en-segments.json'),'utf8'));
  const manual = locale==='en' ? english : {...english,...JSON.parse(readFileSync(path.join(root,`i18n/manual/bp10-${locale}.json`),'utf8'))};
  for (const model of models) {
    const line = lines.filter(s=>s.includes(`](${prefix}${model}.html):`));
    assert.equal(line.length,1,`${relative}/${model}: unique direct link`);
    assert.ok(sitemap.includes(`${prefix}${model}.html`),`${relative}/${model}: sitemap coverage`);
    const expected = model === 'BP-10P-0001'
      ? `- [${manual[3]}](${prefix}${model}.html): ${manual[34]}`
      : `- [${drawingBackedProductLinkLabel(locale,model)}](${prefix}${model}.html): ${drawingBackedProductSummary(locale,model)}`;
    assert.equal(line[0],expected,`${relative}/${model}: controlled source parity`);
    const sig=asciiNumbers(line[0]);
    if(locale==='en')signatures.set(model,sig);
    else assert.deepEqual(sig,signatures.get(model),`${relative}/${model}: numerical parity across languages`);
    if(model==='BP-2P-0002')assert.ok(!/0[.,]22\s*(kg|кг)|220\s*(g|г)|2-in-3-out/i.test(line[0]));
    if(model==='BP-3P-0006')assert.ok(!/G4\/1|0[.,]36\s*(kg|кг)|360\s*(g|г)/i.test(line[0]));
  }
  assert.ok(!/217\s*[×x]\s*117[.,]5\s*[×x]\s*115[.,]8/u.test(text),`${relative}: withdrawn envelope`);
  const p=policyCopy(locale);
  for(const key of ['topology','seal','weight','weightNote','quality','warranty','response','fob','stockConfirm','stock','lead','bp10Order','payment','commercialScope'])assert.ok(text.includes(p[key]),`${relative}: unchanged ${key} policy`);
  for(const [model,price] of Object.entries(productPolicy.prices))assert.ok(text.includes(`${model}: ${p.bulk.replace('{price}',String(price))}`),`${relative}: scoped bulk price`);
  for(const i of [50,52,54,56])assert.ok(text.includes(`${manual[i-1]}: ${manual[i]}`),`${relative}: BP10 rating ${i}`);
  for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/g)) {
    const url=new URL(match[2]);links++;
    if (url.protocol === 'mailto:') {
      assert.equal(url.href, 'mailto:sales@begapunk.com', `${relative}: exact authorized email URL`);
      assert.equal(match[1], 'sales@begapunk.com', `${relative}: exact email label`);
      continue;
    }
    assert.ok(['https:','http:'].includes(url.protocol),`${relative}: URL scheme`);
    if(url.hostname==='www.begapunk.com'){
      const f=decodeURIComponent(url.pathname).replace(/^\//,'')+(url.pathname.endsWith('/')?'index.html':'');
      assert.ok(existsSync(path.join(root,f)),`${relative}: local target ${f}`);
    } else assert.ok(llmsIdentity.verificationSources.some(s=>s.url===url.href)
      || llmsIdentity.officialSocialChannels.some(s=>s.url===url.href)
      || (llmsIdentity.marketplaceProfiles||[]).some(s=>s.url===url.href),`${relative}: unapproved external link ${url.href}`);
  }
  console.log(`PASS ${relative}: UTF-8, Markdown, 17 models, numeric parity, identity, policy and local URLs.`);
}
console.log(`PASS 85 model summaries; ${links} Markdown link occurrences; original product/owner sources used without evidence upgrades.`);
