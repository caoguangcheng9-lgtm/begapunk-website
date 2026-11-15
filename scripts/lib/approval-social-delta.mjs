import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { OFFICIAL_SOCIAL_CHANNELS } from './official-social-channels.mjs';

export const SOCIAL_INCREMENT_SCOPE = Object.freeze([
  'footer-official-social-links-and-instagram-svg-label',
  'existing-organization-sameAs',
  'shared-css-version-20261108-footer-info1-to-20261114-footer-social5',
]);
const prefixes = { en:'Begapunk on ', de:'Begapunk auf ', fr:'Begapunk sur ', ja:'Begapunk公式', ru:'Begapunk в ' };
const instagram = '<svg class="footer-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.75"/></svg>';
const fragment = s => load(s, null, false).html();
const lf = b => new TextDecoder('utf-8', { fatal:true, ignoreBOM:true }).decode(b).replace(/\r\n?/g, '\n');

// Strict source comparison outside three delimited areas. JSON is compared
// recursively; a new node, other property, LocalBusiness or Person cannot hide
// inside a masked JSON script. This check establishes scope, never approval.
export function assertSocialIncrement(beforeBytes, afterBytes, relativePath) {
  const before=lf(beforeBytes), after=lf(afterBytes), locale=relativePath.includes('/')?relativePath.split('/')[0]:'en';
  assert.ok(prefixes[locale], 'Unsupported page locale');
  const b=load(before,{sourceCodeLocationInfo:true}), a=load(after,{sourceCodeLocationInfo:true});
  const selector='#siteFooter .footer-social-links';
  assert.equal(b(selector).length,1); assert.equal(a(selector).length,1);
  const old=b(selector+' a'), next=a(selector+' a');
  assert.equal(old.length,4);assert.equal(next.length,5);
  for(const [$,count] of [[b,4],[a,5]]) {
    const list=$(selector);assert.equal(list.children().length,count);assert.equal(list.children('li').length,count);
    list.contents().each((_,el)=>{if(el.type==='text')assert.equal(el.data.trim(),'');else assert.equal(el.name,'li');});
    list.children().each((_,el)=>{assert.deepEqual({...el.attribs},{});assert.equal($(el).children().length,1);assert.equal($(el).children('a').length,1);assert.equal($(el).text().trim(),'');});
  }
  next.each((i,el)=>{
    const c=OFFICIAL_SOCIAL_CHANNELS[i];
    // Existing localized labels are approved page content; preserve their
    // exact wording (including Russian prepositions), rather than rewriting it.
    const label=i<4?old.eq(i).attr('aria-label'):prefixes[locale]+c.platform;
    assert.deepEqual({...el.attribs},{href:c.url,target:'_blank',rel:'noopener noreferrer','aria-label':label});
    if(i<4){assert.deepEqual({...old.get(i).attribs,href:c.url},{...el.attribs});assert.equal(b(old.get(i)).html(),a(el).html(),'Existing SVG changed');}
    else assert.equal(a(el).html(),fragment(instagram),'Unexpected Instagram SVG/content');
  });
  const bs=b('script[type="application/ld+json"]'),as=a('script[type="application/ld+json"]');assert.equal(bs.length,as.length);
  let organizations=0;
  function paired(prior,current) {
    if(prior===null||typeof prior!=='object'){assert.deepEqual(current,prior);return;}
    assert.equal(Array.isArray(current),Array.isArray(prior));assert.ok(current&&typeof current==='object');
    assert.deepEqual(Object.keys(current).sort(),Object.keys(prior).sort(),'JSON-LD properties changed');
    const organization=prior['@type']==='Organization';
    if(organization){organizations++;assert.deepEqual(current.sameAs,OFFICIAL_SOCIAL_CHANNELS.map(c=>c.url));assert.ok(Array.isArray(prior.sameAs));}
    for(const key of Object.keys(prior))if(!(organization&&key==='sameAs'))paired(prior[key],current[key]);
  }
  as.each((i,el)=>paired(JSON.parse(bs.eq(i).html()),JSON.parse(a(el).html())));
  function masked(html,$,version) {
    const ranges=[];
    $(selector+', script[type="application/ld+json"]').each((_,el)=>{const p=el.sourceCodeLocation;assert.ok(p?.endTag);ranges.push([p.startTag.endOffset,p.endTag.startOffset,'__SOCIAL_OR_CHECKED_JSON__']);});
    const css=$('link[rel="stylesheet"]').filter((_,el)=>/^(?:\.\.\/)?css\/style\.css\?v=/.test($(el).attr('href')||''));
    assert.equal(css.length,1,'Exactly one shared CSS reference required');
    const el=css.get(0),href=$(el).attr('href');assert.equal(href,(locale==='en'?'':'../')+'css/style.css?v='+version);
    const p=el.sourceCodeLocation.attrs.href,raw=html.slice(p.startOffset,p.endOffset);
    assert.ok(raw.includes(version));ranges.push([p.startOffset,p.endOffset,raw.replace(version,'__APPROVED_CSS_VERSION__')]);
    for(const [start,end,value] of ranges.sort((x,y)=>y[0]-x[0]))html=html.slice(0,start)+value+html.slice(end);
    return html;
  }
  assert.equal(masked(after,a,'20261114-footer-social5'),masked(before,b,'20261108-footer-info1'),'Non-social source, body, parameters or policy changed');
  return {nonSocialBody:'UNCHANGED',otherJsonLd:'UNCHANGED',semanticReviewRequired:true,organizations};
}
