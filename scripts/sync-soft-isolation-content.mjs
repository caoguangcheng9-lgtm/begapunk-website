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
    metaDescription: 'This page is under technical review. Begapunk is checking model references, technical claims, and evidence boundaries before republishing detailed guidance.',
    eyebrow: 'Technical content review',
    status: 'This page is temporarily limited while we verify technical content.',
    withdrawn: 'The previous long-form content has been withdrawn from use while we recheck its technical statements, model references, and evidence boundaries against current product data, approved drawings, and available test evidence.',
    reviewHeading: 'What is being checked',
    reviewItems: [
      'Technical statements and operating limits',
      'Model references and selection guidance',
      'The scope and applicability of supporting evidence',
    ],
    resourcesHeading: 'Available resources you can use now',
    resources: [
      ['products.html', 'Product Catalog', 'Review current model pages and published specifications.'],
      ['case-studies.html', 'Case Studies', 'See documented installation examples and their stated evidence boundaries.'],
      ['manufacturing-quality.html', 'Manufacturing & Quality', 'Review the currently published manufacturing and quality information.'],
      ['production-inspection-testing.html', '100% Leak Testing', 'See the documented production leak-test process and its stated test conditions.'],
      ['contact.html', 'Contact', 'Send your actual medium, pressure, speed, passage count, mounting, and duty-cycle requirements for an application-specific review.'],
    ],
    helpHeading: 'Need help before this page is republished?',
    helpText: 'Send the application conditions and drawing. We will answer from current confirmed data, identify any unresolved point, and avoid treating an unverified model reference as a recommendation.',
    contactCta: 'Contact Engineering',
    closingNote: 'Until this review is complete, do not rely on earlier detailed guidance from this route.',
  },
  de: {
    directory: 'de',
    metaDescription: 'Diese Seite wird technisch überprüft. Begapunk prüft Modellverweise, technische Aussagen und Nachweisgrenzen, bevor detaillierte Inhalte erneut veröffentlicht werden.',
    eyebrow: 'Technische Inhaltsprüfung',
    status: 'Diese Seite ist vorübergehend eingeschränkt, während wir die technischen Inhalte überprüfen.',
    withdrawn: 'Der bisherige ausführliche Inhalt wurde vorübergehend zurückgezogen, während wir seine technischen Aussagen, Modellverweise und Nachweisgrenzen anhand aktueller Produktdaten, freigegebener Zeichnungen und verfügbarer Prüfnachweise erneut prüfen.',
    reviewHeading: 'Was geprüft wird',
    reviewItems: [
      'Technische Aussagen und Betriebsgrenzen',
      'Modellverweise und Auswahlhinweise',
      'Geltungsbereich und Übertragbarkeit der Nachweise',
    ],
    resourcesHeading: 'Verfügbare Ressourcen',
    resources: [
      ['products.html', 'Produktkatalog', 'Aktuelle Modellseiten und veröffentlichte Spezifikationen ansehen.'],
      ['case-studies.html', 'Anwendungsfälle', 'Dokumentierte Einbaubeispiele und die jeweils angegebenen Nachweisgrenzen ansehen.'],
      ['manufacturing-quality.html', 'Fertigung & Qualität', 'Aktuell veröffentlichte Informationen zu Fertigung und Qualität ansehen.'],
      ['production-inspection-testing.html', '100 % Dichtheitsprüfung', 'Den dokumentierten Produktions-Dichtheitsprüfprozess und die angegebenen Prüfbedingungen ansehen.'],
      ['contact.html', 'Kontakt', 'Senden Sie Medium, Druck, Drehzahl, Kanalzahl, Einbauart und Lastprofil für eine anwendungsspezifische Prüfung.'],
    ],
    helpHeading: 'Benötigen Sie Unterstützung vor der erneuten Veröffentlichung?',
    helpText: 'Senden Sie die Einsatzbedingungen und eine Zeichnung. Wir antworten auf Basis aktuell bestätigter Daten, kennzeichnen offene Punkte und behandeln nicht geprüfte Modellverweise nicht als Empfehlung.',
    contactCta: 'Technische Prüfung anfragen',
    closingNote: 'Bis die Prüfung abgeschlossen ist, sollte die frühere ausführliche Anleitung unter dieser Adresse nicht als aktuell betrachtet werden.',
  },
  ja: {
    directory: 'ja',
    metaDescription: 'このページは技術内容を再確認中です。詳細情報の再公開前に、型式参照、技術的記述、根拠資料の適用範囲を確認しています。',
    eyebrow: '技術内容の確認中',
    status: 'このページは、技術内容を再確認しているため、一時的に詳細表示を制限しています。',
    withdrawn: 'これまで掲載していた詳細内容は一時的に取り下げ、技術的記述、型式参照、根拠資料の適用範囲を、最新の製品データ、承認図面、利用可能な試験資料と照合しています。',
    reviewHeading: '確認している項目',
    reviewItems: [
      '技術的記述と使用限界',
      '型式参照と選定案内',
      '根拠資料の適用範囲と他条件への適用可否',
    ],
    resourcesHeading: '現在利用できる資料',
    resources: [
      ['products.html', '製品カタログ', '現在公開中の型式ページと仕様をご確認ください。'],
      ['case-studies.html', '導入事例', '実際の設置事例と、各ページに明記した根拠の範囲をご確認ください。'],
      ['manufacturing-quality.html', '製造・品質', '現在公開中の製造工程と品質情報をご確認ください。'],
      ['production-inspection-testing.html', '全数漏れ検査', '公開済みの生産時漏れ検査工程と試験条件をご確認ください。'],
      ['contact.html', 'お問い合わせ', '媒体、圧力、回転数、流路数、取付方法、運転条件をお送りください。用途ごとに確認します。'],
    ],
    helpHeading: 'ページ再公開前に選定支援が必要ですか？',
    helpText: '使用条件と図面をお送りください。現在確認済みの情報に基づいて回答し、未確認事項を明示し、未検証の型式参照を推奨として扱いません。',
    contactCta: '技術確認を依頼',
    closingNote: '確認が完了するまで、このURLに以前掲載されていた詳細案内を最新情報として利用しないでください。',
  },
  ru: {
    directory: 'ru',
    metaDescription: 'Страница проходит техническую проверку. Begapunk уточняет ссылки на модели, технические утверждения и границы доказательств перед повторной публикацией.',
    eyebrow: 'Техническая проверка содержания',
    status: 'Подробное содержание этой страницы временно ограничено на период технической проверки.',
    withdrawn: 'Ранее опубликованный развернутый материал временно снят, пока мы сверяем технические утверждения, ссылки на модели и границы применимости доказательств с актуальными данными изделий, утвержденными чертежами и доступными результатами испытаний.',
    reviewHeading: 'Что проверяется',
    reviewItems: [
      'Технические утверждения и рабочие пределы',
      'Ссылки на модели и рекомендации по выбору',
      'Область и применимость подтверждающих материалов',
    ],
    resourcesHeading: 'Доступные материалы',
    resources: [
      ['products.html', 'Каталог продукции', 'См. актуальные страницы моделей и опубликованные характеристики.'],
      ['case-studies.html', 'Примеры применения', 'См. документированные примеры установки и указанные для них границы доказательств.'],
      ['manufacturing-quality.html', 'Производство и качество', 'См. опубликованную информацию о производстве и контроле качества.'],
      ['production-inspection-testing.html', '100% проверка герметичности', 'См. описанный процесс производственной проверки герметичности и указанные условия испытания.'],
      ['contact.html', 'Контакты', 'Отправьте данные о среде, давлении, скорости, числе каналов, монтаже и рабочем цикле для проверки конкретного применения.'],
    ],
    helpHeading: 'Нужна помощь до повторной публикации страницы?',
    helpText: 'Отправьте условия применения и чертеж. Мы ответим на основе подтвержденных данных, отметим нерешенные вопросы и не будем представлять непроверенную ссылку на модель как рекомендацию.',
    contactCta: 'Запросить техническую проверку',
    closingNote: 'До завершения проверки не следует считать ранее опубликованное подробное руководство по этому адресу актуальным.',
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
    ['This page is under technical review. Begapunk is checking model references, technical claims, and evidence boundaries before republishing detailed guidance.', localized.metaDescription],
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
