import { readFileSync } from 'node:fs';
import { load } from 'cheerio';

// Emits scoped patches; never writes generated pages into the repository itself.
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const data = JSON.parse(read('i18n/manual/ptfe-o-ring-article.json'));
const route = data.route;
const origin = 'https://www.begapunk.com/';
const locales = ['en', 'de', 'fr', 'ja', 'ru'];
const prefix = code => code === 'en' ? '' : code + '/';
const hrefs = locales.concat('x-default').map(code => `<link rel="alternate" hreflang="${code}" href="${origin}${prefix(code === 'x-default' ? 'en' : code)}${route}">`).join('\n');
const [mode, code] = process.argv.slice(2);
const t = key => data.translations[code]?.[key] ?? data.source[key];
const dictionary = new Map(data.source.map((s, i) => [s, t(i)]));
const translate = value => dictionary.get(value) ?? value;
const transformJson = value => typeof value === 'string' ? translate(value) : Array.isArray(value) ? value.map(transformJson) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, transformJson(v)])) : value;
const pending = new Map();
const patch = (file, old, next, create = false) => {
  if (old === next) return '';
  const state = pending.get(file) || {original:create ? '' : read(file), next:create ? '' : read(file), create};
  if (create) state.next = next;
  else {
    if (!state.next.includes(old)) throw new Error('Patch source not found: '+file);
    state.next = state.next.replace(old,next);
  }
  pending.set(file,state);
  return '';
};
let changes = '';
if (mode === 'article') {
  const en = read(route);
  if (code === 'en') {
    const old = en.match(/  <link rel="alternate"[^\n]+>\r?\n  <link rel="alternate"[^\n]+>/)?.[0];
    if (!old) throw new Error('Expected English-only hreflang pair');
    changes += patch(route, old, hrefs);
    for (const lang of locales.slice(1)) changes += patch(route, `value="${lang}/blog.html"`, `value="${lang}/${route}"`);
  } else {
    const $ = load(en);
    function visit(node) {
      if (node.type === 'text' && node.data.trim()) node.data = node.data.replace(node.data.trim(), translate(node.data.trim()));
      if (node.name === 'script' || node.name === 'style') return;
      for (const child of node.children || []) visit(child);
    }
    $('head,main,.ptfe-skip-link').each((i,e) => visit(e));
    $('main [alt],main [aria-label],meta[content]').each((i,e) => {
      for (const attr of ['alt','aria-label','content']) if ($(e).attr(attr)) $(e).attr(attr, translate($(e).attr(attr)));
    });
    $('html').attr('lang', code);
    const url = origin + code + '/' + route;
    $('link[rel="canonical"]').attr('href', url);
    $('link[hreflang]').remove();
    $('head').append('\n' + hrefs + '\n');
    $('meta[property="og:url"]').attr('content', url);
    $('meta[property="og:locale"]').attr('content', {de:'de_DE',fr:'fr_FR',ja:'ja_JP',ru:'ru_RU'}[code]);
    $('script[type="application/ld+json"]').each((i,e) => {
      const schema = transformJson(JSON.parse($(e).text()));
      if (schema['@type'] === 'TechArticle') { schema.inLanguage = code; schema.mainEntityOfPage['@id'] = url; schema.mainEntityOfPage.inLanguage = code; }
      if (schema['@type'] === 'BreadcrumbList') schema.itemListElement.forEach((item,i) => { item.item = origin + code + '/' + ['', 'blog.html', route][i]; });
      $(e).text(JSON.stringify(schema));
    });
    $('[href],[src],[srcset]').each((i,e) => {
      for (const attr of ['href','src']) { const v=$(e).attr(attr); if (/^(images|css|js)\//.test(v || '')) $(e).attr(attr, '../'+v); }
      const set = $(e).attr('srcset'); if(set) $(e).attr('srcset', set.replace(/(^|,\s*)images\//g, '$1../images/'));
    });
    const shell = load(read(code + '/blog.html'));
    $('header.header').replaceWith(shell('header.header').toString());
    $('header.header a[aria-current="page"]').removeAttr('aria-current');
    $('footer.footer').replaceWith(shell('footer.footer').toString());
    $('.floating-cta').replaceWith(shell('.floating-cta').toString());
    $('.i18n-switcher option').each((i,e) => $(e).attr('value', $(e).attr('value').replace(/blog\.html$/, route)));
    const cta = $('.ptfe-review .btn');
    cta.attr('href', cta.attr('href').replace('source=' + route, 'source=' + code + '/' + route));
    changes += patch(code + '/' + route, '', $.html() + '\n', true);
  }
} else if (mode === 'blog') {
  const file = code + '/blog.html';
  const html = read(file);
  const $ = load(html);
  const en = load(read('blog.html'));
  const card = load(en('.blog-card').first().toString(), null, false);
  card('.blog-thumb').attr('aria-label', t(7));
  card('img').attr('src','../images/knowledge/ptfe-o-rings/coated-480.webp').attr('alt',t(61));
  card('.blog-tag').text(t(6)); card('h3 a').text(t(7)); card('.blog-body > p').text(t(8)); card('.date').text(t(49));
  const marker = html.match(/<div class="blog-grid"[^>]*>/)?.[0];
  if (!marker) throw new Error('Missing blog grid');
  changes += patch(file, marker, marker + '\n' + card.html());
  const el = $('script[type="application/ld+json"]').filter((i,e)=>JSON.parse($(e).text())['@type']==='Blog').first();
  const old = el.text(); const schema = JSON.parse(old);
  schema.blogPost.unshift({'@type':'BlogPosting',headline:t(7),description:t(8),url:origin+code+'/'+route,inLanguage:code});
  changes += patch(file, old, JSON.stringify(schema));
} else if (mode === 'index') {
  const file=prefix(code)+'search-index.json';const old=read(file);const records=JSON.parse(old);
  if(!records.some(r=>r.url===route)) records.push({id:'blog-ptfe-coated-o-rings',url:route,title:t(0),description:t(57),h1:t(7),h2s:[],body:'',keywords:[t(5),'PTFE'],category:'blog',tags:['blog','technical']});
  changes += patch(file,old.trimEnd(),JSON.stringify(records,null,2));
} else if (mode === 'discovery') {
  const file=prefix(code)+'llms.txt';const old=read(file).trimEnd();
  const link=`- [${t(7)}](${origin}${prefix(code)}${route}): ${t(57)}`;
  if(!old.includes(origin+prefix(code)+route)) changes+=patch(file,old,old+'\n'+link);
  if(code!=='en') {
    const intro={
      de:'Entdecken Sie Funktionsprinzipien, Dichtungsoptionen und praktische Hinweise zur Auswahl und Montage von Drehdurchführungen.',
      fr:'Découvrez les principes de fonctionnement, les options d’étanchéité et les conseils pratiques pour choisir et installer un raccord tournant.',
      ja:'ロータリージョイントの作動原理、シールの選択肢、選定と取付に役立つ実務的な情報を紹介します。',
      ru:'Принципы работы, варианты уплотнений и практические рекомендации по выбору и монтажу вращающихся соединений.'
    }[code];
    const blogFile=code+'/blog.html',blog=load(read(blogFile));
    const p=blog('.blog-grid').parent().find('p').first();
    changes+=patch(blogFile,p.html(),intro);
    const additions={
      [`<a href="${route}" style="display:block;">${data.source[7]}</a>`]:`<a href="${route}" style="display:block;">${t(7)}</a>`,
      'Application-based selection':t(49),
      'Blue PTFE-coated O-rings for an optional rotary union seal configuration':t(61),
      'Explore an optional surface treatment for O-rings used with composite slipper seals, with process photos and a supplier coating thickness report.':t(8),
      'Explore operating principles, seal options, and practical guidance for rotary joint selection and installation.':intro,
      'Read about optional PTFE-coated O-rings for rotary unions':t(7),
      'Seal Options':t(6)
    };
    const overrideFile='i18n/overrides/'+code+'.json';const oldOverrides=read(overrideFile);
    const entries=JSON.stringify(additions,null,2).split('\n').slice(1,-1).join('\n');
    changes+=patch(overrideFile,'{','{\n'+entries+',');
  }
} else throw new Error('Unknown mode');
for (const [file,state] of pending) {
  if(state.create) { changes += `*** Add File: ${file}\n${state.next.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n`; continue; }
  const a=state.original.replace(/\r\n/g,'\n').trimEnd().split('\n');
  const b=state.next.replace(/\r\n/g,'\n').trimEnd().split('\n');
  let start=0,endA=a.length,endB=b.length;
  while(start<endA && start<endB && a[start]===b[start])start++;
  while(endA>start && endB>start && a[endA-1]===b[endB-1]){endA--;endB--;}
  if(start===endA && start===endB)continue;
  const before=a.slice(Math.max(0,start-1),start).map(l=>' '+l);
  const after=a.slice(endA,Math.min(a.length,endA+1)).map(l=>' '+l);
  changes+=`*** Update File: ${file}\n@@\n`+[...before,...a.slice(start,endA).map(l=>'-'+l),...b.slice(start,endB).map(l=>'+'+l),...after].join('\n')+'\n';
}
process.stdout.write('*** Begin Patch\n' + changes + '*** End Patch\n');
