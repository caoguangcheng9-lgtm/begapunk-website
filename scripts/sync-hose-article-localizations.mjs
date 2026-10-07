// Reviewed translations for this article only. Default: check; --write: apply.
import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const route='blog-prevent-air-hose-twisting.html';
const reference='blog-non-contact-clearance-seal-rotary-union.html';
const base='https://www.begapunk.com/';
const langs=['en','de','fr','ja','ru'];
const en=JSON.parse(read('i18n/manual/hose-article-en.json'));
const source=read(route);
const clean=s=>s.replace(/\s+/g,' ').trim();
const lookup=new Map(Object.entries(en).map(([k,v])=>[clean(v),k]));
if(lookup.size!==110)throw Error('English translation keys must be unique.');
export const articleMeta={
 en:{title:'Prevent Air Hose Twisting on Rotating Machinery | Begapunk',description:'Stop air hoses winding around rotary tables and fixtures. Compare motion types, see how a pneumatic rotary union works, and choose the right air circuits.',locale:'en_US',labels:['Breadcrumb','Article contents','Two air-supply connection arrangements','BP-10P-0001 pneumatic rotary union principle animation','English','BP-10P-0001 10-passage pneumatic rotary union with air fittings']},
 de:{title:'Druckluftschläuche an Rundtischen vor Verdrehen schützen | Begapunk',description:'Druckluftschläuche wickeln sich am Rundtisch auf? Bewegungsarten vergleichen, das Prinzip pneumatischer Drehdurchführungen verstehen und Luftkreise auswählen.',locale:'de_DE',labels:['Brotkrumennavigation','Artikelinhalt','Zwei Varianten der Luftversorgung','BP-10P-0001: Funktionsanimation der pneumatischen Drehdurchführung','Englisch','BP-10P-0001 pneumatische 10-Kanal-Drehdurchführung mit Schlauchverschraubungen']},
 fr:{title:'Éviter la torsion des tuyaux d’air sur les tables rotatives | Begapunk',description:'Des tuyaux s’enroulent sur une table rotative ? Comparez les mouvements, comprenez le joint tournant pneumatique et choisissez les circuits d’air nécessaires.',locale:'fr_FR',labels:['Fil d’Ariane','Sommaire','Deux configurations d’alimentation en air','BP-10P-0001 : animation du principe du joint tournant pneumatique','Anglais','Joint tournant pneumatique BP-10P-0001 à 10 passages avec raccords']},
 ja:{title:'回転装置のエアチューブの絡まり・ねじれ対策 | Begapunk',description:'回転テーブルや治具のエアチューブが巻き付く原因を解説。往復揺動・間欠割出・連続回転を区別し、エアロータリージョイントの原理と流路の選び方を紹介します。',locale:'ja_JP',labels:['現在位置','記事の目次','2つの給気接続方式','BP-10P-0001 エアロータリージョイントの原理アニメーション','英語','継手付きBP-10P-0001 10流路エアロータリージョイント']},
 ru:{title:'Как избежать перекручивания пневмошлангов на поворотном столе | Begapunk',description:'Шланги наматываются на поворотный стол? Сравните виды движения, изучите принцип пневматического вращающегося соединения и подберите воздушные контуры.',locale:'ru_RU',labels:['Навигационная цепочка','Содержание статьи','Две схемы подачи воздуха','BP-10P-0001: анимация принципа пневматического вращающегося соединения','Английский','10-канальное пневматическое вращающееся соединение BP-10P-0001 с фитингами']}
};
let changed=0;
for(const lang of langs){
 const d=JSON.parse(read(`i18n/manual/hose-article-${lang}.json`));
 if(Object.keys(d).length!==110)throw Error(`Incomplete ${lang} translation`);
 const $=load(source),seen=new Set();
 function translate(n){if(n.type==='text'){const s=clean(n.data);if(!s||!/[\p{L}]/u.test(s))return;const k=lookup.get(s);if(k===undefined)throw Error(`Unmapped article text: ${s}`);seen.add(k);n.data=(/^\s/.test(n.data)?' ':'')+d[k].trim()+(/\s$/.test(n.data)||/\s$/.test(d[k])?' ':'');}else for(const c of n.children||[])translate(c);}
 translate($('main')[0]);
 if(seen.size!==110)throw Error(`Expected 110 source segments, found ${seen.size}.`);
 const prefix=lang==='en'?'':lang+'/';const asset=lang==='en'?'':'../';const canonical=base+prefix+route;const m=articleMeta[lang];
 $('html').attr('lang',lang);$('title').text(m.title);$('meta[name="description"]').attr('content',m.description);
 $('meta[name="robots"],link[rel="canonical"],link[hreflang],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]').remove();
 $('head').append(`<link rel="canonical" href="${canonical}">`);
 for(const code of [...langs,'x-default'])$('head').append(`<link rel="alternate" hreflang="${code}" href="${base}${['en','x-default'].includes(code)?'':code+'/'}${route}">`);
 const hero=base+'images/optimized/products/bp-10p-0001-hero.webp';
 for(const [property,content]of Object.entries({'og:title':m.title,'og:description':m.description,'og:url':canonical,'og:type':'article','og:locale':m.locale,'og:site_name':'Begapunk','og:image':hero,'og:image:width':'1600','og:image:height':'1200','og:image:alt':m.labels[5]}))$('head').append($('<meta>').attr({property,content}));
 for(const [name,content]of Object.entries({'twitter:card':'summary_large_image','twitter:title':m.title,'twitter:description':m.description,'twitter:image':hero}))$('head').append($('<meta>').attr({name,content}));
 $('[href],[src],[poster]').each((_,el)=>{for(const a of ['href','src','poster']){const v=$(el).attr(a);if(v&&/^(css|js|images|videos|downloads)\//.test(v))$(el).attr(a,asset+v);}});
 const template=load(read(prefix+reference));
 $('header.header').replaceWith(template('header.header').prop('outerHTML').replaceAll(reference,route));
 $('footer').replaceWith(template('footer').prop('outerHTML'));
 $('.skip-link').replaceWith(template('.skip-link').prop('outerHTML'));
 $('script[src*="analytics.js"]').remove();$('head').append(template('script[src*="analytics.js"]').prop('outerHTML'));
 const l=m.labels;
 $('.breadcrumb').attr('aria-label',l[0]);$('.breadcrumb a').first().attr('href','./');$('.article-toc').attr('aria-label',l[1]);$('.flow-compare').attr('aria-label',l[2]);$('video').attr('aria-label',l[3]);$('track').attr('label',l[4]);$('.product-example img').attr('alt',l[5]);$('.references').attr('aria-label',d[108].replace(/[:：]$/, '').trim());
 $('.motion-table tr').each((_,e)=>{$(e).find('td').eq(0).attr('data-label',d[26]);$(e).find('td').eq(1).attr('data-label',d[27]);});
 $('main a[href^="contact.html?"]').each((_,e)=>{const u=new URL($(e).attr('href'),canonical);u.searchParams.set('source',prefix+route);u.searchParams.set('application',d[2]);$(e).attr('href','contact.html'+u.search+u.hash);});
 const headline=clean($('h1').text());
 const graph=[{'@type':'TechArticle','@id':canonical+'#article',headline,description:m.description,inLanguage:lang,image:hero,dateModified:'2026-10-07',author:{'@type':'Organization',name:'Begapunk',url:base},publisher:{'@id':base+'#organization'},mainEntityOfPage:{'@type':'WebPage','@id':canonical,inLanguage:lang}}, {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:d[0],item:base+prefix},{'@type':'ListItem',position:2,name:d[1],item:base+prefix+'blog.html'},{'@type':'ListItem',position:3,name:d[2],item:canonical}]},{'@type':'FAQPage',inLanguage:lang,mainEntity:$('.ta-faq details').toArray().map(e=>({'@type':'Question',name:$(e).find('summary').text(),acceptedAnswer:{'@type':'Answer',text:$(e).find('p').text()}}))}];
 $('head').append($('<script>').attr('type','application/ld+json').text(JSON.stringify({'@context':'https://schema.org','@graph':graph})));
 const output=$.html(),file=prefix+route;
 if(!fs.existsSync(path.join(root,file))||read(file)!==output){changed++;if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,file),output);else console.error(`Outdated: ${file}`);}
}
console.log(`Hose article: ${changed} pages ${process.argv.includes('--write')?'written':'outdated'}.`);
if(changed&&!process.argv.includes('--write'))process.exitCode=1;
