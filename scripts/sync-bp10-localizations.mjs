// Narrow, reviewed BP10 localization. Never feed this model through legacy product facts.
// Default checks only; --write rebuilds only the four BP10 pages from reviewed dictionaries.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const route = 'BP-10P-0001.html';
const base = 'https://www.begapunk.com/';
const languages = ['de', 'fr', 'ja', 'ru'];
const segments = JSON.parse(read('i18n/manual/bp10-en-segments.json'));
const en = read(route);
const clean = value => value.replace(/\s+/g, ' ').trim();
const attributes = {
 de: ['Produktbilder','Produktinformationen','Auf dieser Seite','Wichtige Produktdaten','Produktdetails','Vorderansicht mit Verschraubungen – CAD-Darstellung','Rückansicht der Befestigung – CAD-Darstellung','Anschlüsse und Befestigung – CAD-Darstellung','Maßzeichnung','Funktionsanimation','Englisch'],
 fr: ['Images du produit','Informations produit','Sur cette page','Principales caractéristiques','Détails du produit','Vue avant avec raccords – rendu CAO','Vue arrière de fixation – rendu CAO','Détail des raccords et fixations – rendu CAO','Plan coté','Animation du principe de fonctionnement','Anglais'],
 ja: ['製品画像','製品情報','このページの内容','主な製品情報','製品詳細','継手付き正面図（CADレンダリング）','取付部の背面図（CADレンダリング）','ポートと取付部の詳細（CADレンダリング）','外形寸法図','動作原理アニメーション','英語'],
 ru: ['Изображения изделия','Информация об изделии','На этой странице','Основные характеристики','Подробности об изделии','Вид спереди с фитингами — CAD-визуализация','Вид крепления сзади — CAD-визуализация','Порты и крепления — CAD-визуализация','Габаритный чертёж','Анимация принципа работы','Английский']
};
const metadata = {
 de: '10 unabhängige Druckluftkanäle, 1 MPa, 100 min⁻¹ bei intermittierender Rotation. G1/8-Anschlüsse, 8-mm-Schlauchverschraubungen, PDF und STEP.',
 fr: '10 circuits d’air indépendants, 1 MPa, 100 tr/min en rotation intermittente. Orifices G1/8, raccords pour tubes de 8 mm, plan PDF et modèle STEP.',
 ja: '独立した10系統の圧縮空気回路に対応。最高圧力1 MPa、間欠回転で最高100 min⁻¹。G1/8ポート、外径8 mmチューブ用継手付き。PDF図面・STEPモデルをダウンロード。',
 ru: '10 независимых пневмоканалов, 1 МПа, 100 об/мин при прерывистом вращении. Порты G1/8, фитинги для трубок 8 мм, чертёж PDF и модель STEP.'
};
let changed = 0;
for (const lang of languages) {
 const d = JSON.parse(read(`i18n/manual/bp10-${lang}.json`));
 const $ = load(en);
 const template = load(read(`${lang}/BP-8P-0001.html`));
 const seen = new Set();
 function translate(node) {
  if (node.type === 'text') {
   const text = clean(node.data), index = segments.indexOf(text);
   if (index >= 0) { seen.add(index); if (d[index]) node.data = node.data.replace(text, d[index]); }
   else if (/[A-Za-z]{3}/.test(text)) throw new Error(`Unmapped English main text: ${text}`);
  } else for (const child of node.children || []) translate(child);
 }
 translate($('main')[0]);
 for (const key of Object.keys(d)) if (!seen.has(Number(key))) throw new Error(`Unused ${lang} segment ${key}`);
 $('html').attr('lang', lang);
 const canonical = `${base}${lang}/${route}`;
 $('title').text(`${d[3]} | Begapunk`);
 $('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').attr('content',metadata[lang]);
 $('meta[property="og:title"],meta[name="twitter:title"]').attr('content',`${d[3]} | Begapunk`);
 $('meta[property="og:url"],link[rel="canonical"]').each((_,e)=>$(e).attr(e.name==='link'?'href':'content',canonical));
 $('meta[property="og:locale"]').attr('content', {de:'de_DE',fr:'fr_FR',ja:'ja_JP',ru:'ru_RU'}[lang]);
 $('link[hreflang]').remove();
 for (const code of ['en',...languages,'x-default']) $('head').append(`<link rel="alternate" hreflang="${code}" href="${base}${['en','x-default'].includes(code)?'':code+'/'}${route}">\n`);
 // Prefix only the source page's shared assets, before replacing localized chrome.
 $('[href],[src],[poster]').each((_,e)=>{for(const attr of ['href','src','poster']){const value=$(e).attr(attr);if(value && /^(images|css|js|downloads|videos)\//.test(value))$(e).attr(attr,'../'+value);}});
 $('header.header').replaceWith(template('header.header').prop('outerHTML').replaceAll('BP-8P-0001', 'BP-10P-0001'));
 $('footer').replaceWith(template('footer').prop('outerHTML'));
 $('.skip-link').replaceWith(template('.skip-link').prop('outerHTML'));
 const a=attributes[lang];
 ['.pd-gallery','.pd-info','.pd-jump-nav','.pd-key-specs','.pd-tabs'].forEach((s,i)=>$(s).attr('aria-label',a[i]));
 $('main img').each((_,e)=>{const src=$(e).attr('src');const index=src.includes('-hero')?5:src.includes('-rear')?6:src.includes('-detail')?7:8;$(e).attr('alt',`BP-10P-0001 ${a[index]}`);});
 $('meta[property="og:image:alt"]').attr('content',`BP-10P-0001 ${a[5]}`);
 $('video').attr('aria-label',`BP-10P-0001 ${a[9]}`);
 $('track').attr('label',a[10]);
 $('main a[href^="contact.html?"]').each((_,e)=>{const u=new URL($(e).attr('href'),canonical);u.searchParams.set('product',d[3]);u.searchParams.set('source',`${lang}/${route}`);$(e).attr('href',`contact.html${u.search}${u.hash}`);});
 $('.pd-share-option').each((_,e)=>{const u=new URL($(e).attr('href'));for(const key of ['url','u'])if(u.searchParams.has(key))u.searchParams.set(key,canonical);if(u.searchParams.has('text'))u.searchParams.set('text',`${d[3]} | Begapunk${u.hostname==='api.whatsapp.com'?' - '+canonical:''}`);$(e).attr('href',u.href);});
 const graph=JSON.parse($('script[type="application/ld+json"]').text());
 const p=graph['@graph'].find(o=>o['@type']==='Product');p.name=d[3];p.description=d[34];p.url=canonical;p.inLanguage=lang;
 p.additionalProperty=$('.spec-table tr').toArray().map(e=>({'@type':'PropertyValue',name:$(e).find('th').text(),value:$(e).find('td').text()}));
 const crumbs=graph['@graph'].find(o=>o['@type']==='BreadcrumbList').itemListElement;crumbs[0].name=d[0];crumbs[0].item=`${base}${lang}/`;crumbs[1].name=d[1];crumbs[1].item=`${base}${lang}/products.html`;crumbs[2].item=canonical;
 graph['@graph'].find(o=>o['@type']==='FAQPage').mainEntity=Array.from({length:5},(_,i)=>({'@type':'Question',name:d[110+i*2],acceptedAnswer:{'@type':'Answer',text:d[111+i*2]}}));
 graph['@graph'].find(o=>o['@type']==='FAQPage').inLanguage=lang;
 $('script[type="application/ld+json"]').text(JSON.stringify(graph));
 const output=$.html();const file=`${lang}/${route}`;
 if(!fs.existsSync(path.join(root,file))||read(file)!==output){changed++;if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,file),output);else console.error(`Outdated: ${file}`);}
}
console.log(`BP10 localized pages: ${changed} ${process.argv.includes('--write')?'written':'outdated'}.`);
if(changed&&!process.argv.includes('--write'))process.exitCode=1;
