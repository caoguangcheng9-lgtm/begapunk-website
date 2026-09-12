import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { Launcher } from 'chrome-launcher';

const root = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || '.');
const report = path.resolve(process.argv.find(a => a.startsWith('--report='))?.slice(9) || 'audit/website-experience/sitewide-layout.json');
const config = JSON.parse(await fs.readFile(new URL('../i18n/config.json', import.meta.url)));
async function manifestDigest(){try{return createHash('sha256').update(await fs.readFile(path.join(root,'manifest.sha256'))).digest('hex');}catch{return null;}}
const startingManifestSha256 = await manifestDigest();
const filter = process.argv.find(a => a.startsWith('--pages='))?.slice(8).split(',');
const baseline = process.argv.includes('--baseline');
const fallback = process.argv.includes('--fallback');
const widths = (process.argv.find(a => a.startsWith('--widths='))?.slice(9) || '390,1440').split(',').map(Number);
if (widths.some(w => !Number.isInteger(w) || w < 200 || w > 3840)) throw new Error('Invalid viewport widths.');
const routes = ['', ...config.activeLanguageCodes].flatMap(lang => (filter || config.pages).map(p => lang ? `${lang}/${p}` : p));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.ico':'image/x-icon', '.pdf':'application/pdf', '.mp4':'video/mp4' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let relative = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    const bytes = await fs.readFile(file);
    // Deliberately reproduce late navigation initialization on every route.
    if (relative === 'js/site-navigation.js') await new Promise(r => setTimeout(r, 500));
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: Launcher.getInstallations()[0], headless:true, args:['--disable-background-networking'] });
const jobs = routes.flatMap(route => fallback
  ? ['disabled', 'blocked'].map(mode => ({ route, width:390, height:844, mode }))
  : widths.map(width => ({route,width,height:width < 1280 ? 844 : 900,mode:width < 1280 ? 'mobile':'desktop'})));
let next = 0;
const results = [];
const startedAt = new Date().toISOString();
await fs.mkdir(path.dirname(report), {recursive:true});
const wait = ms => new Promise(r => setTimeout(r, ms));
async function worker() {
  while (next < jobs.length) {
    const job = jobs[next++];
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const result = {...job, failures:[], pageErrors:[], badResponses:[]};
    try {
      await page.setViewport({width:job.width,height:job.height});
      if (job.mode === 'disabled') await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = request.url();
        if (job.mode === 'blocked' && /\/js\/site-navigation\.js/.test(url)) return request.abort();
        if (request.method() !== 'GET' || (!url.startsWith(origin + '/') && !/^(data|blob):/.test(url))) return request.abort();
        request.continue();
      });
      page.on('pageerror', error => result.pageErrors.push(error.message));
      page.on('response', response => { if(response.url().startsWith(origin) && response.status() >= 400) result.badResponses.push({url:response.url().slice(origin.length),status:response.status()}); });
      await page.evaluateOnNewDocument(() => {
        window.__layout = [];
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__layout.push({time:entry.startTime,value:entry.value,recentInput:entry.hadRecentInput,sources:(entry.sources||[]).map(s=>({node:s.node?.id || s.node?.className || s.node?.tagName,from:s.previousRect.y,to:s.currentRect.y}))}); }).observe({type:'layout-shift',buffered:true});
      });
      const response = await page.goto(`${origin}/${job.route}`, {waitUntil:'load',timeout:30000});
      result.status = response.status();
      await wait(250);
      result.initial = await page.evaluate(() => ({
        shifts:window.__layout || [],
        overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
        h1:document.querySelectorAll('h1').length,
        title:document.title,
        mainTop:document.querySelector('main')?.getBoundingClientRect().top,
        languages:[...document.querySelectorAll('.i18n-switcher option')].map(e=>e.textContent.trim()),
      }));
      // Maximum session window, before any interaction; raw entries are retained.
      let start=0,last=0,sum=0,max=0;
      for(const e of result.initial.shifts){if(e.time-last>1000 || e.time-start>5000){start=e.time;sum=0;}sum+=e.value;last=e.time;max=Math.max(max,sum);}
      result.loadShiftScore=max;
      if(max>0.1) result.failures.push(`load-layout-shift:${max.toFixed(4)}`);
      if(result.initial.overflow>1) result.failures.push(`horizontal-overflow:${result.initial.overflow}`);
      if(result.initial.h1!==1) result.failures.push(`h1-count:${result.initial.h1}`);
      if(result.initial.languages.length!==5) result.failures.push('language-options');
      if(!baseline){
        // Trigger lazy images throughout the document; no links or forms sent.
        if (!fallback) await page.evaluate(async () => {
          document.documentElement.style.scrollBehavior='auto';
          for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>setTimeout(r,25));}
          await Promise.all([...document.images].filter(i=>i.complete===false).map(i=>Promise.race([new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}),new Promise(r=>setTimeout(r,1500))])));
          scrollTo(0,0);
        });
        result.brokenImages=await page.evaluate(()=>[...document.images].filter(i=>i.complete && !i.naturalWidth && i.getClientRects().length).map(i=>i.getAttribute('src')));
        if(result.brokenImages.length)result.failures.push('broken-images');
        if(job.width<1280){
          await page.click('#mobileToggle');
          await wait(60);
          result.menuOpen=await page.$eval('#mainNav', e=>getComputedStyle(e).display!=='none' && e.getBoundingClientRect().height>0);
          if(!result.menuOpen)result.failures.push('menu-does-not-open');
          if(fallback){
            await page.click('.nav-close');
          }else{
            await page.keyboard.press('Escape');
          }
          await wait(60);
          result.menuClosed=await page.$eval('#mainNav', e=>getComputedStyle(e).display==='none');
          if(!result.menuClosed)result.failures.push('menu-does-not-close');
        }
      }
      if(result.pageErrors.length)result.failures.push('javascript-error');
      if(result.badResponses.length)result.failures.push('asset-http-error');
    }catch(error){result.failures.push(error.message);}
    finally{await context.close();results.push(result);}
    if(results.length%40===0) console.log(`${results.length}/${jobs.length} checked; ${results.filter(r=>r.failures.length).length} cases with findings`);
  }
}
try{await Promise.all(Array.from({length:4},worker));}
finally{await browser.close();await new Promise(r=>server.close(r));}
const summary={startedAt,completedAt:new Date().toISOString(),root,baseline,fallback,pageCount:routes.length,caseCount:results.length,failingCases:results.filter(r=>r.failures.length).length,results:results.sort((a,b)=>a.route.localeCompare(b.route)||a.mode.localeCompare(b.mode))};
summary.startingManifestSha256 = startingManifestSha256;
summary.endingManifestSha256 = await manifestDigest();
summary.artifactChangedDuringRun = summary.startingManifestSha256 !== summary.endingManifestSha256;
await fs.writeFile(report,JSON.stringify(summary,null,2));
console.log(JSON.stringify({report,pageCount:summary.pageCount,caseCount:summary.caseCount,failingCases:summary.failingCases}));
if(summary.failingCases || summary.artifactChangedDuringRun)process.exitCode=1;
