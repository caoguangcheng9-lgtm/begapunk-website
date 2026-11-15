import {load} from 'cheerio';
import {drawingBackedUiContract} from './drawing-backed-product-facts.mjs';
import {policyCopy,applyCommercialScope,isProductFactPublished} from './owner-product-policy.mjs';
const bp2Short={en:'2 rotary passages + 1 shaft-only passage',de:'2 Drehkanäle + 1 Kanal nur in der Welle',fr:'2 circuits rotatifs + 1 circuit interne à l’arbre',ja:'回転界面を通る2流路＋軸内専用1流路',ru:'2 вращающихся канала + 1 канал внутри вала'};
const targets=['BP-2P-0002','BP-3P-0006','BP-10P-0001'];
export function applyProductDiscovery(html,locale,pageName){
 html=applyCommercialScope(html,locale,pageName);
 const application=['application-automation-rotary-tables.html','application-cnc-pneumatic-clamping.html'].includes(pageName);
 if(!application&&!['products.html','product-comparison.html'].includes(pageName))return html;
 if(application){
   const $=load(html,{sourceCodeLocationInfo:true}),edits=[];
   $('p:has(a[href="BP-10P-0001.html"]),a.app-related-product[href="BP-10P-0001.html"]').each((_,n)=>{
     const loc=n.sourceCodeLocation;if(!loc)return;
     let text=html.slice(loc.startOffset,loc.endOffset);
     for(const [a,b] of [[' for intermittent rotation',''],['intermittent indexing tables','rotary tables'],['intermittent rotation','rotation'],['intermittierend rotierende','rotierende'],['intermittierende Rotation','Rotation'],['intermittierender Rotation','Rotation'],['rotation intermittente','rotation'],['間欠回転','回転'],['прерывистым вращением','вращением'],['прерывистом вращении','вращении'],['прерывистое вращение','вращение']])text=text.replaceAll(a,b);
     edits.push({start:loc.startOffset,end:loc.endOffset,text});
   });
   for(const e of edits.sort((a,b)=>b.start-a.start))html=html.slice(0,e.start)+e.text+html.slice(e.end);
   return html;
 }
 // Page-scoped label translations; numerical specifications remain unchanged.
 if(pageName==='products.html'){
  if(locale==='fr')html=html.replaceAll('>Labyrinthe de protection<','>Capot de protection et labyrinthe<');
  if(locale==='ja')html=html.replace(/(>\s*\d+) 流路の(?=\s*<)/g,'$1流路').replace(/(>\s*\d+)mm 中空径の(?=\s*<)/g,'$1 mm 中空径').replace(/(>\s*\d+)mm オリフィスの(?=\s*<)/g,'$1 mm オリフィス').replaceAll('>ダウンロードのPDF<','>PDFをダウンロード<').replaceAll('>45#鋼鉄<','>45号炭素鋼<');
  if(locale==='ru')html=html.replace(/(>\s*)(\d+) Проходы(?=\s*<)/g,(_,prefix,n)=>`${prefix}${n} ${Number(n)===1?'канал':Number(n)>=2&&Number(n)<=4?'канала':'каналов'}`).replaceAll('>пневматический-электрический<','>Пневмоэлектрическое исполнение<');
 }
 const $=load(html,{sourceCodeLocationInfo:true}),changes=[],copy=policyCopy(locale);
 $('.product-card-large, tbody tr').each((_,node)=>{
  const model=targets.find(m=>$(node).attr('data-href')===m+'.html'||$(node).find(`a[href="${m}.html"]`).length);
  if(!model)return;
  const loc=node.sourceCodeLocation;if(!loc)throw new Error('Discovery source locations unavailable');
  const q=load($.html(node),null,false),root=q.root().children().first(),ui=model==='BP-10P-0001'?null:drawingBackedUiContract(locale,model);
  if(root.is('tr')){
   const cells=root.find('td');if(cells.length!==9)throw new Error(`${pageName}/${model}: comparison columns changed`);
   if(ui){cells.eq(2).text(ui.fields.pressure);cells.eq(3).text(ui.fields.speed);cells.eq(4).text(ui.fields.ports);cells.eq(5).text(ui.fields.mount);}
   if(model==='BP-2P-0002')cells.eq(1).text(bp2Short[locale]);
   if(model==='BP-10P-0001'){
    cells.eq(3).text({en:'100 RPM',de:'100 U/min',fr:'100 tr/min',ja:'100 min⁻¹',ru:'100 об/мин'}[locale]);
    cells.eq(7).text(copy.sealShort);
   }
  }else{
   const spans=root.find('.product-specs span');
   if(model==='BP-2P-0002'){
    root.find('h3').text(`${model} · ${bp2Short[locale]}`);root.find('img').attr('alt',`${model} · ${bp2Short[locale]}`);
    const values=[bp2Short[locale],'PCD 16 mm','G1/4 + G1/8',ui.fields.pressure,ui.fields.speed,'AL6061'];
    spans.each((i,e)=>q(e).text(values[i]));
   }
   if(model==='BP-3P-0006'){
    spans.eq(1).text('6 × G1/4 BSPP');
    if(!isProductFactPublished(model,'weight')) spans.filter((_,e)=>/(?:0[.,]36|360)\s*(?:kg|g|кг|г)/u.test(q(e).text())).remove();
   }
   if(model==='BP-10P-0001'){
    spans.eq(2).text({en:'100 RPM',de:'100 U/min',fr:'100 tr/min',ja:'100 min⁻¹',ru:'100 об/мин'}[locale]);
    // Preserve card layout; full coating process is on the product page.
    spans.eq(5).text(copy.sealShort);
   }
  }
  const replacement=q.html();if(html.slice(loc.startOffset,loc.endOffset)!==replacement)changes.push({start:loc.startOffset,end:loc.endOffset,replacement});
 });
 for(const ch of changes.sort((a,b)=>b.start-a.start))html=html.slice(0,ch.start)+ch.replacement+html.slice(ch.end);
 html=html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/g,(_,a,j,b)=>{
   const data=JSON.parse(j);function visit(n){if(!n||typeof n!=='object')return;if(typeof n.name==='string'&&n.name.includes('BP-2P-0002'))n.name='BP-2P-0002 · '+bp2Short[locale];for(const v of Object.values(n))if(typeof v==='object')visit(v);}visit(data);return a+JSON.stringify(data)+b;
 });
 return html;
}
