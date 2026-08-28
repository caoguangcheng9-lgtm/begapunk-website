import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';
import {
  drawingBackedProductMetadata,
  drawingBackedProductModels,
  drawingBackedUiContract,
} from './lib/drawing-backed-product-facts.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const productPages = config.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));
const productLocales = ['en', ...(config.activeLanguageCodes || [])];
const drawingBackedModelSet = new Set(drawingBackedProductModels);
const deepContractPath = path.join(root, 'scripts', 'sync-drawing-backed-product-content.mjs');

const copy = {
  installRisks: 'Overtightening, rigid piping, skipped run-in checks, and unsuitable filtration are common installation risks that can contribute to premature wear or leakage.',
  installIntro: 'Correct installation helps reduce premature seal and bearing wear. Verify mounting, alignment, connections, and the approved operating limits before commissioning.',
  cad: 'STEP/IGES files may be provided for qualified projects after the application requirements and selected configuration are reviewed. Available formats and delivery timing are confirmed for each project.',
  custom: 'Custom passage count, connection, and mounting options can be reviewed against the application. CAD availability and lead time are confirmed for the selected model, quantity, customization, and destination.',
  scenario: 'These examples highlight common selection and installation risks. Confirm the approved configuration and mounting instructions before commissioning.',
  runIn: 'Commission the joint at controlled pressure and speed, then check for leakage, abnormal friction, heat, and vibration before full-load operation.',
  mistakeTorque: 'Excess torque can damage aluminum threads or distort the mounting and sealing surfaces. Tighten evenly to the approved drawing or installation specification.',
  mistakeAlignment: 'Flange bolts cannot correct shaft misalignment; forcing the joint into position transfers side load into the rotating interface. Align and support the assembly before tightening.',
  mistakeRigid: 'Rigid piping transfers misalignment and side load into the joint, bearings, and seals. Use supported flexible connections and complete alignment before tightening.',
  mistakePassage: 'A shared or incorrectly selected passage cannot maintain independent pneumatic circuits. Verify the machine schematic and every port function, then select the required number of independent passages.',
  mistakeLimits: 'Operating outside the published pressure, speed, or medium limits increases seal load and heat. Confirm the approved configuration before commissioning.',
  mistakeSideLoad: 'External radial or side load can misalign the rotating interface and accelerate seal or bearing wear. Support external loads and verify alignment before operation.',
  mistakeFlow: 'A small flow passage can create pressure loss when demand exceeds its capacity. Check required flow and response against the port and orifice before selection.',
  mistakeElectrical: 'Current above the per-circuit rating or inductive inrush can overheat and damage slip-ring contacts. Check continuous and inrush current, then allocate circuits to the approved specification.',
  upgrade: 'Review another configuration when the required passage count, pressure, speed, bore, mounting, medium, or environmental protection falls outside the published limits of this model. The final model, custom scope, price, and lead time are confirmed after engineering review.',
  materials: 'Material and seal suitability is confirmed for the selected configuration. Before ordering, review the approved drawing, exact body alloy, seal compound, medium, pressure, speed, temperature, duty cycle, and environment.',
  electrical: 'Electrical circuit life and signal performance depend on current, voltage, speed, duty cycle, environment, and the selected slip-ring configuration. Confirm the approved specification before order.',
  maintenance: 'Inspection and replacement intervals must be established from the actual medium, pressure, speed, temperature, alignment, filtration, duty cycle, leakage trend, bearing condition, and recorded inspection results.',
  regulated: 'For regulated or food-contact service, complete a project-specific review of wetted materials, seal compound, cleaning chemistry, temperature, and applicable requirements. Any FDA-related requirement must be documented for the selected configuration.',
  multiPassage: 'A multi-passage body can reduce external plumbing components compared with multiple separate joints. The actual layout and service implications depend on the machine design.',
};

const translations = {
  de: {
    [copy.installRisks]: 'Zu den typischen Montagerisiken zählen zu hohes Anzugsdrehmoment, starre Verrohrung, ausgelassene Einlaufkontrollen und ungeeignete Filtration; sie können vorzeitigen Verschleiß oder Leckage begünstigen.',
    [copy.installIntro]: 'Eine fachgerechte Montage hilft, vorzeitigen Verschleiß an Dichtungen und Lagern zu vermeiden. Prüfen Sie vor der Inbetriebnahme Befestigung, Ausrichtung, Anschlüsse und die freigegebenen Betriebsgrenzen.',
    [copy.cad]: 'STEP-/IGES-Dateien können nach Prüfung der Anwendung und der ausgewählten Ausführung für qualifizierte Projekte bereitgestellt werden. Verfügbare Formate und Bereitstellungszeitpunkt werden projektbezogen bestätigt.',
    [copy.custom]: 'Kanalzahl, Anschlüsse und Befestigung können anwendungsbezogen geprüft werden. CAD-Verfügbarkeit und Lieferzeit werden für Modell, Menge, Anpassungsumfang und Zielort bestätigt.',
    [copy.scenario]: 'Diese Beispiele zeigen typische Auswahl- und Montagerisiken. Prüfen Sie vor der Inbetriebnahme die freigegebene Ausführung und die Montagevorgaben.',
    [copy.runIn]: 'Nehmen Sie die Drehdurchführung mit kontrolliertem Druck und kontrollierter Drehzahl in Betrieb und prüfen Sie vor Volllast auf Leckage, ungewöhnliche Reibung, Erwärmung und Vibration.',
    [copy.mistakeTorque]: 'Zu hohes Anzugsdrehmoment kann Aluminiumgewinde beschädigen oder Montage- und Dichtflächen verformen. Ziehen Sie die Verbindung gleichmäßig nach freigegebener Zeichnung oder Montagevorgabe an.',
    [copy.mistakeAlignment]: 'Flanschschrauben können eine Wellenfehlausrichtung nicht korrigieren; erzwungene Montage überträgt Querkräfte auf die rotierende Schnittstelle. Richten und stützen Sie die Baugruppe vor dem Anziehen aus.',
    [copy.mistakeRigid]: 'Starre Rohrleitungen übertragen Fehlausrichtung und Querkräfte auf Drehdurchführung, Lager und Dichtungen. Verwenden Sie abgestützte flexible Anschlüsse und richten Sie die Baugruppe vor dem Anziehen aus.',
    [copy.mistakePassage]: 'Ein gemeinsamer oder falsch ausgewählter Kanal kann keine unabhängigen Pneumatikkreise aufrechterhalten. Prüfen Sie den Maschinenplan und jede Anschlussfunktion und wählen Sie danach die erforderliche Zahl unabhängiger Kanäle.',
    [copy.mistakeLimits]: 'Der Betrieb außerhalb der veröffentlichten Druck-, Drehzahl- oder Mediengrenzen erhöht Dichtungsbelastung und Erwärmung. Bestätigen Sie vor der Inbetriebnahme die freigegebene Ausführung.',
    [copy.mistakeSideLoad]: 'Äußere Radial- oder Querkräfte können die rotierende Schnittstelle fehlausrichten und den Verschleiß von Dichtung oder Lager beschleunigen. Stützen Sie äußere Lasten ab und prüfen Sie vor dem Betrieb die Ausrichtung.',
    [copy.mistakeFlow]: 'Ein kleiner Strömungsquerschnitt kann Druckverlust verursachen, wenn der Bedarf seine Kapazität übersteigt. Prüfen Sie vor der Auswahl den erforderlichen Durchfluss und das Ansprechverhalten anhand von Anschluss und Bohrung.',
    [copy.mistakeElectrical]: 'Ein Strom oberhalb des Grenzwerts je Stromkreis oder induktiver Einschaltstrom kann Schleifringkontakte überhitzen und beschädigen. Prüfen Sie Dauer- und Einschaltstrom und ordnen Sie die Stromkreise gemäß freigegebener Spezifikation zu.',
    [copy.upgrade]: 'Prüfen Sie eine andere Ausführung, wenn Kanalzahl, Druck, Drehzahl, Bohrung, Befestigung, Medium oder Umgebungsschutz außerhalb der veröffentlichten Grenzen dieses Modells liegen. Endgültiges Modell, Sonderumfang, Preis und Lieferzeit werden nach technischer Prüfung bestätigt.',
    [copy.materials]: 'Die Eignung von Werkstoffen und Dichtungen wird für die ausgewählte Ausführung bestätigt. Prüfen Sie vor der Bestellung die freigegebene Zeichnung, die genaue Gehäuselegierung, den Dichtungswerkstoff, Medium, Druck, Drehzahl, Temperatur, Einschaltdauer und Umgebung.',
    [copy.electrical]: 'Lebensdauer und Signalverhalten der Stromkreise hängen von Strom, Spannung, Drehzahl, Einschaltdauer, Umgebung und der gewählten Schleifringausführung ab. Bestätigen Sie vor der Bestellung die freigegebene Spezifikation.',
    [copy.maintenance]: 'Inspektions- und Austauschintervalle sind aus dem tatsächlichen Medium, Druck, der Drehzahl, Temperatur, Ausrichtung, Filtration, Einschaltdauer, Leckageentwicklung, dem Lagerzustand und den dokumentierten Prüfergebnissen abzuleiten.',
    [copy.regulated]: 'Für regulierte Anwendungen oder Lebensmittelkontakt werden medienberührte Werkstoffe, Dichtungswerkstoff, Reinigungschemie, Temperatur und geltende Anforderungen projektbezogen geprüft. FDA-bezogene Anforderungen müssen für die ausgewählte Ausführung dokumentiert sein.',
    [copy.multiPassage]: 'Ein Mehrkanalgehäuse kann gegenüber mehreren einzelnen Drehdurchführungen die externe Verrohrung reduzieren. Die tatsächliche Anordnung und die Auswirkungen auf den Service hängen von der Maschinenkonstruktion ab.',
  },
  ja: {
    [copy.installRisks]: '締付け過多、剛性配管、ならし運転時の確認不足、不適切なろ過は、早期摩耗や漏れにつながる代表的な取付リスクです。',
    [copy.installIntro]: '適切な取付けは、シールや軸受の早期摩耗を抑えるうえで重要です。運転開始前に、取付け、芯出し、接続、および承認された使用限界を確認してください。',
    [copy.cad]: 'STEP／IGESデータは、用途条件と選定仕様を確認したうえで、対象案件に提供できる場合があります。対応形式と提供時期は案件ごとに確認します。',
    [copy.custom]: '流路数、接続、取付方法の特注可否は、用途条件に基づいて検討します。CADデータの提供可否と納期は、型式、数量、特注範囲、納入先を確認後に回答します。',
    [copy.scenario]: '以下は代表的な選定・取付上のリスクです。運転開始前に、承認仕様と取付指示をご確認ください。',
    [copy.runIn]: '低い圧力と回転数から運転を開始し、全負荷運転の前に、漏れ、異常摩擦、発熱、振動がないことを確認してください。',
    [copy.mistakeTorque]: '過大な締付けトルクは、アルミねじ部を損傷したり、取付面・シール面を変形させるおそれがあります。承認図面または取付仕様に従い、均等に締め付けてください。',
    [copy.mistakeAlignment]: 'フランジボルトで軸芯ずれを矯正することはできません。無理な取付けは回転部に横荷重を伝えます。締付け前に、組立体の芯出しと支持を完了してください。',
    [copy.mistakeRigid]: '剛性配管は、芯ずれや横荷重をロータリージョイント、軸受、シールへ伝えます。支持されたフレキシブル配管を使用し、締付け前に芯出しを完了してください。',
    [copy.mistakePassage]: '共通流路または誤った流路選定では、独立した空圧回路を維持できません。機械回路図と各ポートの機能を確認し、必要な独立流路数を選定してください。',
    [copy.mistakeLimits]: '公開されている圧力、回転数、流体の範囲外での運転は、シール荷重と発熱を増加させます。運転開始前に承認仕様をご確認ください。',
    [copy.mistakeSideLoad]: '外部からのラジアル荷重や横荷重は、回転部の芯ずれを生じさせ、シールまたは軸受の摩耗を早めます。外部荷重を支持し、運転前に芯出しをご確認ください。',
    [copy.mistakeFlow]: '小さな流路は、必要流量が容量を超えると圧力損失を生じます。選定前に、必要流量と応答性をポート径・オリフィス径と照合してください。',
    [copy.mistakeElectrical]: '回路ごとの定格を超える電流や誘導負荷の突入電流は、スリップリング接点を過熱・損傷させます。連続電流と突入電流を確認し、承認仕様に従って回路を割り当ててください。',
    [copy.upgrade]: '必要な流路数、圧力、回転数、中空径、取付方法、流体、環境保護が本型式の公開範囲を外れる場合は、別仕様を検討してください。最終型式、特注範囲、価格、納期は技術確認後に回答します。',
    [copy.materials]: '材料とシールの適合性は、選定仕様ごとに確認します。注文前に、承認図面、本体合金、シール材質、流体、圧力、回転数、温度、デューティ、使用環境をご確認ください。',
    [copy.electrical]: '電気回路の寿命と信号性能は、電流、電圧、回転数、デューティ、使用環境、選定したスリップリング仕様によって異なります。注文前に承認仕様を確認してください。',
    [copy.maintenance]: '点検・交換間隔は、実際の流体、圧力、回転数、温度、芯出し、ろ過、デューティ、漏れ傾向、軸受状態、および記録された点検結果に基づいて設定してください。',
    [copy.regulated]: '規制対象または食品接触用途では、接液部材、シール材質、洗浄薬品、温度、適用要件を案件ごとに確認します。FDAに関する要求は、選定仕様について文書化します。',
    [copy.multiPassage]: '多流路構造は、複数の単独ロータリジョイントと比べて外部配管部品を減らせる場合があります。実際の配管構成と保守性は、機械設計によって異なります。',
  },
  ru: {
    [copy.installRisks]: 'Чрезмерная затяжка, жёсткая подводка, пропуск проверки при обкатке и неподходящая фильтрация являются типичными монтажными рисками и могут привести к преждевременному износу или утечке.',
    [copy.installIntro]: 'Правильный монтаж помогает снизить риск преждевременного износа уплотнений и подшипников. Перед вводом в эксплуатацию проверьте крепление, соосность, соединения и утверждённые рабочие пределы.',
    [copy.cad]: 'Файлы STEP/IGES могут предоставляться для согласованных проектов после проверки требований применения и выбранного исполнения. Форматы и срок предоставления подтверждаются для каждого проекта.',
    [copy.custom]: 'Число каналов, присоединения и способ монтажа могут быть рассмотрены под конкретное применение. Доступность CAD и срок поставки подтверждаются с учётом модели, количества, объёма доработок и места назначения.',
    [copy.scenario]: 'Эти примеры показывают типичные риски выбора и монтажа. Перед вводом в эксплуатацию проверьте утверждённое исполнение и монтажные указания.',
    [copy.runIn]: 'Вводите соединение в работу при контролируемых давлении и частоте вращения, а перед полной нагрузкой проверьте отсутствие утечек, повышенного трения, нагрева и вибрации.',
    [copy.mistakeTorque]: 'Чрезмерный момент затяжки может повредить алюминиевую резьбу или деформировать монтажные и уплотнительные поверхности. Затягивайте соединение равномерно по утверждённому чертежу или монтажной спецификации.',
    [copy.mistakeAlignment]: 'Фланцевые болты не устраняют несоосность вала; принудительная сборка передаёт боковую нагрузку на вращающийся узел. До затяжки выровняйте и закрепите сборку.',
    [copy.mistakeRigid]: 'Жёсткая трубная обвязка передаёт несоосность и боковую нагрузку на соединение, подшипники и уплотнения. Используйте закреплённые гибкие подводы и завершите выравнивание до затяжки.',
    [copy.mistakePassage]: 'Общий или неправильно выбранный канал не обеспечивает независимые пневматические контуры. Проверьте схему машины и назначение каждого порта, затем выберите необходимое число независимых каналов.',
    [copy.mistakeLimits]: 'Работа за пределами опубликованных ограничений по давлению, частоте вращения или среде повышает нагрузку на уплотнение и нагрев. До ввода в эксплуатацию подтвердите утверждённое исполнение.',
    [copy.mistakeSideLoad]: 'Внешняя радиальная или боковая нагрузка может нарушить соосность вращающегося узла и ускорить износ уплотнения или подшипника. Разгрузите внешние нагрузки и проверьте соосность до работы.',
    [copy.mistakeFlow]: 'Малое проходное сечение может вызвать падение давления, если требуемый расход превышает его пропускную способность. До выбора сопоставьте требуемый расход и быстродействие с размером порта и отверстия.',
    [copy.mistakeElectrical]: 'Ток выше допустимого для одной цепи или пусковой ток индуктивной нагрузки может перегреть и повредить контакты токосъёмника. Проверьте рабочий и пусковой ток и распределите цепи по утверждённой спецификации.',
    [copy.upgrade]: 'Рассмотрите другое исполнение, если требуемые число каналов, давление, частота вращения, проходное отверстие, монтаж, среда или защита от окружающей среды выходят за опубликованные пределы этой модели. Окончательная модель, объём доработок, цена и срок поставки подтверждаются после технической проверки.',
    [copy.materials]: 'Пригодность материалов и уплотнений подтверждается для выбранного исполнения. До заказа проверьте утверждённый чертёж, сплав корпуса, материал уплотнения, рабочую среду, давление, частоту вращения, температуру, режим работы и условия эксплуатации.',
    [copy.electrical]: 'Срок службы электрических цепей и качество сигнала зависят от тока, напряжения, частоты вращения, режима работы, окружающих условий и выбранного исполнения токосъёмника. До заказа подтвердите утверждённую спецификацию.',
    [copy.maintenance]: 'Интервалы осмотра и замены следует устанавливать по фактической среде, давлению, частоте вращения, температуре, соосности, фильтрации, режиму работы, динамике утечки, состоянию подшипников и зарегистрированным результатам проверок.',
    [copy.regulated]: 'Для регулируемых применений или контакта с пищевой продукцией материалы, контактирующие со средой, материал уплотнения, моющие средства, температура и применимые требования проверяются для конкретного проекта. Требования FDA должны быть документированы для выбранного исполнения.',
    [copy.multiPassage]: 'Многоканальный корпус может сократить число внешних трубопроводных компонентов по сравнению с несколькими отдельными вращающимися соединениями. Фактическая компоновка и условия обслуживания зависят от конструкции машины.',
  },
};

function compact(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

async function loadDeepRelatedActionCopy() {
  const source = await fs.readFile(deepContractPath, 'utf8');
  const copyStart = source.indexOf('const COPY = {');
  const copyEnd = source.indexOf('\nconst ENGINEERING_PENDING_MODELS', copyStart);
  if (copyStart < 0 || copyEnd < 0) {
    throw new Error('Unable to locate the drawing-backed deep COPY contract.');
  }

  const copyBlock = source.slice(copyStart, copyEnd);
  const markers = productLocales.map((locale) => {
    const match = new RegExp(`^(?:  ${locale}: \\{|COPY\\.${locale} = \\{)`, 'm').exec(copyBlock);
    if (!match) throw new Error(`Drawing-backed deep COPY is missing locale ${locale}.`);
    return { locale, index: match.index };
  });
  if (markers.some((marker, index) => index > 0 && marker.index <= markers[index - 1].index)) {
    throw new Error('Drawing-backed deep COPY locale order does not match the active product locale contract.');
  }

  const actions = {};
  markers.forEach((marker, index) => {
    const end = markers[index + 1]?.index ?? copyBlock.length;
    const localeBlock = copyBlock.slice(marker.index, end);
    const viewModelMatch = /^\s*viewModel:\s*'([^'\\\r\n]*)'/m.exec(localeBlock);
    const requestReviewMatch = /\brequestReview:\s*'([^'\\\r\n]*)'/m.exec(localeBlock);
    if (!viewModelMatch || !requestReviewMatch) {
      throw new Error(`Unable to read related-product action labels from drawing-backed deep COPY for ${marker.locale}.`);
    }
    actions[marker.locale] = Object.freeze({
      viewModel: viewModelMatch[1],
      requestReview: requestReviewMatch[1],
    });
  });
  return Object.freeze(actions);
}

function assertLegacyRelatedPricing($, pageName) {
  $('.related-card .price').each((_, element) => {
    if (compact($(element).text()) !== 'Request Quote') {
      throw new Error(`${pageName}: non-product related-card pricing must use Request Quote.`);
    }
  });
}

function assertRelatedCardAction($, card, expected, label) {
  const action = $(card).children('.price');
  if (action.length !== 1) throw new Error(`${label}: expected exactly one direct .price action label.`);
  if (compact(action.text()) !== expected) {
    throw new Error(`${label}: expected action label "${expected}", found "${compact(action.text())}".`);
  }
}

function expectedApplicationReviewHref(model, metadata) {
  return `contact.html?request=application-review&model=${encodeURIComponent(model)}&product=${encodeURIComponent(metadata.linkLabel)}&source=${model}.html#quoteForm`;
}

function assertApplicationReviewEntrances($, model, pageName, metadata) {
  const expectedHref = expectedApplicationReviewHref(model, metadata);
  const reviewLinks = $('main a[href*="request=application-review"]');
  if (reviewLinks.length !== 3) {
    throw new Error(`${pageName}: expected exactly three application-review entry links; found ${reviewLinks.length}.`);
  }
  reviewLinks.each((index, element) => {
    if ($(element).attr('href') !== expectedHref) {
      throw new Error(`${pageName}: application-review entry ${index + 1} is missing the complete request/model/product/source/#quoteForm contract.`);
    }
  });
}

function assertDrawingBackedRelatedProducts($, model, locale, pageName, actions) {
  const grids = $('main .related-grid');
  if (grids.length !== 1) throw new Error(`${pageName}: expected exactly one related-products grid.`);
  const cards = grids.first().children('a.related-card');
  if (cards.length !== 4 || $('.related-card').length !== 4) {
    throw new Error(`${pageName}: drawing-backed related products must contain exactly three model cards and one selection-help card.`);
  }

  const seenModels = new Set();
  cards.slice(0, 3).each((index, card) => {
    const href = compact($(card).attr('href'));
    const match = /^(BP-[\w-]+)\.html$/.exec(href);
    if (!match) throw new Error(`${pageName}: related model card ${index + 1} has an invalid model link.`);
    const relatedModel = match[1];
    if (!drawingBackedModelSet.has(relatedModel)) {
      throw new Error(`${pageName}: related model card ${index + 1} links outside the drawing-backed model set.`);
    }
    if (relatedModel === model || seenModels.has(relatedModel)) {
      throw new Error(`${pageName}: related model cards must be distinct and must not link to the current model.`);
    }
    seenModels.add(relatedModel);

    const ui = drawingBackedUiContract(locale, relatedModel);
    if (ui.status !== 'verified-drawing') {
      throw new Error(`${pageName}: related model ${relatedModel} is not backed by a verified drawing.`);
    }
    const metadata = drawingBackedProductMetadata(locale, relatedModel);
    const headings = $(card).children('h3');
    if (headings.length !== 1 || compact(headings.text()) !== metadata.linkLabel) {
      throw new Error(`${pageName}: related model ${relatedModel} label drifted from shared metadata.`);
    }
    assertRelatedCardAction($, card, actions.viewModel, `${pageName}: related model ${relatedModel}`);
  });

  const metadata = drawingBackedProductMetadata(locale, model);
  if (!metadata) throw new Error(`${pageName}: shared product metadata is missing.`);
  const review = cards.eq(3);
  const expectedReviewHref = expectedApplicationReviewHref(model, metadata);
  if (review.attr('href') !== expectedReviewHref) {
    throw new Error(`${pageName}: selection-help link is missing or has an incomplete request/model/product/source/#quoteForm contract.`);
  }
  assertRelatedCardAction($, review, actions.requestReview, `${pageName}: selection-help card`);
  assertApplicationReviewEntrances($, model, pageName, metadata);
}

function assertRelatedProducts($, { model, locale, pageName, actions } = {}) {
  if (!model) return assertLegacyRelatedPricing($, pageName);
  return assertDrawingBackedRelatedProducts($, model, locale, pageName, actions);
}

const deepRelatedActions = await loadDeepRelatedActionCopy();

function walkJson(value, visitor) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJson(item, visitor));
    return;
  }
  if (!value || typeof value !== 'object') return;
  visitor(value);
  Object.values(value).forEach((item) => walkJson(item, visitor));
}

function assertProductTrustContent($, pageName) {
  if ($('#mainNav').length !== 1) {
    throw new Error(`${pageName}: expected exactly one #mainNav.`);
  }
  if ($('#siteFooter').length !== 1) {
    throw new Error(`${pageName}: expected exactly one #siteFooter.`);
  }

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`${pageName}: invalid JSON-LD (${error.message}).`);
    }
    walkJson(data, (node) => {
      if (Array.isArray(node.additionalProperty)
        && node.additionalProperty.some((property) => compact(property?.name).toLowerCase() === 'service life')) {
        throw new Error(`${pageName}: JSON-LD still contains an unsupported service-life property.`);
      }
    });
  });

  $('tr').each((_, row) => {
    if (compact($(row).find('th').first().text()).toLowerCase() === 'service life') {
      throw new Error(`${pageName}: visible specifications still contain an unsupported service-life row.`);
    }
  });

  const visibleText = $('main p, main li, main th, main td, main .price')
    .map((_, element) => compact($(element).text()))
    .get()
    .filter(Boolean)
    .join('\n');
  const structuredText = $('script[type="application/ld+json"]')
    .map((_, element) => compact($(element).html()))
    .get()
    .join('\n');
  const source = `${visibleText}\n${structuredText}`;
  const forbidden = [
    /\bFrom \$\s*\d/i,
    /60% of warranty claims/i,
    /6 months to 12\+ months/i,
    /Free 3D STEP file with every inquiry/i,
    /\b8,000\+? hours\b/i,
    /The #1 cause/i,
    /Free 3D files? provided after inquiry/i,
    /FDA[- ](?:approved|compatible|grade)/i,
    /inspect every \d+ months/i,
    /replace (?:the )?seal every \d+[–-]\d+ months/i,
    /\b(?:halving|half)\b[^.!?]{0,60}\b(?:leak points?|maintenance time)\b/i,
  ];
  forbidden.forEach((pattern) => {
    if (pattern.test(source)) throw new Error(`${pageName}: trust cleanup left forbidden content ${pattern}.`);
  });
}

function replaceProductContent($, pageName) {
  $('tr').each((_, row) => {
    const rowText = compact($(row).text());
    if (compact($(row).find('th').first().text()).toLowerCase() === 'service life' || /FDA[- ](?:approved|compatible|grade)|FDA 21 CFR/i.test(rowText)) $(row).remove();
  });

  $('ul').each((_, list) => {
    const listText = compact($(list).text());
    if (/inspect every \d+ months|replace (?:the )?seal every \d+[–-]\d+ months|inspection every \d+ months/i.test(listText)) {
      $(list).html(`<li>${copy.maintenance}</li>`);
    }
  });

  $('li').each((_, element) => {
    const text = compact($(element).text());
    if (/FDA[- ](?:approved|compatible|grade)|FDA 21 CFR/i.test(text)) $(element).text(copy.regulated);
    else if (/\b60%\b/i.test(text)) $(element).text(copy.multiPassage);
  });

  $('p').each((_, element) => {
    const text = compact($(element).text());
    if (/Free 3D (?:STEP\/IGES )?files?|Free 3D file with inquiry/i.test(text)) $(element).text(copy.cad);
    else if (/FDA[- ](?:approved|compatible|grade)|FDA 21 CFR/i.test(text)) $(element).text(copy.regulated);
  });

  $('li,p').each((_, element) => {
    if (/8,000\+? hours/i.test($(element).text())) $(element).text(copy.electrical);
  });

  assertProductTrustContent($, pageName);
}

const snapshots = new Map();
const pendingUpdates = [];

for (const locale of productLocales) {
  const actions = deepRelatedActions[locale];
  if (!actions) throw new Error(`Missing drawing-backed related-product actions for ${locale}.`);
  for (const pageName of productPages) {
    const model = path.basename(pageName, '.html');
    if (!drawingBackedModelSet.has(model)) throw new Error(`${pageName}: product is absent from the shared drawing-backed model contract.`);
    const relativePath = locale === 'en' ? pageName : path.join(locale, pageName);
    if (relativePath.toLowerCase().includes('catalog-project')) throw new Error(`Protected path rejected: ${relativePath}`);
    const filePath = path.resolve(root, relativePath);
    if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error(`Product page escaped repository root: ${relativePath}`);
    const label = relativePath.split(path.sep).join('/');
    const before = await fs.readFile(filePath, 'utf8');
    snapshots.set(filePath, before);
    const current = load(before, { decodeEntities: false });
    try {
      assertRelatedProducts(current, { model, locale, pageName: label, actions });
      if (locale === 'en') assertProductTrustContent(current, label);
    } catch (error) {
      if (checkOnly) throw error;
      pendingUpdates.push(`${label}: ${error.message}`);
    }
  }
}

for (const [language, additions] of Object.entries(translations)) {
  const filePath = path.join(root, 'i18n', 'overrides', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  snapshots.set(filePath, before);
  const current = JSON.parse(before);
  for (const [source, translation] of Object.entries(additions)) {
    if (current[source] !== translation) {
      const message = `${language} overrides: missing curated product-trust translation for ${source}.`;
      if (checkOnly) throw new Error(message);
      pendingUpdates.push(message);
    }
  }
}

for (const [filePath, before] of snapshots) {
  const after = await fs.readFile(filePath, 'utf8');
  if (after !== before) {
    throw new Error(`${path.relative(root, filePath)} changed during product-trust verification; no page or override file may be rewritten by this script.`);
  }
}

if (pendingUpdates.length) {
  throw new Error([
    'Product trust content requires updates, but automatic whole-file rewriting is disabled to protect #mainNav, #siteFooter, and all unmanaged bytes.',
    'Apply a reviewed source-scoped patch, then run this command again:',
    ...pendingUpdates.map((message) => `- ${message}`),
  ].join('\n'));
}

console.log(`Product trust content is synchronized across ${productPages.length * productLocales.length} drawing-backed product pages and three localization override files; no files changed.`);
