import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const dateModified = '2026-08-14';
const siteUrl = 'https://www.begapunk.com';
const applicationPage = 'application-cnc-pneumatic-clamping.html';
const productPage = 'BP-2P-130-0001.html';
const imageBase = 'bp-2p-130-custom-cnc-circular-saw-fixture-rear-view';
const imagePath = `images/applications/cnc-pneumatic-clamping/${imageBase}`;
const evidenceAnchor = 'bp-2p-130-cnc-saw-fixture-evidence';
const moduleAnchor = 'verified-bp-2p-130-cnc-saw-fixture';
const markerStart = '<!-- CNC-SAW-FIXTURE-CASE:START -->';
const markerEnd = '<!-- CNC-SAW-FIXTURE-CASE:END -->';
const productMarkerStart = '<!-- CNC-SAW-FIXTURE-PRODUCT:START -->';
const productMarkerEnd = '<!-- CNC-SAW-FIXTURE-PRODUCT:END -->';

const copy = {
  en: {
    prefix: '',
    language: 'en',
    label: 'Verified Customer Production Application',
    heading: 'BP-2P-130-0001 in a Custom CNC Circular-Saw Fixture',
    intro: 'This customer-authorized video frame shows BP-2P-130-0001 installed at the rear of a custom CNC machining fixture on a circular-blade saw machine. The customer uses two independent compressed-air passages for fixture clamp and release.',
    detailsHeading: 'Verified application facts',
    facts: [
      ['Equipment', 'Customer\'s custom CNC machining fixture on a circular-blade saw machine'],
      ['Installed rotary union', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['Pneumatic function', 'Two independent compressed-air passages for fixture clamp and release'],
      ['Operating context', 'Low-speed customer production equipment; the exact rotational speed is not established by the video'],
      ['Camera view', 'Rear or tail of the fixture; the front jaws are outside the frame'],
      ['Disclosure', 'Customer identity and machine brand are not disclosed'],
    ],
    alt: 'Rear view of a custom CNC circular-saw fixture with BP-2P-130-0001 installed',
    imageAria: 'View the BP-2P-130-0001 product page from the authorized CNC fixture photograph',
    caption: 'Customer-authorized production-video frame showing the rear of the custom fixture; the customer and machine brand are not disclosed.',
    boundaryTitle: 'Engineering confirmation',
    boundary: 'This customer application confirms BP-2P-130-0001 with two independent compressed-air passages for fixture clamp and release. For a similar fixture, send us the clamping-fixture drawing and operating conditions; we will check the port arrangement, pressure, rotational speed, duty cycle and mounting interface before recommending the configuration.',
    introVisualAlt: 'BP-2P-130-0001 air rotary union for a CNC pneumatic clamping fixture',
    introVisualLabel: 'Verified installed model',
    introVisualText: 'BP-2P-130-0001 in the documented low-speed circular-saw fixture application.',
    introSupplyLegacy: 'When a CNC fixture rotates, the air line cannot be allowed to twist or pull on the actuator. A pneumatic rotary joint provides a sealed rotating path between the stationary supply and the moving fixture.',
    introSupply: 'When a CNC fixture rotates, its compressed-air lines must not twist or pull on the actuator. A pneumatic rotary union provides sealed rotating passages for compressed air between the stationary air-supply side and the rotating fixture.',
    faqQuestion: 'Can a rotary union hold clamping pressure during machining?',
    blowOff: 'Blow-off',
    productButton: 'View BP-2P-130-0001',
    contactButton: 'Discuss a Similar Fixture',
    productEntryHeading: 'Verified Customer Application: Custom CNC Circular-Saw Fixture',
    productEntry: 'BP-2P-130-0001 is installed at the rear of a customer production fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. The equipment operates at low speed; exact speed, pressure, port assignment and interface must be confirmed from the fixture drawing and approved product data.',
    productEntryLink: 'View authorized application evidence →',
    creativeName: 'BP-2P-130-0001 in a custom CNC circular-saw fixture',
    creativeDescription: 'Customer-authorized production evidence confirms BP-2P-130-0001 at the rear of a custom CNC machining fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. For similar equipment, the port arrangement, pressure, rotational speed, duty cycle and mounting interface require engineering confirmation against the fixture drawing and approved product data.',
    llms: 'Selection guidance plus a customer-authorized BP-2P-130-0001 production application on a custom low-speed circular-saw fixture, using two independent compressed-air passages for clamp and release.',
  },
  de: {
    prefix: 'de/',
    language: 'de',
    label: 'Bestätigter Einsatz in einer Kunden-Produktionsanlage',
    heading: 'BP-2P-130-0001 in einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine',
    intro: 'Dieses vom Kunden zur Veröffentlichung freigegebene Videostandbild zeigt BP-2P-130-0001 an der Rückseite einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine. Der Kunde nutzt zwei getrennte Druckluftkanäle zum Spannen und Lösen der Vorrichtung.',
    detailsHeading: 'Bestätigte Anwendungsdaten',
    facts: [
      ['Anlage', 'Kundenspezifische CNC-Spannvorrichtung an einer Kreissägemaschine'],
      ['Eingebaute Drehdurchführung', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['Pneumatikfunktion', 'Zwei getrennte Druckluftkanäle zum Spannen und Lösen der Vorrichtung'],
      ['Betriebsumfeld', 'Langsam laufende Kunden-Produktionsanlage; die genaue Drehzahl ist durch das Video nicht belegt'],
      ['Bildausschnitt', 'Rückseite der Spannvorrichtung; die vorderen Spannbacken liegen außerhalb des Bildes'],
      ['Offenlegung', 'Identität des Kunden und Maschinenfabrikat werden nicht genannt'],
    ],
    alt: 'Rückansicht einer kundenspezifischen CNC-Spannvorrichtung an einer Kreissägemaschine mit eingebauter BP-2P-130-0001',
    imageAria: 'Produktseite der BP-2P-130-0001 über das freigegebene Foto der CNC-Spannvorrichtung öffnen',
    caption: 'Vom Kunden freigegebenes Standbild aus einem Produktionsvideo mit der Rückseite der kundenspezifischen Vorrichtung; Kunde und Maschinenmarke werden nicht genannt.',
    boundaryTitle: 'Technische Abstimmung',
    boundary: 'Für diese Kundenanwendung ist der Einsatz der BP-2P-130-0001 mit zwei getrennten Druckluftkanälen zum Spannen und Lösen der Vorrichtung bestätigt. Senden Sie uns für eine ähnliche Vorrichtung die Vorrichtungszeichnung und Betriebsdaten; wir prüfen Anschlussbelegung, Druck, Drehzahl, Betriebszyklus und Einbauschnittstelle vor der Auslegung.',
    introVisualAlt: 'Drehdurchführung BP-2P-130-0001 für eine pneumatische CNC-Spannvorrichtung',
    introVisualLabel: 'Bestätigtes Einbaumodell',
    introVisualText: 'BP-2P-130-0001 in der dokumentierten Anwendung an einer langsam laufenden Kreissägemaschine.',
    introSupplyLegacy: 'Beim Drehen einer CNC-Spannvorrichtung darf die Luftleitung weder verdreht werden noch am Aktuator ziehen. Eine pneumatische Drehdurchführung stellt einen abgedichteten rotierenden Übergang zwischen der stationären Versorgung und der bewegten Vorrichtung her.',
    introSupply: 'Wenn sich eine CNC-Spannvorrichtung dreht, dürfen sich die Druckluftleitungen weder verdrehen noch am Aktuator ziehen. Eine pneumatische Drehdurchführung stellt abgedichtete rotierende Druckluftkanäle zwischen der stationären Druckluftversorgung und der rotierenden Vorrichtung bereit.',
    faqQuestion: 'Kann eine Drehdurchführung den Spanndruck während der Bearbeitung halten?',
    blowOff: 'Abblasen',
    productButton: 'BP-2P-130-0001 ansehen',
    contactButton: 'Ähnliche Vorrichtung besprechen',
    productEntryHeading: 'Bestätigte Kundenanwendung: kundenspezifische CNC-Spannvorrichtung einer Kreissägemaschine',
    productEntry: 'BP-2P-130-0001 ist an der Rückseite einer Kunden-Produktionsvorrichtung an einer Kreissägemaschine eingebaut. Zwei getrennte Druckluftkanäle übernehmen das Spannen und Lösen der Vorrichtung. Die Anlage läuft mit niedriger Drehzahl; genaue Drehzahl, Druck, Portzuordnung und Schnittstelle sind anhand der Vorrichtungszeichnung und der freigegebenen Produktdaten zu bestätigen.',
    productEntryLink: 'Freigegebenen Anwendungsnachweis ansehen →',
    creativeName: 'BP-2P-130-0001 in einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine',
    creativeDescription: 'Ein vom Kunden freigegebener Produktionsnachweis bestätigt BP-2P-130-0001 an der Rückseite einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine. Zwei getrennte Druckluftkanäle übernehmen das Spannen und Lösen. Für vergleichbare Anwendungen sind Anschlussbelegung, Druck, Drehzahl, Betriebszyklus und Einbauschnittstelle anhand der Vorrichtungszeichnung und freigegebener Produktdaten technisch abzustimmen.',
    llms: 'Auswahlhilfe mit einer vom Kunden freigegebenen Produktionsanwendung der BP-2P-130-0001 an einer langsam laufenden kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine; zwei getrennte Druckluftkanäle dienen zum Spannen und Lösen.',
  },
  ja: {
    prefix: 'ja/',
    language: 'ja',
    label: 'お客様の実生産設備で確認された用途',
    heading: 'CNC丸鋸盤の特注クランプ治具に組み込まれたBP-2P-130-0001',
    intro: 'お客様から公開許可を得た動画の一場面です。CNC丸鋸盤の特注クランプ治具後端にBP-2P-130-0001が組み込まれ、独立した2つの圧縮空気流路で治具のクランプ／アンクランプを行います。',
    detailsHeading: '確認済みの用途情報',
    facts: [
      ['設備', 'お客様のCNC丸鋸盤に搭載された特注クランプ治具'],
      ['搭載ロータリジョイント', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['空圧機能', '独立した2つの圧縮空気流路による治具のクランプ／アンクランプ'],
      ['使用状況', '低速で運転するお客様の実生産設備。正確な回転数は動画からは確認できません'],
      ['撮影範囲', '治具後端。前側の爪部は画面外です'],
      ['公開範囲', 'お客様名および装置メーカー名は非公開'],
    ],
    alt: 'BP-2P-130-0001を組み込んだCNC丸鋸盤用特注クランプ治具の後端',
    imageAria: '公開許可を得たCNC治具の写真からBP-2P-130-0001製品ページを開く',
    caption: 'お客様から公開許可を得た生産設備動画の一場面。特注治具の後端を示し、お客様名および機械メーカー名は非公開です。',
    boundaryTitle: '選定時の確認事項',
    boundary: 'このお客様設備では、BP-2P-130-0001を使用し、独立した2つの圧縮空気流路で治具のクランプ／アンクランプを行っていることを確認しています。同様の治具をご検討の場合は、治具図面と使用条件をご提示ください。ポート配置、圧力、回転数、運転サイクル、取合いを確認したうえで仕様をご提案します。',
    introVisualAlt: 'CNC空圧クランプ治具向けBP-2P-130-0001ロータリジョイント',
    introVisualLabel: '確認済みの搭載型式',
    introVisualText: '低速の丸鋸盤用治具で確認されたBP-2P-130-0001です。',
    introSupplyLegacy: 'CNC治具が回転するとき、エア配管がねじれたりアクチュエータを引っ張ったりしない構造が必要です。空圧ロータリージョイントは、固定側の供給源と回転する治具の間に密閉された回転流路を設けます。',
    introSupply: 'CNC治具の回転時には、圧縮空気配管がねじれたり、アクチュエータを引っ張ったりしない構造が必要です。空圧用ロータリジョイントは、固定側の圧縮空気供給部と回転治具の間に、密閉された回転流路を設けます。',
    faqQuestion: '加工中もクランプ圧を保持できますか？',
    blowOff: 'エアブロー',
    productButton: 'BP-2P-130-0001を見る',
    contactButton: '同様の治具について相談',
    productEntryHeading: '確認済みのお客様用途：CNC丸鋸盤用特注クランプ治具',
    productEntry: 'BP-2P-130-0001は、お客様の丸鋸盤用生産治具の後端に組み込まれています。独立した2つの圧縮空気流路で治具のクランプ／アンクランプを行います。設備は低速運転ですが、正確な回転数、圧力、ポート割当、取合いは、治具図面および承認済み製品データとの照合が必要です。',
    productEntryLink: '公開許可済みの用途事例を見る →',
    creativeName: 'CNC丸鋸盤用特注クランプ治具に組み込まれたBP-2P-130-0001',
    creativeDescription: 'お客様から公開許可を得た生産設備の映像により、CNC丸鋸盤用特注クランプ治具の後端に組み込まれたBP-2P-130-0001を確認しています。独立した2つの圧縮空気流路でクランプ／アンクランプを行います。同様の設備では、治具図面と承認済み製品データに基づき、ポート配置、圧力、回転数、運転サイクル、取合いを確認します。',
    llms: 'お客様から公開許可を得た実生産事例を含む選定ガイドです。低速のCNC丸鋸盤用特注クランプ治具にBP-2P-130-0001を組み込み、独立した2つの圧縮空気流路でクランプ／アンクランプを行います。',
  },
  ru: {
    prefix: 'ru/',
    language: 'ru',
    label: 'Подтверждённое применение на производственном оборудовании заказчика',
    heading: 'BP-2P-130-0001 в нестандартном зажимном приспособлении круглопильного станка с ЧПУ',
    intro: 'Кадр из видео, разрешённого заказчиком к публикации, показывает BP-2P-130-0001 в задней части нестандартного зажимного приспособления круглопильного станка с ЧПУ. Два независимых канала сжатого воздуха используются для зажима и разжима приспособления.',
    detailsHeading: 'Подтверждённые сведения о применении',
    facts: [
      ['Оборудование', 'Нестандартное зажимное приспособление на круглопильном станке с ЧПУ заказчика'],
      ['Установленное ротационное соединение', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['Пневматическая функция', 'Два независимых канала сжатого воздуха используются для зажима и разжима приспособления'],
      ['Условия работы', 'Низкооборотное производственное оборудование заказчика; точная частота вращения видеозаписью не подтверждается'],
      ['Ракурс', 'Задняя часть приспособления; передние зажимные кулачки находятся вне кадра'],
      ['Раскрытие данных', 'Название заказчика и марка машины не раскрываются'],
    ],
    alt: 'Задняя часть нестандартного зажимного приспособления круглопильного станка с установленной BP-2P-130-0001',
    imageAria: 'Открыть страницу BP-2P-130-0001 по разрешённому снимку зажимного приспособления ЧПУ',
    caption: 'Разрешённый заказчиком кадр из видео производственного оборудования, показывающий заднюю часть нестандартного приспособления; заказчик и марка станка не раскрываются.',
    boundaryTitle: 'Инженерное согласование',
    boundary: 'В этой установке заказчика подтверждено применение BP-2P-130-0001 с двумя независимыми каналами сжатого воздуха для зажима и разжима приспособления. Для подбора аналогичного решения направьте чертёж приспособления и рабочие условия; мы проверим назначение портов, давление, частоту вращения, режим работы и монтажное сопряжение перед выбором исполнения.',
    introVisualAlt: 'Ротационное соединение BP-2P-130-0001 для пневматического зажимного приспособления с ЧПУ',
    introVisualLabel: 'Подтверждённая модель',
    introVisualText: 'BP-2P-130-0001 в подтверждённом применении на низкооборотном круглопильном станке.',
    introSupplyLegacy: 'При вращении приспособления ЧПУ воздушная линия не должна перекручиваться или тянуть привод. Пневматическое вращающееся соединение создаёт герметичный вращающийся переход между неподвижной подачей и подвижным приспособлением.',
    introSupply: 'При вращении приспособления ЧПУ линии сжатого воздуха не должны перекручиваться или тянуть привод. Пневматическое ротационное соединение образует герметичные вращающиеся каналы для подачи сжатого воздуха между неподвижной питающей магистралью и вращающимся приспособлением.',
    faqQuestion: 'Может ли ротационное соединение удерживать давление зажима во время обработки?',
    blowOff: 'Обдув',
    productButton: 'Открыть BP-2P-130-0001',
    contactButton: 'Обсудить аналогичное приспособление',
    productEntryHeading: 'Подтверждённое применение у заказчика: нестандартное зажимное приспособление круглопильного станка с ЧПУ',
    productEntry: 'Модель BP-2P-130-0001 установлена в задней части производственного приспособления заказчика на круглопильном станке. Два независимых канала сжатого воздуха используются для зажима и разжима приспособления. Оборудование низкооборотное; точную частоту вращения, давление, назначение портов и интерфейс необходимо подтвердить по чертежу приспособления и утверждённым данным изделия.',
    productEntryLink: 'Открыть разрешённое подтверждение применения →',
    creativeName: 'BP-2P-130-0001 в нестандартном зажимном приспособлении круглопильного станка с ЧПУ',
    creativeDescription: 'Разрешённое заказчиком производственное подтверждение показывает BP-2P-130-0001 в задней части нестандартного зажимного приспособления круглопильного станка с ЧПУ. Два независимых канала сжатого воздуха используются для зажима и разжима. Для аналогичного оборудования назначение портов, давление, частота вращения, режим работы и монтажное сопряжение согласуются по чертежу приспособления и утверждённым данным изделия.',
    llms: 'Руководство по подбору с разрешённым заказчиком производственным примером BP-2P-130-0001 в низкооборотном нестандартном зажимном приспособлении круглопильного станка с ЧПУ; два независимых канала сжатого воздуха используются для зажима и разжима.',
  },
};

const changes = [];

function withNewlineStyle(text, fragment) {
  return text.includes('\r\n') ? fragment.replace(/\n/g, '\r\n') : fragment;
}

function applicationUrl(languageCode) {
  return `${siteUrl}/${languageCode === 'en' ? '' : `${languageCode}/`}${applicationPage}`;
}

function productUrl() {
  return `${siteUrl}/${productPage}`;
}

function creativeWork(languageCode) {
  const locale = copy[languageCode];
  const base = applicationUrl(languageCode);
  return {
    '@type': 'CreativeWork',
    '@id': `${base}#${evidenceAnchor}`,
    url: `${base}#${moduleAnchor}`,
    name: locale.creativeName,
    description: locale.creativeDescription,
    image: `${siteUrl}/${imagePath}.jpg`,
    inLanguage: languageCode,
    dateModified,
    about: { '@id': `${productUrl()}#product` },
    publisher: { '@id': `${siteUrl}/#organization` },
  };
}

function syncJsonLd(html, languageCode) {
  let inserted = false;
  const next = html.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (whole, opening, json, closing) => {
    try {
      const payload = JSON.parse(json);
      const graph = Array.isArray(payload?.['@graph']) ? payload['@graph'] : null;
      if (!graph || inserted) return whole;
      payload['@graph'] = graph.filter((node) => !(node?.['@type'] === 'CreativeWork' && String(node?.['@id'] || '').endsWith(`#${evidenceAnchor}`)));
      payload['@graph'].push(creativeWork(languageCode));
      const webPage = payload['@graph'].find((node) => node?.['@type'] === 'WebPage');
      if (webPage) webPage.dateModified = dateModified;
      inserted = true;
      return `${opening}${JSON.stringify(payload)}${closing}`;
    } catch {
      return whole;
    }
  });
  if (!inserted) throw new Error(`No @graph JSON-LD block found while synchronizing ${languageCode}.`);
  return next;
}

function factsMarkup(locale) {
  return locale.facts.map(([term, value]) => `<div class="cnc-saw-fact"><dt>${term}</dt><dd>${value}</dd></div>`).join('\n');
}

function applicationModule(locale) {
  const imagePrefix = locale.prefix ? '../' : '';
  const inquirySource = `${locale.prefix}${applicationPage}`;
  return `${markerStart}
<section class="section cnc-saw-case-section" data-verified-application="bp-2p-130-cnc-saw-fixture">
 <div class="container">
  <article class="cnc-saw-case" id="${moduleAnchor}">
   <header class="cnc-saw-case__header">
    <span class="section-label">${locale.label}</span>
    <h2>${locale.heading}</h2>
    <p>${locale.intro}</p>
   </header>
   <div class="cnc-saw-case__grid">
    <figure class="cnc-saw-case__media">
     <a class="cnc-saw-case__image-link" href="${productPage}" aria-label="${locale.imageAria}">
      <picture>
       <source srcset="${imagePrefix}${imagePath}.webp" type="image/webp">
       <img src="${imagePrefix}${imagePath}.jpg" alt="${locale.alt}" width="720" height="1280" loading="lazy" decoding="async">
      </picture>
     </a>
     <figcaption>${locale.caption}</figcaption>
    </figure>
    <div class="cnc-saw-case__details">
     <h3>${locale.detailsHeading}</h3>
     <dl class="cnc-saw-facts">
${factsMarkup(locale)}
     </dl>
     <aside class="cnc-saw-boundary">
      <strong>${locale.boundaryTitle}</strong>
      <p>${locale.boundary}</p>
     </aside>
     <div class="cnc-saw-actions">
      <a class="btn btn-primary" href="${productPage}">${locale.productButton}</a>
       <a class="btn btn-outline" href="contact.html?request=application-review&amp;model=BP-2P-130-0001&amp;product=BP-2P-130-0001&amp;application=cnc-pneumatic-clamping&amp;source=${inquirySource}#quoteForm">${locale.contactButton}</a>
     </div>
    </div>
   </div>
  </article>
 </div>
</section>
${markerEnd}`;
}

function productEntry(locale) {
  return `${productMarkerStart}
    <div class="compat-item" data-verified-application="cnc-circular-saw-fixture"><strong>${locale.productEntryHeading}</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">${locale.productEntry} <a href="${applicationPage}#${moduleAnchor}">${locale.productEntryLink}</a></span></div>
${productMarkerEnd}`;
}

function stripManagedBlock(html, start, end) {
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
  return html.replace(pattern, '');
}

async function planWrite(relativePath, next) {
  const absolute = path.join(root, relativePath);
  const current = await fs.readFile(absolute, 'utf8').catch(() => '');
  if (current === next) return;
  changes.push(relativePath.replaceAll('\\', '/'));
  if (!checkOnly) await fs.writeFile(absolute, next, 'utf8');
}

async function syncApplicationPage(languageCode) {
  const locale = copy[languageCode];
  const relativePath = `${locale.prefix}${applicationPage}`;
  const absolute = path.join(root, relativePath);
  const original = await fs.readFile(absolute, 'utf8');
  let html = stripManagedBlock(original, markerStart, markerEnd);
  html = html.replace(/\s*<link rel="stylesheet" href="(?:\.\.\/)?css\/application-cnc-clamping-case\.css[^>]*>/g, '');
  const cssHref = `${locale.prefix ? '../' : ''}css/application-cnc-clamping-case.css?v=20260814-customer-case2`;
  html = html.replace('</head>', withNewlineStyle(html, `<link rel="stylesheet" href="${cssHref}">\n</head>`));
  const introSection = /<section class="section(?: cnc-saw-intro-section)?"><div class="container"><div class="app-detail-intro">[\s\S]*?<\/section>/;
  if (!introSection.test(html)) throw new Error(`${relativePath}: application-intro section not found.`);
  html = html.replace(introSection, (match) => {
    const imagePrefix = locale.prefix ? '../' : '';
    const visual = `<div class="app-detail-visual"><img src="${imagePrefix}images/optimized/products/BP-2P-130-0001-1.webp" alt="${locale.introVisualAlt}" width="500" height="500"><strong>${locale.introVisualLabel}</strong><span>${locale.introVisualText}</span></div>`;
    let synchronizedIntro = match
      .replace(/<section class="section(?: cnc-saw-intro-section)?">/, '<section class="section cnc-saw-intro-section">')
      .replace(/<div class="app-detail-visual">[\s\S]*?<\/div>(?=<\/div><\/div><\/section>$)/, visual);
    const legacySupply = `<p>${locale.introSupplyLegacy}</p>`;
    const approvedSupply = `<p>${locale.introSupply}</p>`;
    if (synchronizedIntro.includes(legacySupply)) synchronizedIntro = synchronizedIntro.replace(legacySupply, approvedSupply);
    else if (!synchronizedIntro.includes(approvedSupply)) throw new Error(`${relativePath}: compressed-air supply paragraph not found.`);
    return `${synchronizedIntro}\n${withNewlineStyle(html, applicationModule(locale))}`;
  });
  if (languageCode === 'ja') {
    html = html
      .replaceAll('ロータリーユニオンは機械化の間に圧力をクランプができますか。', locale.faqQuestion)
      .replaceAll('ロータリーユニオンは機械化の間に圧力を締め金で止めることができますか。', locale.faqQuestion)
      .replaceAll('<li>ブローオフ</li>', `<li>${locale.blowOff}</li>`);
  }
  if (languageCode === 'ru') html = html.replaceAll('<li>Взрыв</li>', `<li>${locale.blowOff}</li>`);
  html = syncJsonLd(html, languageCode);
  await planWrite(relativePath, html);
}

async function syncProductPage(languageCode) {
  const locale = copy[languageCode];
  const relativePath = `${locale.prefix}${productPage}`;
  const absolute = path.join(root, relativePath);
  const original = await fs.readFile(absolute, 'utf8');
  let html = stripManagedBlock(original, productMarkerStart, productMarkerEnd);
  if (!html.includes('<div class="compat-grid">')) throw new Error(`${relativePath}: compatibility grid not found.`);
  html = html.replace('<div class="compat-grid">', `<div class="compat-grid">\n${withNewlineStyle(html, productEntry(locale))}`);
  html = syncJsonLd(html, languageCode);
  await planWrite(relativePath, html);
}

async function syncOverrides(languageCode) {
  if (languageCode === 'en') return;
  const locale = copy[languageCode];
  const file = path.join(root, 'i18n', 'overrides', `${languageCode}.json`);
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  const source = copy.en;
  const pairs = [
    [source.label, locale.label], [source.heading, locale.heading], [source.intro, locale.intro],
    [source.detailsHeading, locale.detailsHeading], [source.alt, locale.alt], [source.imageAria, locale.imageAria],
    [source.caption, locale.caption], [source.boundaryTitle, locale.boundaryTitle], [source.boundary, locale.boundary],
    [source.introVisualAlt, locale.introVisualAlt], [source.introVisualLabel, locale.introVisualLabel],
    [source.introVisualText, locale.introVisualText],
    [source.introSupply, locale.introSupply],
    [source.faqQuestion, locale.faqQuestion], [source.blowOff, locale.blowOff],
    [source.productButton, locale.productButton], [source.contactButton, locale.contactButton],
    [source.productEntryHeading, locale.productEntryHeading], [source.productEntry, locale.productEntry],
    [source.productEntryLink, locale.productEntryLink],
  ];
  pairs.push([
    'Project-owner confirmation establishes the customer production application, installed model, two compressed-air passages, clamp/release function and low-speed circular-saw context. The frame does not establish port numbering or assignment, operating pressure, exact speed, duty cycle, service life, leakage performance, machine output or performance improvement. Confirm these conditions from the fixture drawing and approved product data.',
    locale.boundary,
  ]);
  source.facts.forEach(([sourceTerm, sourceValue], index) => {
    const [targetTerm, targetValue] = locale.facts[index];
    pairs.push([sourceTerm, targetTerm]);
    const cleanSourceValue = sourceValue.replace(/<[^>]+>/g, '');
    const cleanTargetValue = targetValue.replace(/<[^>]+>/g, '');
    pairs.push([cleanSourceValue, cleanTargetValue]);
  });
  pairs.push([
    `${source.productEntry} <a href="${applicationPage}#${moduleAnchor}">${source.productEntryLink}</a>`,
    `${locale.productEntry} <a href="${applicationPage}#${moduleAnchor}">${locale.productEntryLink}</a>`,
  ]);
  for (const staleSource of [
    'Typical requirement',
    'Flange-mount or through-bore air rotary union for CNC fixture integration.',
  ]) delete data[staleSource];
  for (const [sourceText, targetText] of pairs) data[sourceText] = targetText;
  await planWrite(path.join('i18n', 'overrides', `${languageCode}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

async function syncLlms(languageCode) {
  const locale = copy[languageCode];
  const relativePath = `${locale.prefix}llms.txt`;
  const absolute = path.join(root, relativePath);
  let text = await fs.readFile(absolute, 'utf8');
  const absoluteUrl = applicationUrl(languageCode);
  const linePattern = new RegExp(`^(- \\[[^\\]]+\\]\\(${absoluteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\): ).*$`, 'm');
  if (!linePattern.test(text)) throw new Error(`${relativePath}: CNC pneumatic-clamping llms entry not found.`);
  text = text.replace(linePattern, `$1${locale.llms}`);
  await planWrite(relativePath, text);
}

async function syncSitemap(relativePath, urls) {
  const absolute = path.join(root, relativePath);
  let xml = await fs.readFile(absolute, 'utf8');
  for (const url of urls) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(<loc>${escaped}<\\/loc>[\\s\\S]*?<lastmod>)[^<]+(<\\/lastmod>)`);
    if (!pattern.test(xml)) throw new Error(`${relativePath}: sitemap entry not found for ${url}.`);
    xml = xml.replace(pattern, `$1${dateModified}$2`);
  }
  await planWrite(relativePath, xml);
}

for (const languageCode of Object.keys(copy)) {
  await syncApplicationPage(languageCode);
  await syncProductPage(languageCode);
  await syncOverrides(languageCode);
  await syncLlms(languageCode);
}

const publicUrls = Object.keys(copy).flatMap((languageCode) => [applicationUrl(languageCode), `${siteUrl}/${languageCode === 'en' ? '' : `${languageCode}/`}${productPage}`]);
await syncSitemap('sitemap.xml', [applicationUrl('en'), productUrl()]);
await syncSitemap('sitemap-i18n.xml', publicUrls);

if (checkOnly && changes.length) {
  console.error(`CNC saw-fixture case is not synchronized (${changes.length} file(s)): ${changes.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`${checkOnly ? 'Verified' : 'Synchronized'} CNC saw-fixture case; ${changes.length} file(s) ${checkOnly ? 'would change' : 'changed'}.`);
}
