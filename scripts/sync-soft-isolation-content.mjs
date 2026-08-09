import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');

const routes = [
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

const locales = {
  en: {
    directory: '',
    metaDescription: 'Plan rotary-joint selection with Begapunk product data, an engineering input checklist, application cases, quality information, and application review.',
    eyebrow: 'Application planning',
    status: 'Use the checklist and current resources below to prepare an accurate rotary-joint selection.',
    withdrawn: 'A reliable recommendation starts with the actual medium, pressure, speed, passage count, mounting space, environment, and duty cycle. Match these inputs to the current product page and approved drawing.',
    reviewHeading: 'Information to prepare',
    reviewItems: [
      'Operating medium, pressure, speed, temperature, and duty cycle',
      'Passage count, port functions, and required flow',
      'Mounting space, connection interfaces, hose routing, and environment',
    ],
    resourcesHeading: 'Current selection resources',
    resources: [
      ['products.html', 'Product Catalog', 'Review current model pages and published specifications.'],
      ['case-studies.html', 'Case Studies', 'See documented installations and practical integration details.'],
      ['manufacturing-quality.html', 'Manufacturing & Quality', 'See how components are manufactured and inspected.'],
      ['production-inspection-testing.html', '100% Leak Testing', 'See the current passage-by-passage production inspection process.'],
      ['contact.html', 'Contact', 'Send your actual medium, pressure, speed, passage count, mounting, and duty-cycle requirements for an application-specific review.'],
    ],
    helpHeading: 'Get an engineering review for your application',
    helpText: 'Send the operating conditions and drawing. We will compare current standard models and identify any custom interface or documentation requirement.',
    contactCta: 'Contact Engineering',
    closingNote: 'Use these inputs to compare current models and request an application-specific engineering review.',
  },
  de: {
    directory: 'de',
    metaDescription: 'Planen Sie die Auswahl einer Drehdurchführung mit aktuellen Begapunk-Produktdaten, einer Checkliste, Anwendungsfällen, Qualitätsinformationen und technischer Prüfung.',
    eyebrow: 'Anwendungsplanung',
    status: 'Mit der folgenden Checkliste und den aktuellen Unterlagen können Sie eine belastbare Vorauswahl der Drehdurchführung vorbereiten.',
    withdrawn: 'Eine zuverlässige Empfehlung beginnt mit Betriebsmedium, Druck, Drehzahl, Kanalzahl, Einbauraum, Umgebung und Betriebszyklus. Gleichen Sie diese Angaben mit der aktuellen Produktseite und der freigegebenen Zeichnung ab.',
    reviewHeading: 'Erforderliche Angaben',
    reviewItems: [
      'Betriebsmedium, Druck, Drehzahl, Temperatur und Betriebszyklus',
      'Kanalzahl, Anschlussfunktionen und erforderlicher Durchfluss',
      'Einbauraum, Anschlussschnittstellen, Schlauchführung und Umgebung',
    ],
    resourcesHeading: 'Aktuelle Auswahlunterlagen',
    resources: [
      ['products.html', 'Produktkatalog', 'Aktuelle Modellseiten und veröffentlichte Spezifikationen ansehen.'],
      ['case-studies.html', 'Anwendungsfälle', 'Dokumentierte Einbauten und praktische Integrationsdetails ansehen.'],
      ['manufacturing-quality.html', 'Fertigung & Qualität', 'Fertigung und Prüfung der Komponenten ansehen.'],
      ['production-inspection-testing.html', '100%-Dichtheitsprüfung', 'Den aktuellen kanalweisen Produktionsprüfprozess ansehen.'],
      ['contact.html', 'Kontakt', 'Senden Sie Medium, Druck, Drehzahl, Kanalzahl, Einbauart und Lastprofil für eine anwendungsspezifische Prüfung.'],
    ],
    helpHeading: 'Technische Auswahl für Ihre Anwendung anfragen',
    helpText: 'Senden Sie die Einsatzbedingungen und eine Zeichnung. Wir vergleichen die aktuellen Standardmodelle und klären kundenspezifische Schnittstellen oder Dokumentationsanforderungen.',
    contactCta: 'Technische Prüfung anfragen',
    closingNote: 'Nutzen Sie diese Angaben, um aktuelle Modelle zu vergleichen und eine anwendungsspezifische technische Prüfung anzufragen.',
  },
  ja: {
    directory: 'ja',
    metaDescription: 'Begapunkの最新製品データ、技術入力チェックリスト、導入事例、品質情報を使って、ロータリージョイントの選定を計画できます。',
    eyebrow: '用途選定の準備',
    status: '以下のチェックリストと最新資料を使って、ロータリージョイントの選定条件を整理できます。',
    withdrawn: '適切な型式選定には、使用流体、圧力、回転数、流路数、取付スペース、周囲環境、運転サイクルが必要です。最新の製品ページと承認図面に照らして確認します。',
    reviewHeading: 'ご用意いただく情報',
    reviewItems: [
      '使用流体、圧力、回転数、温度、運転サイクル',
      '流路数、各ポートの機能、必要流量',
      '取付スペース、接続インターフェース、配管、周囲環境',
    ],
    resourcesHeading: '現在の選定資料',
    resources: [
      ['products.html', '製品カタログ', '現在公開中の型式ページと仕様をご確認ください。'],
      ['case-studies.html', '導入事例', '実際の設置とインテグレーションの要点をご確認ください。'],
      ['manufacturing-quality.html', '製造・品質', '部品の製造工程と検査方法をご確認ください。'],
      ['production-inspection-testing.html', '全数漏れ検査', '現在実施している流路別の量産検査工程をご確認ください。'],
      ['contact.html', 'お問い合わせ', '媒体、圧力、回転数、流路数、取付方法、運転条件をお送りください。用途ごとに確認します。'],
    ],
    helpHeading: '用途に合わせた技術選定をご依頼ください',
    helpText: '使用条件と図面をお送りください。現在の標準型式を比較し、特注インターフェースや必要書類の有無を確認します。',
    contactCta: '技術確認を依頼',
    closingNote: 'これらの情報を使って現行型式を比較し、用途別の技術確認をご依頼ください。',
  },
  ru: {
    directory: 'ru',
    metaDescription: 'Планируйте подбор вращающегося соединения по актуальным данным Begapunk, перечню исходных данных, примерам применения и информации о качестве.',
    eyebrow: 'Планирование применения',
    status: 'Используйте приведённый ниже перечень и актуальные материалы для точного подбора вращающегося соединения.',
    withdrawn: 'Надёжная рекомендация требует данных о рабочей среде, давлении, скорости, числе каналов, монтажном объёме, окружающей среде и рабочем цикле. Сопоставьте эти данные с актуальной страницей изделия и утверждённым чертежом.',
    reviewHeading: 'Исходные данные',
    reviewItems: [
      'Рабочая среда, давление, скорость, температура и рабочий цикл',
      'Число каналов, функции портов и требуемый расход',
      'Монтажный объём, присоединительные интерфейсы, прокладка шлангов и условия окружающей среды',
    ],
    resourcesHeading: 'Актуальные материалы для выбора',
    resources: [
      ['products.html', 'Каталог продукции', 'См. актуальные страницы моделей и опубликованные характеристики.'],
      ['case-studies.html', 'Примеры применения', 'См. документированные установки и практические данные по интеграции.'],
      ['manufacturing-quality.html', 'Производство и качество', 'См. процессы изготовления и контроля компонентов.'],
      ['production-inspection-testing.html', '100%-ный контроль герметичности', 'См. действующий поканальный процесс производственного контроля.'],
      ['contact.html', 'Контакты', 'Отправьте данные о среде, давлении, скорости, числе каналов, монтаже и рабочем цикле для проверки конкретного применения.'],
    ],
    helpHeading: 'Запросите инженерный анализ для вашего применения',
    helpText: 'Отправьте условия эксплуатации и чертеж. Мы сравним актуальные стандартные модели и определим требования к специальному интерфейсу или документации.',
    contactCta: 'Запросить инженерный анализ',
    closingNote: 'Используйте эти данные для сравнения актуальных моделей и запроса инженерного анализа конкретного применения.',
  },
};

const htmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function buildBody(strings, preservedH1) {
  const reviewItems = strings.reviewItems
    .map((item) => `      <li>${htmlEscape(item)}</li>`)
    .join('\n');
  const resources = strings.resources
    .map(([href, label, description]) => `      <a href="${href}" style="display:flex;flex-direction:column;gap:7px;padding:18px;border:1px solid var(--border);border-radius:10px;background:#fff;color:inherit;text-decoration:none;">\n       <strong style="color:var(--dark-soft);">${htmlEscape(label)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(description)}</span>\n      </a>`)
    .join('\n');

  return `<!-- SOFT-ISOLATION-CONTENT:START -->
<main id="main-content" class="soft-isolation-page">
 <section class="section">
  <div class="container" style="max-width:980px;">
   <span class="section-label">${htmlEscape(strings.eyebrow)}</span>
   ${preservedH1}
   <p style="font-size:1.15rem;line-height:1.7;color:var(--dark-soft);margin:18px 0 24px;">${htmlEscape(strings.status)}</p>
   <div style="padding:22px 24px;border-left:4px solid var(--primary);background:var(--bg-alt);border-radius:8px;margin-bottom:30px;">
    <p style="margin:0;line-height:1.8;color:var(--text);">${htmlEscape(strings.withdrawn)}</p>
   </div>
   <h2 style="margin-bottom:12px;">${htmlEscape(strings.reviewHeading)}</h2>
   <ul style="margin:0 0 34px;padding-left:22px;line-height:1.9;color:var(--text);">
${reviewItems}
   </ul>
   <h2 style="margin-bottom:16px;">${htmlEscape(strings.resourcesHeading)}</h2>
   <nav aria-label="${htmlEscape(strings.resourcesHeading)}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:34px;">
${resources}
   </nav>
   <div class="app-detail-cta" style="align-items:center;">
    <div>
     <h2>${htmlEscape(strings.helpHeading)}</h2>
     <p>${htmlEscape(strings.helpText)}</p>
    </div>
    <a href="contact.html" class="btn btn-primary">${htmlEscape(strings.contactCta)}</a>
   </div>
   <p style="margin:24px 0 0;color:var(--text-light);font-size:0.9rem;line-height:1.7;">${htmlEscape(strings.closingNote)}</p>
  </div>
 </section>
</main>
<!-- SOFT-ISOLATION-CONTENT:END -->`;
}

function updateDescriptionMeta(prefix, description) {
  const escaped = htmlEscape(description);
  const descriptionPattern = /<meta\s+name=["']description["'][^>]*>/i;
  if (!descriptionPattern.test(prefix)) throw new Error('Missing meta description.');
  let next = prefix.replace(descriptionPattern, `<meta name="description" content="${escaped}">`);
  for (const property of ['og:description', 'twitter:description']) {
    const pattern = new RegExp(`<meta\\s+(?:property|name)=["']${property.replace(':', '\\:')}["'][^>]*>`, 'i');
    if (pattern.test(next)) {
      const attribute = property.startsWith('og:') ? 'property' : 'name';
      next = next.replace(pattern, `<meta ${attribute}="${property}" content="${escaped}">`);
    }
  }
  return next;
}

function ensureNoindex(prefix) {
  const robots = '<meta name="robots" content="noindex, follow">';
  const robotsPattern = /<meta\s+name=["']robots["'][^>]*>/i;
  if (robotsPattern.test(prefix)) {
    return prefix.replace(robotsPattern, (tag) => {
      const contentMatch = tag.match(/\bcontent=["']([^"']*)["']/i);
      const directives = new Set((contentMatch?.[1] || '')
        .split(',')
        .map((directive) => directive.trim().toLowerCase())
        .filter(Boolean));
      if (directives.has('noindex') && !directives.has('index') && !directives.has('nofollow')) return tag;
      if (contentMatch) return tag.replace(contentMatch[0], 'content="noindex, follow"');
      return tag.replace(/>$/, ' content="noindex, follow">');
    });
  }
  const descriptionPattern = /<meta\s+name=["']description["'][^>]*>\s*/i;
  return prefix.replace(descriptionPattern, (match) => `${match}${robots}\n`);
}

function isolatePage(html, strings, relativePath) {
  const title = html.match(/<title>[\s\S]*?<\/title>/i)?.[0];
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*>/i)?.[0];
  if (!title || !canonical) throw new Error(`${relativePath}: title or canonical is missing.`);

  const headerStart = html.indexOf('<header class="header">');
  const headerEndStart = html.indexOf('</header>', headerStart);
  const footerStart = html.indexOf('<footer class="footer"', headerEndStart);
  if (headerStart < 0 || headerEndStart < 0 || footerStart < 0) {
    throw new Error(`${relativePath}: expected Header/Footer boundary is missing.`);
  }
  const headerEnd = headerEndStart + '</header>'.length;
  const originalHeader = html.slice(headerStart, headerEnd);
  const originalFooter = html.slice(footerStart);
  const oldBody = html.slice(headerEnd, footerStart);
  const preservedH1 = oldBody.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0];
  if (!preservedH1) throw new Error(`${relativePath}: original H1 is missing.`);

  let prefix = html.slice(0, headerStart);
  prefix = prefix.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  prefix = updateDescriptionMeta(prefix, strings.metaDescription);
  prefix = ensureNoindex(prefix);

  const next = `${prefix}${originalHeader}\n\n${buildBody(strings, preservedH1)}\n\n${originalFooter}`;
  if (!next.includes(title)) throw new Error(`${relativePath}: title changed unexpectedly.`);
  if (!next.includes(canonical)) throw new Error(`${relativePath}: canonical changed unexpectedly.`);
  const nextHeaderStart = next.indexOf('<header class="header">');
  const nextHeaderEnd = next.indexOf('</header>', nextHeaderStart) + '</header>'.length;
  const nextFooterStart = next.indexOf('<footer class="footer"', nextHeaderEnd);
  if (next.slice(nextHeaderStart, nextHeaderEnd) !== originalHeader) throw new Error(`${relativePath}: Header changed unexpectedly.`);
  if (next.slice(nextFooterStart) !== originalFooter) throw new Error(`${relativePath}: Footer changed unexpectedly.`);
  if ((next.match(/<script\b[^>]*type=["']application\/ld\+json["']/gi) || []).length !== 0) {
    throw new Error(`${relativePath}: legacy JSON-LD remains.`);
  }
  if ((next.match(/SOFT-ISOLATION-CONTENT:START/g) || []).length !== 1) {
    throw new Error(`${relativePath}: soft-isolation marker is not unique.`);
  }
  return next;
}

function serializeJson(data, sourceText) {
  const eol = sourceText.includes('\r\n') ? '\r\n' : '\n';
  return `${JSON.stringify(data, null, 2).replaceAll('\n', eol)}${eol}`;
}

function overridePairs(source, localized) {
  const pairs = [
    [source.metaDescription, localized.metaDescription],
    [source.eyebrow, localized.eyebrow],
    [source.status, localized.status],
    [source.withdrawn, localized.withdrawn],
    [source.reviewHeading, localized.reviewHeading],
    [source.resourcesHeading, localized.resourcesHeading],
    [source.helpHeading, localized.helpHeading],
    [source.helpText, localized.helpText],
    [source.contactCta, localized.contactCta],
    [source.closingNote, localized.closingNote],
  ];
  source.reviewItems.forEach((item, index) => pairs.push([item, localized.reviewItems[index]]));
  source.resources.forEach(([, label, description], index) => {
    const [, localizedLabel, localizedDescription] = localized.resources[index];
    pairs.push([`<strong style="color:var(--dark-soft);">${htmlEscape(label)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(description)}</span>`, `<strong style="color:var(--dark-soft);">${htmlEscape(localizedLabel)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(localizedDescription)}</span>`]);
  });
  return pairs;
}

const pending = [];
const plannedWrites = new Map();

for (const [localeCode, strings] of Object.entries(locales)) {
  for (const route of routes) {
    const relativePath = strings.directory ? path.join(strings.directory, route) : route;
    const filePath = path.join(root, relativePath);
    const current = fs.readFileSync(filePath, 'utf8');
    const desired = isolatePage(current, strings, relativePath);
    if (desired !== current) {
      pending.push(relativePath);
      plannedWrites.set(filePath, desired);
    }
  }
}

for (const localeCode of ['de', 'ja', 'ru']) {
  const strings = locales[localeCode];
  const overridesPath = path.join(root, 'i18n', 'overrides', `${localeCode}.json`);
  const overridesText = fs.readFileSync(overridesPath, 'utf8');
  const overrides = JSON.parse(overridesText);
  for (const [, label, description] of locales.en.resources) {
    const legacyUnescapedKey = `<strong style="color:var(--dark-soft);">${label}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${description}</span>`;
    const escapedKey = `<strong style="color:var(--dark-soft);">${htmlEscape(label)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(description)}</span>`;
    if (legacyUnescapedKey !== escapedKey) delete overrides[legacyUnescapedKey];
  }
  for (const [source, translation] of overridePairs(locales.en, strings)) overrides[source] = translation;
  const desiredOverrides = serializeJson(overrides, overridesText);
  if (desiredOverrides !== overridesText) {
    pending.push(path.relative(root, overridesPath));
    plannedWrites.set(overridesPath, desiredOverrides);
  }

  const seoPath = path.join(root, 'i18n', 'seo', `${localeCode}.json`);
  const seoText = fs.readFileSync(seoPath, 'utf8');
  const seo = JSON.parse(seoText);
  for (const route of routes) {
    if (!seo[route]?.title || !seo[route]?.h1) throw new Error(`${localeCode}/${route}: curated SEO title or H1 is missing.`);
    seo[route].description = strings.metaDescription;
  }
  const desiredSeo = serializeJson(seo, seoText);
  if (desiredSeo !== seoText) {
    pending.push(path.relative(root, seoPath));
    plannedWrites.set(seoPath, desiredSeo);
  }
}

if (checkOnly) {
  if (pending.length) {
    console.error(`Soft-isolation sync check failed: ${pending.length} file(s) need synchronization.`);
    for (const file of pending) console.error(`- ${file}`);
    process.exitCode = 1;
  } else {
    console.log('Soft-isolation sync check passed: 9 routes × 4 languages, overrides, and localized SEO descriptions are synchronized.');
  }
} else {
  for (const [filePath, content] of plannedWrites) fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Soft-isolation sync complete: ${plannedWrites.size} file(s) updated.`);
}
