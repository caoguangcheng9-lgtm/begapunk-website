import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import sharp from 'sharp';
import { DISCOVERY_ROBOTS_MARKER, discoveryExcludedPageSet } from './discovery-exclusions.mjs';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'config.json'), 'utf8'));
const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map((language) => language.code));
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const localizedRoot = process.env.I18N_OUTPUT_ROOT
  ? path.resolve(process.env.I18N_OUTPUT_ROOT)
  : sourceRoot;
const seoByLanguage = new Map();
for (const language of activeLanguages) {
  const seoPath = path.join(sourceRoot, 'i18n', 'seo', `${language.code}.json`);
  seoByLanguage.set(language.code, JSON.parse(await fs.readFile(seoPath, 'utf8')));
}
const failures = [];
const expectedDiscoveryExcludedPages = [
  'application-packaging-machinery.html',
  'application-bottle-filling-capping.html',
  'blog-rotary-joint-leaking.html',
  'application-automation-rotary-tables.html',
  'application-pneumatic-tools-hose-anti-twist.html',
  'blog-seal-replacement.html',
  'blog-threaded-vs-flange.html',
  'application-robot-end-of-arm-tooling.html',
  'blog-rotary-joint-materials.html',
];
let discoveryExcludedPages = new Set();
try {
  discoveryExcludedPages = discoveryExcludedPageSet(config);
  const expected = new Set(expectedDiscoveryExcludedPages);
  if (discoveryExcludedPages.size !== expected.size
      || [...expected].some((pageName) => !discoveryExcludedPages.has(pageName))) {
    failures.push('i18n/config.json: discoveryExcludedPages must contain exactly the approved nine P1 quarantine routes.');
  }
} catch (error) {
  failures.push(`i18n/config.json: invalid discovery exclusion contract (${error.message}).`);
}
const translationManagedPages = config.translationManagedPages || config.pages;
const manualLocalizedPages = config.manualLocalizedPages || [];
const expectedOwnershipCounts = { total: 55, managed: 49, manual: 6 };
const configuredPageSet = new Set(config.pages);
const translationPageSet = new Set(translationManagedPages);
const manualPageSet = new Set(manualLocalizedPages);
if (configuredPageSet.size !== config.pages.length) failures.push('i18n/config.json: pages contains duplicates.');
if (translationPageSet.size !== translationManagedPages.length) failures.push('i18n/config.json: translationManagedPages contains duplicates.');
if (manualPageSet.size !== manualLocalizedPages.length) failures.push('i18n/config.json: manualLocalizedPages contains duplicates.');
if (config.pages.length !== expectedOwnershipCounts.total
  || translationManagedPages.length !== expectedOwnershipCounts.managed
  || manualLocalizedPages.length !== expectedOwnershipCounts.manual) {
  failures.push(`i18n/config.json: expected the approved ${expectedOwnershipCounts.total} = ${expectedOwnershipCounts.managed} translation-managed + ${expectedOwnershipCounts.manual} manual ownership contract.`);
}
if (activeLanguages.map((language) => language.code).join('|') !== 'de|ja|ru') {
  failures.push('i18n/config.json: active localized build languages must be de, ja and ru in canonical order.');
}
for (const pageName of manualPageSet) {
  if (translationPageSet.has(pageName)) failures.push(`i18n/config.json: ${pageName} is both translation-managed and manually localized.`);
}
const groupedPageSet = new Set([...translationManagedPages, ...manualLocalizedPages]);
if (groupedPageSet.size !== configuredPageSet.size
  || [...configuredPageSet].some((pageName) => !groupedPageSet.has(pageName))) {
  failures.push('i18n/config.json: translationManagedPages and manualLocalizedPages must partition pages exactly.');
}
try {
  const sourceCatalog = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'source-catalog.json'), 'utf8'));
  if (JSON.stringify(sourceCatalog.pages) !== JSON.stringify(translationManagedPages)) {
    failures.push('i18n/source-catalog.json: pages must exactly match translationManagedPages in order and membership.');
  }
  const catalogEntries = sourceCatalog.entries || [];
  const validCatalogIds = new Set(catalogEntries.map((entry) => entry.id));
  const validCatalogSources = new Set(catalogEntries.map((entry) => entry.source));
  if (validCatalogIds.size !== catalogEntries.length) failures.push('i18n/source-catalog.json: entry IDs must be unique.');
  if (validCatalogSources.size !== catalogEntries.length) failures.push('i18n/source-catalog.json: source strings must be unique.');
  for (const language of activeLanguages) {
    const cache = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'cache', `${language.code}.json`), 'utf8'));
    const overrides = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'overrides', `${language.code}.json`), 'utf8'));
    const editorial = JSON.parse(await fs.readFile(path.join(sourceRoot, 'i18n', 'editorial', `${language.code}.json`), 'utf8'));
    const orphanIds = Object.keys(cache.translations || {}).filter((id) => !validCatalogIds.has(id));
    if (orphanIds.length) failures.push(`i18n/cache/${language.code}.json: ${orphanIds.length} orphaned translation IDs remain.`);
    const sharedEditorial = editorial['*'] || {};
    const missingCoverage = [];
    for (const entry of catalogEntries) {
      const entryPages = Array.isArray(entry.pages) ? entry.pages : [];
      if (!entryPages.length || entryPages.some((pageName) => !translationPageSet.has(pageName))) {
        failures.push(`i18n/source-catalog.json: ${entry.id} must reference only translation-managed pages.`);
        continue;
      }
      for (const pageName of entryPages) {
        const pageEditorial = editorial[pageName] || {};
        const translated = pageEditorial[entry.id]
          || pageEditorial[entry.source]
          || sharedEditorial[entry.id]
          || sharedEditorial[entry.source]
          || overrides[entry.source]
          || cache.translations?.[entry.id];
        if (!translated) missingCoverage.push(`${pageName}:${entry.id}`);
      }
    }
    if (missingCoverage.length) {
      failures.push(`i18n/${language.code}: ${missingCoverage.length} managed page/string use(s) lack effective translation coverage at the approved editorial/override/cache priority.`);
    }
  }
} catch (error) {
  failures.push(`i18n ownership contract could not be verified (${error.message}).`);
}
try {
  const packageJson = JSON.parse(await fs.readFile(path.join(sourceRoot, 'package.json'), 'utf8'));
  const deployPrepare = packageJson.scripts?.['deploy:prepare'] || '';
  if (!/(?:^|&&\s*)npm run search:verify(?:\s*&&|$)/.test(deployPrepare)) {
    failures.push('package.json: deploy:prepare must run search:verify.');
  }
  if (/(?:^|&&\s*)npm run search:sync(?:\s*&&|$)/.test(deployPrepare)) {
    failures.push('package.json: deploy:prepare must verify search data without mutating it via search:sync.');
  }
} catch (error) {
  failures.push(`package.json: deploy preparation contract could not be verified (${error.message}).`);
}
for (const pageName of manualLocalizedPages) {
  for (const languageCode of [config.sourceLanguage.code, ...activeLanguages.map((language) => language.code)]) {
    const languageRoot = languageCode === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, languageCode);
    try {
      await fs.access(path.join(languageRoot, pageName));
    } catch {
      failures.push(`${languageCode}/${pageName}: manually localized page is missing.`);
    }
  }
}
const suspiciousRepeatedTokenPattern = /(?:\bX\s+){5,}\bX\b/;
const suspiciousRepeatedSymbolPattern = /(?:★\s*){5,}|(?:⚙\s*){3,}|(?:✉\s*){2,}|(?:\b\d+\s+[-–—]\s+){5,}/u;
const suspiciousPlaceholderPattern = /__(?:PH|TR|Ф|ТР)?[A-ZА-ЯЁ]{4,8}__|\b(?:PH|TR)AAA[A-Z]\b|\b(?:Ф|ТР)ААА[А-ЯЁ]\b/u;
const suspiciousRussianMachineTranslationPattern = /Корабли|Тяжел(?:ый|ая|ое) долг|Протоптан|Стальная сталь|Ротари|совместн(?:ый|ое) каталог|Следующая статья/iu;
const suspiciousVisibleEnglishPattern = /\b(?:Threaded|Heavy Duty|Rotary Joint|Rotary Union|Ships in|Flange Mount|Download PDF|Details|Previous|Next)\b/i;
const suspiciousLocalizedPhrases = {
  de: /Erzeugnisse|Sonderanfrage|uns benachrichtigen|Multi-Kanal|multi-Kanal|through-Bohrung|Through-Bohrung|Air Kanäle|air Kanäle|Rutschring|Kanal Ausführung|Re-Leitungsführung|Automatisierungstabelle/,
  ja: /据え付け品|電子工学|密集した|回転式移動|空気電気|気圧電気|チャネルカウント|工具細工|真空のコップ|洗剤材料|見直しる|送って下さい|物質的な条件|製造業装置/,
  ru: /Пользователь RFQ|[Пп]ользовательский дизайн|[Мм]ногопропуск|[Мм]ногопроход|роторн(?:ая|ые|ых|ой) таблиц|кажд(?:ый|ую) оснастка|несколько оснастка|весь ротационное|один ротационное|соединение должен|радиальный клиренс|счет станции|счетчик сигналов/,
};
const expectedTeamInitials = ['GC', 'LW', 'SZ'];
const expectedTeamNames = ['GuangCheng Cao', 'Li Wei', 'Sarah Zhang'];
const expectedFounderJobTitle = {
  de: 'Gründer und Ingenieur',
  ja: '創業者・技術責任者',
  ru: 'Основатель и инженер',
};
const expectedOrganizationSlogan = {
  de: 'Spezialist für pneumatische Drehdurchführungen',
  ja: '空圧用ロータリージョイント専門メーカー',
  ru: 'Специалист по пневматическим вращающимся соединениям',
};
const navigationSignatures = new Map();
const languageSwitcherLabels = {
  en: 'Language',
  de: 'Sprache',
  es: 'Idioma',
  it: 'Lingua',
  ja: '言語',
  pl: 'Język',
  ru: 'Язык',
};
const homepageQualityLinks = {
  en: ['View Manufacturing & Quality', 'See 100% Leak Testing'],
  de: ['Fertigung & Qualität ansehen', '100%-Dichtheitsprüfung ansehen'],
  ja: ['製造・品質管理を見る', '全数漏れ検査を見る'],
  ru: ['Производство и качество', 'Смотреть 100%-ный контроль герметичности'],
};
const navigationExpected = {
  en: {
    top: ['Products', 'Applications', 'Quality', 'Knowledge Center'], home: 'Home', about: 'About', quote: 'Get a Quote',
    menus: [
      [['product-comparison.html', 'Model Comparison'], ['contact.html', 'Custom RFQ']],
      [['case-studies.html', 'Case Studies'], ['application-laser-tube-cutting.html', 'Laser Tube Cutting'], ['application-packaging-machinery.html', 'Packaging Machinery'], ['application-bottle-filling-capping.html', 'Bottle Filling & Capping'], ['application-cnc-pneumatic-clamping.html', 'CNC Pneumatic Clamping']],
      [['production-inspection-testing.html', '100% Leak Testing']],
      [['blog-rotary-joint-selection.html', 'Selection Guide'], ['blog-rotary-union-seal-types.html', 'Sealing Technology'], ['installation.html', 'Installation Guide'], ['faq.html', 'FAQ']],
    ],
    footerTitles: ['Products', 'Applications', 'Knowledge Center', 'Company'],
    company: [['about.html', 'About / Factory'], ['manufacturing-quality.html', 'Manufacturing & Quality'], ['production-inspection-testing.html', '100% Leak Testing'], ['contact.html', 'Contact']],
  },
  de: {
    top: ['Produkte', 'Anwendungen', 'Qualität', 'Wissenszentrum'], home: 'Startseite', about: 'Unternehmen', quote: 'Angebot anfordern',
    menus: [
      [['product-comparison.html', 'Modellvergleich'], ['contact.html', 'Sonderausführung & Angebot']],
      [['case-studies.html', 'Fallstudien'], ['application-laser-tube-cutting.html', 'Laserröhrenschneiden'], ['application-packaging-machinery.html', 'Verpackungsmaschinen'], ['application-bottle-filling-capping.html', 'Füllen und Verschließen von Flaschen'], ['application-cnc-pneumatic-clamping.html', 'CNC-Pneumatikspannen']],
      [['production-inspection-testing.html', '100%-Dichtheitsprüfung']],
      [['blog-rotary-joint-selection.html', 'Auswahlleitfaden'], ['blog-rotary-union-seal-types.html', 'Dichtungstechnik'], ['installation.html', 'Montageanleitung'], ['faq.html', 'FAQ']],
    ],
    footerTitles: ['Produkte', 'Anwendungen', 'Wissenszentrum', 'Unternehmen'],
    company: [['about.html', 'Unternehmen / Werk'], ['manufacturing-quality.html', 'Fertigung & Qualität'], ['production-inspection-testing.html', '100%-Dichtheitsprüfung'], ['contact.html', 'Kontakt']],
  },
  ja: {
    top: ['製品情報', '用途別情報', '品質管理', '技術情報'], home: 'ホーム', about: '会社情報', quote: '見積もり・技術相談',
    menus: [
      [['product-comparison.html', '機種選定表'], ['contact.html', '特注品・見積依頼']],
      [['case-studies.html', '選定事例'], ['application-laser-tube-cutting.html', 'レーザー管切断機'], ['application-packaging-machinery.html', '包装機械'], ['application-bottle-filling-capping.html', 'ボトル充填・キャッピング機'], ['application-cnc-pneumatic-clamping.html', 'CNC空圧クランプ']],
      [['production-inspection-testing.html', '全数漏れ検査']],
      [['blog-rotary-joint-selection.html', '選定ガイド'], ['blog-rotary-union-seal-types.html', 'シール技術'], ['installation.html', '取付要領'], ['faq.html', 'よくある質問']],
    ],
    footerTitles: ['製品情報', '用途別情報', '技術情報', '会社情報'],
    company: [['about.html', '会社・工場情報'], ['manufacturing-quality.html', '製造・品質管理'], ['production-inspection-testing.html', '全数漏れ検査'], ['contact.html', 'お問い合わせ']],
  },
  ru: {
    top: ['Продукция', 'Применение', 'Качество', 'Центр знаний'], home: 'Главная', about: 'О компании', quote: 'Запросить предложение',
    menus: [
      [['product-comparison.html', 'Сравнение моделей'], ['contact.html', 'Специальное исполнение и запрос']],
      [['case-studies.html', 'Примеры применения'], ['application-laser-tube-cutting.html', 'Лазерная резка труб'], ['application-packaging-machinery.html', 'Упаковочные машины'], ['application-bottle-filling-capping.html', 'Розлив и укупорка бутылок'], ['application-cnc-pneumatic-clamping.html', 'Пневматический зажим с ЧПУ']],
      [['production-inspection-testing.html', '100%-ный контроль герметичности']],
      [['blog-rotary-joint-selection.html', 'Руководство по выбору'], ['blog-rotary-union-seal-types.html', 'Технология уплотнений'], ['installation.html', 'Инструкция по монтажу'], ['faq.html', 'Часто задаваемые вопросы']],
    ],
    footerTitles: ['Продукция', 'Применение', 'Центр знаний', 'Компания'],
    company: [['about.html', 'О компании / Производство'], ['manufacturing-quality.html', 'Производство и качество'], ['production-inspection-testing.html', '100%-ный контроль герметичности'], ['contact.html', 'Контакты']],
  },
};
const footerStructureSignatures = new Set();
const legalCompanyName = 'Ningbo Begapunk Pneumatic Components Co., Ltd.';
const footerStyleVersion = '20260809-mobile3';
const footerSocial = [
  ['https://www.linkedin.com/in/guangcheng-cao/', 'LinkedIn'],
  ['https://www.youtube.com/@BEGAPUNKRotaryJointsTV', 'YouTube'],
  ['https://www.facebook.com/profile.php?id=61591616523667', 'Facebook'],
  ['https://x.com/Begapunk728', 'X'],
];
const organizationSocialProfiles = [
  'https://www.youtube.com/@BEGAPUNKRotaryJointsTV',
  'https://www.facebook.com/profile.php?id=61591616523667',
  'https://x.com/Begapunk728',
];
const founderSocialProfiles = ['https://www.linkedin.com/in/guangcheng-cao/'];
const organizationEntityId = 'https://www.begapunk.com/#organization';
const founderEntityId = 'https://www.begapunk.com/#founder-g-c-cao';
const localBusinessEntityId = 'https://www.begapunk.com/#localbusiness';
const canonicalBrandName = 'Begapunk';
const obsoleteHomepageSocialProfiles = [
  'https://www.linkedin.com/company/begapunk',
  'https://www.youtube.com/@begapunk',
];
const footerExpected = {
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
const navProductPages = new Set(['products.html', 'products-p2.html', 'product-comparison.html', ...config.pages.filter((page) => /^BP-/.test(page))]);
const navApplicationPages = new Set(['applications.html', ...config.pages.filter((page) => /^application-/.test(page) || /^case(?:-|studies)/.test(page))]);
const navQualityPages = new Set(['manufacturing-quality.html', 'production-inspection-testing.html']);
const navKnowledgePages = new Set(['installation.html', 'faq.html', 'blog.html', ...config.pages.filter((page) => /^blog-/.test(page))]);

function expectedNavigationCategory(page) {
  if (navProductPages.has(page)) return 'products';
  if (navApplicationPages.has(page)) return 'applications';
  if (navQualityPages.has(page)) return 'quality';
  if (navKnowledgePages.has(page)) return 'knowledge';
  if (page === 'about.html') return 'about';
  if (page === 'index.html') return 'home';
  return '';
}
const untranslatedStructuredPropertyNames = new Set([
  'Protection rating', 'Pneumatic passages', 'Electrical circuits', 'Electrical contact material',
  'Insulation resistance', 'Surface treatment', 'Hollow bore diameter',
]);
const suspiciousStructuredEnglishPattern = /\b(?:Pneumatic rotary joint|air rotary union|air swivel|rotary joint|inlet|outlet|Threaded mount|Flange mount|Deep groove ball bearing|hours \(rated conditions\)|Zero leakage|pressure tested|Approx\.|Heavy duty|dust-proof structure|hollow bore|mounting holes|Typical applications)\b/i;

function verifyGeneratedText(value, owner) {
  if (value.includes('\uFFFD')) {
    failures.push(`${owner}: Unicode replacement character detected.`);
  }
  if (suspiciousRepeatedTokenPattern.test(value)) {
    failures.push(`${owner}: suspicious repeated X tokens detected.`);
  }
  if (suspiciousRepeatedSymbolPattern.test(value)) {
    failures.push(`${owner}: suspicious repeated symbols detected.`);
  }
  if (suspiciousPlaceholderPattern.test(value)) {
    failures.push(`${owner}: damaged translation placeholder detected.`);
  }
  if (suspiciousRussianMachineTranslationPattern.test(value)) {
    failures.push(`${owner}: known Russian machine-translation artifact detected.`);
  }
  const languageCode = owner.split('/')[0];
  if (suspiciousLocalizedPhrases[languageCode]?.test(value)) {
    failures.push(`${owner}: known unnatural localized phrase detected.`);
  }
}

async function targetExists(target, relativeFromOutput) {
  try {
    const item = await fs.stat(target);
    if (item.isFile()) return true;
  } catch {
    // Fall through to the shared source-asset check.
  }
  try {
    const sourceTarget = path.join(sourceRoot, relativeFromOutput);
    const item = await fs.stat(sourceTarget);
    return item.isFile();
  } catch {
    return false;
  }
}

async function verifyLocalReference(value, ownerPath) {
  if (!value || value.startsWith('#') || /^(?:data:|mailto:|tel:|javascript:|https?:|\/\/)/i.test(value)) return;
  const pathname = value.split('#')[0].split('?')[0];
  if (!pathname) return;
  const target = pathname.startsWith('/')
    ? path.join(localizedRoot, pathname.slice(1))
    : path.resolve(path.dirname(ownerPath), pathname);
  const resolved = pathname.endsWith('/') ? path.join(target, 'index.html') : target;
  const relativeFromOutput = path.relative(localizedRoot, resolved);
  if (relativeFromOutput === '..'
      || relativeFromOutput.startsWith(`..${path.sep}`)
      || path.isAbsolute(relativeFromOutput)) {
    failures.push(`${path.relative(localizedRoot, ownerPath)}: local reference escapes the site root ${value}.`);
    return;
  }
  if (!await targetExists(resolved, relativeFromOutput)) {
    failures.push(`${path.relative(localizedRoot, ownerPath)}: missing local reference ${value}.`);
  }
}

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  if (languageCode === config.sourceLanguage.code) return `${config.siteUrl}/${suffix}`;
  return `${config.siteUrl}/${languageCode}/${suffix}`;
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function visibleFaqEntries($) {
  const cardEntries = $('.faq-item, .app-faq-item').map((_, item) => ({
    question: compactText($(item).find('.faq-question, h3').first().clone().find('svg, i, .faq-icon, .faq-toggle, .arrow').remove().end().text()),
    answer: compactText($(item).find('.faq-answer, p').first().text()),
  })).get().filter((item) => item.question && item.answer);
  if (cardEntries.length) return cardEntries;

  const articleEntries = [];
  let current = $('h2#faq').first().next();
  while (current.length && !current.is('h2')) {
    if (current.is('h3') && current.next().is('p')) {
      articleEntries.push({
        question: compactText(current.text()),
        answer: compactText(current.next().text()),
      });
    }
    current = current.next();
  }
  return articleEntries;
}

function schemaTypes(node) {
  const type = node?.['@type'];
  return new Set((Array.isArray(type) ? type : [type]).filter(Boolean));
}

function schemaNodes(value, found = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => schemaNodes(item, found));
  } else if (value && typeof value === 'object') {
    if (value['@type']) found.push(value);
    Object.values(value).forEach((item) => schemaNodes(item, found));
  }
  return found;
}

function switcherReference(currentLanguageCode, targetLanguageCode, pageName) {
  if (currentLanguageCode === config.sourceLanguage.code) {
    return targetLanguageCode === config.sourceLanguage.code
      ? pageName
      : `${targetLanguageCode}/${pageName}`;
  }
  if (targetLanguageCode === config.sourceLanguage.code) return `../${pageName}`;
  if (targetLanguageCode === currentLanguageCode) return pageName;
  return `../${targetLanguageCode}/${pageName}`;
}

const verifiedLanguages = [config.sourceLanguage, ...activeLanguages];
for (const language of verifiedLanguages) {
  for (const pageName of config.pages) {
    const filePath = language.code === config.sourceLanguage.code
      ? path.join(localizedRoot, pageName)
      : path.join(localizedRoot, language.code, pageName);
    let html;
    try {
      html = await fs.readFile(filePath, 'utf8');
    } catch {
      failures.push(`${language.code}/${pageName}: file is missing.`);
      continue;
    }
    verifyGeneratedText(html, `${language.code}/${pageName}`);
    const $ = load(html, { decodeEntities: false });
    if (language.code !== config.sourceLanguage.code) {
      const seo = seoByLanguage.get(language.code)?.[pageName];
      if (!seo) {
        failures.push(`${language.code}/${pageName}: curated SEO entry is missing.`);
      } else {
        const actual = {
          title: compactText($('title').first().text()),
          description: compactText($('meta[name="description"]').first().attr('content')),
          h1: compactText($('h1').first().text()),
          ogTitle: compactText($('meta[property="og:title"]').first().attr('content')),
          ogDescription: compactText($('meta[property="og:description"]').first().attr('content')),
          twitterTitle: compactText($('meta[name="twitter:title"]').first().attr('content')),
          twitterDescription: compactText($('meta[name="twitter:description"]').first().attr('content')),
        };
        for (const field of ['title', 'description', 'h1']) {
          if (actual[field] !== seo[field]) failures.push(`${language.code}/${pageName}: ${field} does not match curated SEO data.`);
        }
        if (actual.ogTitle !== seo.title || actual.twitterTitle !== seo.title) failures.push(`${language.code}/${pageName}: social title is not localized.`);
        if (actual.ogDescription !== seo.description || actual.twitterDescription !== seo.description) failures.push(`${language.code}/${pageName}: social description is not localized.`);
        if ($('meta[name="keywords"]').length) failures.push(`${language.code}/${pageName}: inherited meta keywords should be removed.`);
      }
    }
    if (language.code === 'ru') {
      const visibleBody = $('body').clone();
      visibleBody.find('script,style,noscript,.notranslate,[translate="no"]').remove();
      if (suspiciousVisibleEnglishPattern.test(visibleBody.text())) {
        failures.push(`${language.code}/${pageName}: visible high-risk English residue detected.`);
      }
      for (const attribute of config.translatedAttributes || []) {
        $(`[${attribute}]`).each((_, element) => {
          const value = $(element).attr(attribute) || '';
          if (suspiciousVisibleEnglishPattern.test(value)) {
            failures.push(`${language.code}/${pageName}: high-risk English residue in ${attribute}.`);
          }
        });
      }
    }
    if (pageName === 'about.html') {
      const teamInitials = $('.team-avatar').map((_, element) => $(element).text().trim()).get();
      const teamNames = $('.team-card h3').map((_, element) => $(element).text().trim()).get();
      if (teamInitials.join('|') !== expectedTeamInitials.join('|')) failures.push(`${language.code}/${pageName}: team initials were changed by localization.`);
      if (teamNames.join('|') !== expectedTeamNames.join('|')) failures.push(`${language.code}/${pageName}: team names were changed by localization.`);
    }
    if (pageName === 'faq.html') {
      const categoryIcons = $('.faq-category .icon').map((_, element) => $(element).text().trim()).get();
      const arrows = $('.faq-question .arrow').map((_, element) => $(element).text().trim()).get();
      if (categoryIcons.join('|') !== '?|★|✉|⚙') failures.push(`${language.code}/${pageName}: FAQ category icons were changed by localization.`);
      if (arrows.some((value) => value !== '▼')) failures.push(`${language.code}/${pageName}: FAQ arrows were changed by localization.`);
    }
    if (language.code === 'ja' && pageName === 'blog-rotary-joint-selection.html') {
      const channelHeading = $('h2').map((_, element) => $(element).text().trim()).get().find((value) => value.includes('流路数'));
      const channelModels = $('li').map((_, element) => $(element).text().trim()).get().filter((value) => /^[12]流路：/.test(value));
      if (channelHeading !== '1. 実際の空圧・媒体回路から流路数を決める') failures.push(`${language.code}/${pageName}: channel-count heading is incorrect.`);
      if (channelModels.length !== 2 || !channelModels[0].startsWith('1流路：') || !channelModels[1].startsWith('2流路：')) failures.push(`${language.code}/${pageName}: channel model labels are incorrect.`);
    }
    if (language.code !== config.sourceLanguage.code) {
      for (const selector of config.browserNoTranslateSelectors || []) {
        $(selector).each((_, element) => {
          const classes = ($(element).attr('class') || '').split(/\s+/);
          if ($(element).attr('translate') !== 'no' || !classes.includes('notranslate')) {
            failures.push(`${language.code}/${pageName}: ${selector} is not protected from browser translation.`);
          }
        });
      }
    }
    if ((html.match(/<!doctype html>/gi) || []).length !== 1) failures.push(`${language.code}/${pageName}: expected one HTML doctype.`);
    if (html.includes('undefined')) failures.push(`${language.code}/${pageName}: literal undefined leaked into public HTML.`);
    if ($('html').attr('lang') !== language.code) failures.push(`${language.code}/${pageName}: incorrect html lang.`);
    if ($('link[rel="canonical"]').attr('href') !== pageUrl(language.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect canonical.`);
    const alternates = new Map($('link[rel="alternate"][hreflang]').map((_, element) => [[$(element).attr('hreflang'), $(element).attr('href')]]).get());
    for (const candidate of [config.sourceLanguage, ...activeLanguages]) {
      if (alternates.get(candidate.code) !== pageUrl(candidate.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect ${candidate.code} hreflang.`);
    }
    if (alternates.get('x-default') !== pageUrl(config.sourceLanguage.code, pageName)) failures.push(`${language.code}/${pageName}: incorrect x-default hreflang.`);
    if (!$('.i18n-switcher select').length) failures.push(`${language.code}/${pageName}: language switcher is missing.`);
    const switcherLabel = $('.i18n-switcher label.sr-only').first();
    const switcherSelect = $('.i18n-switcher select').first();
    const expectedSwitcherLabel = languageSwitcherLabels[language.code] || languageSwitcherLabels.en;
    if (compactText(switcherLabel.text()) !== expectedSwitcherLabel
      || switcherSelect.attr('aria-label') !== expectedSwitcherLabel) {
      failures.push(`${language.code}/${pageName}: language switcher accessible label is not localized.`);
    }
    const switcherOptions = new Map($('.i18n-switcher option[value]').map((_, element) => [[$(element).text().trim(), $(element).attr('value')]]).get());
    for (const candidate of verifiedLanguages) {
      const expected = switcherReference(language.code, candidate.code, pageName);
      if (switcherOptions.get(candidate.label) !== expected) failures.push(`${language.code}/${pageName}: incorrect ${candidate.code} switcher target.`);
    }
    const navCopy = navigationExpected[language.code];
    const nav = $('#mainNav');
    if (nav.length !== 1) {
      failures.push(`${language.code}/${pageName}: expected exactly one #mainNav.`);
    } else {
      const mobileHome = nav.children('a.nav-home-mobile');
      const dropdowns = nav.children('.nav-dropdown');
      const about = nav.children('a.nav-about');
      const quote = nav.children('a.nav-cta');
      if (mobileHome.length !== 1 || compactText(mobileHome.text()) !== navCopy.home || mobileHome.attr('href') !== 'index.html') failures.push(`${language.code}/${pageName}: localized mobile Home link is missing or incorrect.`);
      if (dropdowns.length !== 4) failures.push(`${language.code}/${pageName}: expected Products, Applications, Quality, and Knowledge Center dropdowns.`);
      const parentUrls = ['products.html', 'applications.html', 'manufacturing-quality.html', 'blog.html'];
      dropdowns.each((index, element) => {
        const toggle = $(element).children('.nav-dropdown-toggle').first();
        const toggleText = compactText(toggle.clone().find('.chevron').remove().end().text());
        if (toggleText !== navCopy.top[index]) failures.push(`${language.code}/${pageName}: navigation dropdown ${index + 1} label is incorrect.`);
        if (toggle.attr('href') !== parentUrls[index]) failures.push(`${language.code}/${pageName}: navigation parent ${index + 1} does not link to its overview page.`);
        if ($(element).find(`.nav-dropdown-menu > a[href="${parentUrls[index]}"]`).length) failures.push(`${language.code}/${pageName}: navigation parent ${parentUrls[index]} is duplicated in its submenu.`);
        const actualItems = $(element).find('.nav-dropdown-menu > a').map((_, link) => [[$(link).attr('href'), compactText($(link).text())]]).get();
        if (JSON.stringify(actualItems) !== JSON.stringify(navCopy.menus[index])) failures.push(`${language.code}/${pageName}: navigation dropdown ${index + 1} links drifted from the canonical structure.`);
      });
      parentUrls.forEach((href) => {
        if (nav.find(`a[href="${href}"]`).length !== 1) failures.push(`${language.code}/${pageName}: overview link ${href} must appear exactly once in the Header.`);
      });
      if (about.length !== 1 || compactText(about.text()) !== navCopy.about || about.attr('href') !== 'about.html') failures.push(`${language.code}/${pageName}: About must be one localized direct link.`);
      if (quote.length !== 1 || compactText(quote.text()) !== navCopy.quote || quote.attr('href') !== 'contact.html') failures.push(`${language.code}/${pageName}: quote link is missing or incorrect.`);
      if (nav.find('.nav-dropdown-menu a[href="case-studies.html"]').length !== 1 || nav.find('.nav-dropdown').eq(1).find('a[href="case-studies.html"]').length !== 1) failures.push(`${language.code}/${pageName}: Case Studies must appear only under Applications.`);
      if (nav.find('.nav-dropdown-menu a[href="production-inspection-testing.html"]').length !== 1 || nav.find('.nav-dropdown').eq(2).find('a[href="production-inspection-testing.html"]').length !== 1) failures.push(`${language.code}/${pageName}: 100% Leak Testing must appear only under Quality.`);
      const activeTop = nav.children('.nav-dropdown').children('.nav-dropdown-toggle.active').length + nav.children('a.nav-about.active').length + nav.children('a.nav-home-mobile.active').length;
      if (activeTop > 1) failures.push(`${language.code}/${pageName}: more than one primary navigation item is active.`);
      const expectedActive = expectedNavigationCategory(pageName);
      const actualActive = nav.children('a.nav-home-mobile.active').length ? 'home'
        : nav.children('.nav-dropdown').eq(0).children('.nav-dropdown-toggle.active').length ? 'products'
          : nav.children('.nav-dropdown').eq(1).children('.nav-dropdown-toggle.active').length ? 'applications'
            : nav.children('.nav-dropdown').eq(2).children('.nav-dropdown-toggle.active').length ? 'quality'
              : nav.children('.nav-dropdown').eq(3).children('.nav-dropdown-toggle.active').length ? 'knowledge'
                : nav.children('a.nav-about.active').length ? 'about' : '';
      if (actualActive !== expectedActive) failures.push(`${language.code}/${pageName}: active navigation category should be ${expectedActive || 'none'}, found ${actualActive || 'none'}.`);
      const matchingLeaf = nav.find(`a[href="${pageName}"]`).filter((_, element) => !$(element).hasClass('nav-home-mobile') && !$(element).hasClass('nav-about') && !$(element).hasClass('nav-cta')).first();
      const expectedCurrent = pageName === 'index.html' ? mobileHome
        : pageName === 'about.html' ? about
          : pageName === 'contact.html' ? quote
            : matchingLeaf;
      const currentLinks = nav.find('[aria-current="page"]');
      if (expectedCurrent.length) {
        if (currentLinks.length !== 1 || currentLinks.attr('href') !== pageName) failures.push(`${language.code}/${pageName}: current navigation leaf must have exactly one aria-current="page".`);
      } else if (currentLinks.length) {
        failures.push(`${language.code}/${pageName}: unrelated navigation link has aria-current="page".`);
      }
      const signatureNav = nav.clone();
      signatureNav.find('.active').removeClass('active');
      signatureNav.find('[aria-current]').removeAttr('aria-current');
      const signature = compactText(signatureNav.html());
      if (!navigationSignatures.has(language.code)) navigationSignatures.set(language.code, signature);
      else if (navigationSignatures.get(language.code) !== signature) failures.push(`${language.code}/${pageName}: navigation structure differs from other pages in the same language.`);
    }
    const mobileButton = $('#mobileToggle');
    if (mobileButton.length !== 1 || mobileButton.attr('aria-controls') !== 'mainNav' || mobileButton.attr('aria-expanded') !== 'false') failures.push(`${language.code}/${pageName}: mobile menu button ARIA state is incomplete.`);
    const navigationScript = language.code === config.sourceLanguage.code ? 'js/site-navigation.js?v=20260808-nav1' : '../js/site-navigation.js?v=20260808-nav1';
    if ($(`script[src="${navigationScript}"]`).length !== 1) failures.push(`${language.code}/${pageName}: canonical site-navigation script is missing.`);
    if (/mainNav\.classList\.(?:toggle|add|remove)\((['"])(?:active|open)\1\)/.test(html)) failures.push(`${language.code}/${pageName}: legacy mobile navigation state class remains in page script.`);
    if (/mainNav\.classList\.toggle\((['"])mobile-open\1\)/.test(html)) failures.push(`${language.code}/${pageName}: legacy inline mobile-open listener remains.`);
    if (/Durability Testing|Dauerprüfung|耐久試験|испытан[^<]{0,30}ресурс/iu.test(nav.text())) failures.push(`${language.code}/${pageName}: nonexistent durability-testing navigation link detected.`);
    const footerCopy = footerExpected[language.code];
    const footer = $('footer.footer');
    if (footer.length !== 1 || footer.attr('id') !== 'siteFooter') failures.push(`${language.code}/${pageName}: exactly one canonical Footer landmark is required.`);
    const footerRoot = footer.first();
    if (footerRoot.children('.container').children('.footer-brand-band').length !== 1) failures.push(`${language.code}/${pageName}: exactly one first-layer Footer brand band is required.`);
    if (footerRoot.children('.container').children('.footer-contact-band').length !== 1) failures.push(`${language.code}/${pageName}: exactly one second-layer Footer contact band is required.`);
    if (footerRoot.find('.footer-company-name').length !== 1 || compactText(footerRoot.find('.footer-company-name').text()) !== legalCompanyName) {
      failures.push(`${language.code}/${pageName}: the legal company name must appear once in the brand identity field.`);
    }
    if (compactText(footerRoot.find('.footer-positioning').text()) !== footerCopy.positioning) failures.push(`${language.code}/${pageName}: approved Footer positioning copy drifted.`);
    if (compactText(footerRoot.find('.footer-address').text()) !== footerCopy.address) failures.push(`${language.code}/${pageName}: localized Footer address is incorrect.`);
    const contactExpectations = [
      ['mailto:sales@begapunk.com', 'sales@begapunk.com'],
      ['tel:+8618368425342', '+86 183 6842 5342'],
      ['https://wa.me/8618368425342', 'WhatsApp'],
    ];
    for (const [href, text] of contactExpectations) {
      const contact = footerRoot.find(`.footer-contact > a[href="${href}"]`);
      if (contact.length !== 1 || compactText(contact.text()) !== text) failures.push(`${language.code}/${pageName}: Footer contact ${href} is missing or incorrect.`);
    }
    const quoteLink = footerRoot.find('.footer-quote[href="contact.html#quoteForm"]');
    if (quoteLink.length !== 1 || compactText(quoteLink.text()) !== footerCopy.quote) failures.push(`${language.code}/${pageName}: localized engineering quote CTA is incorrect.`);
    const socialNavigation = footerRoot.find('nav.footer-social');
    if (socialNavigation.length !== 1 || socialNavigation.attr('aria-label') !== footerCopy.socialTitle) failures.push(`${language.code}/${pageName}: localized social navigation label is incorrect.`);
    if (footerRoot.find('.footer-social-title').length) failures.push(`${language.code}/${pageName}: visible social heading must not consume Footer layout space.`);
    footerSocial.forEach(([href, platform], index) => {
      const link = footerRoot.find(`.footer-social-links a[href="${href}"]`);
      const rel = new Set((link.attr('rel') || '').split(/\s+/).filter(Boolean));
      if (link.length !== 1 || link.attr('target') !== '_blank' || !rel.has('noopener') || !rel.has('noreferrer')) failures.push(`${language.code}/${pageName}: ${platform} Footer link or external-link protection is incorrect.`);
      if (compactText(link.text()) !== '' || link.find('span').length || link.attr('aria-label') !== footerCopy.socialLabels[index]) failures.push(`${language.code}/${pageName}: ${platform} must be an icon-only Footer control with the approved accessible label.`);
      const svg = link.find('svg.footer-icon');
      if (svg.length !== 1 || svg.attr('aria-hidden') !== 'true' || svg.attr('focusable') !== 'false') failures.push(`${language.code}/${pageName}: ${platform} icon accessibility attributes are incomplete.`);
    });
    if (/Begapunk LinkedIn Company Page/i.test(footerRoot.text())) failures.push(`${language.code}/${pageName}: LinkedIn is incorrectly presented as a company page.`);
    const footerNavigation = footerRoot.find('nav.footer-navigation');
    if (footerNavigation.length !== 1 || footerNavigation.attr('aria-label') !== footerCopy.navigationLabel) failures.push(`${language.code}/${pageName}: localized Footer navigation landmark is incorrect.`);
    const footerColumns = footerNavigation.children('.footer-column');
    if (footerColumns.length !== 4) failures.push(`${language.code}/${pageName}: Footer must contain four approved navigation groups.`);
    const footerTitles = footerColumns.find('.footer-title').map((_, element) => compactText($(element).text())).get();
    if (JSON.stringify(footerTitles) !== JSON.stringify(footerCopy.titles)) failures.push(`${language.code}/${pageName}: Footer group labels or order are inconsistent.`);
    footerColumns.each((index, column) => {
      const list = $(column).children('ul.footer-links');
      const actualLinks = list.children('li').children('a').map((_, element) => [[$(element).attr('href'), compactText($(element).text())]]).get();
      if (list.length !== 1 || list.children('li').length !== footerCopy.links[index].length || JSON.stringify(actualLinks) !== JSON.stringify(footerCopy.links[index])) {
        failures.push(`${language.code}/${pageName}: Footer group ${index + 1} links drifted from the approved structure.`);
      }
    });
    const legal = footerRoot.find('nav.footer-legal');
    const legalLinks = legal.children('a').map((_, element) => [[$(element).attr('href'), compactText($(element).text())]]).get();
    if (legal.length !== 1 || legal.attr('aria-label') !== footerCopy.legalLabel || JSON.stringify(legalLinks) !== JSON.stringify([['privacy.html', footerCopy.privacy], ['terms.html', footerCopy.terms]])) failures.push(`${language.code}/${pageName}: localized Privacy/Terms links are incorrect.`);
    if (compactText(footerRoot.find('.footer-bottom > p').text()) !== footerCopy.copyright) failures.push(`${language.code}/${pageName}: localized legal copyright is incorrect.`);
    const internalFooterHrefs = footerRoot.find('a[href]').map((_, element) => $(element).attr('href')).get().filter((href) => !/^(?:https?:|mailto:|tel:|#)/i.test(href));
    if (new Set(internalFooterHrefs).size !== internalFooterHrefs.length) failures.push(`${language.code}/${pageName}: duplicate internal Footer href detected.`);
    if (footerRoot.find('[style]').length) failures.push(`${language.code}/${pageName}: inline Footer color/style attribute detected.`);
    if (/undefined|Begapunk Precision\s+Ротационное соединение\s+Manufacturer/iu.test(footerRoot.text())) failures.push(`${language.code}/${pageName}: invalid generated or mixed-language Footer text detected.`);
    const footerStructure = footerRoot.find('*').map((_, element) => `${element.tagName}.${($(element).attr('class') || '').trim()}`).get().join('|');
    footerStructureSignatures.add(footerStructure);
    const expectedStyleHref = language.code === config.sourceLanguage.code ? `css/style.css?v=${footerStyleVersion}` : `../css/style.css?v=${footerStyleVersion}`;
    if ($(`link[rel="stylesheet"][href="${expectedStyleHref}"]`).length !== 1) failures.push(`${language.code}/${pageName}: canonical Footer stylesheet cache version is missing.`);
    if (pageName === 'index.html') {
      const qualityLinks = $('.portal-cert-actions > a').map((_, element) => [[$(element).attr('href'), compactText($(element).text())]]).get();
      const expectedLinks = [['manufacturing-quality.html', homepageQualityLinks[language.code][0]], ['production-inspection-testing.html', homepageQualityLinks[language.code][1]]];
      if (JSON.stringify(qualityLinks) !== JSON.stringify(expectedLinks)) failures.push(`${language.code}/index.html: direct Manufacturing & Quality and 100% leak-testing entries are incomplete.`);
    }
    if (language.code === 'de' && html.includes('Über:')) failures.push(`${language.code}/${pageName}: obsolete German navigation label Über: remains.`);
    $('form#quoteForm, form[action*="send_inquiry.php"]').each((_, form) => {
      if ($(form).find('input[name="source_language"]').attr('value') !== language.code) failures.push(`${language.code}/${pageName}: source_language is missing or incorrect.`);
      const redirect = $(form).find('input[name="redirect"]').attr('value');
      if (redirect && redirect !== pageUrl(language.code, 'thank-you.html')) failures.push(`${language.code}/${pageName}: localized form redirect is incorrect.`);
    });
    const pageStructuredNodes = [];
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const payload = JSON.parse($(element).html());
        pageStructuredNodes.push(...schemaNodes(payload));
        if (language.code !== config.sourceLanguage.code) {
          const contentTypes = new Set(['Article', 'BlogPosting', 'TechArticle', 'WebPage', 'WebSite', 'Product', 'FAQPage', 'HowTo']);
          for (const node of schemaNodes(payload)) {
            const types = schemaTypes(node);
            if ([...types].some((type) => contentTypes.has(type)) && node.inLanguage !== language.code) {
              failures.push(`${language.code}/${pageName}: ${[...types].join('/')} JSON-LD lacks the correct inLanguage.`);
            }
            if (types.has('Organization')) {
              const founders = Array.isArray(node.founder) ? node.founder : (node.founder ? [node.founder] : []);
              if (founders.some((founder) => founder.jobTitle !== expectedFounderJobTitle[language.code])) {
                failures.push(`${language.code}/${pageName}: Organization founder job title is not localized.`);
              }
              if (node.slogan && node.slogan !== expectedOrganizationSlogan[language.code]) {
                failures.push(`${language.code}/${pageName}: Organization slogan is not localized.`);
              }
            }
            if (types.has('Product') && Array.isArray(node.additionalProperty)) {
              for (const property of node.additionalProperty) {
                if (untranslatedStructuredPropertyNames.has(property?.name)) {
                  failures.push(`${language.code}/${pageName}: Product JSON-LD property name is not localized (${property.name}).`);
                }
                if (suspiciousStructuredEnglishPattern.test(String(property?.value || ''))) {
                  failures.push(`${language.code}/${pageName}: Product JSON-LD property value contains untranslated English (${property.name}).`);
                }
              }
            }
            if (types.has('BreadcrumbList') && Array.isArray(node.itemListElement) && node.itemListElement.length) {
              for (const item of node.itemListElement) {
                if (!item?.item || typeof item.item !== 'string') continue;
                try {
                  const itemUrl = new URL(item.item);
                  if (itemUrl.origin === new URL(config.siteUrl).origin) {
                    const itemPage = itemUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
                    if (config.pages.includes(itemPage) && item.item !== pageUrl(language.code, itemPage)) {
                      failures.push(`${language.code}/${pageName}: BreadcrumbList contains a cross-language URL (${item.item}).`);
                    }
                  }
                } catch {
                  failures.push(`${language.code}/${pageName}: BreadcrumbList contains an invalid URL (${item.item}).`);
                }
              }
              const current = node.itemListElement[node.itemListElement.length - 1];
              const visibleBreadcrumbName = compactText($('.breadcrumb-bar span').last().text());
              const breadcrumbName = visibleBreadcrumbName || (pageName === 'manufacturing-quality.html'
                ? navCopy.top[2]
                : pageName === 'production-inspection-testing.html'
                  ? navCopy.menus[2][0][1]
                  : pageName === 'case-studies.html'
                    ? navCopy.menus[1][0][1]
                    : seoByLanguage.get(language.code)?.[pageName]?.h1);
              if (compactText(current?.name) !== breadcrumbName || current?.item !== pageUrl(language.code, pageName)) {
                failures.push(`${language.code}/${pageName}: BreadcrumbList current page is not localized.`);
              }
            }
          }
        }
        for (const node of schemaNodes(payload)) {
          if (!schemaTypes(node).has('FAQPage')) continue;
          const visibleFaq = visibleFaqEntries($);
          const schemaFaq = Array.isArray(node.mainEntity) ? node.mainEntity : [];
          if (schemaFaq.length !== visibleFaq.length) {
            failures.push(`${language.code}/${pageName}: FAQ JSON-LD count does not match visible FAQ content.`);
          } else {
            visibleFaq.forEach((item, index) => {
              if (compactText(schemaFaq[index]?.name) !== item.question || compactText(schemaFaq[index]?.acceptedAnswer?.text) !== item.answer) {
                failures.push(`${language.code}/${pageName}: FAQ JSON-LD item ${index + 1} does not match visible content.`);
              }
            });
          }
        }
      } catch (error) {
        failures.push(`${language.code}/${pageName}: invalid JSON-LD (${error.message}).`);
      }
    });
    if (pageName === 'index.html' || pageName === 'about.html') {
      const organizations = pageStructuredNodes.filter((node) => schemaTypes(node).has('Organization'));
      if (organizations.length !== 1) {
        failures.push(`${language.code}/${pageName}: expected exactly one Organization JSON-LD entity; found ${organizations.length}.`);
      } else {
        const organization = organizations[0];
        if (organization['@id'] !== organizationEntityId || organization.url !== 'https://www.begapunk.com/') {
          failures.push(`${language.code}/${pageName}: Organization must use the canonical entity ID and root-domain URL.`);
        }
        if (organization.name !== canonicalBrandName || organization.legalName !== legalCompanyName) {
          failures.push(`${language.code}/${pageName}: Organization must use the canonical brand and legal company names.`);
        }
        if (organization.foundingDate !== '2022') {
          failures.push(`${language.code}/${pageName}: Organization foundingDate must be the owner-confirmed year 2022.`);
        }
        if (organization.alternateName !== undefined) {
          failures.push(`${language.code}/${pageName}: unverified Organization alternateName must not be published.`);
        }
        const organizationSameAs = Array.isArray(organization.sameAs) ? organization.sameAs : [];
        if (JSON.stringify(organizationSameAs) !== JSON.stringify(organizationSocialProfiles)) {
          failures.push(`${language.code}/${pageName}: Organization.sameAs must exactly contain the three approved Begapunk brand channels in canonical order.`);
        }
        if (new Set(organizationSameAs).size !== organizationSameAs.length) {
          failures.push(`${language.code}/${pageName}: Organization.sameAs contains a duplicate social profile.`);
        }
        if (organizationSameAs.includes(founderSocialProfiles[0])) {
          failures.push(`${language.code}/${pageName}: Organization.sameAs must not contain the founder's personal LinkedIn profile.`);
        }
        const founder = organization.founder;
        if (!founder || Array.isArray(founder) || typeof founder !== 'object' || !schemaTypes(founder).has('Person')) {
          failures.push(`${language.code}/${pageName}: Organization.founder must be one Person object.`);
        } else {
          if (founder['@id'] !== founderEntityId) {
            failures.push(`${language.code}/${pageName}: Organization.founder.@id must be ${founderEntityId}.`);
          }
          const founderSameAs = Array.isArray(founder.sameAs) ? founder.sameAs : [];
          if (JSON.stringify(founderSameAs) !== JSON.stringify(founderSocialProfiles)) {
            failures.push(`${language.code}/${pageName}: Organization.founder.sameAs must exactly contain G. C. Cao's approved personal LinkedIn profile.`);
          }
          if (new Set(founderSameAs).size !== founderSameAs.length) {
            failures.push(`${language.code}/${pageName}: Organization.founder.sameAs contains a duplicate social profile.`);
          }
        }
      }
    }
    const localBusinesses = pageStructuredNodes.filter((node) => schemaTypes(node).has('LocalBusiness'));
    if (['about.html', 'contact.html'].includes(pageName) && localBusinesses.length !== 1) {
      failures.push(`${language.code}/${pageName}: expected exactly one LocalBusiness JSON-LD entity; found ${localBusinesses.length}.`);
    }
    for (const business of localBusinesses) {
      const sameAs = Array.isArray(business.sameAs) ? business.sameAs : [];
      if (business['@id'] !== localBusinessEntityId
          || business.url !== 'https://www.begapunk.com/'
          || business.name !== canonicalBrandName
          || business.legalName !== legalCompanyName) {
        failures.push(`${language.code}/${pageName}: LocalBusiness must use the canonical ID, root URL, brand name and legal name.`);
      }
      if (business.alternateName !== undefined) {
        failures.push(`${language.code}/${pageName}: unverified LocalBusiness alternateName must not be published.`);
      }
      if (JSON.stringify(sameAs) !== JSON.stringify(organizationSocialProfiles)) {
        failures.push(`${language.code}/${pageName}: LocalBusiness.sameAs must exactly contain the approved Begapunk brand channels.`);
      }
      if (sameAs.includes(founderSocialProfiles[0])) {
        failures.push(`${language.code}/${pageName}: LocalBusiness.sameAs must not contain the founder's personal LinkedIn profile.`);
      }
      if (business.parentOrganization?.['@id'] !== organizationEntityId) {
        failures.push(`${language.code}/${pageName}: LocalBusiness.parentOrganization must reference the canonical Organization.`);
      }
    }
    for (const node of pageStructuredNodes) {
      const sameAs = Array.isArray(node.sameAs) ? node.sameAs : [];
      if (!sameAs.includes(founderSocialProfiles[0])) continue;
      if (!schemaTypes(node).has('Person') || node['@id'] !== founderEntityId) {
        failures.push(`${language.code}/${pageName}: the personal LinkedIn profile may appear only on the canonical Founder Person entity.`);
      }
    }
    for (const obsoleteProfile of obsoleteHomepageSocialProfiles) {
      if (html.includes(obsoleteProfile)) {
        failures.push(`${language.code}/${pageName}: obsolete social profile remains in page data (${obsoleteProfile}).`);
      }
    }
    if (['case-bp-2p-95-pneumatic-chuck-integration.html', 'case-bp-3p-s06-sensor-monitored-chuck.html'].includes(pageName)) {
      const articles = pageStructuredNodes.filter((node) => schemaTypes(node).has('TechArticle'));
      if (articles.length !== 1) {
        failures.push(`${language.code}/${pageName}: expected exactly one TechArticle JSON-LD entity.`);
      } else if (articles[0].author?.['@id'] !== organizationEntityId || articles[0].publisher?.['@id'] !== organizationEntityId) {
        failures.push(`${language.code}/${pageName}: TechArticle author and publisher must reference the canonical Organization entity.`);
      }
    }
    for (const element of $('[href], [src], [poster], [action]').toArray()) {
      for (const attribute of ['href', 'src', 'poster', 'action']) {
        await verifyLocalReference($(element).attr(attribute), filePath);
      }
    }
    for (const element of $('[srcset]').toArray()) {
      const candidates = ($(element).attr('srcset') || '').split(',');
      for (const candidate of candidates) {
        await verifyLocalReference(candidate.trim().split(/\s+/)[0], filePath);
      }
    }
    for (const option of $('.i18n-switcher option[value]').toArray()) {
      await verifyLocalReference($(option).attr('value'), filePath);
    }
  }
}

if (footerStructureSignatures.size !== 1) failures.push(`Footer structure differs across the ${verifiedLanguages.length * config.pages.length} canonical pages.`);

try {
  const globalCss = await fs.readFile(path.join(sourceRoot, 'css', 'style.css'), 'utf8');
  if (/\.nav\.(?:open|active)\b/.test(globalCss)) failures.push('css/style.css: legacy .nav.open or .nav.active mobile state remains.');
  if (!/\.nav\.mobile-open/.test(globalCss) || !/max-height:\s*calc\(100vh\s*-\s*64px\)/.test(globalCss) || !/overflow-y:\s*auto/.test(globalCss)) failures.push('css/style.css: canonical scrollable .nav.mobile-open state is incomplete.');
  if ((globalCss.match(/\.nav\.mobile-open\s*\{/g) || []).length !== 1) failures.push('css/style.css: mobile-open navigation rules must be consolidated into one canonical block.');
  if (!/@media\s*\(max-width:\s*1024px\)[\s\S]*?\.header\s*\{[^}]*z-index:\s*1[12]\d{2}/.test(globalCss)) failures.push('css/style.css: mobile header stacking context must be above the floating CTA.');
  if (!/\.mobile-toggle span\s*\{\s*display:\s*none/.test(globalCss)) failures.push('css/style.css: decorative hamburger spans must be hidden in the text-only mobile control.');
  for (const label of ['Menu', 'Menü', 'メニュー', 'Меню']) {
    if (!globalCss.includes(`content:\"${label}\"`)) failures.push(`css/style.css: localized mobile menu label ${label} is missing.`);
  }
    if (/\.footer-grid\b/.test(globalCss)) failures.push('css/style.css: obsolete two-column Footer grid remains.');
    if (!/\.footer-brand-band\s*\{[^}]*grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/is.test(globalCss)) failures.push('css/style.css: desktop three-part Footer brand band is missing.');
    if (!/\.footer-contact-band\s*\{[^}]*display:\s*flex/is.test(globalCss)) failures.push('css/style.css: Footer contact band layout is missing.');
    if (!/\.footer-social-links\s+a\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/is.test(globalCss)) failures.push('css/style.css: Footer social controls must be exactly 44 by 44 pixels.');
    if (!/@media\s*\(max-width:\s*1179px\)[\s\S]*?\.footer-navigation\s*\{[^}]*grid-template-columns:\s*repeat\(2/is.test(globalCss)) failures.push('css/style.css: tablet Footer 2-column navigation rule is missing.');
  if (!/@media\s*\(max-width:\s*430px\)[\s\S]*?\.footer-navigation\s*\{[^}]*grid-template-columns:\s*1fr/is.test(globalCss)) failures.push('css/style.css: narrow-mobile Footer single-column rule is missing.');
  if (!/\.footer\s+a:focus-visible\s*\{[^}]*outline:\s*3px/is.test(globalCss)) failures.push('css/style.css: clear Footer keyboard focus style is missing.');
  if (!/\.footer-links\s+a\s*\{[^}]*min-height:\s*44px/is.test(globalCss)) failures.push('css/style.css: Footer navigation touch targets must be at least 44px high.');
  if (!/\.nav-home-mobile\s*\{\s*display:\s*none\s*!important/.test(globalCss)) failures.push('css/style.css: desktop-hidden mobile Home rule is missing.');
  if (!/\.nav-dropdown:focus-within\s+\.nav-dropdown-menu/.test(globalCss)) failures.push('css/style.css: desktop dropdown focus-within support is missing.');
  for (const cssName of ['production-inspection-testing.css', 'case-studies.css', 'application-case.css', 'manufacturing-quality.css']) {
    const css = await fs.readFile(path.join(sourceRoot, 'css', cssName), 'utf8');
    if (/\.nav\s*\{|\.nav\.(?:open|active|mobile-open)\b|\.header-inner\s*\{|\.mobile-toggle\s*\{/.test(css)) failures.push(`css/${cssName}: page-specific header or navigation state rule must be removed.`);
  }
} catch (error) {
  failures.push(`Navigation CSS verification failed (${error.message}).`);
}

try {
  const navigationSource = await fs.readFile(path.join(sourceRoot, 'js', 'site-navigation.js'), 'utf8');
  if (navigationSource.includes('stopImmediatePropagation')) failures.push('js/site-navigation.js: obsolete capture-stage listener suppression remains.');
  for (const required of ["toggle('mobile-open')", "event.key === 'Escape'", 'toggle.focus()', 'window.innerWidth > 1024', "toggle.setAttribute('aria-expanded'"]) {
    if (!navigationSource.includes(required)) failures.push(`js/site-navigation.js: required behavior is missing (${required}).`);
  }
} catch (error) {
  failures.push(`js/site-navigation.js: navigation behavior verification failed (${error.message}).`);
}

const sitemapExcludedPages = new Set(config.sitemapExcludedPages || []);
const excludedPages = new Set([...sitemapExcludedPages, ...discoveryExcludedPages]);
const discoverablePages = config.pages.filter((pageName) => !excludedPages.has(pageName));
const localizedLlmsPages = discoverablePages;

let verifiedDiscoveryNoindexPages = 0;
for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code
    ? localizedRoot
    : path.join(localizedRoot, language.code);
  for (const pageName of config.pages) {
    const owner = language.code === config.sourceLanguage.code ? pageName : `${language.code}/${pageName}`;
    try {
      const html = await fs.readFile(path.join(languageRoot, pageName), 'utf8');
      const $ = load(html, { decodeEntities: false });
      const robots = $('meta[name="robots"]');
      const managedRobots = robots.filter((_, element) => $(element).attr('data-discovery-exclusion') === DISCOVERY_ROBOTS_MARKER);
      if (discoveryExcludedPages.has(pageName)) {
        const content = (robots.first().attr('content') || '').toLowerCase().replace(/\s+/g, '');
        if (robots.length !== 1 || managedRobots.length !== 1 || content !== 'noindex,follow') {
          failures.push(`${owner}: quarantined P1 page must have exactly one managed robots directive with content noindex,follow.`);
        } else {
          verifiedDiscoveryNoindexPages += 1;
        }
      } else {
        if (managedRobots.length) failures.push(`${owner}: non-quarantined page retains managed discovery-exclusion metadata.`);
        const hasNoindex = robots.toArray().some((element) => /(?:^|,)\s*noindex\s*(?:,|$)/i.test($(element).attr('content') || ''));
        if (!sitemapExcludedPages.has(pageName) && hasNoindex) {
          failures.push(`${owner}: discoverable non-quarantined page must not be marked noindex.`);
        }
      }
    } catch (error) {
      failures.push(`${owner}: discovery robots verification failed (${error.message}).`);
    }
  }
}
const expectedDiscoveryNoindexPages = discoveryExcludedPages.size * verifiedLanguages.length;
if (verifiedDiscoveryNoindexPages !== expectedDiscoveryNoindexPages) {
  failures.push(`Discovery robots coverage: expected ${expectedDiscoveryNoindexPages} quarantined localized pages, verified ${verifiedDiscoveryNoindexPages}.`);
}

for (const language of verifiedLanguages) {
  const searchIndexPath = language.code === config.sourceLanguage.code
    ? path.join(localizedRoot, 'search-index.json')
    : path.join(localizedRoot, language.code, 'search-index.json');
  const searchOwner = language.code === config.sourceLanguage.code
    ? 'search-index.json'
    : `${language.code}/search-index.json`;
  try {
    const searchIndexSource = await fs.readFile(searchIndexPath, 'utf8');
    verifyGeneratedText(searchIndexSource, searchOwner);
    const searchIndex = JSON.parse(searchIndexSource);
    if (!Array.isArray(searchIndex) || !searchIndex.length) {
      failures.push(`${searchOwner}: index is empty.`);
    } else {
      const urls = searchIndex.map((record) => record?.url).filter(Boolean);
      const duplicateUrls = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))];
      if (urls.length !== discoverablePages.length) failures.push(`${searchOwner}: expected ${discoverablePages.length} records, found ${urls.length}.`);
      duplicateUrls.forEach((url) => failures.push(`${searchOwner}: duplicate URL ${url}.`));
      discoverablePages.forEach((pageName) => {
        if (!urls.includes(pageName)) failures.push(`${searchOwner}: missing ${pageName}.`);
      });
      urls.filter((url) => !discoverablePages.includes(url)).forEach((url) => failures.push(`${searchOwner}: unexpected URL ${url}.`));
      for (const casePage of ['case-studies.html', 'case-bp-2p-95-pneumatic-chuck-integration.html', 'case-bp-3p-s06-sensor-monitored-chuck.html']) {
        const records = searchIndex.filter((record) => record?.url === casePage);
        if (records.length !== 1) continue;
        const record = records[0];
        const tags = new Set((Array.isArray(record.tags) ? record.tags : []).map((tag) => String(tag).toLowerCase()));
        if (record.category !== 'application') failures.push(`${searchOwner}: ${casePage} category must be application, not ${record.category || 'missing'}.`);
        if (!tags.has('application') || !tags.has('case study')) failures.push(`${searchOwner}: ${casePage} must include application and case study tags.`);
        for (const invalidTag of ['core', 'page', 'information']) {
          if (tags.has(invalidTag)) failures.push(`${searchOwner}: ${casePage} retains invalid ${invalidTag} tag.`);
        }
      }
    }
  } catch (error) {
    failures.push(`${searchOwner}: missing or invalid (${error.message}).`);
  }
  if (language.code === config.sourceLanguage.code) continue;
  const llmsPath = path.join(localizedRoot, language.code, 'llms.txt');
  try {
    const llmsSource = await fs.readFile(llmsPath, 'utf8');
    verifyGeneratedText(llmsSource, `${language.code}/llms.txt`);
    for (const pageName of localizedLlmsPages) {
      const expectedUrl = pageUrl(language.code, pageName);
      if (!llmsSource.includes(expectedUrl)) failures.push(`${language.code}/llms.txt: missing ${expectedUrl}.`);
    }
    for (const excludedLanguage of verifiedLanguages) {
      for (const pageName of excludedPages) {
        const excludedUrl = pageUrl(excludedLanguage.code, pageName);
        if (llmsSource.includes(excludedUrl)) failures.push(`${language.code}/llms.txt: excluded URL is present (${excludedUrl}).`);
      }
    }
  } catch (error) {
    failures.push(`${language.code}/llms.txt: missing or invalid (${error.message}).`);
  }
}

const manufacturingQualityPage = 'manufacturing-quality.html';
const manufacturingQualityHeadings = {
  en: 'Manufacturing & Quality for Pneumatic Rotary Unions',
  de: 'Fertigung und Qualität pneumatischer Drehdurchführungen',
  ja: '空圧用ロータリージョイントの製造・品質管理',
  ru: 'Производство и контроль качества вращающихся соединений',
};
const manufacturingQualityHeroCopy = {
  en: 'Function-led surface treatment for aluminum rotary-union components, documented with production photographs and a recorded coating-thickness measurement.',
  de: 'Funktionsgerechte Oberflächenbehandlung für Aluminiumbauteile, dokumentiert mit Produktionsfotos und einer aufgezeichneten Schichtdickenmessung.',
  ja: 'アルミニウム製ロータリージョイント部品の機能に応じた表面処理を、製造写真と皮膜厚さの測定記録とともに紹介します。',
  ru: 'Функциональная обработка алюминиевых деталей ротационных соединений показана на производственных фотографиях и дополнена зафиксированным измерением толщины покрытия.',
};
const manufacturingQualityRequiredTerms = {
  en: [/hard-anodized rotor/i, /color-anodized stator housing/i, /low-speed[\s\S]{0,80}O-ring/i],
  de: [/harteloxierte[rsn]? Rotor/i, /farbeloxierte[sn]? Statorgehäuse/i, /langsam[\s\S]{0,100}O-Ring/i],
  ja: [/硬質アルマイト処理ロータ/, /カラーアルマイト処理ステータハウジング/, /低速回転[\s\S]{0,80}Oリング/],
  ru: [/ротор[\s\S]{0,80}твёрдым анодированием/i, /корпус статора[\s\S]{0,80}цветным анодированием/i, /низкоскоростн[\s\S]{0,120}O-ring/i],
};
const manufacturingQualityForbiddenClaims = /(?:all|every|entire batch|batch-wide)[^.!?]{0,80}51[.,]7|51[.,]7[^.!?]{0,80}(?:all|every|entire batch|batch average)|zero wear|maintenance[- ]free|MIL(?:-PRF-8625)?\s*Type\s*III\s*(?:certified|compliant)|50\s*[±+\/-]\s*\d+\s*(?:μm|µm|um)|耐磨性提高\d|寿命提高\d|нулев(?:ой|ого)\s+износ/i;
const manufacturingPhotoPassageClaims = {
  en: /(?:photograph shows|caption[^.!?]*|assembled)\s+(?:a\s+)?multi-passage pneumatic rotary union/i,
  de: /(?:Foto zeigt|Montierte)\s+(?:eine\s+)?Mehrkanal-Drehdurchführung/i,
  ja: /(?:写真|組立品)[^。]{0,80}多回路空圧用ロータリジョイント/,
  ru: /(?:фотографи|собранн)[^.]{0,100}многоканальн/i,
};
const manufacturingImageNames = [
  'rotor-stator-anodizing-close-up',
  'color-anodized-stator-batch',
  'hard-anodized-rotor-thickness-check',
  'assembled-pneumatic-rotary-union',
  'assembled-rotary-union-batch',
];
const statorProcessHeadings = {
  en: 'From Aluminum Billet to Color-Anodized Stator Housing',
  de: 'Vom Aluminium-Rohling zum farbeloxierten Statorgehäuse',
  ja: 'アルミ丸棒材からカラーアルマイト処理済みステータハウジングまで',
  ru: 'От алюминиевой заготовки до корпуса статора с цветным анодированием',
};
const statorProcessStepHeadings = {
  en: ['Material preparation', 'Two machining setups', 'Dimensional sampling', 'External anodizing and return inspection'],
  de: ['Materialvorbereitung', 'Zwei Aufspannungen', 'Stichprobenprüfung der Maße', 'Externes Farbeloxieren und Wareneingangsprüfung'],
  ja: ['材料準備', '2回の段取り', '抜取寸法検査', '外部カラーアルマイト処理と受入検査'],
  ru: ['Подготовка материала', 'Два установа детали', 'Выборочный контроль размеров', 'Внешнее анодирование и входной контроль'],
};
const statorProcessRequiredTerms = {
  en: [/6061 aluminum/i, /7075/i, /4-axis turn-mill/i, /sample-inspected/i, /approximately 5\s*(?:μm|µm)/i],
  de: [/Aluminiumlegierung 6061/i, /Legierung 7075/i, /4-Achs-Dreh-Fräs/i, /Stichprobenprüfung/i, /ca\. 5\s*(?:μm|µm)/i],
  ja: [/6061アルミ合金/, /7075アルミ合金/, /4軸複合旋盤/, /抜き取り検査/, /約5\s*(?:μm|µm)/i],
  ru: [/алюминиевый сплав 6061/i, /сплав 7075/i, /4-осев/i, /выборочн/i, /около 5\s*мкм/i],
};
const statorProcessSearchTerms = {
  en: ['stator machining', 'turn-mill machining', '6061 aluminum', '7075 aluminum', 'color anodizing', 'manufacturing process'],
  de: ['Statorbearbeitung', '4-Achs-Dreh-Fräs-Bearbeitung', 'Aluminium 6061', 'Aluminium 7075', 'Farbeloxieren', 'Fertigungsablauf'],
  ja: ['ステータ加工', '4軸複合旋盤加工', '6061アルミ合金', '7075アルミ合金', 'カラーアルマイト', '製造工程'],
  ru: ['обработка статора', '4-осевая токарно-фрезерная обработка', 'алюминий 6061', 'алюминий 7075', 'цветное анодирование', 'процесс изготовления'],
};
const statorProcessEnglishResidue = /\b(?:Stator manufacturing process|Material preparation|Two machining setups|Dimensional sampling|External anodizing and return inspection|View 100% Leak Testing|Evidence boundary|Photo note)\b/i;
const statorPhotoNoteLabels = {
  en: /^Photo note:/i,
  de: /^Aussagegrenze der Fotos:/i,
  ja: /^写真で確認できる範囲：/,
  ru: /^Границы подтверждения по фотографиям:/i,
};
const rotorMeasurementNoteLabels = {
  en: /^Coating thickness:/i,
  de: /^Schichtdicke:/i,
  ja: /^皮膜厚さ：/,
  ru: /^Толщина покрытия:/i,
};
const statorProcessImages = [
  { name: 'stator-cut-billets-4x5', width: 864, height: 1080 },
  { name: 'stator-turn-mill-machining-4x5', width: 864, height: 1080 },
  { name: 'stator-before-anodizing-4x5', width: 864, height: 1080 },
];
const statorLeakTestingStatements = {
  en: 'After final assembly, every finished rotary union and every individual passage enters the existing 100% leak-testing process.',
  de: 'Nach der Endmontage wird bei jeder fertigen Drehdurchführung jeder einzelne Kanal im bestehenden 100%-Dichtheitsprüfprozess geprüft.',
  ja: '最終組立後は、完成したすべてのロータリージョイントについて、各流路を既存の全数漏れ検査工程で個別に確認します。',
  ru: 'После окончательной сборки каждое готовое вращающееся соединение и каждый отдельный канал проверяют в рамках действующего процесса 100%-ного контроля герметичности.',
};
const obsoleteStatorLeakTestingStatements = {
  en: /documented 100% leak-testing process/i,
  de: /dokumentierten 100-%-Dichtheitsprüfprozess/i,
  ja: /文書化された全数漏れ検査|追跡可能な全数漏れ検査/,
  ru: /документированн[^.]{0,50}100%-н[^.]{0,30}контрол[^.]{0,30}герметичности/i,
};

if (config.pages.filter((pageName) => pageName === manufacturingQualityPage).length !== 1) {
  failures.push(`i18n/config.json: ${manufacturingQualityPage} must appear exactly once.`);
}

for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  try {
    const source = await fs.readFile(path.join(languageRoot, manufacturingQualityPage), 'utf8');
    const $page = load(source, { decodeEntities: false });
    const mainText = compactText($page('main').text());
    if ($page('h1').length !== 1 || compactText($page('h1').text()) !== manufacturingQualityHeadings[language.code]) {
      failures.push(`${language.code}/${manufacturingQualityPage}: H1 is missing, duplicated, or not localized as approved.`);
    }
    if (compactText($page('.mq-hero > .container > p').text()) !== manufacturingQualityHeroCopy[language.code]) {
      failures.push(`${language.code}/${manufacturingQualityPage}: the production-photo and coating-thickness hero summary is missing or stale.`);
    }
    if ($page('.mq-breadcrumb a').length !== 1 || $page('.mq-breadcrumb a').attr('href') !== 'index.html') failures.push(`${language.code}/${manufacturingQualityPage}: visible breadcrumb must be flattened to Home / Quality.`);
    if ($page('link[rel="canonical"]').attr('href') !== pageUrl(language.code, manufacturingQualityPage)) {
      failures.push(`${language.code}/${manufacturingQualityPage}: canonical URL is incorrect.`);
    }
    const hreflangs = $page('link[rel="alternate"][hreflang]').map((_, element) => $page(element).attr('hreflang')).get();
    for (const code of ['en', 'de', 'ja', 'ru', 'x-default']) {
      if (hreflangs.filter((value) => value === code).length !== 1) failures.push(`${language.code}/${manufacturingQualityPage}: hreflang ${code} is missing or duplicated.`);
    }
    for (const pattern of manufacturingQualityRequiredTerms[language.code] || []) {
      if (!pattern.test(mainText)) failures.push(`${language.code}/${manufacturingQualityPage}: required localized manufacturing or inspection terminology is missing (${pattern}).`);
    }
    const photographedThicknessPattern = language.code === 'ru'
      ? /51[.,]7\s*мкм/i
      : /51[.,]7\s*(?:μm|µm)/i;
    if (!photographedThicknessPattern.test(mainText)) failures.push(`${language.code}/${manufacturingQualityPage}: the photographed 51.7 μm reading is missing.`);
    if (manufacturingQualityForbiddenClaims.test(mainText)) failures.push(`${language.code}/${manufacturingQualityPage}: an unsupported batch, life, certification, or fixed-tolerance claim was detected.`);
    if (manufacturingPhotoPassageClaims[language.code]?.test(mainText)) failures.push(`${language.code}/${manufacturingQualityPage}: a photograph is being used to infer an internal multi-passage construction.`);
    if ($page('main a[href^="BP-"]').length) failures.push(`${language.code}/${manufacturingQualityPage}: photographs or manufacturing evidence must not be assigned to a product model.`);
    if (!$page('link[href*="manufacturing-quality.css?v=20260808-mq4"]').length) failures.push(`${language.code}/${manufacturingQualityPage}: page CSS or cache key is missing.`);
    for (const imageName of manufacturingImageNames) {
      const jpg = $page(`img[src$="${imageName}.jpg"]`);
      const webp = $page(`source[srcset$="${imageName}.webp"]`);
      if (jpg.length !== 1 || webp.length !== 1 || !jpg.attr('width') || !jpg.attr('height')) {
        failures.push(`${language.code}/${manufacturingQualityPage}: ${imageName} JPG/WebP pair or intrinsic dimensions are incomplete.`);
      }
    }
    const statorProcess = $page('.mq-stator-process');
    if (statorProcess.length !== 1) failures.push(`${language.code}/${manufacturingQualityPage}: expected exactly one .mq-stator-process module.`);
    const statorText = compactText(statorProcess.text());
    if (compactText(statorProcess.find('h2').text()) !== statorProcessHeadings[language.code]) failures.push(`${language.code}/${manufacturingQualityPage}: stator-process H2 is missing or not localized as approved.`);
    const actualStepHeadings = statorProcess.find('.mq-process-steps h3').map((_, element) => compactText($page(element).text())).get();
    if (JSON.stringify(actualStepHeadings) !== JSON.stringify(statorProcessStepHeadings[language.code])) failures.push(`${language.code}/${manufacturingQualityPage}: stator-process step headings are missing, reordered, or not localized.`);
    for (const pattern of statorProcessRequiredTerms[language.code] || []) {
      if (!pattern.test(statorText)) failures.push(`${language.code}/${manufacturingQualityPage}: required stator-process terminology or owner-confirmed fact is missing (${pattern}).`);
    }
    if (!/(?:approximately|ca\.|約|около)\s*5\s*(?:μm|µm|мкм)/iu.test(statorText)) failures.push(`${language.code}/${manufacturingQualityPage}: stator color-anodizing thickness is not stated as approximately 5 µm.`);
    if (/51[.,]7\s*(?:μm|µm|мкм)/iu.test(statorText)) failures.push(`${language.code}/${manufacturingQualityPage}: the rotor-only 51.7 µm reading leaked into the stator process module.`);
    if (language.code !== config.sourceLanguage.code && statorProcessEnglishResidue.test(statorText)) failures.push(`${language.code}/${manufacturingQualityPage}: English stator-process heading, step, CTA, or evidence label remains.`);
    if (statorProcess.find('.mq-process-gallery .mq-figure').length !== 3 || statorProcess.find('.mq-process-steps .mq-control').length !== 4 || statorProcess.find('.mq-stator-boundary').length !== 1) {
      failures.push(`${language.code}/${manufacturingQualityPage}: stator-process gallery, four process steps, or photo note is incomplete.`);
    }
    const statorPhotoNote = compactText(statorProcess.find('.mq-stator-boundary').text());
    if (!statorPhotoNoteLabels[language.code]?.test(statorPhotoNote)) failures.push(`${language.code}/${manufacturingQualityPage}: the stator-process photo note is missing or not localized.`);
    if (statorProcess.find('.mq-process-gallery .mq-process-figure').length !== 3 || statorProcess.find('.mq-figure-landscape, .mq-figure-portrait').length) {
      failures.push(`${language.code}/${manufacturingQualityPage}: all three stator-process figures must use the common 4:5 module class.`);
    }
    const leakTestingStatement = compactText(statorProcess.find('.mq-stator-leak-link p').text());
    if (leakTestingStatement !== statorLeakTestingStatements[language.code]) failures.push(`${language.code}/${manufacturingQualityPage}: the approved existing-process leak-testing statement is missing or altered.`);
    if (obsoleteStatorLeakTestingStatements[language.code]?.test(statorText)) failures.push(`${language.code}/${manufacturingQualityPage}: an obsolete documented or traceable leak-testing statement remains.`);
    for (const image of statorProcessImages) {
      const jpg = statorProcess.find(`img[src$="${image.name}.jpg"]`);
      const webp = statorProcess.find(`source[srcset$="${image.name}.webp"]`);
      if (jpg.length !== 1 || webp.length !== 1) {
        failures.push(`${language.code}/${manufacturingQualityPage}: ${image.name} JPG/WebP pair is missing or duplicated.`);
        continue;
      }
      if (Number(jpg.attr('width')) !== image.width || Number(jpg.attr('height')) !== image.height) {
        failures.push(`${language.code}/${manufacturingQualityPage}: ${image.name} HTML intrinsic dimensions must be ${image.width} × ${image.height}.`);
      }
      for (const [kind, reference] of [['JPG', jpg.attr('src')], ['WebP', webp.attr('srcset')]]) {
        const filePath = path.resolve(languageRoot, reference);
        try {
          const metadata = await sharp(filePath).metadata();
          if (metadata.width !== image.width || metadata.height !== image.height) failures.push(`${language.code}/${manufacturingQualityPage}: ${image.name} ${kind} file dimensions do not match HTML.`);
          if (metadata.exif || metadata.xmp || metadata.iptc || metadata.icc) failures.push(`${language.code}/${manufacturingQualityPage}: ${image.name} ${kind} contains public metadata that should have been stripped.`);
        } catch (error) {
          failures.push(`${language.code}/${manufacturingQualityPage}: ${image.name} ${kind} cannot be read (${error.message}).`);
        }
      }
    }
    const rotorInspectionSection = $page('.mq-reading').closest('.mq-section');
    const rotorInspectionText = compactText(rotorInspectionSection.text());
    if ($page('.mq-reading').length !== 1 || $page('.mq-boundary').length !== 2 || $page('.mq-stator-boundary').length !== 1 || $page('.mq-evidence').length !== 0) {
      failures.push(`${language.code}/${manufacturingQualityPage}: expected one rotor reading, one stator photo note, one rotor measurement boundary, and no duplicate photo-evidence summary.`);
    }
    if (!/51[.,]7\s*(?:μm|µm|мкм)/iu.test(rotorInspectionText) || !rotorInspectionSection.find('.mq-boundary:not(.mq-stator-boundary)').length) {
      failures.push(`${language.code}/${manufacturingQualityPage}: the rotor 51.7 µm production coating measurement is missing.`);
    }
    const rotorMeasurementNote = compactText(rotorInspectionSection.find('.mq-boundary:not(.mq-stator-boundary)').text());
    if (!rotorMeasurementNoteLabels[language.code]?.test(rotorMeasurementNote)) failures.push(`${language.code}/${manufacturingQualityPage}: the 51.7 µm coating-thickness note is missing or not localized.`);
    const ids = $page('[id]').map((_, element) => $page(element).attr('id')).get();
    if (new Set(ids).size !== ids.length) failures.push(`${language.code}/${manufacturingQualityPage}: duplicate HTML id detected.`);
    if (statorProcess.find('a[href="production-inspection-testing.html"]').length !== 1) failures.push(`${language.code}/${manufacturingQualityPage}: localized 100% leak-testing process link is missing or duplicated.`);
    const schemas = $page('script[type="application/ld+json"]').map((_, element) => JSON.parse($page(element).text())).get();
    const breadcrumb = schemas.flatMap((schema) => schemaNodes(schema)).find((node) => schemaTypes(node).has('BreadcrumbList'));
    if (breadcrumb?.itemListElement?.length !== 2 || breadcrumb.itemListElement[1]?.item !== pageUrl(language.code, manufacturingQualityPage)) failures.push(`${language.code}/${manufacturingQualityPage}: JSON-LD breadcrumb must be flattened to Home / Quality.`);
    const searchIndex = JSON.parse(await fs.readFile(path.join(languageRoot, 'search-index.json'), 'utf8'));
    const record = searchIndex.find((entry) => entry.url === manufacturingQualityPage);
    if (!record || !/51[.,]7/.test(JSON.stringify(record)) || compactText(record.h1) !== manufacturingQualityHeadings[language.code]) {
      failures.push(`${language.code}/search-index.json: manufacturing-quality record is missing or not synchronized.`);
    } else {
      const recordText = compactText(JSON.stringify(record));
      if (!recordText.includes(statorProcessHeadings[language.code])) failures.push(`${language.code}/search-index.json: stator manufacturing process H2 is not synchronized.`);
      if (!recordText.includes(statorLeakTestingStatements[language.code]) || obsoleteStatorLeakTestingStatements[language.code]?.test(recordText)) failures.push(`${language.code}/search-index.json: stator leak-testing process wording is stale or unsynchronized.`);
      for (const term of statorProcessSearchTerms[language.code] || []) {
        if (!record.keywords?.includes(term) || !recordText.toLocaleLowerCase(language.code).includes(term.toLocaleLowerCase(language.code))) {
          failures.push(`${language.code}/search-index.json: stator-process search term is missing or not synchronized (${term}).`);
        }
      }
    }
    const llmsPath = language.code === config.sourceLanguage.code
      ? path.join(localizedRoot, 'llms.txt')
      : path.join(languageRoot, 'llms.txt');
    const llmsSource = await fs.readFile(llmsPath, 'utf8');
    if (!llmsSource.includes(pageUrl(language.code, manufacturingQualityPage))) {
      failures.push(`${language.code}/llms.txt: manufacturing-quality URL is missing.`);
    }
  } catch (error) {
    failures.push(`${language.code}/${manufacturingQualityPage}: manufacturing-quality verification failed (${error.message}).`);
  }
}

for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  for (const configuredPage of config.pages) {
    try {
      const source = await fs.readFile(path.join(languageRoot, configuredPage), 'utf8');
      const $page = load(source, { decodeEntities: false });
      const qualityMenu = $page('.nav-dropdown').eq(2);
      if (qualityMenu.children(`.nav-dropdown-toggle[href="${manufacturingQualityPage}"]`).length !== 1
          || qualityMenu.find(`.nav-dropdown-menu a[href="${manufacturingQualityPage}"]`).length !== 0) {
        failures.push(`${language.code}/${configuredPage}: Quality parent must be the sole Header link to manufacturing-quality.`);
      }
      if ($page(`.footer-links a[href="${manufacturingQualityPage}"]`).length !== 1) {
        failures.push(`${language.code}/${configuredPage}: Company footer must contain exactly one manufacturing-quality link.`);
      }
      if (configuredPage === 'about.html' && $page(`.mq-about-entry a[href="${manufacturingQualityPage}"]`).length !== 1) {
        failures.push(`${language.code}/about.html: manufacturing-process section entry is missing.`);
      }
    } catch (error) {
      failures.push(`${language.code}/${configuredPage}: manufacturing-quality navigation verification failed (${error.message}).`);
    }
  }
}

const productionInspectionPage = 'production-inspection-testing.html';
const productionInspectionHeadings = {
  en: '100% Passage-by-Passage Leak Testing for Pneumatic Rotary Unions',
  de: '100%-Dichtheitsprüfung jedes einzelnen Kanals bei pneumatischen Drehdurchführungen',
  ja: '空圧用ロータリージョイントの全数・流路別漏れ検査',
  ru: '100%-ный поканальный контроль герметичности пневматических вращающихся соединений',
};
const productionInspectionBoundaryHeadings = {
  en: 'Current production process',
  de: 'Aktueller Produktionsablauf',
  ja: '現在の量産検査工程',
  ru: 'Действующий производственный процесс',
};
const productionInspectionRequiredTerms = {
  en: [/100% of finished units/i, /Every passage tested individually/i, /1\.0 MPa/i, /Approximately 1 second/i, /4 seconds/i, /Unpressurized and open/i, /yellow quarantine container/i, /(?:fully|completely) retest|complete passage-by-passage test/i, /Every passage must pass before packing and storage/i],
  de: [/100 % der Fertigteile/i, /Jeder Kanal wird einzeln geprüft/i, /1,0 MPa/i, /Etwa 1 Sekunde/i, /4 Sekunden/i, /Drucklos und offen/i, /gelben Sperrbehälter/i, /vollständig erneut prüfen/i, /Alle Kanäle müssen vor Verpackung und Einlagerung bestanden sein/i],
  ja: [/完成品の100％（全数）/, /すべての流路を個別に検査/, /1\.0 MPa/, /約1秒/, /4秒/, /無加圧で大気開放/, /黄色の不適合品隔離容器/, /全流路(?:を)?再検査/, /すべての流路が合格した後に梱包・入庫/],
  ru: [/100\s% готовых изделий/i, /Каждый канал проверяется отдельно/i, /1,0 МПа/i, /Около 1 секунды/i, /4 секунды/i, /Без давления[^.]{0,30}открыт/i, /жёлт(?:ый|ого|ую) (?:контейнер|карантинн)/i, /полн(?:ый|ую) повторн(?:ый|ого) контрол/i, /неремонтопригодное изделие списывают в брак/i, /либо списание в брак/i, /Все каналы должны пройти контроль до упаковки и передачи на склад/i],
};
const productionInspectionForbiddenClaims = {
  en: [/zero leakage/i, /detects? (?:any|every) (?:minute|small) leak/i, /\b\d+(?:\.\d+)?\s*(?:mL\/min|Pa\/s)\b/i, /annual(?:ly)? calibrat/i, /calibration certificate/i, /QR code traceability/i, /CRM traceability/i, /100% first-pass/i],
  de: [/Nullleckage/i, /jede noch so kleine Leckage/i, /\b\d+(?:[.,]\d+)?\s*(?:ml\/min|Pa\/s)\b/i, /jährlich(?:e|en)? Kalibrier/i, /Kalibrierzertifikat/i, /QR-Code-Rückverfolg/i, /CRM-Rückverfolg/i, /100 % Erstprüf/i],
  ja: [/ゼロ漏れ/, /あらゆる微小漏れ/, /\b\d+(?:\.\d+)?\s*(?:mL\/min|Pa\/s)\b/i, /毎年(?:の)?校正/, /校正証明書/, /QRコード追跡/, /CRM個体追跡/, /初回検査100％合格/],
  ru: [/нулев(?:ая|ые|ую) утечк/i, /люб(?:ую|ая) микроскопическ(?:ую|ая) утечк/i, /\b\d+(?:[.,]\d+)?\s*(?:мл\/мин|Па\/с)\b/i, /ежегодн(?:ая|ую) калибров/i, /сертификат калибровки/i, /прослеживаемость по QR/i, /прослеживаемость CRM/i, /100%-н(?:ое|ый) прохождени.{0,30}с первого раза/i],
};
const productionInspectionPendingPassClaims = {
  en: /(?:awaiting|queue)[^.!?]{0,100}(?:passed|approved|ready for shipment)/i,
  de: /(?:wartet|Prüfwarteschlange)[^.!?]{0,100}(?:bestanden|freigegeben|versandbereit)/i,
  ja: /(?:検査待ち|待つ)[^。]{0,100}(?:合格済み|出荷可能|検査完了)/,
  ru: /(?:ожидают|очереди)[^.]{0,100}(?:прошли|одобрены|готовы к отгрузке)/i,
};
const productionInspectionPassBoundaries = {
  en: /PASS[^.!?]{0,100}photographed passage-test cycle/i,
  de: /PASS-Anzeige[^.!?]{0,120}abgebildeten Kanalprüfzyklus/i,
  ja: /写真に写る流路別検査サイクル[^\u3002]{0,120}PASS/,
  ru: /PASS[^.]{0,140}изображённого цикла проверки одного канала/i,
};
const productionInspectionTableLabels = {
  de: 'Aktueller Produktionsablauf',
  ja: '現在の量産工程',
  ru: 'Действующий производственный процесс',
};
const productionInspectionImages = [
  'assembled-units-in-inspection-queue',
  'individual-passage-test-pass',
];

if (config.pages.filter((pageName) => pageName === productionInspectionPage).length !== 1) {
  failures.push(`i18n/config.json: ${productionInspectionPage} must appear exactly once.`);
}

for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  try {
    const pagePath = path.join(languageRoot, productionInspectionPage);
    const source = await fs.readFile(pagePath, 'utf8');
    const $page = load(source, { decodeEntities: false });
    const mainText = compactText($page('main').text());
    if (compactText($page('.pit-evidence-boundary strong').text()) !== productionInspectionBoundaryHeadings[language.code]) {
      failures.push(`${language.code}/${productionInspectionPage}: evidence-boundary heading is missing or not localized as approved.`);
    }
    if ($page('h1').length !== 1 || compactText($page('h1').text()) !== productionInspectionHeadings[language.code]) {
      failures.push(`${language.code}/${productionInspectionPage}: H1 is missing, duplicated, or not localized as approved.`);
    }
    if ($page('link[rel="canonical"]').attr('href') !== pageUrl(language.code, productionInspectionPage)) {
      failures.push(`${language.code}/${productionInspectionPage}: canonical URL is incorrect.`);
    }
    for (const code of ['en', 'de', 'ja', 'ru', 'x-default']) {
      const alternates = $page(`link[rel="alternate"][hreflang="${code}"]`);
      if (alternates.length !== 1) failures.push(`${language.code}/${productionInspectionPage}: hreflang ${code} is missing or duplicated.`);
    }
    const socialImage = 'https://www.begapunk.com/images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg';
    if ($page('meta[name="keywords"]').length) failures.push(`${language.code}/${productionInspectionPage}: obsolete meta keywords must be removed.`);
    if ($page('meta[property="og:image"]').attr('content') !== socialImage || $page('meta[name="twitter:image"]').attr('content') !== socialImage) failures.push(`${language.code}/${productionInspectionPage}: social image must use the Begapunk inspection-queue photograph.`);
    if ($page('img[src$="rotary-unions-awaiting-inspection.jpg"]').length) failures.push(`${language.code}/${productionInspectionPage}: low-resolution duplicate inspection-queue image remains in the page body.`);
    for (const pattern of productionInspectionRequiredTerms[language.code] || []) {
      if (!pattern.test(mainText)) failures.push(`${language.code}/${productionInspectionPage}: required production-inspection fact is missing (${pattern}).`);
    }
    for (const pattern of productionInspectionForbiddenClaims[language.code] || []) {
      if (pattern.test(mainText)) failures.push(`${language.code}/${productionInspectionPage}: unsupported leak sensitivity, calibration, traceability, or first-pass claim detected (${pattern}).`);
    }
    if ($page('main a[href^="BP-"]').length || /\bBP-[A-Z0-9-]+\b/.test(mainText)) {
      failures.push(`${language.code}/${productionInspectionPage}: the manufacturing procedure must remain model-neutral.`);
    }
    if ($page('.pit-fact').length !== 4 || $page('.pit-step').length !== 5 || $page('.pit-table tbody tr').length !== 8) {
      failures.push(`${language.code}/${productionInspectionPage}: workflow or verified-parameter coverage is incomplete.`);
    }
    const figures = $page('.pit-figure');
    if (figures.length !== 2) failures.push(`${language.code}/${productionInspectionPage}: expected two evidence figures.`);
    const pendingCaptions = compactText(figures.eq(0).find('figcaption').text());
    if (productionInspectionPendingPassClaims[language.code]?.test(pendingCaptions)) {
      failures.push(`${language.code}/${productionInspectionPage}: an inspection-queue photograph is described as already accepted.`);
    }
    const passContext = compactText(figures.eq(1).text() + ' ' + $page('.pit-evidence-boundary').text());
    if (!productionInspectionPassBoundaries[language.code]?.test(passContext)) {
      failures.push(`${language.code}/${productionInspectionPage}: the PASS caption is not tied to the photographed passage-test cycle.`);
    }
    for (const imageName of productionInspectionImages) {
      const jpg = $page(`img[src$="${imageName}.jpg"]`);
      const webp = $page(`source[srcset$="${imageName}.webp"]`);
      if (jpg.length !== 1 || webp.length !== 1 || !jpg.attr('width') || !jpg.attr('height') || !jpg.attr('alt')) {
        failures.push(`${language.code}/${productionInspectionPage}: ${imageName} image pair, dimensions, or localized alt is incomplete.`);
      }
    }
    if (!$page('link[href*="production-inspection-testing.css?v=20260808-pit1"]').length) {
      failures.push(`${language.code}/${productionInspectionPage}: page CSS or cache key is missing.`);
    }
    if ($page(`a[href="manufacturing-quality.html"]`).length < 2) {
      failures.push(`${language.code}/${productionInspectionPage}: breadcrumb and body return links to Manufacturing & Quality are incomplete.`);
    }
    const hubSource = await fs.readFile(path.join(languageRoot, manufacturingQualityPage), 'utf8');
    const $hub = load(hubSource, { decodeEntities: false });
    if ($hub(`.mq-subpage-card a[href="${productionInspectionPage}"]`).length !== 1) {
      failures.push(`${language.code}/${manufacturingQualityPage}: production leak-testing subpage card is missing or duplicated.`);
    }
    if (language.code !== config.sourceLanguage.code) {
      const labels = $page('.pit-table td[data-label]').map((_, element) => $page(element).attr('data-label')).get();
      if (labels.length !== 8 || labels.some((label) => label !== productionInspectionTableLabels[language.code])) {
        failures.push(`${language.code}/${productionInspectionPage}: mobile table labels are missing, English, or inconsistent.`);
      }
    }
    const schemas = $page('script[type="application/ld+json"]').map((_, element) => JSON.parse($page(element).text())).get();
    const nodes = schemas.flatMap((schema) => schemaNodes(schema));
    if (!nodes.some((node) => schemaTypes(node).has('WebPage') && node.inLanguage === language.code)) {
      failures.push(`${language.code}/${productionInspectionPage}: localized WebPage schema is missing.`);
    }
    if (!nodes.some((node) => schemaTypes(node).has('BreadcrumbList'))) failures.push(`${language.code}/${productionInspectionPage}: BreadcrumbList schema is missing.`);
    const webPageNode = nodes.find((node) => schemaTypes(node).has('WebPage'));
    if (webPageNode?.primaryImageOfPage?.url !== socialImage) failures.push(`${language.code}/${productionInspectionPage}: WebPage primary image is not synchronized with social metadata.`);
    const breadcrumbNode = nodes.find((node) => schemaTypes(node).has('BreadcrumbList'));
    if (breadcrumbNode?.itemListElement?.length !== 3 || breadcrumbNode.itemListElement[1]?.item !== pageUrl(language.code, manufacturingQualityPage)) failures.push(`${language.code}/${productionInspectionPage}: flattened Quality breadcrumb is incorrect.`);
    if (nodes.some((node) => ['Product', 'Review', 'Certification', 'HowTo'].some((type) => schemaTypes(node).has(type)))) {
      failures.push(`${language.code}/${productionInspectionPage}: unsupported Product, Review, Certification, or HowTo schema detected.`);
    }
    const searchIndex = JSON.parse(await fs.readFile(path.join(languageRoot, 'search-index.json'), 'utf8'));
    if (JSON.stringify(searchIndex).includes('undefined')) failures.push(`${language.code}/search-index.json: literal undefined leaked into the public search index.`);
    const record = searchIndex.find((entry) => entry.url === productionInspectionPage);
    if (!record || compactText(record.h1) !== productionInspectionHeadings[language.code]) {
      failures.push(`${language.code}/search-index.json: production-inspection record is missing or not synchronized.`);
    } else {
      const recordText = compactText(JSON.stringify(record));
      for (const pattern of productionInspectionRequiredTerms[language.code] || []) {
        if (!pattern.test(recordText)) failures.push(`${language.code}/search-index.json: required production-inspection fact is missing (${pattern}).`);
      }
      for (const pattern of productionInspectionForbiddenClaims[language.code] || []) {
        if (pattern.test(recordText)) failures.push(`${language.code}/search-index.json: unsupported production-inspection claim detected (${pattern}).`);
      }
    }
    const llmsPath = language.code === config.sourceLanguage.code ? path.join(localizedRoot, 'llms.txt') : path.join(languageRoot, 'llms.txt');
    if (!(await fs.readFile(llmsPath, 'utf8')).includes(pageUrl(language.code, productionInspectionPage))) {
      failures.push(`${language.code}/llms.txt: production-inspection URL is missing.`);
    }
  } catch (error) {
    failures.push(`${language.code}/${productionInspectionPage}: production-inspection verification failed (${error.message}).`);
  }
}

try {
  const rootLlms = await fs.readFile(path.join(localizedRoot, 'llms.txt'), 'utf8');
  for (const pageName of discoverablePages) {
    const expectedUrl = pageUrl(config.sourceLanguage.code, pageName);
    if (!rootLlms.includes(expectedUrl)) failures.push(`llms.txt: missing ${expectedUrl}.`);
  }
  for (const language of activeLanguages) {
    const localizedLlmsUrl = `${config.siteUrl}/${language.code}/llms.txt`;
    if (!rootLlms.includes(localizedLlmsUrl)) failures.push(`llms.txt: missing localized AI index link ${localizedLlmsUrl}.`);
  }
  for (const language of verifiedLanguages) {
    for (const pageName of excludedPages) {
      const excludedUrl = pageUrl(language.code, pageName);
      if (rootLlms.includes(excludedUrl)) failures.push(`llms.txt: excluded URL is present (${excludedUrl}).`);
    }
  }
  const laserApplicationStatement = 'BP-2P-08-0001 and BP-3P-0004 are used in this application category.';
  if (rootLlms.split(laserApplicationStatement).length - 1 !== 1) {
    failures.push('llms.txt: the confirmed laser rear-chuck application-model statement must appear exactly once.');
  }
  if (/evidence limits|photographed unit has not been individually identified|without photograph-to-model identification/i.test(rootLlms)) {
    failures.push('llms.txt: a repeated evidence-limit or photograph-to-model disclaimer remains.');
  }
  const productionInspectionSummary = rootLlms.split(/\r?\n/).find((line) => line.includes('/production-inspection-testing.html')) || '';
  if (!productionInspectionSummary.includes('PASS/NG handling')) {
    failures.push('llms.txt: the production-inspection summary must mention PASS/NG handling.');
  }
} catch (error) {
  failures.push(`llms.txt: missing or invalid (${error.message}).`);
}

try {
  const sitemapSource = await fs.readFile(path.join(localizedRoot, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedSitemapUrls = discoverablePages.map((pageName) => pageUrl(config.sourceLanguage.code, pageName));
  if (sitemapUrls.length !== expectedSitemapUrls.length) failures.push(`sitemap.xml: expected ${expectedSitemapUrls.length} URLs, found ${sitemapUrls.length}.`);
  expectedSitemapUrls.forEach((url) => {
    if (!sitemapUrls.includes(url)) failures.push(`sitemap.xml: missing ${url}.`);
  });
  sitemapUrls.filter((url) => !expectedSitemapUrls.includes(url)).forEach((url) => failures.push(`sitemap.xml: unexpected ${url}.`));
} catch (error) {
  failures.push(`sitemap.xml: missing or invalid (${error.message}).`);
}

const applicationCasePage = 'case-bp-2p-95-pneumatic-chuck-integration.html';
const smartChuckCasePage = 'case-bp-3p-s06-sensor-monitored-chuck.html';
const caseBreadcrumbCopy = {
  en: { home: 'Home', applications: 'Applications', cases: 'Case Studies' },
  de: { home: 'Startseite', applications: 'Anwendungen', cases: 'Fallstudien' },
  ja: { home: 'ホーム', applications: '用途別情報', cases: '選定事例' },
  ru: { home: 'Главная', applications: 'Применение', cases: 'Примеры применения' },
};
const detailPhotoNotes = {
  en: 'Photo note: These customer-authorized workshop photographs document the installation state shown. Operating parameters and acceptance requirements are confirmed for the order and approved drawing.',
  de: 'Fotohinweis: Diese mit Genehmigung des Kunden veröffentlichten Werkstattfotos dokumentieren den dargestellten Einbauzustand. Betriebsparameter und Abnahmeanforderungen werden für den Auftrag und in der freigegebenen Zeichnung bestätigt.',
  ja: '写真に関する注記：これらのお客様の許可を得た工場写真は、掲載した組込み状態を記録しています。運転条件および受入基準は、注文書と承認図面で確認します。',
  ru: 'Примечание к фотографиям: Эти цеховые фотографии, опубликованные с разрешения заказчика, фиксируют показанное состояние установки. Рабочие параметры и критерии приёмки подтверждаются в заказе и согласованном чертеже.',
};
const bp2p95CaseCenterSummaryCopy = {
  en: 'Two customer-authorized workshop photographs document the BP-2P-95-0001 mounting area, the surrounding chuck assembly and visible pneumatic hose routing. Open the detail page for the installation layout and project review inputs.',
  de: 'Zwei mit Genehmigung des Kunden veröffentlichte Werkstattaufnahmen dokumentieren den Einbaubereich der BP-2P-95-0001, die umgebende Spannfuttereinheit und die sichtbare Schlauchführung. Die Detailseite zeigt die Einbauanordnung und die Angaben für die projektbezogene Prüfung.',
  ja: 'お客様の許可を得た2点の工場内組立写真で、BP-2P-95-0001の取付部、チャック周辺の構成、空圧ホースの配管状態を紹介しています。詳細ページでは、組込みレイアウトと案件確認に必要な情報をご覧いただけます。',
  ru: 'Две цеховые фотографии, опубликованные с разрешения заказчика, документируют зону установки BP-2P-95-0001, окружающий узел патрона и видимую прокладку пневматических шлангов. На отдельной странице приведены компоновка установки и исходные данные для проектной проверки.',
};
const bp2p95Descriptions = {
  en: 'The project owner confirmed the model as BP-2P-95-0001. Customer-authorized workshop photographs show the visible chuck assembly and air routing, not model identity.',
  de: 'Der Projektverantwortliche bestätigte die Modellbezeichnung BP-2P-95-0001. Mit Genehmigung des Kunden veröffentlichte Werkstattfotos zeigen die sichtbare Spannfutterbaugruppe und Druckluftführung; die genaue Modellzuordnung lässt sich jedoch nicht allein aus den Fotos ableiten.',
  ja: '案件責任者が型式をBP-2P-95-0001と確認しました。公開許可済みの工場写真は、目視可能なチャック組立状態と空圧配管を示しますが、型式自体を証明するものではありません。',
  ru: 'Владелец проекта подтвердил модель BP-2P-95-0001. Опубликованные с разрешения заказчика цеховые фотографии показывают видимую компоновку патрона и пневмолинии, но не подтверждают модель.',
};
const bp2p95ModelIdentityBoundaries = {
  en: 'Project-owner confirmation; the photographs alone do not establish the internal model identity.',
  de: 'Bestätigung durch den Projektverantwortlichen; die genaue Modellzuordnung lässt sich nicht allein aus den Fotos ableiten.',
  ja: '案件責任者による確認。写真だけでは、写っている製品の正確な型式を特定できません。',
  ru: 'Модель подтверждена владельцем проекта; по самим фотографиям нельзя установить точное обозначение модели.',
};
const applicationCaseSearchKeywords = {
  en: {
    [applicationCasePage]: ['BP-2P-95-0001', 'pneumatic chuck', 'compressed air', 'rotary union integration'],
    [smartChuckCasePage]: ['BP-3P-S06-0001', 'sensor-monitored pneumatic chuck', 'pneumatic chuck', 'sensor signal transfer'],
  },
  de: {
    [applicationCasePage]: ['BP-2P-95-0001', 'pneumatisches Spannfutter', 'Druckluft', 'Drehdurchführung im Spannfutter'],
    [smartChuckCasePage]: ['BP-3P-S06-0001', 'sensorüberwachtes pneumatisches Spannfutter', 'pneumatisches Spannfutter', 'Sensorsignalübertragung'],
  },
  ja: {
    [applicationCasePage]: ['BP-2P-95-0001', 'エアチャック', '空圧式チャック', '圧縮空気', 'ロータリージョイント組込み'],
    [smartChuckCasePage]: ['BP-3P-S06-0001', '外部センサ信号伝送', 'エアチャック', '空圧回路', '電気信号伝送'],
  },
  ru: {
    [applicationCasePage]: ['BP-2P-95-0001', 'пневматический патрон', 'сжатый воздух', 'установка вращающегося соединения'],
    [smartChuckCasePage]: ['BP-3P-S06-0001', 'пневматический патрон с контролем по датчикам', 'пневматический патрон', 'передача сигналов датчиков'],
  },
};
const caseCenterGuideCopy = {
  en: 'The three entries above are real applications supported by workshop photographs; the two entries below are engineering selection examples, not customer performance results. Final selection requires the actual machine drawing and operating conditions.',
  de: 'Die drei oben aufgeführten Einträge sind reale Anwendungen, die durch Werkstattfotos belegt sind; die beiden folgenden Einträge sind technische Auswahlbeispiele und keine Leistungsnachweise aus Kundenanlagen. Für die endgültige Auswahl sind die tatsächliche Maschinenzeichnung und die Betriebsbedingungen erforderlich.',
  ja: '上の3項目は工場内写真に基づく実際の用途事例で、以下の2項目は顧客装置の性能実績ではなく技術選定例です。最終的な機種選定には、実際の装置図面と使用条件の確認が必要です。',
  ru: 'Три записи выше — реальные примеры, подтверждённые цеховыми фотографиями; две записи ниже — инженерные примеры подбора, а не результаты работы оборудования заказчика. Для окончательного выбора необходимы чертёж машины и фактические условия эксплуатации.',
};
const caseCenterHeroCopy = {
  en: 'Review documented rotary-union installations and the engineering inputs needed for model and fit discussions.',
  de: 'Dokumentierte Einbauten von Drehdurchführungen und die technischen Angaben für Modell- und Einbauprüfungen im Überblick.',
  ja: 'ロータリジョイントの組込み事例と、機種・取付検討に必要な技術条件を紹介します。',
  ru: 'Документированные примеры установки ротационных соединений и исходные данные для подбора модели и проверки монтажа.',
};
const caseCenterDetailFaqCopy = {
  en: {
    question: 'Where can I review the detailed installation cases?',
    answer: 'Open the BP-2P-95-0001 pneumatic chuck case or the BP-3P-S06-0001 sensor-monitored chuck case from their case cards. The laser rear-chuck evidence is summarized on this page.',
    laserAnswer: 'Yes. BP-3P-0004 and BP-2P-08-0001 are confirmed for pneumatic rear-chuck applications on laser tube cutting machines. Provide the chuck drawing and operating conditions to confirm the ordered model and interface.',
  },
  de: {
    question: 'Wo finde ich die ausführlichen Einbaufälle?',
    answer: 'Öffnen Sie über die Fallkarten den Einbaufall BP-2P-95-0001 im pneumatischen Spannfutter oder den Fall BP-3P-S06-0001 im sensorüberwachten Spannfutter. Der Nachweis für das hintere Laser-Spannfutter ist auf dieser Seite zusammengefasst.',
    laserAnswer: 'Ja. BP-3P-0004 und BP-2P-08-0001 sind für pneumatische Anwendungen am hinteren Spannfutter von Laser-Rohrschneidmaschinen bestätigt. Senden Sie Spannfutterzeichnung und Betriebsbedingungen, um Bestellausführung und Schnittstelle zu bestätigen.',
  },
  ja: {
    question: '詳細な組込み事例はどこで確認できますか？',
    answer: '各事例カードから、BP-2P-95-0001の空圧チャック組込み事例またはBP-3P-S06-0001のセンサ監視対応チャック組込み事例を開けます。レーザー後方チャックの資料はこのページにまとめています。',
    laserAnswer: 'はい。BP-3P-0004およびBP-2P-08-0001は、レーザー管切断機の後方チャック空圧用途で採用実績があります。発注型式と取付インターフェースの確認には、チャック図面と使用条件をご提示ください。',
  },
  ru: {
    question: 'Где посмотреть подробные примеры установки?',
    answer: 'Откройте с карточек подробный пример BP-2P-95-0001 в пневматическом патроне или BP-3P-S06-0001 в патроне с контролем по датчикам. Материалы по заднему патрону лазерного станка приведены на этой странице.',
    laserAnswer: 'Да. BP-3P-0004 и BP-2P-08-0001 подтверждены для пневматических систем заднего патрона станков лазерной резки труб. Для подтверждения заказной модели и интерфейса направьте чертёж патрона и условия эксплуатации.',
  },
};
const laserApplicationProductMetaCopy = {
  en: 'Confirmed for pneumatic laser tube cutting rear-chuck applications.',
  de: 'Für pneumatische Anwendungen am hinteren Spannfutter einer Laser-Rohrschneidmaschine bestätigt.',
  ja: 'レーザー管切断機の後方チャック空圧回路で採用実績があります。',
  ru: 'Применение в пневмосистеме заднего патрона лазерного станка подтверждено.',
};
const detailEngineeringInputs = {
  en: { drawing: /chuck drawing/i, conditions: /operating conditions/i, interface: /mechanical interface/i },
  de: { drawing: /Spannfutterzeichnung/iu, conditions: /Betriebsbedingungen/iu, interface: /Mechanische Schnittstelle/iu },
  ja: { drawing: /チャック図面/u, conditions: /使用条件/u, interface: /(?:機械取合い|取付部)/u },
  ru: { drawing: /Чертёж патрона/iu, conditions: /Условия работы/iu, interface: /Монтажные размеры и крепление/iu },
};
const unsupportedApplicationCaseClaims = {
  en: /workshop assembly and commissioning|separate compressed-air paths/i,
  de: /Werkstattmontage und Inbetriebnahme|Getrennte Druckluftkreise/i,
  ja: /組立・試運転|独立した空圧回路/,
  ru: /Сборка и пусконаладка|несколько независимых[^.]{0,80}канал/iu,
};
const laserCaseForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas|\b\d+(?:\.\d+)?\s*(?:MPa|bar|RPM)\b/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas|\b\d+(?:[,.]\d+)?\s*(?:MPa|bar|min⁻¹|U\/min)\b/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス|\d+(?:\.\d+)?\s*(?:MPa|bar|min⁻¹|回転\/分)/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ|\b\d+(?:[,.]\d+)?\s*(?:МПа|бар|об\/мин)\b/iu,
};
const laserPhotoModelBoundary = {
  en: 'The product shown in each photograph has not been individually identified as either model.',
  de: 'Eine eindeutige Zuordnung der beiden Fotos zu jeweils einem dieser Modelle liegt nicht vor.',
  ja: 'ただし、各写真に写る製品をいずれかの型式に個別特定したものではありません。',
  ru: 'При этом соответствие каждого изделия на фотографиях конкретной модели отдельно не установлено.',
};
const laserSameCategoryBoundary = {
  en: /same application category[^.]{0,180}not presented as two views of the same machine/i,
  de: /selben Anwendungskategorie[^.]{0,180}nicht als zwei Ansichten derselben Maschine/iu,
  ja: /同じ用途区分[^。]{0,180}同一装置[^。]{0,100}別角度[^。]{0,100}位置付けていません/u,
  ru: /(?:одной категории применения[\s\S]{0,320}не представлены как два (?:вида|ракурса) (?:одной и той же машины|одного и того же оборудования)|не представлены как два (?:вида|ракурса) (?:одной и той же машины|одного и того же оборудования)[\s\S]{0,320}одной категории применения)/iu,
};
const productPhotoModelBoundary = {
  en: /has not been individually identified as this model/i,
  de: /nicht einzeln als dieses Modell identifiziert/iu,
  ja: /本型式に個別特定したものではありません/u,
  ru: /модель изделия[^.]{0,120}отдельно не идентифицирована/iu,
};
const permittedLaserCaseSafetyBoundary = {
  en: /The confirmed scope for the two standard models is the rear chuck's compressed-air circuits; process or assist-gas transfer is not included\./i,
  de: /$^/,
  ja: /$^/,
  ru: /$^/,
};
const productApplicationForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas|(?:clamp|unclamp|purge)\s+(?:port|passage|channel)|(?:port|passage|channel)[^.]{0,40}(?:clamp|unclamp|purge)/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas|(?:Spannen|Lösen|Abblasen|Spülluft)[^.]{0,50}(?:Anschluss|Kanal)|(?:Anschluss|Kanal)[^.]{0,50}(?:Spannen|Lösen|Abblasen|Spülluft)/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス|(?:クランプ|アンクランプ|パージ|吹き飛ばし)[^。]{0,50}(?:ポート|流路)|(?:ポート|流路)[^。]{0,50}(?:クランプ|アンクランプ|パージ|吹き飛ばし)/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ|(?:зажим|разжим|продувк)[^.]{0,60}(?:порт|канал)|(?:порт|канал)[^.]{0,60}(?:зажим|разжим|продувк)/iu,
};
const laserApplicationMediaClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|(?:process|assist)[- ]gas/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Prozessgas|Schneidgas/iu,
  ja: /酸素|窒素|冷却液|クーラント|プロセスガス|アシストガス/u,
  ru: /кислород|азот|охлаждающ|СОЖ|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ/iu,
};
const permittedSeparateMediaEngineering = {
  en: /separate engineering solution[^.]{0,180}(?:materials|cleaning|testing|approval)/i,
  de: /separate technische Lösung[^.]{0,180}(?:Werkstoff|Reinigung|Prüfung|Freigabe)/iu,
  ja: /独立したエンジニアリング仕様[^。]{0,180}(?:材質|洗浄|試験|承認)/u,
  ru: /отдельное инженерное решение[^.]{0,180}(?:материал|очистк|испытан|согласован)/iu,
};
const laserApplicationNumericClaims = /(?:\b\d+(?:[.,]\d+)?\s*(?:MPa|МПа|bar|бар|RPM|rpm|об\/мин|min⁻¹|L\/min|л\/мин)\b|30\s*%|ISO\s*4414|(?:orifice|bore|孔径|オリフィス|диаметр прохода)[^.;。]{0,40}\d+\s*mm)/iu;
const staleLaserApplicationModels = /BP-2P-0001|BP-3P-0006|BP-2P-130-0001/i;
const expectedLaserApplicationHeadings = {
  en: 'Pneumatic Rotary Unions for Laser Tube Cutting Rear Chucks',
  de: 'Pneumatische Drehdurchführungen für hintere Spannfutter von Laser-Rohrschneidmaschinen',
  ja: 'レーザー管切断機の後方チャック用空圧ロータリジョイント',
  ru: 'Пневматические ротационные соединения для задних патронов станков лазерной резки труб',
};
const rearChuckTerms = {
  en: /rear[- ]chuck/i,
  de: /hinter(?:en|e[msn]?) Spannfutter/iu,
  ja: /後方チャック/u,
  ru: /задн(?:его|ем|ий|их)[^.]{0,40}патрон/iu,
};
const laserMachineTerms = {
  en: /laser tube cutting/i,
  de: /Laser-Rohrschneidmaschinen/iu,
  ja: /レーザー管切断機/u,
  ru: /лазерной резки труб/iu,
};
const sitewideLaserMachineTerms = {
  en: /laser tube/i,
  de: /Laser(?:rohrschneiden|-Rohrschneidmaschine)/iu,
  ja: /レーザー管切断機/u,
  ru: /лазерн(?:ой|ая) резк[аи] труб/iu,
};
const sitewideRearChuckTerms = {
  en: /rear[- ]chuck/i,
  de: /hinter(?:en|e[msn]?) Spannfutter/iu,
  ja: /後(?:側|方)チャック/u,
  ru: /задн(?:его|ем|ий|их|ие|им)[^.]{0,45}патрон/iu,
};
const sitewideCompressedAirTerms = {
  en: /compressed[- ]air/i,
  de: /Druckluft/iu,
  ja: /圧縮空気/u,
  ru: /сжат(?:ого|ый) воздух/iu,
};
const sitewideLaserForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|\blubricant\b|\bvacuum\b|(?:process|assist)[- ]gas|(?:rotary )?laser head|cutting head|\b(?:clamp(?:ing)?|unclamp(?:ing)?|blow[- ]?off|purge)\b/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Schmier(?:mittel|stoff)|Vakuum|Prozessgas|Hilfsgas|Schneidgas|(?:rotierender )?Laserkopf|Schneidkopf|\b(?:Spannen|Lösen|Abblasen|Spülen)\b/iu,
  ja: /酸素|窒素|冷却液|クーラント|潤滑(?:油|液)|真空|加工ガス|プロセスガス|アシストガス|回転レーザーヘッド|切断ヘッド|クランプ|アンクランプ|吹(?:き飛ばし|き付け)|パージ/u,
  ru: /кислород|азот|охлаждающ|СОЖ|смазочн|вакуум|технологическ(?:ий|ого) газ|вспомогательн(?:ый|ого) газ|лазерн(?:ая|ой) головк|режущ(?:ая|ей) головк|зажим|разжим|продувк/iu,
};
const sitewideLaserStaleModels = /BP-2P-0001|BP-3P-0006|BP-4P-30(?:-0001)?/i;
const sitewideLaserUnsupportedPerformance = {
  en: /(?:service life|leak(?:age)? rate|validated pressure|validated speed|suitable for (?:all|every) laser)/i,
  de: /Lebensdauer|Leckagerate|bestätigt(?:er|e) (?:Druck|Drehzahl)|für alle Laser/iu,
  ja: /寿命|漏れ率|確認済み(?:圧力|回転数)|すべてのレーザー/u,
  ru: /срок службы|уровень утеч|подтверждённ(?:ое|ая) (?:давление|частота вращения)|для всех лазер/iu,
};
const sitewideSeparateGasEngineering = {
  en: /separate engineering project[^.]{0,180}(?:materials|cleaning|testing|approval)/i,
  de: /separates Engineering-Projekt[^.]{0,180}(?:Werkstoff|Reinigung|Prüfung|Freigabe)/iu,
  ja: /個別のエンジニアリング案件[^。]{0,180}(?:材質|洗浄|試験|承認)/u,
  ru: /отдельный инженерный проект[^.]{0,180}(?:материал|очистк|испытан|согласован)/iu,
};
const laserApplicationPhotoModelNote = {
  en: /photograph[\s\S]{0,320}has not been individually identified as either model/i,
  de: /Werkstattfotos[\s\S]{0,320}keinem der beiden Modelle einzeln zugeordnet/iu,
  ja: /現場写真[\s\S]{0,320}個別対応付けしたものではありません/u,
  ru: /фотограф[\s\S]{0,320}не сопоставлены[\s\S]{0,180}модел/iu,
};
const applicationsRepeatedIpCaveat = {
  en: /no certified IP rating is currently claimed/giu,
  de: /keine zertifizierte IP-Schutzart ist ausgewiesen/giu,
  ja: /認証済みIP保護等級の記載はありません/gu,
  ru: /сертифицированная степень защиты IP не заявляется/giu,
};
const applicationsDefensiveFoodClaim = {
  en: /\bFDA\b|no product-level|without configuration-specific documentation/i,
  de: /\bFDA\b|keine (?:Produkt|Konform)|ohne konfigurationsbezogene Nachweise/iu,
  ja: /FDA|うたうものではありません|裏付け資料がない限り/u,
  ru: /\bFDA\b|без документации[^.]{0,120}(?:соответств|пищев)|соответств[^.]{0,120}не заявляется/iu,
};
const applicationsPositiveConfigurationReview = {
  en: /selected configuration[^.]{0,180}(?:documentation|food-contact|regulatory)|configuration review/i,
  de: /gewählte Ausführung[^.]{0,180}(?:Nachweise|Lebensmittelkontakt|regulatorisch)|Konfigurationsprüfung/iu,
  ja: /選定仕様[^。]{0,180}(?:必要資料|食品接触|規制)|仕様審査/u,
  ru: /выбранн(?:ой|ого) (?:конфигурации|исполнения)[^.]{0,180}(?:документац|пищев|регулятор)|проверке исполнения/iu,
};
const sitewideSearchLegacyClaims = {
  en: /Air, oxygen assist, clamp control|Assist gas, clamping, and coolant|Oxygen \+ Nitrogen \+ Coolant|Assist gas, cooling support|oxygen, nitrogen, and compressed air/i,
  de: /Prozessgas, Spannen und Abblasen|Prozessgas, Spannluft und Kühlmittel|Sauerstoff \+ Stickstoff \+ Kühlmittel|Hilfsgas, Kühlunterstützung|Sauerstoff, Stickstoff und Druckluft/iu,
  ja: /アシストガス・クランプ・ブロー|アシストガス、クランプ用エア、クーラント|酸素＋窒素＋クーラント|アシストガス、冷却補助/u,
  ru: /Лазерная трубка режет|Технологический газ, зажим и обдув|кислород \+ азот \+ охлаждающая жидкость|Помогите газу, охлаждению/iu,
};
function verifySitewideLaserScope(languageCode, text, owner, { requireModels = false } = {}) {
  if (!sitewideLaserMachineTerms[languageCode]?.test(text)
      || !sitewideRearChuckTerms[languageCode]?.test(text)
      || !sitewideCompressedAirTerms[languageCode]?.test(text)) {
    failures.push(`${owner}: localized laser-tube, rear-chuck, or compressed-air meaning is missing.`);
  }
  if (sitewideLaserForbiddenClaims[languageCode]?.test(text)
      || sitewideLaserStaleModels.test(text)
      || laserApplicationNumericClaims.test(text)
      || sitewideLaserUnsupportedPerformance[languageCode]?.test(text)) {
    failures.push(`${owner}: unsupported laser medium, model, function, numeric, or performance claim detected.`);
  }
  if (requireModels && (!text.includes('BP-3P-0004') || !text.includes('BP-2P-08-0001'))) {
    failures.push(`${owner}: both factory-confirmed rear-chuck application models are required.`);
  }
}
const caseCenterSearchForbiddenClaims = {
  en: /\boxygen\b|\bnitrogen\b|\bcoolant\b|assist[- ]gas|Laser cutting & packaging/i,
  de: /Sauerstoff|Stickstoff|Kühlmittel|Schneidgas|Begapunk-Prüfrichtung|Portrichtung/iu,
  ja: /酸素|窒素|冷却液|クーラント|アシストガス|現場写真|空圧供給/u,
  ru: /кислород|азот|охлаждающ|СОЖ|Лазерная трубка режет|\bгорный\b|фланцевый рисунок/iu,
};
const localizedCaseCenterEnglishLabels = [
  'Selection item', 'Typical question', 'Begapunk direction', 'Input required',
  'Why it matters', 'Check', 'Required confirmation',
];
const smartChuckRequiredFunctions = {
  en: /clamping[\s\S]{0,120}unclamping[\s\S]{0,120}blow-off/i,
  de: /Spannen[\s\S]{0,120}Lösen[\s\S]{0,120}Ausblasen/iu,
  ja: /クランプ[\s\S]{0,120}アンクランプ[\s\S]{0,120}エアブロー/u,
  ru: /зажим[\s\S]{0,120}разжим[\s\S]{0,120}обдув/iu,
};
const smartChuckSensorBoundary = {
  en: /(?:detection|responsibility)[^.]{0,180}external sensors[^.]{0,120}(?:machine )?(?:controller|control system)|external sensors[^.]{0,120}(?:machine )?(?:controller|control system)[^.]{0,180}(?:perform|responsib)/i,
  de: /(?:Messung|Logik|Aufgabe|Erkennung)[^.]{0,180}externe(?:n)? Sensoren[^.]{0,120}Maschinensteuerung|externe(?:n)? Sensoren[^.]{0,120}Maschinensteuerung[^.]{0,180}(?:Messung|Logik|Aufgabe|Erkennung)/iu,
  ja: /(?:検出|判定)[^。]{0,180}外部センサ[^。]{0,120}機械制御装置|外部センサ[^。]{0,120}機械制御装置[^。]{0,180}(?:検出|判定)/u,
  ru: /(?:измерение|логику|выполня)[^.]{0,200}внешн(?:ие|их) датчик[^.]{0,120}(?:контроллер|систем[аы] управления)|внешн(?:ие|их) датчик[^.]{0,120}(?:контроллер|систем[аы] управления)[^.]{0,200}(?:измерение|логику|выполня)/iu,
};
const smartChuckForbiddenClaims = {
  en: /batch (?:test|tested|passed)|(?:test|inspection) passed|\b\d+(?:\.\d+)?\s*(?:MPa|bar|RPM|cycles?)\b/i,
  de: /Chargenprüfung|alle Einheiten bestanden|\b\d+(?:[,.]\d+)?\s*(?:MPa|bar|U\/min|Zyklen)\b/iu,
  ja: /全数(?:試験|合格)|試験合格|\d+(?:\.\d+)?\s*(?:MPa|bar|回転\/分|サイクル)/u,
  ru: /испытание партии|все изделия прошли|\b\d+(?:[,.]\d+)?\s*(?:МПа|бар|об\/мин|циклов)\b/iu,
};
const caseCenterCssVersion = 'v=20260809-case-mobile-table2';
const caseDetailCssVersion = 'v=20260809-case-mobile-table2';
const smartChuckDetailCssVersion = 'v=20260809-case-mobile-table2';
for (const language of verifiedLanguages) {
  const languageRoot = language.code === config.sourceLanguage.code ? localizedRoot : path.join(localizedRoot, language.code);
  try {
    const caseCenter = await fs.readFile(path.join(languageRoot, 'case-studies.html'), 'utf8');
    const product = await fs.readFile(path.join(languageRoot, 'BP-2P-95-0001.html'), 'utf8');
    const detail = await fs.readFile(path.join(languageRoot, applicationCasePage), 'utf8');
    const smartProduct = await fs.readFile(path.join(languageRoot, 'BP-3P-S06-0001.html'), 'utf8');
    const smartDetail = await fs.readFile(path.join(languageRoot, smartChuckCasePage), 'utf8');
    const laserApplicationPageName = 'application-laser-tube-cutting.html';
    const laserApplication = await fs.readFile(path.join(languageRoot, laserApplicationPageName), 'utf8');
    const home = await fs.readFile(path.join(languageRoot, 'index.html'), 'utf8');
    const applications = await fs.readFile(path.join(languageRoot, 'applications.html'), 'utf8');
    const faqPage = await fs.readFile(path.join(languageRoot, 'faq.html'), 'utf8');
    const verifiedProductPageNames = ['BP-3P-0004.html', 'BP-2P-08-0001.html'];
    const verifiedProductSources = new Map(await Promise.all(verifiedProductPageNames.map(async (pageName) => [
      pageName,
      await fs.readFile(path.join(languageRoot, pageName), 'utf8'),
    ])));
    if (!caseCenter.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/case-studies.html: application case link is missing.`);
    if (!product.includes(`href="${applicationCasePage}"`)) failures.push(`${language.code}/BP-2P-95-0001.html: application case link is missing.`);
    if (!detail.includes('href="BP-2P-95-0001.html"')) failures.push(`${language.code}/${applicationCasePage}: product backlink is missing.`);
    if (!caseCenter.includes(`href="${smartChuckCasePage}"`)) failures.push(`${language.code}/case-studies.html: sensor-monitored chuck case link is missing.`);
    if (!smartProduct.includes(`href="${smartChuckCasePage}"`)) failures.push(`${language.code}/BP-3P-S06-0001.html: sensor-monitored chuck case link is missing.`);
    if (!smartDetail.includes('href="BP-3P-S06-0001.html"') || !smartDetail.includes('href="case-studies.html"')) {
      failures.push(`${language.code}/${smartChuckCasePage}: product or case-center backlink is missing.`);
    }
    const $center = load(caseCenter, { decodeEntities: false });
    const $product = load(product, { decodeEntities: false });
    const $detail = load(detail, { decodeEntities: false });
    const $smartProduct = load(smartProduct, { decodeEntities: false });
    const $smartDetail = load(smartDetail, { decodeEntities: false });
    const $laserApplication = load(laserApplication, { decodeEntities: false });
    const $home = load(home, { decodeEntities: false });
    const $applications = load(applications, { decodeEntities: false });
    const $faqPage = load(faqPage, { decodeEntities: false });
    const expectedBp2p95Description = bp2p95Descriptions[language.code];
    if ($detail('meta[name="description"]').attr('content') !== expectedBp2p95Description
        || $detail('meta[property="og:description"]').attr('content') !== expectedBp2p95Description
        || $detail('meta[name="twitter:description"]').attr('content') !== expectedBp2p95Description) {
      failures.push(`${language.code}/${applicationCasePage}: model provenance is missing or inconsistent across description metadata.`);
    }
    const detailArticles = [];
    $detail('script[type="application/ld+json"]').each((_, element) => {
      try {
        schemaNodes(JSON.parse($detail(element).html())).forEach((node) => {
          if (schemaTypes(node).has('TechArticle')) detailArticles.push(node);
        });
      } catch {
        // General JSON-LD parsing is reported by the all-page validation above.
      }
    });
    if (detailArticles.length !== 1
        || detailArticles[0].inLanguage !== language.code
        || detailArticles[0].description !== expectedBp2p95Description) {
      failures.push(`${language.code}/${applicationCasePage}: TechArticle language or model-provenance description is missing or stale.`);
    }
    const breadcrumbCopy = caseBreadcrumbCopy[language.code];
    const casePages = [
      ['case-studies.html', $center, 3],
      [applicationCasePage, $detail, 4],
      [smartChuckCasePage, $smartDetail, 4],
    ];
    for (const [casePageName, $casePage, expectedLength] of casePages) {
      const visibleLinks = $casePage('.breadcrumb-bar a').map((_, element) => [[$casePage(element).attr('href'), compactText($casePage(element).text())]]).get();
      const expectedLinks = expectedLength === 3
        ? [['index.html', breadcrumbCopy.home], ['applications.html', breadcrumbCopy.applications]]
        : [['index.html', breadcrumbCopy.home], ['applications.html', breadcrumbCopy.applications], ['case-studies.html', breadcrumbCopy.cases]];
      if (JSON.stringify(visibleLinks) !== JSON.stringify(expectedLinks)
          || compactText($casePage('.breadcrumb-bar span').last().text()) === '') {
        failures.push(`${language.code}/${casePageName}: visible breadcrumb must follow the Applications > Case Studies hierarchy.`);
      }
      const breadcrumbNodes = [];
      $casePage('script[type="application/ld+json"]').each((_, element) => {
        try {
          schemaNodes(JSON.parse($casePage(element).html())).forEach((node) => {
            if (schemaTypes(node).has('BreadcrumbList')) breadcrumbNodes.push(node);
          });
        } catch {
          // General JSON-LD parsing reports malformed data.
        }
      });
      const items = breadcrumbNodes[0]?.itemListElement || [];
      if (breadcrumbNodes.length !== 1 || items.length !== expectedLength
          || items[0]?.item !== pageUrl(language.code, '')
          || items[1]?.item !== pageUrl(language.code, 'applications.html')
          || items[2]?.item !== pageUrl(language.code, 'case-studies.html')
          || (expectedLength === 4 && items[3]?.item !== pageUrl(language.code, casePageName))) {
        failures.push(`${language.code}/${casePageName}: BreadcrumbList JSON-LD must follow the Applications > Case Studies hierarchy.`);
      }
    }

    const homeCompactEntry = $home('[data-laser-rear-chuck-entry="compact"]');
    const homeOverviewEntry = $home('[data-laser-rear-chuck-entry="overview"]');
    if (homeCompactEntry.length !== 1 || homeOverviewEntry.length !== 1) {
      failures.push(`${language.code}/index.html: both scoped laser rear-chuck entries must remain present exactly once.`);
    } else {
      verifySitewideLaserScope(language.code, compactText(homeCompactEntry.text()), `${language.code}/index.html compact laser entry`);
      verifySitewideLaserScope(language.code, compactText(homeOverviewEntry.text()), `${language.code}/index.html laser application card`, { requireModels: true });
    }

    const applicationBlock = $applications('[data-laser-rear-chuck-application]');
    const applicationMap = $applications('[data-laser-rear-chuck-map]');
    const applicationSummary = $applications('[data-laser-rear-chuck-summary]');
    if (applicationBlock.length !== 1 || applicationMap.length !== 1 || applicationSummary.length !== 1) {
      failures.push(`${language.code}/applications.html: scoped laser application, mapping, and summary blocks must each remain present exactly once.`);
    }
    const sitewideEngineeringPath = applicationBlock.find('.laser-engineering-path');
    if (sitewideEngineeringPath.length !== 1
        || !sitewideSeparateGasEngineering[language.code]?.test(compactText(sitewideEngineeringPath.text()))
        || /BP-3P-0004|BP-2P-08-0001/.test(sitewideEngineeringPath.text())) {
      failures.push(`${language.code}/applications.html: separate process-gas engineering path is missing or recommends a standard model.`);
    }
    const applicationCore = applicationBlock.clone();
    applicationCore.find('.laser-engineering-path').remove();
    const applicationCoreText = compactText(applicationCore.text());
    const applicationSearchSnippets = applicationBlock.children()
      .filter((_, element) => !$applications(element).hasClass('laser-engineering-path'))
      .map((_, element) => compactText($applications(element).text()))
      .get()
      .filter(Boolean);
    if (applicationBlock.length === 1) {
      verifySitewideLaserScope(language.code, applicationCoreText, `${language.code}/applications.html detailed laser block`, { requireModels: true });
      const modelLinks = applicationBlock.find('a[href^="BP-"]').map((_, element) => $applications(element).attr('href')).get();
      if (modelLinks.join('|') !== 'BP-3P-0004.html|BP-2P-08-0001.html') {
        failures.push(`${language.code}/applications.html: detailed laser block must link only the two confirmed application models.`);
      }
    }
    if (applicationMap.length === 1) verifySitewideLaserScope(language.code, compactText(applicationMap.text()), `${language.code}/applications.html laser mapping row`, { requireModels: true });
    if (applicationSummary.length === 1) verifySitewideLaserScope(language.code, compactText(applicationSummary.text()), `${language.code}/applications.html laser summary card`, { requireModels: true });

    const applicationsVisible = $applications('body').clone();
    applicationsVisible.find('header, nav, footer, script, style, .cookie-banner, .i18n-switcher').remove();
    const applicationsVisibleText = compactText(applicationsVisible.text());
    const repeatedIpCaveatCount = (applicationsVisibleText.match(applicationsRepeatedIpCaveat[language.code]) || []).length;
    if (repeatedIpCaveatCount !== 0) {
      failures.push(`${language.code}/applications.html: the product-level uncertified-IP caveat must not be repeated on the applications overview; found ${repeatedIpCaveatCount}.`);
    }
    if (applicationsDefensiveFoodClaim[language.code]?.test(applicationsVisibleText)
        || !applicationsPositiveConfigurationReview[language.code]?.test(applicationsVisibleText)) {
      failures.push(`${language.code}/applications.html: food or regulated-use copy must use a positive configuration-review statement without defensive FDA wording.`);
    }

    const collectionPages = [];
    $applications('script[type="application/ld+json"]').each((_, element) => {
      try {
        schemaNodes(JSON.parse($applications(element).html())).forEach((node) => {
          if (schemaTypes(node).has('CollectionPage')) collectionPages.push(node);
        });
      } catch {
        // General JSON-LD parsing is reported by the all-page validation above.
      }
    });
    if (collectionPages.length !== 1
        || collectionPages[0].dateModified !== '2026-08-07'
        || collectionPages[0].inLanguage !== language.code
        || compactText(collectionPages[0].name) !== compactText($applications('h1').first().text())) {
      failures.push(`${language.code}/applications.html: localized CollectionPage name, date, or language is missing or mismatched.`);
    } else {
      verifySitewideLaserScope(language.code, compactText(collectionPages[0].description), `${language.code}/applications.html CollectionPage description`);
      if (language.code !== config.sourceLanguage.code && suspiciousVisibleEnglishPattern.test(JSON.stringify(collectionPages[0]))) {
        failures.push(`${language.code}/applications.html: English residue remains in localized CollectionPage structured data.`);
      }
    }

    const faqItem = $faqPage('[data-laser-rear-chuck-faq]');
    if (faqItem.length !== 1) {
      failures.push(`${language.code}/faq.html: scoped rear-chuck passage-selection FAQ must remain present exactly once.`);
    }
    const faqButton = faqItem.find('.faq-question').first();
    const faqQuestionClone = faqButton.clone();
    faqQuestionClone.find('.arrow').remove();
    const faqQuestionText = compactText(faqQuestionClone.text());
    const faqAnswer = faqItem.find('.faq-answer').first();
    const faqAnswerText = compactText(faqAnswer.text());
    if (faqItem.length === 1) verifySitewideLaserScope(language.code, faqAnswerText, `${language.code}/faq.html rear-chuck passage-selection answer`);
    if (faqButton.attr('id') !== 'laser-rear-chuck-faq-question'
        || faqButton.attr('aria-controls') !== 'laser-rear-chuck-faq-answer'
        || faqButton.attr('aria-expanded') !== 'false'
        || faqAnswer.attr('id') !== 'laser-rear-chuck-faq-answer'
        || faqAnswer.attr('role') !== 'region'
        || faqAnswer.attr('aria-labelledby') !== 'laser-rear-chuck-faq-question') {
      failures.push(`${language.code}/faq.html: target FAQ accessibility relationship is incomplete.`);
    }
    const faqSchemas = [];
    $faqPage('script[type="application/ld+json"]').each((_, element) => {
      try {
        schemaNodes(JSON.parse($faqPage(element).html())).forEach((node) => {
          if (schemaTypes(node).has('FAQPage')) faqSchemas.push(node);
        });
      } catch {
        // General JSON-LD parsing is reported by the all-page validation above.
      }
    });
    const faqSchemaMatches = faqSchemas.flatMap((schema) => schema.mainEntity || [])
      .filter((entry) => compactText(entry?.name).replace(/\s*▼$/u, '') === faqQuestionText);
    if (faqSchemas.length !== 1 || faqSchemaMatches.length !== 1
        || compactText(faqSchemaMatches[0]?.acceptedAnswer?.text) !== faqAnswerText) {
      failures.push(`${language.code}/faq.html: visible rear-chuck FAQ and FAQPage JSON-LD are not identical.`);
    }
    for (const entry of faqSchemas.flatMap((schema) => schema.mainEntity || [])) {
      const answerText = compactText(entry?.acceptedAnswer?.text);
      if (sitewideLaserMachineTerms[language.code]?.test(answerText)
          && sitewideLaserForbiddenClaims[language.code]?.test(answerText)) {
        failures.push(`${language.code}/faq.html: FAQPage JSON-LD retains an unsafe laser application example.`);
      }
    }
    if ($center('#real-application-cases').length !== 1 || $center('#engineering-selection-examples').length !== 1) {
      failures.push(`${language.code}/case-studies.html: real cases and selection examples are not separated.`);
    }
    const caseCenterGuide = $center('.case-intro .key-takeaways > p');
    if (compactText($center('.cs-hero > .container > p').text()) !== caseCenterHeroCopy[language.code]
        || caseCenterGuide.length !== 1
        || compactText(caseCenterGuide.text()) !== caseCenterGuideCopy[language.code]
        || $center('.case-category-heading > .container > p').length
        || $center('.tech-note').length) {
      failures.push(`${language.code}/case-studies.html: the neutral hero or single real-case versus engineering-example guide boundary is missing, duplicated, or stale.`);
    }
    if (caseCenter.indexOf('id="real-application-cases"') > caseCenter.indexOf('id="engineering-selection-examples"')) {
      failures.push(`${language.code}/case-studies.html: the real application case category is not first.`);
    }
    const realCases = $center('.case-block.real-case');
    if (realCases.length !== 3) failures.push(`${language.code}/case-studies.html: expected exactly three photo-supported real cases.`);
    if (realCases.eq(0).attr('id') !== 'bp-2p-95-pneumatic-chuck'
        || realCases.eq(1).attr('id') !== 'laser-tube-rear-chuck'
        || realCases.eq(2).attr('id') !== 'bp-3p-s06-sensor-monitored-chuck') {
      failures.push(`${language.code}/case-studies.html: real case ordering must be BP-2P-95, laser rear chuck, then BP-3P-S06.`);
    }
    const bp2p95CaseCenterSummary = compactText($center('#bp-2p-95-pneumatic-chuck .case-text > p').text());
    if (bp2p95CaseCenterSummary !== bp2p95CaseCenterSummaryCopy[language.code]) {
      failures.push(`${language.code}/case-studies.html: the BP-2P-95 installation summary is missing, duplicated, or stale.`);
    }
    const ordering = [
      caseCenter.indexOf('id="real-application-cases"'),
      caseCenter.indexOf('id="bp-2p-95-pneumatic-chuck"'),
      caseCenter.indexOf('id="laser-tube-rear-chuck"'),
      caseCenter.indexOf('id="bp-3p-s06-sensor-monitored-chuck"'),
      caseCenter.indexOf('class="case-intro"'),
      caseCenter.indexOf('id="engineering-selection-examples"'),
    ];
    if (ordering.some((position) => position < 0) || ordering.some((position, index) => index > 0 && position <= ordering[index - 1])) {
      failures.push(`${language.code}/case-studies.html: required real-cases, how-to, and selection-example order is incorrect.`);
    }
    const $smartCase = $center('#bp-3p-s06-sensor-monitored-chuck');
    const smartCaseText = compactText($smartCase.text());
    if ($smartCase.length !== 1
        || $smartCase.find(`a[href="${smartChuckCasePage}"]`).length < 1
        || $smartCase.find('img[src$="bp-3p-s06-chuck-installation.webp"][loading="lazy"]').length !== 1) {
      failures.push(`${language.code}/case-studies.html: BP-3P-S06 case card, link, or installation image is missing.`);
    }
    if (!smartChuckRequiredFunctions[language.code]?.test(smartCaseText)
        || !/BP-3P-S06-0001/.test(smartCaseText)
        || !smartChuckSensorBoundary[language.code]?.test(smartCaseText)) {
      failures.push(`${language.code}/case-studies.html: BP-3P-S06 functions or external-sensor responsibility boundary is incomplete.`);
    }
    if (smartChuckForbiddenClaims[language.code]?.test(smartCaseText)) {
      failures.push(`${language.code}/case-studies.html: unsupported BP-3P-S06 test, performance, or sensing claim detected.`);
    }
    if ($center('#offshore').length !== 1 || $center('#cnc').length !== 1 || $center('#laser').length) {
      failures.push(`${language.code}/case-studies.html: engineering examples must contain only offshore and CNC entries.`);
    }
    const $laserCase = $center('#laser-tube-rear-chuck');
    const laserText = compactText($laserCase.text());
    if ($laserCase.length !== 1) {
      failures.push(`${language.code}/case-studies.html: model-neutral laser rear-chuck case is missing.`);
    } else {
      const expectedLaserImages = [
        'laser-tube-rear-chuck-rotary-union-overview.webp',
        'laser-tube-rear-chuck-rotary-union-mounting-detail.webp',
      ];
      for (const imageName of expectedLaserImages) {
        const matches = $laserCase.find(`img[src$="${imageName}"]`);
        if (matches.length !== 1) failures.push(`${language.code}/case-studies.html: ${imageName} must appear exactly once in the laser case.`);
        if (matches.attr('loading') !== 'lazy') failures.push(`${language.code}/case-studies.html: ${imageName} must be lazy-loaded.`);
      }
      const modelLinks = $laserCase.find('a[href^="BP-"]').map((_, element) => $center(element).attr('href')).get();
      const expectedModelLinks = ['BP-3P-0004.html', 'BP-2P-08-0001.html'];
      const uniqueModelLinks = [...new Set(modelLinks)];
      if (uniqueModelLinks.length !== expectedModelLinks.length || expectedModelLinks.some((href) => !uniqueModelLinks.includes(href))) {
        failures.push(`${language.code}/case-studies.html: laser case must link only to the two factory-confirmed application models.`);
      }
      if ($laserCase.find('figure a[href^="BP-"], .case-image a[href^="BP-"]').length) {
        failures.push(`${language.code}/case-studies.html: a photograph must not be linked to a specific product model.`);
      }
      const imageContext = compactText($laserCase.find('figure, figcaption, .case-image').text());
      if (/\bBP-[A-Z0-9-]+\b/i.test(imageContext)) {
        failures.push(`${language.code}/case-studies.html: photograph captions must remain model-neutral.`);
      }
      const photoModelBoundary = laserPhotoModelBoundary[language.code];
      const photoModelBoundaryCount = photoModelBoundary ? laserText.split(photoModelBoundary).length - 1 : 0;
      if (!laserText.includes('BP-3P-0004')
          || !laserText.includes('BP-2P-08-0001')
          || photoModelBoundaryCount !== 1
          || $laserCase.find('.case-spec-table tbody tr').length !== 5) {
        failures.push(`${language.code}/case-studies.html: confirmed application models or the single photograph-identification boundary is missing or duplicated.`);
      }
      if (!laserSameCategoryBoundary[language.code]?.test(laserText)) {
        failures.push(`${language.code}/case-studies.html: the same-category and not-the-same-machine evidence boundary is missing.`);
      }
      const laserClaimText = laserText.replace(permittedLaserCaseSafetyBoundary[language.code], '');
      if (laserCaseForbiddenClaims[language.code]?.test(laserClaimText) || staleLaserApplicationModels.test(laserClaimText)) {
        failures.push(`${language.code}/case-studies.html: unsupported laser-case model, media, numeric specification, or performance claim detected.`);
      }
      if ($laserCase.find('.case-image.case-thumbnail').length !== 1 || $laserCase.find('.case-image.laser-case-detail').length !== 1) {
        failures.push(`${language.code}/case-studies.html: laser case must use one 4:3 overview and one contained detail image.`);
      }
    }
    const engineeringImages = [$center('#offshore img').attr('src'), $center('#cnc img').attr('src')];
    if (!/BP-2P-130-0001-1\.webp$/.test(engineeringImages[0] || '') || !/BP-2P-30-0001-1\.webp$/.test(engineeringImages[1] || '')) {
      failures.push(`${language.code}/case-studies.html: engineering examples must use the approved product reference images.`);
    }
    const verifiedApplicationCards = $center('.verified-application-products .product-card');
    const verifiedApplicationHrefs = verifiedApplicationCards.map((_, element) => $center(element).attr('data-href')).get();
    const selectionExampleCards = $center('.selection-example-products .product-card');
    const selectionExampleHrefs = selectionExampleCards.map((_, element) => $center(element).attr('data-href')).get();
    if (verifiedApplicationCards.length !== 4 || verifiedApplicationHrefs.join('|') !== 'BP-2P-95-0001.html|BP-3P-0004.html|BP-2P-08-0001.html|BP-3P-S06-0001.html') {
      failures.push(`${language.code}/case-studies.html: verified-application products must contain BP-2P-95, BP-3P-0004, BP-2P-08-0001 and BP-3P-S06-0001 in that order.`);
    }
    const laserApplicationCardCopy = ['BP-3P-0004.html', 'BP-2P-08-0001.html']
      .map((href) => compactText($center(`.verified-application-products .product-card[data-href="${href}"] .product-meta`).text()));
    if (laserApplicationCardCopy.some((copy) => copy !== laserApplicationProductMetaCopy[language.code])) {
      failures.push(`${language.code}/case-studies.html: laser application product cards must retain the concise confirmed-application copy without repeated photograph-to-model disclaimers.`);
    }
    if (selectionExampleCards.length !== 2 || selectionExampleHrefs.join('|') !== 'BP-2P-130-0001.html|BP-2P-30-0001.html') {
      failures.push(`${language.code}/case-studies.html: selection-example products must contain BP-2P-130-0001 and BP-2P-30-0001.`);
    }
    if ($center('.case-products-grid .product-card[data-href="BP-2P-0001.html"]').length) {
      failures.push(`${language.code}/case-studies.html: BP-2P-0001 must not remain in the related-product groups.`);
    }
    if ($center('#legacy-case-studies-styles').length) failures.push(`${language.code}/case-studies.html: disabled legacy style block must be removed.`);
    if ($center('.faq-item[onclick]').length || $center('.faq-question').length !== 4) {
      failures.push(`${language.code}/case-studies.html: FAQ must use four accessible buttons without inline item click handlers.`);
    }
    const expectedDetailFaq = caseCenterDetailFaqCopy[language.code];
    if (compactText($center(`#faq-question-${language.code}-1`).text()) !== expectedDetailFaq?.question
        || compactText($center(`#faq-answer-${language.code}-1`).text()) !== expectedDetailFaq?.answer
        || compactText($center(`#faq-answer-${language.code}-2`).text()) !== expectedDetailFaq?.laserAnswer) {
      failures.push(`${language.code}/case-studies.html: the case-center FAQs must link to detail cases and keep the laser answer free of repeated photograph-to-model copy.`);
    }
    const faqIds = new Set();
    $center('.faq-question').each((_, element) => {
      const button = $center(element);
      const buttonId = button.attr('id');
      const answerId = button.attr('aria-controls');
      const answer = answerId ? $center(`#${answerId}`) : $center();
      if (element.tagName !== 'button' || button.attr('type') !== 'button' || button.attr('aria-expanded') !== 'false' || !buttonId || !answerId) {
        failures.push(`${language.code}/case-studies.html: FAQ button accessibility attributes are incomplete.`);
      } else if (faqIds.has(buttonId) || faqIds.has(answerId) || answer.length !== 1 || !answer.is('[hidden]') || answer.attr('role') !== 'region' || answer.attr('aria-labelledby') !== buttonId) {
        failures.push(`${language.code}/case-studies.html: FAQ ids, region semantics, labels, or initial hidden state are incomplete for ${answerId}.`);
      }
      faqIds.add(buttonId);
      faqIds.add(answerId);
    });
    if (language.code !== config.sourceLanguage.code) {
      for (const label of localizedCaseCenterEnglishLabels) {
        if ($center(`[data-label="${label}"]`).length) failures.push(`${language.code}/case-studies.html: English mobile table label "${label}" detected.`);
      }
    }
    if (!$center(`link[href*="case-studies.css?${caseCenterCssVersion}"]`).length) failures.push(`${language.code}/case-studies.html: case-study CSS cache version is stale.`);
    if (!$detail(`link[href*="case-studies.css?${caseDetailCssVersion}"]`).length || !$detail(`link[href*="application-case.css?${caseDetailCssVersion}"]`).length) {
      failures.push(`${language.code}/${applicationCasePage}: case CSS cache version is stale.`);
    }
    if (!$smartDetail(`link[href*="case-studies.css?${smartChuckDetailCssVersion}"]`).length
        || !$smartDetail(`link[href*="application-case.css?${smartChuckDetailCssVersion}"]`).length) {
      failures.push(`${language.code}/${smartChuckCasePage}: case CSS cache version is stale.`);
    }
    const smartDetailText = compactText($smartDetail('main').text());
    const expectedSmartImages = ['bp-3p-s06-chuck-installation', 'bp-3p-s06-batch-preparation'];
    for (const imageBase of expectedSmartImages) {
      if ($smartDetail(`img[src$="${imageBase}.jpg"][loading="lazy"]`).length !== 1
          || $smartDetail(`source[srcset$="${imageBase}.webp"]`).length !== 1) {
        failures.push(`${language.code}/${smartChuckCasePage}: ${imageBase} responsive image pair is missing or duplicated.`);
      }
    }
    if (!smartChuckRequiredFunctions[language.code]?.test(smartDetailText)
        || !smartChuckSensorBoundary[language.code]?.test(smartDetailText)
        || smartChuckForbiddenClaims[language.code]?.test(smartDetailText)) {
      failures.push(`${language.code}/${smartChuckCasePage}: function mapping, sensor boundary, or claim safety check failed.`);
    }
    const smartCanonical = $smartDetail('link[rel="canonical"]').attr('href');
    if (smartCanonical !== pageUrl(language.code, smartChuckCasePage)
        || $smartDetail('link[rel="alternate"][hreflang]').length !== 5) {
      failures.push(`${language.code}/${smartChuckCasePage}: canonical or complete hreflang cluster is missing.`);
    }
    const smartArticles = [];
    $smartDetail('script[type="application/ld+json"]').each((_, element) => {
      try {
        schemaNodes(JSON.parse($smartDetail(element).html())).forEach((node) => {
          if (schemaTypes(node).has('TechArticle')) smartArticles.push(node);
        });
      } catch {
        // General JSON-LD parsing is reported by the all-page validation above.
      }
    });
    if (smartArticles.length !== 1 || smartArticles[0].inLanguage !== language.code) {
      failures.push(`${language.code}/${smartChuckCasePage}: localized TechArticle schema is missing or mismatched.`);
    }
    try {
      const searchIndex = JSON.parse(await fs.readFile(path.join(languageRoot, 'search-index.json'), 'utf8'));
      const centerRecord = searchIndex.find((entry) => entry.url === 'case-studies.html');
      if (!centerRecord) failures.push(`${language.code}/search-index.json: case-studies record is missing.`);
      else if (caseCenterSearchForbiddenClaims[language.code]?.test(
        JSON.stringify(centerRecord).replace(permittedLaserCaseSafetyBoundary[language.code], ''),
      )) {
        failures.push(`${language.code}/search-index.json: stale or unsupported case-center wording detected.`);
      } else if (!JSON.stringify(centerRecord).includes('BP-3P-0004') || !JSON.stringify(centerRecord).includes('BP-2P-08-0001')) {
        failures.push(`${language.code}/search-index.json: case-studies record does not include both confirmed laser rear-chuck models.`);
      }
      const smartRecord = searchIndex.find((entry) => entry.url === smartChuckCasePage);
      if (!smartRecord || !JSON.stringify(smartRecord).includes('BP-3P-S06-0001')) {
        failures.push(`${language.code}/search-index.json: BP-3P-S06 sensor-monitored chuck case record is missing.`);
      }
      const detailRecord = searchIndex.find((entry) => entry.url === applicationCasePage);
      if (!detailRecord
          || detailRecord.description !== expectedBp2p95Description
          || !compactText(detailRecord.body).includes(bp2p95ModelIdentityBoundaries[language.code])) {
        failures.push(`${language.code}/search-index.json: BP-2P-95 model provenance is missing or not synchronized.`);
      }
      for (const [pageName, record] of [[applicationCasePage, detailRecord], [smartChuckCasePage, smartRecord]]) {
        const expectedKeywords = applicationCaseSearchKeywords[language.code]?.[pageName];
        if (!record || JSON.stringify(record.keywords) !== JSON.stringify(expectedKeywords)) {
          failures.push(`${language.code}/search-index.json: ${pageName} target-market keywords are missing or stale.`);
        }
      }
      const laserApplicationRecord = searchIndex.find((entry) => entry.url === 'application-laser-tube-cutting.html');
      if (!laserApplicationRecord) {
        failures.push(`${language.code}/search-index.json: laser application record is missing.`);
      } else {
        const recordText = JSON.stringify(laserApplicationRecord);
        if (laserApplicationRecord.h1 !== expectedLaserApplicationHeadings[language.code]) {
          failures.push(`${language.code}/search-index.json: laser application H1 is not synchronized.`);
        }
        if (!recordText.includes('BP-3P-0004') || !recordText.includes('BP-2P-08-0001') || staleLaserApplicationModels.test(recordText)) {
          failures.push(`${language.code}/search-index.json: laser application model coverage is missing or stale.`);
        }
        if (laserApplicationMediaClaims[language.code]?.test(laserApplicationRecord.description || '')) {
          failures.push(`${language.code}/search-index.json: laser application description contains unsupported medium wording.`);
        }
      }
      for (const pageName of ['BP-3P-0004.html', 'BP-2P-08-0001.html']) {
        const productRecord = searchIndex.find((entry) => entry.url === pageName);
        if (!productRecord || !rearChuckTerms[language.code]?.test(JSON.stringify(productRecord))) {
          failures.push(`${language.code}/search-index.json: ${pageName} does not expose the verified rear-chuck application.`);
        }
      }
      const aggregateSearchChecks = [
        {
          pageName: 'index.html',
          document: $home,
          snippets: [compactText(homeCompactEntry.text()), compactText(homeOverviewEntry.text())],
        },
        {
          pageName: 'applications.html',
          document: $applications,
          snippets: [...applicationSearchSnippets, compactText(applicationMap.text()), compactText(applicationSummary.text())],
        },
        {
          pageName: 'faq.html',
          document: $faqPage,
          snippets: [compactText(faqItem.text())],
        },
      ];
      for (const check of aggregateSearchChecks) {
        const record = searchIndex.find((entry) => entry.url === check.pageName);
        if (!record) {
          failures.push(`${language.code}/search-index.json: ${check.pageName} record is missing.`);
          continue;
        }
        const expectedMetadata = {
          title: compactText(check.document('title').first().text()),
          description: compactText(check.document('meta[name="description"]').first().attr('content')),
          h1: compactText(check.document('h1').first().text()),
        };
        for (const [field, expected] of Object.entries(expectedMetadata)) {
          if (compactText(record[field]) !== expected) failures.push(`${language.code}/search-index.json: ${check.pageName} ${field} is not synchronized.`);
        }
        for (const snippet of check.snippets) {
          if (!snippet || !compactText(record.body).includes(snippet)) {
            failures.push(`${language.code}/search-index.json: ${check.pageName} does not include the current scoped laser content.`);
          }
        }
        if (sitewideSearchLegacyClaims[language.code]?.test(record.body || '')) {
          failures.push(`${language.code}/search-index.json: ${check.pageName} retains a known legacy laser claim.`);
        }
      }
    } catch (error) {
      failures.push(`${language.code}/search-index.json: case-center claim verification failed (${error.message}).`);
    }
    if ($product('.app-related-products .app-related-product').first().attr('href') !== applicationCasePage) {
      failures.push(`${language.code}/BP-2P-95-0001.html: the application case is not the first related resource.`);
    }
    if ($smartProduct('.app-related-products .app-related-product').first().attr('href') !== smartChuckCasePage) {
      failures.push(`${language.code}/BP-3P-S06-0001.html: the sensor-monitored chuck case is not the first related resource.`);
    }
    for (const selector of ['.cs-hero', '.case-row', '.case-image', '.case-text', '.case-spec-table', '.tech-note', '.cta-section']) {
      if (!$detail(selector).length) failures.push(`${language.code}/${applicationCasePage}: required standard component ${selector} is missing.`);
    }
    if ($detail('.nav-dropdown').length !== 4) failures.push(`${language.code}/${applicationCasePage}: expected four standard navigation dropdowns.`);
    if ($detail('.footer-brand-band').length !== 1 || $detail('.footer-contact-band').length !== 1 || $detail('.footer-navigation > .footer-column').length !== 4) {
      failures.push(`${language.code}/${applicationCasePage}: standard three-layer Footer is missing.`);
    }
    if ($detail('.floating-cta .floating-btn.quote').length !== 1 || $detail('.floating-cta .floating-btn.whatsapp').length !== 1) {
      failures.push(`${language.code}/${applicationCasePage}: standard floating quote/WhatsApp actions are missing.`);
    }
    for (const selector of ['.cs-hero', '.case-row', '.case-image', '.case-text', '.case-spec-table', '.tech-note', '.cta-section']) {
      if (!$smartDetail(selector).length) failures.push(`${language.code}/${smartChuckCasePage}: required standard component ${selector} is missing.`);
    }
    for (const [pageName, $casePage] of [[applicationCasePage, $detail], [smartChuckCasePage, $smartDetail]]) {
      const photoNotes = $casePage('.tech-note');
      if (photoNotes.length !== 1 || compactText(photoNotes.text()) !== detailPhotoNotes[language.code]) {
        failures.push(`${language.code}/${pageName}: expected exactly one concise customer-authorized photo note.`);
      }
      const engineeringSectionText = compactText($casePage('[aria-labelledby="engineering-checks-title"]').text());
      const requiredInputs = detailEngineeringInputs[language.code];
      if (!requiredInputs?.drawing.test(engineeringSectionText)
          || !requiredInputs.conditions.test(engineeringSectionText)
          || !requiredInputs.interface.test(engineeringSectionText)) {
        failures.push(`${language.code}/${pageName}: drawing, operating-condition, or interface confirmation is missing from the engineering checks.`);
      }
    }
    if ($smartDetail('.nav-dropdown').length !== 4) failures.push(`${language.code}/${smartChuckCasePage}: expected four standard navigation dropdowns.`);
    if ($smartDetail('.footer-brand-band').length !== 1 || $smartDetail('.footer-contact-band').length !== 1 || $smartDetail('.footer-navigation > .footer-column').length !== 4) {
      failures.push(`${language.code}/${smartChuckCasePage}: standard three-layer Footer is missing.`);
    }
    if ($smartDetail('.floating-cta .floating-btn.quote').length !== 1 || $smartDetail('.floating-cta .floating-btn.whatsapp').length !== 1) {
      failures.push(`${language.code}/${smartChuckCasePage}: standard floating quote/WhatsApp actions are missing.`);
    }
    const caseImages = $detail('main .case-image img');
    const detailImages = caseImages.filter((_, element) => /bp-2p-95-pneumatic-connection-detail\.(?:webp|jpg)$/i.test($detail(element).attr('src') || ''));
    const overviewImages = caseImages.filter((_, element) => /bp-2p-95-chuck-assembly-overview\.(?:webp|jpg)$/i.test($detail(element).attr('src') || ''));
    if (detailImages.length !== 1 || overviewImages.length !== 1) failures.push(`${language.code}/${applicationCasePage}: each case photograph must appear exactly once.`);
    caseImages.each((_, element) => {
      if ($detail(element).attr('loading') !== 'lazy') failures.push(`${language.code}/${applicationCasePage}: every case photograph must be lazy-loaded.`);
    });
    if (caseImages.map((_, element) => $detail(element).attr('alt') || '').get().some((alt) => /BP-2P-95-0001/i.test(alt))) {
      failures.push(`${language.code}/${applicationCasePage}: photograph alt text must describe visible content without asserting model identity.`);
    }
    if (!/bp-2p-95-pneumatic-connection-detail/i.test($detail('.case-row').first().find('.case-image img').attr('src') || '')) {
      failures.push(`${language.code}/${applicationCasePage}: connection detail is not the primary evidence image.`);
    }
    const visibleDetail = compactText($detail('main').text());
    if (!visibleDetail.includes(bp2p95ModelIdentityBoundaries[language.code])) {
      failures.push(`${language.code}/${applicationCasePage}: project-owner model confirmation and photograph identity boundary are missing.`);
    }
    if (unsupportedApplicationCaseClaims[language.code]?.test(visibleDetail)) {
      failures.push(`${language.code}/${applicationCasePage}: unsupported commissioning or independent-circuit claim detected.`);
    }

    const laserApplicationH1 = compactText($laserApplication('h1').first().text());
    if (laserApplicationH1 !== expectedLaserApplicationHeadings[language.code]) {
      failures.push(`${language.code}/${laserApplicationPageName}: H1 does not match the approved rear-chuck positioning.`);
    }
    const verifiedModels = $laserApplication('#verified-laser-rear-chuck-models');
    const verifiedModelLinks = verifiedModels.find('a[href^="BP-"]').map((_, element) => $laserApplication(element).attr('href')).get();
    if (verifiedModels.length !== 1 || verifiedModelLinks.join('|') !== 'BP-3P-0004.html|BP-2P-08-0001.html') {
      failures.push(`${language.code}/${laserApplicationPageName}: the confirmed-model section must link only BP-3P-0004 and BP-2P-08-0001.`);
    }
    const engineeringPath = $laserApplication('#process-gas-engineering-path');
    if (engineeringPath.length !== 1
        || !permittedSeparateMediaEngineering[language.code]?.test(compactText(engineeringPath.text()))
        || engineeringPath.find('a[href^="BP-"]').length
        || /BP-3P-0004|BP-2P-08-0001/i.test(engineeringPath.text())) {
      failures.push(`${language.code}/${laserApplicationPageName}: the separate process-gas engineering path is missing or recommends a standard model.`);
    }
    if (!$laserApplication('a[href="case-studies.html#laser-tube-rear-chuck"]').length) {
      failures.push(`${language.code}/${laserApplicationPageName}: real laser rear-chuck case link is missing.`);
    }
    const metadataText = [
      $laserApplication('meta[name="description"]').attr('content'),
      $laserApplication('meta[property="og:description"]').attr('content'),
      $laserApplication('meta[name="twitter:description"]').attr('content'),
    ].filter(Boolean).join(' ');
    if (laserApplicationMediaClaims[language.code]?.test(metadataText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: metadata still mixes process gas or coolant with the pneumatic rear-chuck scope.`);
    }
    const applicationMain = $laserApplication('body').clone();
    applicationMain.find('header, nav, footer, script, style, .cookie-banner, .i18n-switcher').remove();
    applicationMain.find('#process-gas-engineering-path').remove();
    applicationMain.find('.app-faq-item').each((_, element) => {
      const faq = $laserApplication(element);
      const faqText = compactText(faq.text());
      if (!laserApplicationMediaClaims[language.code]?.test(faqText)) return;
      if (!permittedSeparateMediaEngineering[language.code]?.test(faqText)) failures.push(`${language.code}/${laserApplicationPageName}: FAQ must route process or assist gas to a separate engineering solution.`);
      faq.remove();
    });
    const applicationMainText = compactText(applicationMain.text());
    if (laserApplicationMediaClaims[language.code]?.test(applicationMainText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: process-gas or coolant wording appears outside the separate safety boundary.`);
    }
    if (staleLaserApplicationModels.test(laserApplication)) {
      failures.push(`${language.code}/${laserApplicationPageName}: a stale direct-recommendation model remains.`);
    }
    if (laserApplicationNumericClaims.test(applicationMainText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: an unsupported numeric pressure, speed, derating, flow, or orifice conclusion remains.`);
    }
    const photoModelNotes = $laserApplication('[data-photo-model-note]');
    const photoNoteText = compactText(photoModelNotes.text());
    if (photoModelNotes.length !== 1 || !laserApplicationPhotoModelNote[language.code]?.test(photoNoteText)) {
      failures.push(`${language.code}/${laserApplicationPageName}: the photograph-to-model note must appear exactly once in the designated paragraph.`);
    }
    const laserWithoutPhotoNote = $laserApplication('body').clone();
    laserWithoutPhotoNote.find('[data-photo-model-note], header, nav, footer, script, style, .cookie-banner, .i18n-switcher').remove();
    if (laserApplicationPhotoModelNote[language.code]?.test(compactText(laserWithoutPhotoNote.text()))) {
      failures.push(`${language.code}/${laserApplicationPageName}: the photograph-to-model note is repeated outside the designated paragraph.`);
    }
    if ($laserApplication('.app-faq-item').length !== 3) {
      failures.push(`${language.code}/${laserApplicationPageName}: the concise laser application FAQ must contain exactly three complementary items.`);
    }

    for (const pageName of verifiedProductPageNames) {
      const productSource = verifiedProductSources.get(pageName);
      const $verifiedProduct = load(productSource, { decodeEntities: false });
      const applicationEntry = $verifiedProduct('[data-verified-application="laser-rear-chuck"]');
      const applicationEntryText = compactText(applicationEntry.text());
      if (applicationEntry.length !== 1) {
        failures.push(`${language.code}/${pageName}: verified laser rear-chuck application entry is missing or duplicated.`);
        continue;
      }
      if (applicationEntry.find('a[href="case-studies.html#laser-tube-rear-chuck"]').length !== 1
          || applicationEntry.find('a[href="application-laser-tube-cutting.html"]').length !== 1) {
        failures.push(`${language.code}/${pageName}: verified application entry must link to the case center and application guide.`);
      }
      if (productApplicationForbiddenClaims[language.code]?.test(applicationEntryText)) {
        failures.push(`${language.code}/${pageName}: verified application entry contains an unsupported medium or port-function claim.`);
      }
      if (!productPhotoModelBoundary[language.code]?.test(applicationEntryText)) {
        failures.push(`${language.code}/${pageName}: photograph-to-model identification boundary is missing from the verified application entry.`);
      }
      const structuredText = $verifiedProduct('script[type="application/ld+json"]').text();
      if (!structuredText.includes('2026-08-07')
          || !laserMachineTerms[language.code]?.test(structuredText)
          || !rearChuckTerms[language.code]?.test(structuredText)) {
        failures.push(`${language.code}/${pageName}: structured data date or verified laser application description is not synchronized.`);
      }
    }
  } catch (error) {
    failures.push(`${language.code}/${applicationCasePage}: three-way link verification failed (${error.message}).`);
  }
}

try {
  const sitemapSource = await fs.readFile(path.join(localizedRoot, 'sitemap-i18n.xml'), 'utf8');
  const sitemapUrls = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const sitemapPages = discoverablePages;
  const expectedSitemapUrls = [config.sourceLanguage, ...activeLanguages]
    .flatMap((language) => sitemapPages.map((pageName) => pageUrl(language.code, pageName)));
  if (sitemapUrls.length !== expectedSitemapUrls.length) failures.push(`sitemap-i18n.xml: expected ${expectedSitemapUrls.length} URLs, found ${sitemapUrls.length}.`);
  for (const expectedUrl of expectedSitemapUrls) {
    if (!sitemapUrls.includes(expectedUrl)) failures.push(`sitemap-i18n.xml: missing ${expectedUrl}.`);
  }
  for (const language of [config.sourceLanguage, ...activeLanguages]) {
    for (const pageName of excludedPages) {
      const excludedUrl = pageUrl(language.code, pageName);
      if (sitemapSource.includes(excludedUrl)) failures.push(`sitemap-i18n.xml: excluded URL is present (${excludedUrl}).`);
    }
  }
} catch (error) {
  failures.push(`sitemap-i18n.xml: missing or invalid (${error.message}).`);
}

if (failures.length) {
  console.error(`Localized site verification failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Localized site verification passed for ${verifiedLanguages.length * config.pages.length} pages.`);
  console.log(`Discovery quarantine passed for ${discoveryExcludedPages.size} routes and ${verifiedDiscoveryNoindexPages} localized noindex,follow pages, with zero entries in search, AI indexes, and sitemap sources.`);
  console.log(`Application-case coverage passed for BP-2P-95 and BP-3P-S06 across ${verifiedLanguages.length} languages, including detail pages, case-center links, product-page links, search indexes, canonical/hreflang sets, JSON-LD language values, and both sitemap sources.`);
  console.log(`Manufacturing-quality coverage passed across ${verifiedLanguages.length} languages and ${verifiedLanguages.length * config.pages.length} canonical navigation/footer surfaces, including image pairs, the 51.7 μm production coating measurement, discovery metadata, and localized photo notes.`);
  console.log(`Production leak-testing coverage passed across ${verifiedLanguages.length} languages, including 100% unit and passage coverage, 1.0 MPa compressed-air testing, timed pressure-hold stages, NG segregation, evidence boundaries, discovery metadata, and localized mobile labels.`);
}
