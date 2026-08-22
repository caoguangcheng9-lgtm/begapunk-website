import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languages = [config.sourceLanguage.code, ...config.activeLanguageCodes];

const copy = {
  en: {
    home: 'Home', products: 'Products', productLinks: [['products.html', 'Product Catalog'], ['product-comparison.html', 'Model Comparison'], ['contact.html', 'Custom RFQ']],
    applications: 'Applications', applicationLinks: [['applications.html', 'Applications Overview'], ['case-studies.html', 'Case Studies'], ['application-laser-tube-cutting.html', 'Laser Tube Cutting'], ['application-packaging-machinery.html', 'Packaging Machinery'], ['application-bottle-filling-capping.html', 'Bottle Filling &amp; Capping'], ['application-cnc-pneumatic-clamping.html', 'CNC Pneumatic Clamping']],
    quality: 'Quality', qualityLinks: [['manufacturing-quality.html', 'Manufacturing &amp; Quality'], ['production-inspection-testing.html', '100% Leak Testing']],
    knowledge: 'Knowledge Center', knowledgeLinks: [['blog.html', 'Technical Blog'], ['blog-rotary-joint-selection.html', 'Selection Guide'], ['blog-rotary-union-seal-types.html', 'Sealing Technology'], ['installation.html', 'Installation Guide'], ['faq.html', 'FAQ']],
    about: 'About', quote: 'Get a Quote', footerTitles: ['Products', 'Applications', 'Knowledge Center', 'Company'],
    companyLinks: [['about.html', 'About / Factory'], ['manufacturing-quality.html', 'Manufacturing &amp; Quality'], ['production-inspection-testing.html', '100% Leak Testing'], ['contact.html', 'Contact']],
  },
  de: {
    home: 'Startseite', products: 'Produkte', productLinks: [['products.html', 'Produktübersicht'], ['product-comparison.html', 'Modellvergleich'], ['contact.html', 'Sonderausführung &amp; Angebot']],
    applications: 'Anwendungen', applicationLinks: [['applications.html', 'Anwendungsübersicht'], ['case-studies.html', 'Fallstudien'], ['application-laser-tube-cutting.html', 'Laserröhrenschneiden'], ['application-packaging-machinery.html', 'Verpackungsmaschinen'], ['application-bottle-filling-capping.html', 'Füllen und Verschließen von Flaschen'], ['application-cnc-pneumatic-clamping.html', 'CNC-Pneumatikspannen']],
    quality: 'Qualität', qualityLinks: [['manufacturing-quality.html', 'Fertigung &amp; Qualität'], ['production-inspection-testing.html', '100%-Dichtheitsprüfung']],
    knowledge: 'Wissenszentrum', knowledgeLinks: [['blog.html', 'Technischer Blog'], ['blog-rotary-joint-selection.html', 'Auswahlleitfaden'], ['blog-rotary-union-seal-types.html', 'Dichtungstechnik'], ['installation.html', 'Montageanleitung'], ['faq.html', 'FAQ']],
    about: 'Unternehmen', quote: 'Angebot anfordern', footerTitles: ['Produkte', 'Anwendungen', 'Wissenszentrum', 'Unternehmen'],
    companyLinks: [['about.html', 'Unternehmen / Werk'], ['manufacturing-quality.html', 'Fertigung &amp; Qualität'], ['production-inspection-testing.html', '100%-Dichtheitsprüfung'], ['contact.html', 'Kontakt']],
  },
  ja: {
    home: 'ホーム', products: '製品情報', productLinks: [['products.html', '製品一覧'], ['product-comparison.html', '機種選定表'], ['contact.html', '特注品・見積依頼']],
    applications: '用途別情報', applicationLinks: [['applications.html', '用途一覧'], ['case-studies.html', '選定事例'], ['application-laser-tube-cutting.html', 'レーザー管切断機'], ['application-packaging-machinery.html', '包装機械'], ['application-bottle-filling-capping.html', 'ボトル充填・キャッピング機'], ['application-cnc-pneumatic-clamping.html', 'CNC空圧クランプ']],
    quality: '品質管理', qualityLinks: [['manufacturing-quality.html', '製造・品質管理'], ['production-inspection-testing.html', '全数漏れ検査']],
    knowledge: '技術情報', knowledgeLinks: [['blog.html', '技術資料'], ['blog-rotary-joint-selection.html', '選定ガイド'], ['blog-rotary-union-seal-types.html', 'シール技術'], ['installation.html', '取付要領'], ['faq.html', 'よくある質問']],
    about: '会社情報', quote: '見積もり・技術相談', footerTitles: ['製品情報', '用途別情報', '技術情報', '会社情報'],
    companyLinks: [['about.html', '会社・工場情報'], ['manufacturing-quality.html', '製造・品質管理'], ['production-inspection-testing.html', '全数漏れ検査'], ['contact.html', 'お問い合わせ']],
  },
  ru: {
    home: 'Главная', products: 'Продукция', productLinks: [['products.html', 'Каталог продукции'], ['product-comparison.html', 'Сравнение моделей'], ['contact.html', 'Специальное исполнение и запрос']],
    applications: 'Применение', applicationLinks: [['applications.html', 'Обзор применений'], ['case-studies.html', 'Примеры применения'], ['application-laser-tube-cutting.html', 'Лазерная резка труб'], ['application-packaging-machinery.html', 'Упаковочные машины'], ['application-bottle-filling-capping.html', 'Розлив и укупорка бутылок'], ['application-cnc-pneumatic-clamping.html', 'Пневматический зажим с ЧПУ']],
    quality: 'Качество', qualityLinks: [['manufacturing-quality.html', 'Производство и качество'], ['production-inspection-testing.html', '100%-ный контроль герметичности']],
    knowledge: 'Центр знаний', knowledgeLinks: [['blog.html', 'Технический блог'], ['blog-rotary-joint-selection.html', 'Руководство по выбору'], ['blog-rotary-union-seal-types.html', 'Технология уплотнений'], ['installation.html', 'Инструкция по монтажу'], ['faq.html', 'Часто задаваемые вопросы']],
    about: 'О компании', quote: 'Запросить предложение', footerTitles: ['Продукция', 'Применение', 'Центр знаний', 'Компания'],
    companyLinks: [['about.html', 'О компании / Производство'], ['manufacturing-quality.html', 'Производство и качество'], ['production-inspection-testing.html', '100%-ный контроль герметичности'], ['contact.html', 'Контакты']],
  },
};

const footerCopy = {
  en: {
    positioning: 'Precision rotary joint manufacturer based in Ningbo, China. Supporting industrial automation OEMs and machine builders.',
    address: 'Ningbo, Zhejiang, China', quote: 'Request an Engineering Quote', socialTitle: 'Follow Begapunk',
    navigationLabel: 'Footer navigation', legalLabel: 'Legal information',
    titles: ['Products & Selection', 'Applications & Cases', 'Quality & Factory', 'Technical Support'],
    links: [
      [['products.html', 'Product Catalog'], ['product-comparison.html', 'Model Comparison']],
      [['case-studies.html', 'Real Application Cases'], ['application-laser-tube-cutting.html', 'Laser Tube Cutting'], ['application-packaging-machinery.html', 'Packaging Machinery'], ['application-bottle-filling-capping.html', 'Bottle Filling & Capping'], ['applications.html', 'All Applications']],
      [['manufacturing-quality.html', 'Manufacturing & Quality'], ['production-inspection-testing.html', '100% Leak Testing'], ['about.html', 'Company & Factory']],
      [['blog-rotary-joint-selection.html', 'Selection Guide'], ['installation.html', 'Installation Guide'], ['faq.html', 'FAQ'], ['contact.html', 'Contact']],
    ],
    privacy: 'Privacy', terms: 'Terms',
    copyright: '© 2026 Ningbo Begapunk Pneumatic Components Co., Ltd. All rights reserved.',
    socialLabels: ['G. C. Cao on LinkedIn', 'Begapunk on YouTube', 'Begapunk on Facebook', 'Begapunk on X'],
  },
  de: {
    positioning: 'Hersteller von Präzisionsdrehdurchführungen mit Sitz in Ningbo, China. Unterstützung für OEMs und Maschinenbauer in der Industrieautomation.',
    address: 'Ningbo, Zhejiang, China', quote: 'Technische Anfrage senden', socialTitle: 'Begapunk folgen',
    navigationLabel: 'Fußzeilennavigation', legalLabel: 'Rechtliche Informationen',
    titles: ['Produkte & Auswahl', 'Anwendungen & Praxisbeispiele', 'Qualität & Werk', 'Technischer Support'],
    links: [
      [['products.html', 'Produktkatalog'], ['product-comparison.html', 'Modellvergleich']],
      [['case-studies.html', 'Reale Anwendungsbeispiele'], ['application-laser-tube-cutting.html', 'Laser-Rohrschneiden'], ['application-packaging-machinery.html', 'Verpackungsmaschinen'], ['application-bottle-filling-capping.html', 'Flaschenfüllen & Verschließen'], ['applications.html', 'Alle Anwendungen']],
      [['manufacturing-quality.html', 'Fertigung & Qualität'], ['production-inspection-testing.html', '100%-Dichtheitsprüfung'], ['about.html', 'Unternehmen & Werk']],
      [['blog-rotary-joint-selection.html', 'Auswahlleitfaden'], ['installation.html', 'Montageanleitung'], ['faq.html', 'FAQ'], ['contact.html', 'Kontakt']],
    ],
    privacy: 'Datenschutz', terms: 'Nutzungsbedingungen',
    copyright: '© 2026 Ningbo Begapunk Pneumatic Components Co., Ltd. Alle Rechte vorbehalten.',
    socialLabels: ['G. C. Cao auf LinkedIn', 'Begapunk auf YouTube', 'Begapunk auf Facebook', 'Begapunk auf X'],
  },
  ja: {
    positioning: '中国・寧波の産業用ロータリージョイントメーカーです。産業オートメーションのOEM・装置メーカーを支援します。',
    address: '中国 浙江省 寧波市', quote: '見積もり・技術相談', socialTitle: 'Begapunk公式SNS',
    navigationLabel: 'フッターナビゲーション', legalLabel: '法的情報',
    titles: ['製品・選定', '用途・実機組込み事例', '品質・工場', '技術サポート'],
    links: [
      [['products.html', '製品一覧'], ['product-comparison.html', '機種選定表']],
      [['case-studies.html', '実機組込み事例'], ['application-laser-tube-cutting.html', 'レーザー管切断機'], ['application-packaging-machinery.html', '包装機械'], ['application-bottle-filling-capping.html', 'ボトル充填・キャッピング機'], ['applications.html', '用途一覧']],
      [['manufacturing-quality.html', '製造・品質管理'], ['production-inspection-testing.html', '全数漏れ検査'], ['about.html', '会社・工場情報']],
      [['blog-rotary-joint-selection.html', '選定ガイド'], ['installation.html', '取付要領'], ['faq.html', 'よくある質問'], ['contact.html', 'お問い合わせ']],
    ],
    privacy: 'プライバシーポリシー', terms: '利用規約',
    copyright: '© 2026 Ningbo Begapunk Pneumatic Components Co., Ltd. All rights reserved.',
    socialLabels: ['G. C. CaoのLinkedIn個人プロフィール', 'Begapunk公式YouTube', 'Begapunk公式Facebook', 'Begapunk公式X'],
  },
  ru: {
    positioning: 'Begapunk — производитель прецизионных вращающихся соединений в Нинбо, Китай. Мы работаем с производителями промышленного оборудования и систем автоматизации.',
    address: 'Нинбо, Чжэцзян, Китай', quote: 'Отправить технический запрос', socialTitle: 'Begapunk в социальных сетях',
    navigationLabel: 'Навигация в нижней части страницы', legalLabel: 'Правовая информация',
    titles: ['Продукция и подбор', 'Применение и примеры', 'Качество и производство', 'Техническая поддержка'],
    links: [
      [['products.html', 'Каталог продукции'], ['product-comparison.html', 'Сравнение моделей']],
      [['case-studies.html', 'Реальные примеры применения'], ['application-laser-tube-cutting.html', 'Лазерная резка труб'], ['application-packaging-machinery.html', 'Упаковочные машины'], ['application-bottle-filling-capping.html', 'Розлив и укупорка бутылок'], ['applications.html', 'Все области применения']],
      [['manufacturing-quality.html', 'Производство и качество'], ['production-inspection-testing.html', '100%-ный контроль герметичности'], ['about.html', 'О компании и производстве']],
      [['blog-rotary-joint-selection.html', 'Руководство по выбору'], ['installation.html', 'Инструкция по монтажу'], ['faq.html', 'Часто задаваемые вопросы'], ['contact.html', 'Контакты']],
    ],
    privacy: 'Политика конфиденциальности', terms: 'Условия использования',
    copyright: '© 2026 Ningbo Begapunk Pneumatic Components Co., Ltd. Все права защищены.',
    socialLabels: ['G. C. Cao в LinkedIn', 'Begapunk на YouTube', 'Begapunk на Facebook', 'Begapunk в X'],
  },
};

const legalCompanyName = 'Ningbo Begapunk Pneumatic Components Co., Ltd.';
const styleVersion = '20260817-cls1';
const homepageStyleVersion = '20260819-home-clean1';
const socialLinks = [
  ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/guangcheng-cao/'],
  ['youtube', 'YouTube', 'https://www.youtube.com/@BEGAPUNKRotaryJointsTV'],
  ['facebook', 'Facebook', 'https://www.facebook.com/profile.php?id=61591616523667'],
  ['x', 'X', 'https://x.com/Begapunk728'],
];

const productPages = new Set(['products.html', 'products-p2.html', 'product-comparison.html', ...config.pages.filter((page) => /^BP-/.test(page))]);
const applicationPages = new Set(['applications.html', ...config.pages.filter((page) => /^application-/.test(page) || /^case(?:-|studies)/.test(page))]);
const qualityPages = new Set(['manufacturing-quality.html', 'production-inspection-testing.html']);
const knowledgePages = new Set(['installation.html', 'faq.html', 'blog.html', ...config.pages.filter((page) => /^blog-/.test(page))]);

function pageCategory(page) {
  if (productPages.has(page)) return 'products';
  if (applicationPages.has(page)) return 'applications';
  if (qualityPages.has(page)) return 'quality';
  if (knowledgePages.has(page)) return 'knowledge';
  if (page === 'about.html') return 'about';
  return page === 'index.html' ? 'home' : '';
}

function menuLinks(items, currentPage = '') {
  return items.map(([href, label]) => `      <a href="${href}"${href === currentPage ? ' aria-current="page"' : ''}>${label}</a>`).join('\n');
}

function dropdown(href, label, items, active, page) {
  const current = page === href ? ' aria-current="page"' : '';
  return `    <div class="nav-dropdown">\n     <a href="${href}" class="nav-dropdown-toggle${active ? ' active' : ''}"${current}>${label} <span class="chevron"></span></a>\n     <div class="nav-dropdown-menu">\n${menuLinks(items, active ? page : '')}\n     </div>\n    </div>`;
}

function navMarkup(language, page) {
  const t = copy[language];
  const active = pageCategory(page);
  return `<nav class="nav" id="mainNav">\n    <a href="index.html" class="nav-home-mobile${active === 'home' ? ' active' : ''}"${active === 'home' ? ' aria-current="page"' : ''}>${t.home}</a>\n${dropdown('products.html', t.products, t.productLinks.slice(1), active === 'products', page)}\n${dropdown('applications.html', t.applications, t.applicationLinks.slice(1), active === 'applications', page)}\n${dropdown('manufacturing-quality.html', t.quality, t.qualityLinks.slice(1), active === 'quality', page)}\n${dropdown('blog.html', t.knowledge, t.knowledgeLinks.slice(1), active === 'knowledge', page)}\n    <a href="about.html" class="nav-about${active === 'about' ? ' active' : ''}"${active === 'about' ? ' aria-current="page"' : ''}>${t.about}</a>\n    <a href="contact.html" class="nav-cta"${page === 'contact.html' ? ' aria-current="page"' : ''}>${t.quote}</a>\n   </nav>`;
}

function removeLegacyMobileListeners(html) {
  const listenerBlock = /\s*if\s*\(\s*mobileToggle\s*&&\s*mainNav\s*\)\s*\{\s*mobileToggle\.addEventListener\(\s*['"]click['"]\s*,\s*(?:\(\s*\)\s*=>|function\s*\(\s*\))\s*\{\s*(?:var\s+isOpen\s*=\s*)?mainNav\.classList\.toggle\(\s*['"]mobile-open['"]\s*\)\s*;\s*mobileToggle\.classList\.toggle\(\s*['"]active['"](?:\s*,\s*isOpen)?\s*\)\s*;\s*(?:mobileToggle\.setAttribute\(\s*['"]aria-expanded['"]\s*,\s*String\(\s*isOpen\s*\)\s*\)\s*;\s*)?\}\s*\)\s*;\s*\}/g;
  const listener = /\s*mobileToggle\.addEventListener\(\s*['"]click['"]\s*,\s*\(\)\s*=>\s*\{\s*mainNav\.classList\.toggle\(\s*['"]mobile-open['"]\s*\)\s*;\s*(?:mobileToggle\.classList\.toggle\(\s*['"]active['"]\s*\)\s*;\s*)?\}\s*\)\s*;/g;
  const orphanedFragment = /\s*(?:const|var)\s+mobileToggle\s*=\s*document\.getElementById\(\s*['"]mobileToggle['"]\s*\)\s*;\s*(?:const|var)\s+mainNav\s*=\s*document\.getElementById\(\s*['"]mainNav['"]\s*\)\s*;\s*\)\s*;\s*\}/g;
  return html.replace(listenerBlock, '\n').replace(listener, '\n').replace(orphanedFragment, '\n').replace(/\s*if\s*\(\s*mobileToggle\s*&&\s*mainNav\s*\)\s*\{\s*\}/g, '\n');
}

function icon(name) {
  const paths = {
    location: '<path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    mail: '<path d="M3 5h18v14H3z"/><path d="m3 6 9 7 9-7"/>',
    phone: '<path d="M7.2 3.5 10 7l-2 2.4a15.5 15.5 0 0 0 6.6 6.6l2.4-2 3.5 2.8-1.5 3a2.5 2.5 0 0 1-2.6 1.3C9.2 20 4 14.8 2.9 7.6A2.5 2.5 0 0 1 4.2 5z"/>',
    whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/><path d="M8.5 8.2c.5 2.7 2.6 4.8 5.3 5.3"/>',
    linkedin: '<path d="M5.4 8.2H2V22h3.4V8.2ZM3.7 2A2 2 0 1 0 3.7 6a2 2 0 0 0 0-4ZM22 14.1c0-4.2-2.2-6.2-5.2-6.2-2.4 0-3.5 1.3-4.1 2.2V8.2H9.3V22h3.4v-6.8c0-1.8.3-3.6 2.6-3.6 2.3 0 2.3 2.1 2.3 3.7V22H22v-7.9Z"/>',
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6ZM9.8 15.4V8.6L16 12l-6.2 3.4Z"/>',
    facebook: '<path d="M14 22v-8h2.8l.4-3H14V9.1c0-.9.3-1.6 1.7-1.6h1.7V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7.5v3h2.9v8H14Z"/>',
    x: '<path d="M3 3h4.7l4.8 6.4L18 3h3l-7.1 8.7L22 21h-4.7l-5.2-6.9L6 21H3l7.7-9.2L3 3Zm3.5 2 11.8 14h1.2L7.7 5H6.5Z"/>',
  };
  const filled = ['linkedin', 'youtube', 'facebook', 'x'].includes(name);
  return `<svg class="footer-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}>${paths[name]}</svg>`;
}

function footerColumn(title, items) {
  return `<section class="footer-column">\n     <h2 class="footer-title">${title}</h2>\n     <ul class="footer-links">\n${items.map(([href, label]) => `      <li><a href="${href}">${label}</a></li>`).join('\n')}\n     </ul>\n    </section>`;
}

function footerMarkup(language) {
  const t = footerCopy[language];
  const assetPrefix = language === 'en' ? '' : '../';
  const social = socialLinks.map(([key, , href], index) => `      <li><a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${t.socialLabels[index]}">${icon(key)}</a></li>`).join('\n');
  const columns = t.links.map((links, index) => footerColumn(t.titles[index], links)).join('\n    ');
  return `<footer class="footer" id="siteFooter">\n <div class="container">\n  <div class="footer-brand footer-brand-band">\n   <a class="footer-logo" href="index.html" aria-label="Begapunk"><img src="${assetPrefix}images/optimized/begapunk-logo-header.webp" alt="Begapunk" loading="lazy" width="226" height="40"></a>\n   <div class="footer-brand-copy">\n    <p class="footer-positioning">${t.positioning}</p>\n    <p class="footer-company-name">${legalCompanyName}</p>\n   </div>\n   <a class="footer-quote" href="contact.html#quoteForm">${t.quote}</a>\n  </div>\n  <div class="footer-contact-band">\n   <address class="footer-contact">\n    <span class="footer-address">${icon('location')}<span>${t.address}</span></span>\n    <a href="mailto:sales@begapunk.com">${icon('mail')}<span>sales@begapunk.com</span></a>\n    <a href="tel:+8618368425342">${icon('phone')}<span>+86 183 6842 5342</span></a>\n    <a href="https://wa.me/8618368425342" target="_blank" rel="noopener noreferrer">${icon('whatsapp')}<span>WhatsApp</span></a>\n   </address>\n   <nav class="footer-social" aria-label="${t.socialTitle}">\n    <ul class="footer-social-links">\n${social}\n    </ul>\n   </nav>\n  </div>\n  <nav class="footer-navigation" aria-label="${t.navigationLabel}">\n   ${columns}\n  </nav>\n  <div class="footer-bottom">\n   <p>${t.copyright}</p>\n   <nav class="footer-legal" aria-label="${t.legalLabel}">\n    <a href="privacy.html">${t.privacy}</a>\n    <a href="terms.html">${t.terms}</a>\n   </nav>\n  </div>\n </div>\n</footer>`;
}

function replacementRange(element) {
  const location = element?.sourceCodeLocation;
  if (!location) throw new Error('Source location is unavailable.');
  return { start: location.startOffset, end: location.endOffset };
}

let changed = 0;
for (const language of languages) {
  for (const page of config.pages) {
    const file = language === 'en' ? path.join(root, page) : path.join(root, language, page);
    const original = await fs.readFile(file, 'utf8');
    const pageStyleVersion = page === 'index.html' ? homepageStyleVersion : styleVersion;
    const html = removeLegacyMobileListeners(original).replace(
      /(href=["'](?:\.\.\/)?css\/style\.css\?v=)[^"']+/g,
      `$1${pageStyleVersion}`,
    );
    const $ = load(html, { decodeEntities: false, sourceCodeLocationInfo: true });
    const nav = $('#mainNav').get(0);
    const footer = $('footer.footer').first().get(0);
    if (!nav) throw new Error(`${language}/${page}: #mainNav missing.`);
    if (!footer) throw new Error(`${language}/${page}: footer is missing.`);
    const navRange = replacementRange(nav);
    const footerRange = replacementRange(footer);
    const edits = [
      { ...navRange, value: navMarkup(language, page) },
      { ...footerRange, value: footerMarkup(language) },
    ].sort((a, b) => b.start - a.start);
    let next = html;
    for (const edit of edits) next = `${next.slice(0, edit.start)}${edit.value}${next.slice(edit.end)}`;
    if (next !== original) {
      await fs.writeFile(file, next, 'utf8');
      changed += 1;
    }
  }
}

console.log(`Navigation/footer synchronization complete: ${changed} of ${languages.length * config.pages.length} pages changed.`);
