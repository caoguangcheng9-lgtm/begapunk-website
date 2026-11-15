import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

export const productPolicy = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/owner-confirmed-product-policy.json'), 'utf8'));
export const isProductFactPublished = (model, field) => !productPolicy.withheldFacts?.some(fact => fact.model === model && fact.field === field && fact.public === false);
export const policyCopy = (locale) => {
  const copy = productPolicy.locales[locale];
  if (!copy) throw new Error(`Unsupported product policy locale: ${locale}`);
  return copy;
};
const esc = (s) => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function stripProductPolicy(html) {
  return html.replace(/<!-- OWNER PRODUCT POLICY -->[\s\S]*?<!-- END OWNER PRODUCT POLICY -->/g, '').replace(/<!-- COMMERCIAL SCOPE -->[\s\S]*?<!-- END COMMERCIAL SCOPE -->/g, '');
}
export function applyProductPolicy(html, locale, model) {
  if (!/^BP-[\w-]+$/.test(model)) return html;
  const c=policyCopy(locale), price=productPolicy.prices[model];
  const commercial=productPolicy.paymentModels.includes(model);
  let source=stripProductPolicy(html);
  function key(name, value) {
    const re=new RegExp(`(<div\\b[^>]*data-spec-key=["']${name}["'][^>]*>[\\s\\S]*?<dd[^>]*>)[\\s\\S]*?(<\\/dd>)`,'g');
    source=source.replace(re,(_,a,b)=>a+esc(value)+b);
  }
  key('warranty',c.warrantyShort);key('quality',c.qualityShort);
  if(commercial) key('leadTime',model==='BP-10P-0001'?c.bp10Lead:c.leadShort);
  const paras=[c.quality,c.warranty,c.response];
  if(model==='BP-2P-0002') paras.unshift(c.topology);
  if(model==='BP-10P-0001') paras.unshift(c.seal,c.weight,c.weightNote,c.bp10Order);
  if(price) paras.unshift(c.bulk.replace('{price}',price),c.fob,model==='BP-2P-08-0001'?c.stockConfirm:c.stock,c.lead);
  if(commercial) paras.push(c.payment);
  const block=`<!-- OWNER PRODUCT POLICY -->\n<section class="container" data-owner-product-policy="2026-11-13" style="padding-top:24px;padding-bottom:32px"><h2>${esc(c.heading)}</h2>${paras.map(p=>`<p>${esc(p)}</p>`).join('\n')}</section>\n<!-- END OWNER PRODUCT POLICY -->`;
  source=source.replace('</main>',block+'</main>');
  source=source.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/g,(_,a,json,b)=>{
    const data=JSON.parse(json);
    function visit(o) {
      if(!o || typeof o!=='object')return;
      if(o['@type']==='Product'&&o.sku===model){
        delete o.inLanguage;
        delete o.associatedMedia;
        // Bulk-only pricing is not a universally available single-unit price.
        // Do not rely on search engines displaying eligibleQuantity restrictions.
        if(commercial) delete o.offers;
        o.additionalProperty=(o.additionalProperty||[]).filter(p=>!String(p.propertyID||'').startsWith('begapunk-policy-'));
        for(const [id,value] of [['quality',c.quality],['warranty',c.warranty],['response',c.response],...(model==='BP-2P-0002'?[['air-routing',c.topology]]:[])])
          o.additionalProperty.push({'@type':'PropertyValue',propertyID:`begapunk-policy-${id}`,name:c.heading,value});
        const cadNames=['3D CAD model','3D-CAD-Modell','Modèle CAO 3D','3D CADモデル','3D-модель CAD'];
        const cad=o.additionalProperty.filter(p=>cadNames.includes(p.name));
        o.additionalProperty=o.additionalProperty.filter(p=>!cadNames.includes(p.name)).concat(cad);
      }
      for(const value of Object.values(o))if(typeof value==='object')visit(value);
    }
    visit(data);return a+JSON.stringify(data)+b;
  });
  return source;
}

export function assertOwnerProductPolicy(html, locale, model) {
  const $=load(html),c=policyCopy(locale),block=$('[data-owner-product-policy]');
  if(block.length!==1)throw new Error(`${locale}/${model}: policy block count`);
  for(const v of [c.quality,c.warranty,c.response])if(!block.text().includes(v))throw new Error(`${locale}/${model}: owner policy missing`);
  if(productPolicy.paymentModels.includes(model)&&!block.text().includes(c.payment))throw new Error(`${locale}/${model}: payment scope`);
}

export function synchronizeExistingProductFaq(html) {
  const $=load(html);
  const pairs=$('.faq-item').toArray().map(e=>({
    '@type':'Question',name:$(e).find('summary').text().replace(/\s+/g,' ').trim(),
    acceptedAnswer:{'@type':'Answer',text:$(e).find('.faq-answer').text().replace(/\s+/g,' ').trim()},
  }));
  return html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/g,(_,a,json,b)=>{
    const data=JSON.parse(json);for(const node of data['@graph']||[])if(node['@type']==='FAQPage')node.mainEntity=pairs;
    return a+JSON.stringify(data)+b;
  });
}

export function applyCommercialScope(html, locale, pageName) {
  if (!['products.html', 'faq.html', 'terms.html'].includes(pageName)) return html;
  const c = policyCopy(locale);
  const source = html.replace(/<!-- COMMERCIAL SCOPE -->[\s\S]*?<!-- END COMMERCIAL SCOPE -->/g, '');
  const note = `<!-- COMMERCIAL SCOPE --><aside data-commercial-scope="2026-11-13"><h2>${esc(c.commercialScopeHeading)}</h2><p>${esc(c.commercialScope)}</p></aside><!-- END COMMERCIAL SCOPE -->`;
  if (!source.includes('</h1>')) throw new Error(`${locale}/${pageName}: missing heading for order terms`);
  return source.replace('</h1>', '</h1>' + note);
}
