import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languages = [
  { code: 'en', directory: '' },
  ...config.activeLanguageCodes.map((code) => ({ code, directory: code })),
];

const homeContracts = {
  en: {
    badge: 'Pneumatic Rotary Unions | Standard & Custom',
    description: 'Standard and custom pneumatic rotary joints for CNC, packaging, filling, laser cutting, and automation equipment. STEP/IGES files may be provided for qualified projects after model and application review; format and timing are confirmed per project.',
    sectionTitle: 'Find by Application',
    comparisonLabel: 'Model Comparison',
    tags: ['1-8 passages', 'Air / hydraulic oil', 'Threaded / flange'],
    applications: [
      ['application-laser-tube-cutting.html', 'Laser tube rear chuck', 'Compressed-air transfer; verify circuits and interfaces'],
      ['application-packaging-machinery.html', 'Packaging Lines', 'Rotary sealers and mandrels'],
      ['application-bottle-filling-capping.html', 'Bottle Filling', 'Air distribution on rotary turrets'],
      ['application-automation-rotary-tables.html', 'Rotary Tables', 'Pneumatic fixtures and tooling'],
    ],
  },
  de: {
    badge: 'Pneumatische Drehdurchführungen | Standard & kundenspezifisch',
    description: 'Standard- und kundenspezifische pneumatische Drehdurchführungen für CNC-Maschinen, Verpackungs- und Abfüllanlagen, Laserschneidmaschinen und Automatisierungstechnik. STEP-/IGES-Dateien können nach Prüfung von Modell und Anwendung für qualifizierte Projekte bereitgestellt werden; Dateiformat und Bereitstellungszeitpunkt werden projektspezifisch bestätigt.',
    sectionTitle: 'Nach Anwendung auswählen',
    comparisonLabel: 'Modellvergleich',
    tags: ['1-8 Kanäle', 'Luft / Hydrauliköl', 'Gewinde / Flansch'],
    applications: [
      ['application-laser-tube-cutting.html', 'Laserrohrschneiden', 'Druckluftübertragung zum hinteren Spannfutter'],
      ['application-packaging-machinery.html', 'Verpackungsmaschinen', 'Rotierende Siegelköpfe und Dorne'],
      ['application-bottle-filling-capping.html', 'Abfüllanlagen', 'Luftverteilung auf rotierenden Karussells'],
      ['application-automation-rotary-tables.html', 'Rundtische', 'Pneumatische Vorrichtungen und Spanntechnik'],
    ],
  },
  ja: {
    badge: '空圧ロータリージョイント｜標準品・特注品',
    description: '工作機械、包装機、充填機、レーザー加工機、自動化設備向けに、標準品および特注の空圧ロータリージョイントを提供します。STEP/IGESデータは、型式および用途の確認後、対象となる案件に提供できる場合があり、ファイル形式と提供時期は案件ごとに確定します。',
    sectionTitle: '用途から探す',
    comparisonLabel: '機種選定表',
    tags: ['1～8流路', 'エア・作動油', 'ねじ取付・フランジ取付'],
    applications: [
      ['application-laser-tube-cutting.html', 'レーザー管切断機', '後側チャックへの圧縮空気供給'],
      ['application-packaging-machinery.html', '包装機械', '回転シール部・マンドレルへの流体供給'],
      ['application-bottle-filling-capping.html', 'ボトル充填', '回転タレットへのエア供給'],
      ['application-automation-rotary-tables.html', '回転テーブル', '空圧治具・クランプ回路への供給'],
    ],
  },
  ru: {
    badge: 'Пневматические соединения | Стандартные и на заказ',
    description: 'Стандартные и индивидуальные пневматические ротационные соединения для станков с ЧПУ, упаковочных и разливочных машин, лазерных станков и систем автоматизации. Файлы STEP/IGES могут быть предоставлены для проектов после проверки модели и условий применения; формат и срок предоставления согласовываются для каждого проекта.',
    sectionTitle: 'Выбор по применению',
    comparisonLabel: 'Сравнение моделей',
    tags: ['1-8 проходов', 'Воздух / гидравлическое масло', 'Резьба / фланец'],
    applications: [
      ['application-laser-tube-cutting.html', 'Лазерная резка труб', 'Подача сжатого воздуха к заднему патрону'],
      ['application-packaging-machinery.html', 'Упаковочные машины', 'Ротационные запайщики и оправки'],
      ['application-bottle-filling-capping.html', 'Разливочные машины', 'Подача воздуха на вращающиеся карусели'],
      ['application-automation-rotary-tables.html', 'Поворотные столы', 'Пневматическая оснастка и зажимные контуры'],
    ],
  },
};

function compact(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

const softIsolationRoutes = new Set([
  'application-packaging-machinery.html',
  'application-bottle-filling-capping.html',
  'blog-rotary-joint-leaking.html',
  'application-automation-rotary-tables.html',
  'application-pneumatic-tools-hose-anti-twist.html',
  'blog-seal-replacement.html',
  'blog-threaded-vs-flange.html',
  'application-robot-end-of-arm-tooling.html',
  'blog-rotary-joint-materials.html',
]);

const changedStylesheets = new Map([
  ['case-studies.css', '20260817-case-bundle1'],
  ['application-case.css', '20260814-hero1'],
  ['manufacturing-quality.css', '20260814-hero1'],
  ['production-inspection-testing.css', '20260814-hero1'],
  ['contact-rfq.css', '20260814-hero1'],
]);

function contractFor(route) {
  if (route === 'index.html') return { family: 'home-feature', selector: '.hero-deublin' };
  if (/^BP-[A-Z0-9-]+\.html$/i.test(route)) return { family: 'product-detail', selector: '.pd-info' };
  if (route === 'search.html') return { family: 'search-utility', selector: '.search-hero' };
  if (route === '404.html') return { family: 'outcome-utility', selector: '.err-container' };
  if (route === 'thank-you.html') return { family: 'outcome-utility', selector: '.thank-you-section' };
  if (route === 'manufacturing-quality.html') return { family: 'quality-feature', selector: '.mq-hero' };
  if (route === 'production-inspection-testing.html') return { family: 'quality-feature', selector: '.pit-hero' };
  if (route === 'contact.html') return { family: 'rfq-feature', selector: '.bp-rfq-hero' };
  if (route.startsWith('case-') || route === 'case-studies.html') return { family: 'case-feature', selector: '.cs-hero' };
  if (route === 'products.html' || route === 'products-p2.html' || route === 'product-comparison.html') {
    return { family: 'standard-dark', selector: '.products-hero' };
  }
  if (route === 'applications.html' || route.startsWith('application-')) return { family: 'standard-dark', selector: '.app-hero' };
  if (route === 'blog.html' || route.startsWith('blog-')) return { family: 'standard-dark', selector: '.blog-hero' };
  if (route === 'installation.html') return { family: 'standard-dark', selector: '.install-hero' };
  if (route === 'about.html') return { family: 'standard-dark', selector: '.about-hero' };
  if (route === 'faq.html') return { family: 'standard-dark', selector: '.faq-hero' };
  if (route === 'privacy.html' || route === 'terms.html') return { family: 'standard-dark', selector: '.legal-hero' };
  throw new Error(`No page-hero contract for ${route}`);
}

const failures = [];
const familyCounts = new Map();
let checkedPages = 0;

for (const language of languages) {
  for (const route of config.pages) {
    const relativePath = language.directory ? path.join(language.directory, route) : route;
    const normalizedPath = relativePath.replaceAll('\\', '/');
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const $ = load(html);
    const contract = contractFor(route);
    const hero = $(contract.selector);
    checkedPages += 1;
    familyCounts.set(contract.family, (familyCounts.get(contract.family) ?? 0) + 1);

    if (hero.length !== 1) {
      failures.push(`${language.code}/${route}: expected one ${contract.selector}, found ${hero.length}.`);
      continue;
    }
    if (hero.find('h1').length !== 1) {
      failures.push(`${language.code}/${route}: ${contract.selector} must contain exactly one h1.`);
    }
    if ($('h1').length !== 1) {
      failures.push(`${language.code}/${route}: page must contain exactly one h1, found ${$('h1').length}.`);
    }

    if (route === 'index.html') {
      const expected = homeContracts[language.code];
      const badge = hero.find('.hero-badge');
      if (badge.length !== 1 || compact(badge.text()) !== expected.badge) {
        failures.push(`${language.code}/${route}: homepage badge must be exactly ${JSON.stringify(expected.badge)}.`);
      }
      const description = hero.find('.hero-def');
      if (description.length !== 1 || compact(description.text()) !== expected.description) {
        failures.push(`${language.code}/${route}: homepage description must preserve the approved concise copy and CAD qualification.`);
      }
      if (hero.find('.hero-sub, .hero-stats, .hero-application-strip, .tag-step').length !== 0) {
        failures.push(`${language.code}/${route}: retired hero copy, proof points, application strip, or CAD image tag remain.`);
      }

      const tagTexts = hero.find('.hero-spec-tag').map((_, node) => compact($(node).text())).get();
      if (JSON.stringify(tagTexts) !== JSON.stringify(expected.tags)) {
        failures.push(`${language.code}/${route}: homepage image tags must be exactly ${JSON.stringify(expected.tags)}, found ${JSON.stringify(tagTexts)}.`);
      }

      const applicationSection = $('.home-application-paths');
      if (applicationSection.length !== 1) {
        failures.push(`${language.code}/${route}: expected one application-path section, found ${applicationSection.length}.`);
      } else {
        const heroNode = hero.get(0);
        const applicationNode = applicationSection.get(0);
        const firstApplicationAfterHero = hero.nextAll('.home-application-paths').first().get(0);
        const firstProductSectionAfterApplications = applicationSection.nextAll('.portal-section').first().get(0);
        if (firstApplicationAfterHero !== applicationNode || !firstProductSectionAfterApplications) {
          failures.push(`${language.code}/${route}: application paths must sit outside the hero and before the product section.`);
        }
        if (heroNode && hero.find('.home-application-card').length) {
          failures.push(`${language.code}/${route}: application cards must not remain inside the hero.`);
        }
        const sectionTitle = applicationSection.find('#home-application-title');
        if (sectionTitle.length !== 1 || compact(sectionTitle.text()) !== expected.sectionTitle) {
          failures.push(`${language.code}/${route}: application section title must be exactly ${JSON.stringify(expected.sectionTitle)}.`);
        }
        const cards = applicationSection.find('.home-application-card');
        if (cards.length !== expected.applications.length) {
          failures.push(`${language.code}/${route}: expected ${expected.applications.length} application cards, found ${cards.length}.`);
        }
        cards.each((index, card) => {
          const expectedCard = expected.applications[index];
          if (!expectedCard) return;
          const node = $(card);
          const actual = [
            node.attr('href') ?? '',
            compact(node.find('.home-application-copy > strong').text()),
            compact(node.find('.home-application-copy > small').text()),
          ];
          if (JSON.stringify(actual) !== JSON.stringify(expectedCard)) {
            failures.push(`${language.code}/${route}: application card ${index + 1} must be exactly ${JSON.stringify(expectedCard)}, found ${JSON.stringify(actual)}.`);
          }
          if (node.find('.home-application-icon[aria-hidden="true"] > svg').length !== 1) {
            failures.push(`${language.code}/${route}: application card ${index + 1} must contain one decorative inline icon.`);
          }
        });
        if (cards.first().attr('data-laser-rear-chuck-entry') !== 'compact') {
          failures.push(`${language.code}/${route}: laser rear-chuck compact-entry tracking contract is missing.`);
        }
      }
      if ($('.portal-search, .portal-search-grid, .portal-search-form, .portal-search-tab, .portal-part-link').length !== 0) {
        failures.push(`${language.code}/${route}: retired homepage search bar remains.`);
      }
      const productHeading = $('.portal-section').first().find('.portal-heading');
      const comparisonLink = productHeading.find('a[href="product-comparison.html"]');
      if (productHeading.length !== 1 || comparisonLink.length !== 1 || compact(comparisonLink.text()) !== expected.comparisonLabel) {
        failures.push(`${language.code}/${route}: product heading must contain one localized model-comparison link.`);
      }
      if (productHeading.find('a[href="products.html"]').length !== 0) {
        failures.push(`${language.code}/${route}: retired new-products link remains in the product heading.`);
      }
    }

    if (route === 'products.html') {
      const selectionSection = $('.product-compare-cta-section');
      const filterSection = $('.filter-bar');
      const productSection = $('.products-section');
      if (selectionSection.length !== 1 || filterSection.length !== 1 || productSection.length !== 1) {
        failures.push(`${language.code}/${route}: expected one selection CTA, filter bar, and product grid section.`);
      } else {
        const selectionAfterHero = hero.nextAll('.product-compare-cta-section').first().get(0);
        const filterAfterSelection = selectionSection.nextAll('.filter-bar').first().get(0);
        const productsAfterFilter = filterSection.nextAll('.products-section').first().get(0);
        if (selectionAfterHero !== selectionSection.get(0) || filterAfterSelection !== filterSection.get(0) || productsAfterFilter !== productSection.get(0)) {
          failures.push(`${language.code}/${route}: selection CTA, filter bar, and product grid must follow the approved order.`);
        }
      }
    }

    if (softIsolationRoutes.has(route)) {
      if ($('.soft-isolation-hero').length !== 1 || !hero.hasClass('soft-isolation-hero')) {
        failures.push(`${language.code}/${route}: soft-isolation title must use one dedicated hero.`);
      }
    } else if ($('.soft-isolation-hero').length !== 0) {
      failures.push(`${language.code}/${route}: unexpected soft-isolation hero.`);
    }

    const inlineCss = $('style').map((_, node) => $(node).html() ?? '').get().join('\n');
    if (/\.(?:app|blog)-hero(?:\s|[.#:{>])/i.test(inlineCss)) {
      failures.push(`${language.code}/${route}: legacy inline app/blog hero CSS is not allowed.`);
    }

    const stylesheetHrefs = $('link[rel="stylesheet"]').map((_, node) => $(node).attr('href') ?? '').get();
    const sharedStylesheetHrefs = stylesheetHrefs.filter((href) => /(?:^|\/)css\/style\.css(?:\?|$)/.test(href));
    if (sharedStylesheetHrefs.length !== 1) {
      failures.push(`${language.code}/${route}: expected one shared css/style.css link, found ${sharedStylesheetHrefs.length}.`);
    }
    for (const href of stylesheetHrefs) {
      const pathname = href.split('?')[0];
      const filename = path.posix.basename(pathname);
      const expectedVersion = changedStylesheets.get(filename);
      if (expectedVersion && !href.endsWith(`${filename}?v=${expectedVersion}`)) {
        failures.push(`${language.code}/${route}: ${filename} cache key is not ${expectedVersion}.`);
      }
    }
  }
}

if (checkedPages !== config.pages.length * languages.length) {
  failures.push(`Expected ${config.pages.length * languages.length} localized pages, checked ${checkedPages}.`);
}
if (softIsolationRoutes.size * languages.length !== 36) {
  failures.push('Soft-isolation contract must cover exactly 36 localized pages.');
}

const stylesheetContracts = [
  ['css/style.css', /--page-hero-background:/, /--page-hero-title-size:/, /UNIFIED INNER-PAGE HERO SYSTEM/, /\.home-application-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s, /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.home-application-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.home-application-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s],
  ['css/case-studies.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/application-case.css', /padding:\s*var\(--page-hero-padding\)/],
  ['css/manufacturing-quality.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/production-inspection-testing.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
  ['css/contact-rfq.css', /background:\s*var\(--page-hero-background\)/, /font-size:\s*var\(--page-hero-title-size\)/],
];

for (const [relativePath, ...patterns] of stylesheetContracts) {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const pattern of patterns) {
    if (!pattern.test(content)) failures.push(`${relativePath}: missing page-hero contract ${pattern}.`);
  }
  if (relativePath === 'css/style.css' && /\.hero-(?:stats|application-strip)|\.tag-step/.test(content)) {
    failures.push('css/style.css: retired homepage stats, application-strip, or CAD-tag styles remain.');
  }
  if (relativePath === 'css/style.css' && /\.portal-(?:search(?:-grid|-tab|-form)?|part-link)/.test(content)) {
    failures.push('css/style.css: retired homepage search-bar styles remain.');
  }
}

if (failures.length > 0) {
  console.error(`Page-hero verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Page-hero verification passed: ${checkedPages} pages; ${[...familyCounts.entries()].map(([family, count]) => `${family}=${count}`).join(', ')}.`);
