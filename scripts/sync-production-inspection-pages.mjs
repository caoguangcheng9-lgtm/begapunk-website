import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const data = {
  en: {
    dir: '', home: 'Home', quality: 'Quality', current: '100% Leak Testing', eyebrow: 'Production inspection',
    intro: 'After final assembly, every finished Begapunk pneumatic rotary union is checked passage by passage with compressed air before packing and storage.',
    facts: ['100% of finished units', 'Every passage tested individually', '1.0 MPa · approx. 5 seconds', 'Integrated rotation · PASS/NG'],
    processTitle: 'Five-step production inspection', processIntro: 'Every finished unit follows the same inspection and nonconformance process before release.',
    steps: [
      ['Final assembly and inspection queue', 'Finished units enter the final production inspection queue.'],
      ['Test every passage individually', 'One passage is tested at 1.0 MPa while all remaining passages stay unpressurized and open.'],
      ['Build pressure, rotate and hold', 'The equipment pressurizes for approximately 1 second, rotates the joint and holds pressure for approximately 4 seconds. Smooth movement, binding and abnormal noise are also checked.'],
      ['Release only after PASS', 'A unit may proceed to packing and storage only after the instrument displays PASS for every passage.'],
      ['Segregate every nonconforming unit', 'Move the unit to the yellow quarantine container, diagnose it, repair and completely retest it when possible, or scrap it.'],
    ],
    tableTitle: 'Confirmed production parameters', col1: 'Inspection item', col2: 'Current production process',
    rows: [['Inspection stage', 'After final assembly'], ['Inspection coverage', '100% of finished units'], ['Passage coverage', 'Every passage tested individually'], ['Medium and pressure', 'Compressed air at 1.0 MPa (approximately 10 bar)'], ['State of remaining passages', 'Unpressurized and open'], ['Test cycle', 'Approximately 1 second pressurization plus 4 seconds pressure holding'], ['Rotation check', 'Integrated equipment rotation; check for smooth movement, binding and abnormal noise'], ['Acceptance', 'The instrument displays PASS for every passage'], ['Nonconforming-unit handling', 'Yellow quarantine container; diagnose; repair and complete retest, or scrap']],
    evidenceTitle: 'Production inspection in practice', evidenceIntro: 'The photographs show assembled units awaiting inspection and one passage-by-passage test cycle.',
    queueAlt: 'Assembled pneumatic rotary unions waiting in the production inspection queue', queueCaption: 'Assembled units queued for passage-by-passage inspection.',
    passAlt: 'Leak-test station showing PASS during one individual passage test cycle', passCaption: 'Test station showing PASS for the photographed passage-test cycle.',
    boundary: "The 100% passage-by-passage procedure above is Begapunk's current production inspection process. Any project-specific acceptance limit or request for inspection records must be agreed before order.",
    ngTitle: 'Nonconforming-unit segregation and disposition', ngText: 'Any nonconforming unit is placed in the yellow quarantine container for investigation by designated personnel. Repairable units are repaired and must repeat the complete passage-by-passage test. Units that cannot be repaired are scrapped. Packing and storage are allowed only after every passage has passed.',
    ctaTitle: 'Need Inspection Records with Your Order?', ctaText: 'Send the model or drawing, passage count, medium, pressure, and the records or acceptance criteria you need.',
    requestItems: ['Product drawing and passage count', 'Working medium and pressure', 'Order-specific acceptance requirements', 'Inspection records required with the shipment'],
    cta: 'Send Inspection Requirements →', back: '← Back to Manufacturing &amp; Quality', statement: 'Current production process',
  },
  de: {
    dir: 'de', home: 'Startseite', quality: 'Qualität', current: '100%-Dichtheitsprüfung', eyebrow: 'Produktionsprüfung', statement: 'Aktueller Produktionsablauf',
    intro: 'Nach der Endmontage wird jede fertige pneumatische Drehdurchführung von Begapunk vor Verpackung und Einlagerung kanalweise mit Druckluft geprüft.',
    facts: ['100 % der Fertigteile', 'Jeder Kanal wird einzeln geprüft', '1,0 MPa · etwa 5 Sekunden', 'Integrierte Drehfunktion · PASS/NG'],
    processTitle: 'Produktionsprüfung in fünf Schritten', processIntro: 'Der Ablauf zeigt die vollständige Prüffolge – von der Freigabe bestandener Teile bis zur Behandlung nichtkonformer Teile.',
    steps: [['Endmontage und Prüfwarteschlange', 'Fertige Einheiten gelangen in die abschließende Produktionsprüfung.'], ['Jeden Kanal einzeln prüfen', 'Ein Kanal wird mit 1,0 MPa geprüft; alle übrigen Kanäle bleiben drucklos und offen.'], ['Druck aufbauen, drehen und halten', 'Die Anlage baut etwa 1 Sekunde lang Druck auf, dreht die Drehdurchführung und hält den Druck etwa 4 Sekunden. Dabei werden auch gleichmäßiger Lauf, Klemmen und ungewöhnliche Geräusche geprüft.'], ['Freigabe nur bei PASS', 'Verpackung und Einlagerung erfolgen erst, wenn das Prüfgerät für jeden Kanal PASS anzeigt.'], ['Nichtkonforme Teile sperren und behandeln', 'Das Teil wird in den gelben Sperrbehälter gelegt. Anschließend wird die Ursache untersucht; reparierbare Teile werden instand gesetzt und vollständig erneut geprüft, nicht reparierbare Teile werden verschrottet.']],
    tableTitle: 'Bestätigte Produktionsparameter', col1: 'Prüfmerkmal', col2: 'Aktueller Produktionsablauf',
    rows: [['Prüfzeitpunkt', 'Nach der Endmontage'], ['Prüfumfang', '100 % der Fertigteile'], ['Kanalabdeckung', 'Jeder Kanal wird einzeln geprüft'], ['Medium und Druck', 'Druckluft bei 1,0 MPa (etwa 10 bar)'], ['Zustand der übrigen Kanäle', 'Drucklos und offen'], ['Prüfzyklus', 'Etwa 1 Sekunde Druckaufbau plus 4 Sekunden Druckhaltezeit'], ['Drehprüfung', 'Integrierte Drehfunktion; Prüfung auf gleichmäßigen Lauf, Klemmen und ungewöhnliche Geräusche'], ['Annahme', 'Das Prüfgerät zeigt für jeden Kanal PASS an'], ['Behandlung nichtkonformer Teile', 'Im gelben Sperrbehälter separieren; Ursache untersuchen; gegebenenfalls instand setzen und vollständig erneut prüfen, andernfalls verschrotten']],
    evidenceTitle: 'Produktionsprüfung in der Praxis', evidenceIntro: 'Die Fotos zeigen montierte Einheiten in der Prüfwarteschlange und einen einzelnen Kanalprüfzyklus.',
    queueAlt: 'Montierte pneumatische Drehdurchführungen in der betrieblichen Prüfwarteschlange', queueCaption: 'Montierte Einheiten in der Warteschlange für die kanalweise Prüfung.',
    passAlt: 'Dichtheitsprüfstation mit PASS-Anzeige bei einem einzelnen Kanalprüfzyklus', passCaption: 'Prüfstation mit PASS-Anzeige für den abgebildeten Kanalprüfzyklus.',
    boundary: 'Die oben beschriebene 100%-Prüfung jedes einzelnen Kanals ist der derzeit eingesetzte Produktionsprüfprozess von Begapunk. Auftragsbezogene Annahmegrenzen oder Anforderungen an Prüfunterlagen müssen vor der Bestellung vereinbart werden.',
    ngTitle: 'Sperrung und Behandlung nichtkonformer Teile', ngText: 'Jedes nichtkonforme Teil wird zunächst im gelben Sperrbehälter separiert und anschließend von zuständigem Personal untersucht. Reparierbare Teile werden instand gesetzt und müssen anschließend die vollständige kanalweise Prüfung wiederholen. Nicht reparierbare Teile werden verschrottet. Verpackung und Einlagerung erfolgen erst nach bestandener Prüfung aller Kanäle.',
    ctaTitle: 'Prüfanforderung für Ihr Projekt festlegen', ctaText: 'Senden Sie Produktzeichnung, Kanalzahl, Betriebsmedium und -druck sowie auftragsbezogene Anforderungen an Prüfunterlagen.',
    requestItems: ['Produktzeichnung und Kanalzahl', 'Betriebsmedium und -druck', 'Auftragsbezogene Annahmekriterien', 'Mit der Lieferung benötigte Prüfunterlagen'],
    cta: 'Technische Prüfung anfragen →', back: '← Zurück zu Fertigung &amp; Qualität',
  },
  ja: {
    dir: 'ja', home: 'ホーム', quality: '品質管理', current: '全数漏れ検査', eyebrow: '量産検査', statement: '現在の量産検査工程', statementSeparator: '：',
    intro: 'Begapunkでは、最終組立後の空圧用ロータリージョイントを全数対象とし、梱包・入庫前に各流路を圧縮空気で個別に検査します。',
    facts: ['完成品を100％検査', 'すべての流路を個別検査', '1.0 MPa・約5秒', '装置回転機能・PASS／NG判定'],
    processTitle: '5段階の量産検査工程', processIntro: '合格判定とNG品処置までの流れを、重複なくまとめています。',
    steps: [['最終組立・検査待ち', '完成品を最終の量産検査工程へ移します。'], ['すべての流路を個別検査', '対象流路を1.0 MPaで検査し、他の流路は無加圧で大気開放とします。'], ['加圧・回転・保圧', '約1秒かけて加圧し、装置で製品を回転させながら約4秒間保圧します。回転の滑らかさ、引っ掛かり、異音も確認します。'], ['PASS確認後に工程移行', 'すべての流路で検査器にPASSが表示された製品だけを梱包・入庫します。'], ['NG品の隔離と処置', '黄色の不適合品隔離容器に移し、原因を確認します。修理可能品は修理後に全流路を再検査し、修理不可と判定した製品は廃棄します。']],
    tableTitle: '確認済みの量産検査条件', col1: '検査項目', col2: '現在の量産工程',
    rows: [['検査工程', '最終組立後'], ['検査対象', '完成品の100％（全数）'], ['流路の検査範囲', 'すべての流路を個別に検査'], ['媒体・圧力', '1.0 MPa（約10 bar）の圧縮空気'], ['その他の流路の状態', '無加圧で大気開放'], ['検査サイクル', '約1秒の加圧と4秒間の保圧'], ['回転確認', '装置の回転機能を使用し、滑らかさ、引っ掛かり、異音を確認'], ['合格判定', 'すべての流路で検査器にPASSを表示'], ['NG品の処置', '黄色の不適合品隔離容器へ移し、原因確認、修理後の全流路再検査、または廃棄']],
    evidenceTitle: '量産検査の実施例', evidenceIntro: '写真は、組立済み製品の検査待ち工程と1回の流路別検査サイクルを示しています。',
    queueAlt: '量産検査待ちの組立済み空圧用ロータリージョイント', queueCaption: '流路別検査を待つ組立済み製品です。',
    passAlt: '1流路の個別検査サイクルでPASSを表示する漏れ検査装置', passCaption: '写真に写る流路別検査サイクルでPASSを表示する検査装置です。',
    boundary: '上記の全数・流路別検査は、Begapunkが現在実施している量産検査工程です。案件ごとの合格基準や検査書類のご要望は、ご注文前に取り決めます。',
    ngTitle: 'NG品の隔離と処置', ngText: 'NG品は黄色の不適合品隔離容器に移し、担当者が原因を確認します。修理可能な製品は修理後、すべての流路について一連の検査を最初から再実施します。修理不可と判定した製品は廃棄し、全流路が合格した製品だけを梱包・入庫します。',
    ctaTitle: '案件ごとの検査要件を確認します', ctaText: '製品図面、流路数、使用流体、使用圧力、注文ごとに必要な検査書類をお知らせください。',
    requestItems: ['製品図面と流路数', '使用流体と使用圧力', '注文ごとの合格条件', '出荷時に必要な検査書類'],
    cta: '技術確認を依頼する →', back: '← 製造・品質管理に戻る',
  },
  ru: {
    dir: 'ru', home: 'Главная', quality: 'Качество', current: '100%-ный контроль герметичности', eyebrow: 'Производственный контроль', statement: 'Действующий производственный процесс',
    intro: 'После окончательной сборки каждое готовое пневматическое вращающееся соединение Begapunk проверяется сжатым воздухом отдельно по каждому каналу до упаковки и передачи на склад.',
    facts: ['100 % готовых изделий', 'Каждый канал проверяется отдельно', '1,0 МПа · около 5 секунд', 'Встроенное вращение · PASS/NG'],
    processTitle: 'Производственный контроль в пять этапов', processIntro: 'Ниже показана полная последовательность — от решения о приёмке до действий с несоответствующим изделием.',
    steps: [['Окончательная сборка и очередь на контроль', 'Готовые изделия поступают на заключительный этап производственного контроля.'], ['Последовательная проверка каждого канала', 'Один канал проверяется при 1,0 МПа; остальные каналы остаются без давления и открытыми.'], ['Набор давления, вращение и выдержка', 'Оборудование набирает давление примерно за 1 секунду, вращает изделие и выдерживает давление около 4 секунд. Также проверяются плавность хода, отсутствие заедания и посторонних шумов.'], ['Допуск только после PASS', 'Упаковка и передача на склад разрешаются, только когда прибор показывает PASS для каждого канала.'], ['Действия при результате NG', 'Изделие помещают в жёлтый карантинный контейнер, устанавливают причину несоответствия, при возможности ремонтируют и полностью перепроверяют; неремонтопригодное изделие списывают в брак.']],
    tableTitle: 'Подтверждённые параметры производственного контроля', col1: 'Параметр контроля', col2: 'Действующий производственный процесс',
    rows: [['Этап контроля', 'После окончательной сборки'], ['Охват контроля', '100 % готовых изделий'], ['Охват каналов', 'Каждый канал проверяется отдельно'], ['Среда и давление', 'Сжатый воздух при 1,0 МПа (около 10 бар)'], ['Состояние остальных каналов', 'Без давления, каналы открыты'], ['Цикл контроля', 'Около 1 секунды набора давления и 4 секунды выдержки'], ['Проверка вращения', 'Встроенная функция вращения; контроль плавности хода, заедания и посторонних шумов'], ['Приёмка', 'Прибор показывает PASS для каждого канала'], ['Действия при NG', 'Жёлтый карантинный контейнер; поиск причины; ремонт и полный повторный контроль либо списание в брак']],
    evidenceTitle: 'Производственный контроль на практике', evidenceIntro: 'Фотографии показывают собранные изделия в очереди на контроль и один цикл поканальной проверки.',
    queueAlt: 'Собранные пневматические вращающиеся соединения в очереди на производственный контроль', queueCaption: 'Собранные изделия в очереди на поканальный контроль.',
    passAlt: 'Установка контроля герметичности показывает PASS для одного цикла проверки канала', passCaption: 'Установка показывает PASS для изображённого цикла проверки одного канала.',
    boundary: 'Описанный выше 100%-ный поканальный контроль является действующим производственным процессом Begapunk. Критерии приёмки или требования к протоколам для конкретного проекта необходимо согласовать до размещения заказа.',
    ngTitle: 'Изоляция и обработка изделий с результатом NG', ngText: 'Каждое изделие с результатом NG помещают в жёлтый карантинный контейнер и передают ответственному специалисту для поиска причины. Ремонтопригодное изделие после ремонта проходит полный повторный контроль всех каналов. Неремонтопригодное изделие списывают в брак. Упаковка и передача на склад разрешены только после PASS по всем каналам.',
    ctaTitle: 'Согласуйте требования к контролю для вашего проекта', ctaText: 'Направьте чертёж изделия, число каналов, рабочую среду и давление, а также требования к документам по конкретному заказу.',
    requestItems: ['Чертёж изделия и число каналов', 'Рабочая среда и давление', 'Требования к приёмке по заказу', 'Протоколы контроля, которые необходимо приложить к поставке'],
    cta: 'Запросить инженерный анализ →', back: '← Вернуться к разделу «Производство и качество»',
  },
};

function schema(lang, t) {
  const prefix = lang === 'en' ? '' : `${lang}/`;
  const pageUrl = `https://www.begapunk.com/${prefix}production-inspection-testing.html`;
  const homeUrl = `https://www.begapunk.com/${prefix}`;
  const qualityUrl = `https://www.begapunk.com/${prefix}manufacturing-quality.html`;
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: t.current, description: t.intro, inLanguage: lang, dateModified: '2026-08-09', isPartOf: { '@id': 'https://www.begapunk.com/#website' }, primaryImageOfPage: { '@type': 'ImageObject', url: 'https://www.begapunk.com/images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg' } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.home, item: homeUrl },
      { '@type': 'ListItem', position: 2, name: t.quality, item: qualityUrl },
      { '@type': 'ListItem', position: 3, name: t.current, item: pageUrl },
    ] },
  ] });
}

function markup(lang, t) {
  const asset = lang === 'en' ? '' : '../';
  const facts = t.facts.map((fact) => `<article class="pit-fact"><strong>${fact}</strong></article>`).join('');
  const steps = t.steps.map(([title, text]) => `<article class="pit-step"><h3>${title}</h3><p>${text}</p></article>`).join('');
  const rows = t.rows.map(([item, value]) => `<tr><th scope="row">${item}</th><td data-label="${t.col2}">${value}</td></tr>`).join('');
  const requests = t.requestItems.map((item) => `<li>${item}</li>`).join('');
  return `<main id="main-content">
<section class="pit-hero"><div class="container">
  <div class="pit-breadcrumb"><a href="index.html">${t.home}</a> / <a href="manufacturing-quality.html">${t.quality}</a> / ${t.current}</div>
  <span class="pit-eyebrow">${t.eyebrow}</span>
  <h1>${lang === 'en' ? '100% Passage-by-Passage Leak Testing for Pneumatic Rotary Unions' : lang === 'de' ? '100%-Dichtheitsprüfung jedes einzelnen Kanals bei pneumatischen Drehdurchführungen' : lang === 'ja' ? '空圧用ロータリージョイントの全数・流路別漏れ検査' : '100%-ный поканальный контроль герметичности пневматических вращающихся соединений'}</h1>
  <p>${t.intro}</p>
</div></section>
<section class="pit-section pit-facts-section"><div class="container"><div class="pit-facts">${facts}</div></div></section>
<section class="pit-section alt" id="inspection-workflow"><div class="container">
  <div class="pit-heading"><h2>${t.processTitle}</h2><p>${t.processIntro}</p></div>
  <div class="pit-workflow">${steps}</div>
</div></section>
<section class="pit-section" id="verified-test-parameters"><div class="container">
  <div class="pit-heading"><h2>${t.tableTitle}</h2></div>
  <div class="pit-table-wrap"><table class="pit-table"><thead><tr><th scope="col">${t.col1}</th><th scope="col">${t.col2}</th></tr></thead><tbody>${rows}</tbody></table></div>
</div></section>
<section class="pit-section alt" id="visual-evidence"><div class="container">
  <div class="pit-heading"><h2>${t.evidenceTitle}</h2><p>${t.evidenceIntro}</p></div>
  <div class="pit-visual-grid"><figure class="pit-figure"><picture><source srcset="${asset}images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.webp" type="image/webp"><img src="${asset}images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg" alt="${t.queueAlt}" width="900" height="1084" loading="lazy"></picture><figcaption>${t.queueCaption}</figcaption></figure><figure class="pit-figure pass"><picture><source srcset="${asset}images/manufacturing-quality/production-inspection/individual-passage-test-pass.webp" type="image/webp"><img src="${asset}images/manufacturing-quality/production-inspection/individual-passage-test-pass.jpg" alt="${t.passAlt}" width="688" height="720" loading="lazy"></picture><figcaption>${t.passCaption}</figcaption></figure></div>
  <div class="pit-evidence-boundary"><strong>${t.statement}</strong>${t.statementSeparator || ':'} ${t.boundary}</div>
</div></section>
<section class="pit-section" id="ng-control"><div class="container"><div class="pit-ng-summary"><span class="pit-kicker">NG</span><h2>${t.ngTitle}</h2><p>${t.ngText}</p></div></div></section>
<section class="section cta-section" id="inspection-rfq"><div class="container">
  <h2>${t.ctaTitle}</h2><p>${t.ctaText}</p><ul class="pit-request-list">${requests}</ul>
  <a href="contact.html?inquiry_type=technical-consultation&amp;application=production-leak-testing" class="btn btn-primary">${t.cta}</a>
  <p class="pit-back-link"><a href="manufacturing-quality.html">${t.back}</a></p>
</div></section>
</main>`;
}

for (const [lang, t] of Object.entries(data)) {
  const file = lang === 'en' ? path.join(root, 'production-inspection-testing.html') : path.join(root, lang, 'production-inspection-testing.html');
  let html = await fs.readFile(file, 'utf8');
  const $ = load(html, { decodeEntities: false, sourceCodeLocationInfo: true });
  const main = $('main#main-content').get(0);
  if (!main?.sourceCodeLocation) throw new Error(`${lang}: main content is missing.`);
  html = `${html.slice(0, main.sourceCodeLocation.startOffset)}${markup(lang, t)}${html.slice(main.sourceCodeLocation.endOffset)}`;
  html = html.replace(/\s*<meta\s+name="keywords"[^>]*>/i, '');
  html = html.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1https://www.begapunk.com/images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg$2`);
  html = html.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1https://www.begapunk.com/images/manufacturing-quality/production-inspection/assembled-units-in-inspection-queue.jpg$2`);
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">${schema(lang, t)}</script>`);
  await fs.writeFile(file, html, 'utf8');

  const finalPage = load(html, { decodeEntities: false });
  const searchable = finalPage('body').clone();
  searchable.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
  const searchFile = lang === 'en' ? path.join(root, 'search-index.json') : path.join(root, lang, 'search-index.json');
  const searchIndex = JSON.parse(await fs.readFile(searchFile, 'utf8'));
  const record = searchIndex.find((entry) => entry.url === 'production-inspection-testing.html');
  if (!record) throw new Error(`${lang}: production-inspection search record is missing.`);
  record.title = finalPage('title').text().trim();
  record.description = finalPage('meta[name="description"]').attr('content')?.trim() || record.description;
  record.h1 = finalPage('h1').first().text().replace(/\s+/g, ' ').trim();
  record.h2s = finalPage('h2').map((_, element) => finalPage(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean);
  record.body = searchable.text().replace(/\s+/g, ' ').trim();
  await fs.writeFile(searchFile, `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8');
}

console.log('Production inspection pages synchronized across four languages.');
