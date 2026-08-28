#!/usr/bin/env node

/**
 * Synchronize the long-form product-detail content with the reviewed drawing
 * manifest. The command is deliberately read-only unless --write is supplied.
 *
 * Scope: the 16 product HTML files in the root and their de/ja/ru variants.
 * This script never walks the repository and never reads catalog-project/.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  drawingBackedProductMetadata,
  drawingBackedUiContract,
} from './lib/drawing-backed-product-facts.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'data', 'product-drawing-facts.json');
const PRODUCT_DETAIL_UI_PATH = path.join(ROOT_DIR, 'i18n', 'manual', 'product-detail-ui.json');
const START_MARKER = '<!-- ===== KEY TAKEAWAYS ===== -->';
const END_MARKER = '<!-- ===== RELATED RESOURCES ===== -->';

const productDetailUiContract = JSON.parse(await fs.readFile(PRODUCT_DETAIL_UI_PATH, 'utf8'));
if (![4, 5].includes(productDetailUiContract.schemaVersion)) {
  throw new Error(`Unsupported product-detail UI schema: ${productDetailUiContract.schemaVersion}`);
}

function controlledTabs(locale) {
  const links = productDetailUiContract.locales?.[locale]?.jumpLinks;
  if (!links) throw new Error(`${locale}: product-detail UI navigation contract is missing`);
  const tabs = ['specs', 'compat', 'install', 'downloads'].map((key) => links[key]);
  if (tabs.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error(`${locale}: product-detail UI tab labels are incomplete`);
  }
  return tabs;
}

const LOCALES = {
  en: { dir: '', htmlLang: 'en', speedUnit: 'RPM', decimal: '.', prefix: '' },
  de: { dir: 'de', htmlLang: 'de', speedUnit: 'U/min', decimal: ',', prefix: '../' },
  ja: { dir: 'ja', htmlLang: 'ja', speedUnit: 'min⁻¹', decimal: '.', prefix: '../' },
  ru: { dir: 'ru', htmlLang: 'ru', speedUnit: 'об/мин', decimal: ',', prefix: '../' },
};

const COPY = {
  en: {
    home: 'Home', products: 'Products', category: 'Pneumatic rotary union', productOverview: 'product overview',
    drawingSummary: 'Technical summary', drawingBasis: 'Selection basis', operatingLimits: 'Operating limits',
    materialsMedia: 'Materials and medium', interfaces: 'Interfaces', selectionStatus: 'Selection status',
    pendingBasis: 'Application review is required before selecting this model.',
    pendingAction: 'Send the application, medium, pressure, speed, mounting, and quantity for review before selecting or ordering this model.',
    specHeading: 'Technical Data',
    specIntro: 'Key dimensions and operating limits for this model are listed below.',
    specIntroPending: 'Technical values are not listed for this model. Request the current model-specific file before selection.',
    labels: {
      model: 'Model number', status: 'Selection status', document: 'Technical file', pressure: 'Maximum pressure',
      speed: 'Maximum speed', media: 'Suitable media', body: 'Body material', seal: 'Seal materials',
      ports: 'Port annotations', mounting: 'Mounting features', envelope: 'Envelope', bore: 'Through bore',
      temperature: 'Temperature range', weight: 'Weight', electrical: 'Electrical interface', warranty: 'Warranty period',
    },
    statusVerified: 'Available for application review',
    statusPending: 'Application review required before selection',
    portsCountPending: 'Outlet count is not listed; request the current model-specific drawing before selection',
    portsSizePending: 'Port specification is pending; request the current model-specific drawing',
    inletPending: 'Air inlet connection is not identified; request the current model-specific drawing',
    mountNotStated: 'No separate mounting features are listed',
    noBore: 'No through-bore dimension is listed',
    warranty: '1 year',
    electrical: 'The drawing shows 6 electrical leads; confirm circuit allocation and electrical ratings for the selected configuration',
    compatHeading: 'Machine Compatibility and Application Fit',
    compatIntro: 'Check the selected model against the machine’s required circuits, ports, pressure, speed, mounting space, and duty cycle.',
    compatCards: [
      ['Circuit and port match', 'Match every machine circuit to the port configuration. Confirm unresolved port details before selecting fittings or machining mating parts.'],
      ['Pressure and speed', 'Confirm the combined medium, pressure, speed, temperature, and duty cycle for the selected configuration.'],
      ['Mounting and envelope', 'Check the stated mounting features, surrounding clearance, hose routing, shaft alignment, and external loads in the machine assembly.'],
    ],
    notApproved: 'Application review required for',
    notApprovedItems: [
      'Media not listed on the page', 'Operation above a published maximum',
      'Unresolved port or electrical-interface details',
      'Regulated, safety-critical, food-contact, vacuum, or special-environment service without project review',
    ],
    installHeading: 'Installation and Commissioning Guidance',
    installIntro: 'Use the model drawing and the machine installation plan during assembly.',
    installSteps: [
      ['Make the machine safe', 'Before work, isolate and lock out every energy source, fully depressurize all passages, and prevent any unintended rotation.'],
      ['Identify the fixed and rotating sides', 'Orient the rotary union to the machine layout, then align the ports and mounting features before fastening.'],
      ['Check interfaces before assembly', 'Match threads, holes, sealing faces, mating dimensions, and orientation exactly. Confirm adapters, tightening torque, and sealant for the selected fittings and mating materials.'],
      ['Control alignment and external loads', 'Support hoses and fixed-side hardware so bending, tension, torsion, misalignment, and machine loads are not transferred into the rotary joint.'],
      ['Use the listed medium', 'Contact us before using another medium so seal and wetted-material compatibility can be checked.'],
      ['Commission under controlled conditions', 'Start at low pressure and speed within the listed limits. Check every passage for leakage and monitor friction, temperature, vibration, and abnormal noise before increasing duty.'],
    ],
    maintenanceTitle: 'Inspection interval',
    maintenance: 'Set inspection and replacement intervals from recorded operating conditions and inspection results; there is no universal service-life interval.',
    downloadsHeading: 'Downloads and Engineering Files',
    drawingTitle: '2D engineering drawing (PDF)', drawingDescription: 'Model drawing with dimensions, ports, mounting features, and published technical values.',
    drawingPendingTitle: 'Request model-specific file', drawingPendingDescription: 'Request the current model-specific file before technical selection or ordering.',
    cadTitle: 'Request 3D STEP/IGES file', cadDescription: 'We provide STEP/IGES models for the selected configuration and fit check.',
    manualTitle: 'General installation manual (PDF)', manualDescription: 'General handling, alignment, connection, commissioning, and maintenance guidance.',
    docsTitle: 'Inspection Documents', docsDescription: 'Need an inspection record or material document? Include the requirement with your inquiry.',
    commonLabel: 'Installation mistakes', commonHeading: 'Three Common Installation and Startup Errors',
    commonIntro: 'Avoid these mistakes to reduce leakage, abnormal wear, and commissioning rework.',
    commonCards: [
      ['Transferring piping loads into the rotary union', 'Hose tension, bending, twisting, rigid restraint, or misalignment can add side load to the rotary union. Support the piping and leave enough natural movement to avoid loading the union.'],
      ['Connecting ports before checking the interface', 'Confirm each port function, thread, and sealing method before installation. Do not copy another model’s interface or use media ports as mounting holes.'],
      ['Starting at full operating conditions', 'Begin commissioning at low pressure and speed, then increase gradually to the actual operating condition while checking every passage for leakage, temperature rise, vibration, and abnormal noise.'],
    ],
    relatedHeading: 'Related Products', relatedIntro: 'Compare nearby models using each model’s published specifications.',
    relatedDescription: 'Open the model page to review its specifications and application fit.',
    compareTitle: 'Compare models', compareDescription: 'Use the comparison page to shortlist models, then check each shortlisted model against the machine requirements and available drawing.',
    customTitle: 'Send machine details', customDescription: 'Send the required passages, medium, pressure, speed, temperature, mounting, available space, and any drawing or photo you already have.',
    viewModel: 'View model', compareModels: 'Compare models', requestReview: 'Ask us to compare',
  },
  de: {
    home: 'Startseite', products: 'Produkte', category: 'Pneumatische Drehdurchführung', productOverview: 'Produktübersicht',
    drawingSummary: 'Technische Zusammenfassung', drawingBasis: 'Auswahlbasis', operatingLimits: 'Betriebsgrenzen',
    materialsMedia: 'Werkstoffe und Medium', interfaces: 'Anschlüsse', selectionStatus: 'Auswahlstatus',
    pendingBasis: 'Vor der Auswahl ist eine anwendungsbezogene Prüfung erforderlich.',
    pendingAction: 'Anwendung, Medium, Druck, Drehzahl, Montage und Menge zur Prüfung senden, bevor dieses Modell ausgewählt oder bestellt wird.',
    specHeading: 'Technische Daten',
    specIntro: 'Die wichtigsten Abmessungen und Betriebsgrenzen dieses Modells sind nachfolgend aufgeführt.',
    specIntroPending: 'Für dieses Modell sind keine technischen Werte angegeben. Vor der Auswahl die aktuelle modellspezifische Datei anfordern.',
    labels: {
      model: 'Modellnummer', status: 'Auswahlstatus', document: 'Technische Datei', pressure: 'Maximaldruck',
      speed: 'Maximale Drehzahl', media: 'Geeignete Medien', body: 'Gehäusewerkstoff', seal: 'Dichtungswerkstoffe',
      ports: 'Anschlussangaben', mounting: 'Montagemerkmale', envelope: 'Außenabmessungen', bore: 'Durchgangsbohrung',
      temperature: 'Temperaturbereich', weight: 'Gewicht', electrical: 'Elektrische Schnittstelle', warranty: 'Garantiezeitraum',
    },
    statusVerified: 'Für Anwendungsprüfung verfügbar',
    statusPending: 'Anwendungsprüfung vor Auswahl erforderlich',
    portsCountPending: 'Ausgangsanzahl ist nicht angegeben; aktuelle modellspezifische Zeichnung vor der Auswahl anfordern',
    portsSizePending: 'Anschlussspezifikation ist noch offen; aktuelle modellspezifische Zeichnung anfordern',
    inletPending: 'Lufteinlass ist nicht eindeutig angegeben; aktuelle modellspezifische Zeichnung anfordern',
    mountNotStated: 'Separate Montagemerkmale sind nicht angegeben',
    noBore: 'Keine Abmessung für eine Durchgangsbohrung angegeben',
    warranty: '1 Jahr',
    electrical: 'Die Zeichnung zeigt 6 elektrische Leitungen; Kreiszuordnung und elektrische Nennwerte für die gewählte Ausführung bestätigen',
    compatHeading: 'Maschinenkompatibilität und Anwendungseignung',
    compatIntro: 'Das gewählte Modell mit den erforderlichen Kreisen, Anschlüssen, Druck-, Drehzahl-, Bauraum- und Betriebsbedingungen der Maschine abgleichen.',
    compatCards: [
      ['Kreise und Anschlüsse', 'Jeden Maschinenkreis und jede Anschlussfunktion mit der gewählten Ausführung vergleichen. Offene Anschlussangaben vor Auswahl der Verschraubungen oder Bearbeitung der Gegenstücke klären.'],
      ['Druck und Drehzahl', 'Die kombinierte Belastung aus Medium, Druck, Drehzahl, Temperatur und Einschaltdauer für die gewählte Ausführung bestätigen.'],
      ['Montage und Bauraum', 'Montagemerkmale, Freiraum, Schlauchführung, Ausrichtung und äußere Lasten in der Baugruppe prüfen.'],
    ],
    notApproved: 'Anwendungsprüfung erforderlich für',
    notApprovedItems: ['Nicht gelistete Medien', 'Betrieb oberhalb eines veröffentlichten Höchstwerts', 'Offene Anschluss- oder Elektroschnittstellenangaben', 'Regulierte, sicherheitskritische oder besondere Umgebungen ohne Projektprüfung'],
    installHeading: 'Montage- und Inbetriebnahmehinweise', installIntro: 'Bei der Montage die Modellzeichnung und den Einbauplan der Maschine verwenden.',
    installSteps: [
      ['Anlage sicher stillsetzen', 'Vor Arbeiten alle Energiequellen abschalten und gegen Wiedereinschalten sichern, alle Kanäle vollständig drucklos machen und unbeabsichtigte Drehbewegung verhindern.'],
      ['Feste und rotierende Seite zuordnen', 'Die Drehdurchführung nach dem Maschinenlayout ausrichten und anschließend Anschlüsse und Montagemerkmale vor dem Befestigen fluchten.'],
      ['Schnittstellen vor der Montage prüfen', 'Gewinde, Bohrungen, Dichtflächen, Gegenmaße und Orientierung exakt abgleichen. Adapter, Anzugsmoment und Dichtmittel für die gewählten Verschraubungen und Gegenwerkstoffe bestätigen.'],
      ['Ausrichtung und äußere Lasten beherrschen', 'Schläuche und Festseite so abstützen, dass Biegung, Zug, Torsion, Fluchtfehler und Maschinenlasten nicht in die Drehdurchführung eingeleitet werden.'],
      ['Gelistetes Medium verwenden', 'Bei einem anderen Medium vor dem Einsatz die Eignung der Dichtungen und medienberührten Werkstoffe prüfen lassen.'],
      ['Kontrolliert in Betrieb nehmen', 'Mit niedrigem Druck und niedriger Drehzahl innerhalb der angegebenen Grenzen beginnen. Alle Kanäle auf Leckage prüfen und Reibung, Temperatur, Schwingung sowie ungewöhnliche Geräusche überwachen.'],
    ],
    maintenanceTitle: 'Prüfintervall', maintenance: 'Prüf- und Austauschintervalle aus dokumentierten Betriebsbedingungen und Prüfergebnissen festlegen. Ein universeller Lebensdauerwert ist nicht angegeben.',
    downloadsHeading: 'Downloads und Konstruktionsdaten', drawingTitle: '2D-Technikzeichnung (PDF)', drawingDescription: 'Modellzeichnung mit Abmessungen, Anschlüssen, Montagemerkmalen und veröffentlichten technischen Daten.',
    drawingPendingTitle: 'Modellspezifische Datei anfordern', drawingPendingDescription: 'Vor technischen Entscheidungen oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    cadTitle: '3D-STEP-/IGES-Datei anfordern', cadDescription: 'Für die ausgewählte Ausführung und Einbauprüfung stellen wir STEP-/IGES-Modelle bereit.',
    manualTitle: 'Allgemeine Montageanleitung (PDF)', manualDescription: 'Allgemeine Hinweise zu Handhabung, Ausrichtung, Anschluss, Inbetriebnahme und Wartung.',
    docsTitle: 'Prüfunterlagen', docsDescription: 'Benötigen Sie ein Prüfprotokoll oder einen Werkstoffnachweis? Geben Sie die Anforderung in Ihrer Anfrage an.',
    commonLabel: 'Montagefehler', commonHeading: 'Drei häufige Fehler bei Montage und Inbetriebnahme', commonIntro: 'Diese Fehler vermeiden, um Leckagen, vorzeitigen Verschleiß und Nacharbeit bei der Inbetriebnahme zu reduzieren.',
    commonCards: [['Rohr- oder Schlauchlasten einleiten', 'Zug, Biegung, Torsion, starre Halterungen oder Fehlausrichtung können Seitenlasten auf die Drehdurchführung übertragen. Rohrleitungen abstützen und genügend Bewegungsfreiheit lassen.'], ['Anschlüsse ohne Prüfung der Schnittstelle verbinden', 'Vor der Montage Funktion, Gewinde und Dichtungsart jedes Anschlusses prüfen. Die Schnittstelle nicht von einem anderen Modell übernehmen und Medienanschlüsse nicht als Montagebohrungen verwenden.'], ['Sofort unter vollen Betriebsbedingungen starten', 'Die Inbetriebnahme bei niedrigem Druck und niedriger Drehzahl beginnen und dann schrittweise auf die tatsächlichen Betriebsbedingungen erhöhen. Dabei jeden Kanal auf Leckagen, Temperaturanstieg, Vibrationen und ungewöhnliche Geräusche prüfen.']],
    relatedHeading: 'Verwandte Produkte', relatedIntro: 'Benachbarte Modelle anhand der veröffentlichten Spezifikationen des jeweiligen Modells vergleichen.', relatedDescription: 'Modellseite öffnen, um Spezifikationen und Anwendungseignung zu prüfen.',
    compareTitle: 'Modelle vergleichen', compareDescription: 'Auf der Vergleichsseite Modelle vorsortieren und anschließend jedes Modell für die gewählte Anwendung bestätigen.',
    customTitle: 'Technische Prüfung', customDescription: 'Benötigte Kanäle, Medium, Druck, Drehzahl, Temperatur, Montage, Bauraum und Dokumentation zur Prüfung senden.',
    viewModel: 'Modell ansehen', compareModels: 'Modelle vergleichen', requestReview: 'Modelle vergleichen lassen',
  },
};

COPY.ja = {
  ...COPY.en,
  home: 'ホーム', products: '製品', category: '空圧ロータリージョイント', productOverview: '製品概要',
  drawingSummary: '技術要約', drawingBasis: '選定条件', operatingLimits: '使用限界', materialsMedia: '材質・流体', interfaces: '接続仕様', selectionStatus: '選定状態',
  pendingBasis: '選定前に用途条件の確認が必要です。',
  pendingAction: 'この型式を選定・発注する前に、用途、流体、圧力、回転数、取付け、数量をお知らせください。',
  specHeading: '技術情報',
  specIntro: 'この型式の主要寸法と使用限界を以下に示します。',
  specIntroPending: 'この型式の技術値は記載されていません。選定前に現在の型式専用ファイルをご依頼ください。',
  labels: { model: '型式', status: '選定状態', document: '技術ファイル', pressure: '最高使用圧力', speed: '最高回転数', media: '適用流体', body: 'ボディ材質', seal: 'シール材質', ports: 'ポート注記', mounting: '取付仕様', envelope: '外形寸法', bore: '貫通穴', temperature: '温度範囲', weight: '質量', electrical: '電気インターフェース', warranty: '保証期間' },
  statusVerified: '用途確認が可能', statusPending: '選定前に用途確認が必要',
  portsCountPending: '出口数は記載されていません。選定前に最新の型式専用図面をご依頼ください', portsSizePending: 'ポート仕様は未確定です。最新の型式専用図面をご依頼ください',
  inletPending: '空気入口接続は明確に記載されていません。最新の型式専用図面をご依頼ください', mountNotStated: '独立した取付仕様は記載されていません', noBore: '貫通穴寸法は記載されていません',
  warranty: '1年', electrical: '電気リード6本です。選定仕様の回路割当と電気定格を確認してください',
  compatHeading: '適合機械と用途条件', compatIntro: '選定型式を、機械に必要な回路、ポート、圧力、回転数、取付空間、デューティと照合してください。',
  compatCards: [['回路・ポートの一致', '機械の全回路と各ポート機能を選定仕様と照合し、未確定の注記は継手選定や相手部品加工の前に確認してください。'], ['圧力・回転数', '流体、圧力、回転数、温度、デューティの組合せを選定仕様で確認してください。'], ['取付け・外形', '取付仕様、周囲すきま、ホース経路、軸芯、外力を機械組立状態で確認してください。']],
  notApproved: '個別確認が必要な条件', notApprovedItems: ['記載されていない流体', '公開最大値を超える運転', '未解決のポートまたは電気仕様', '規制対象、安全上重要な用途、食品接触、真空、特殊環境で個別技術審査を受けていない場合'],
  installHeading: '取付け・試運転ガイド', installIntro: '組立時は、型式図面と装置の取付計画を使用してください。',
  installSteps: [['設備を安全状態にする', '作業前にすべてのエネルギー源を遮断・ロックアウトし、全流路を完全に減圧し、意図しない回転を防止してください。'], ['固定側と回転側を確認する', '装置レイアウトに合わせてロータリージョイントの向きを決め、締結前にポートと取付部を位置合わせしてください。'], ['組立前に接続部を照合する', 'ねじ、穴、シール面、相手寸法、向きを正確に照合し、選定した継手と相手材に適したアダプタ、締付トルク、シール剤を確認してください。'], ['芯出しと外力を管理する', '曲げ、引張り、ねじり、芯ずれ、機械荷重が本体へ伝わらないよう、ホースと固定側部品を支持してください。'], ['記載流体を使用する', '別の流体を使用する場合は、シールと全接液材の適合性を事前にお問い合わせください。'], ['管理条件で試運転する', '記載範囲内の低い圧力と回転数から開始し、各流路の漏れ、摩擦、温度、振動、異音を確認してから負荷を上げてください。']],
  maintenanceTitle: '点検周期', maintenance: '記録した運転条件と点検結果に基づいて点検・交換周期を設定してください。共通の寿命値はありません。',
  downloadsHeading: 'ダウンロード・設計データ', drawingTitle: '2D技術図面（PDF）', drawingDescription: '寸法、ポート、取付仕様、公開技術値を記載した型式図面です。',
  drawingPendingTitle: '型式専用ファイルを依頼', drawingPendingDescription: '技術判断または発注前に、現在の型式専用ファイルを依頼してください。',
  cadTitle: '3D STEP／IGESデータを依頼', cadDescription: '選定仕様の組込み確認用にSTEP／IGESモデルを提供します。',
  manualTitle: '一般取付説明書（PDF）', manualDescription: '取扱い、芯出し、接続、試運転、保守に関する一般ガイドです。',
  docsTitle: '検査資料', docsDescription: '検査記録や材料資料が必要な場合は、お問い合わせ時に要件をお知らせください。',
  commonLabel: '取付けミス', commonHeading: '取付け・試運転で多い3つのミス', commonIntro: '漏れ、異常摩耗、試運転時の手戻りを減らすため、次のミスを避けてください。',
  commonCards: [['配管荷重をロータリージョイントにかける', 'ホースの張力、曲げ、ねじれ、固定具による拘束、芯ずれは、ロータリージョイントに余分な横荷重を与えます。配管を支持し、ジョイントに機械側の荷重がかからないよう自然な動きの余裕を確保してください。'], ['確認せずにポートを接続する', '取付け前に各ポートの機能、ねじ、シール方法を確認してください。他型式の接続仕様を流用したり、流体ポートを取付け穴として使用したりしないでください。'], ['最初から実運転条件で始動する', '試運転は低圧・低速から開始し、各流路の漏れ、温度上昇、振動、異音を確認しながら、実際の運転条件まで段階的に上げてください。']],
  relatedHeading: '関連製品', relatedIntro: '近い型式は、それぞれの公開仕様で比較してください。', relatedDescription: '型式ページを開き、仕様と用途適合性を確認してください。',
  compareTitle: '型式を比較', compareDescription: '比較ページで候補を絞り、各候補を用途条件で最終確認してください。', customTitle: '技術確認', customDescription: '必要流路、流体、圧力、回転数、温度、取付け、外形、必要書類をお知らせください。',
  viewModel: '型式を見る', compareModels: '型式を比較', requestReview: '候補を比較してもらう',
};

COPY.ru = {
  ...COPY.en,
  home: 'Главная', products: 'Продукция', category: 'Пневматическое вращающееся соединение', productOverview: 'обзор изделия',
  drawingSummary: 'Техническая сводка', drawingBasis: 'Условия выбора', operatingLimits: 'Рабочие пределы', materialsMedia: 'Материалы и среда', interfaces: 'Присоединения', selectionStatus: 'Условия выбора',
  pendingBasis: 'Перед выбором требуется проверка условий применения.',
  pendingAction: 'Перед выбором или заказом этой модели сообщите условия применения, среду, давление, скорость, монтаж и количество.',
  specHeading: 'Технические данные',
  specIntro: 'Ниже приведены основные размеры и рабочие пределы этой модели.',
  specIntroPending: 'Технические значения для этой модели не указаны. Запросите актуальный файл конкретной модели до выбора.',
  labels: { model: 'Модель', status: 'Статус выбора', document: 'Технический файл', pressure: 'Максимальное давление', speed: 'Максимальная частота вращения', media: 'Подходящая среда', body: 'Материал корпуса', seal: 'Материалы уплотнений', ports: 'Обозначения портов', mounting: 'Монтажные элементы', envelope: 'Габариты', bore: 'Сквозное отверстие', temperature: 'Температурный диапазон', weight: 'Масса', electrical: 'Электрический интерфейс', warranty: 'Гарантийный срок' },
  statusVerified: 'Доступно для проверки применения', statusPending: 'Перед выбором требуется проверка применения',
  portsCountPending: 'Количество выходов не указано; запросите актуальный чертёж конкретной модели до выбора', portsSizePending: 'Спецификация портов не определена; запросите актуальный чертёж конкретной модели',
  inletPending: 'Вход воздуха не обозначен; запросите актуальный чертёж конкретной модели', mountNotStated: 'Отдельные монтажные элементы не указаны', noBore: 'Размер сквозного отверстия не указан',
  warranty: '1 год', electrical: 'На чертеже показано 6 электрических выводов; подтвердите распределение цепей и электрические номиналы для выбранного исполнения',
  compatHeading: 'Совместимость с оборудованием и условия применения', compatIntro: 'Сопоставьте выбранную модель с требуемыми контурами, портами, давлением, скоростью, монтажным пространством и рабочим циклом машины.',
  compatCards: [['Контуры и порты', 'Сопоставьте каждый контур машины и назначение порта с выбранным исполнением. Уточните неясные обозначения до выбора фитингов или обработки сопрягаемых деталей.'], ['Давление и скорость', 'Подтвердите сочетание среды, давления, скорости, температуры и рабочего цикла для выбранного исполнения.'], ['Монтаж и габариты', 'Проверьте монтажные элементы, зазоры, трассировку шлангов, соосность и внешние нагрузки в сборке машины.']],
  notApproved: 'Проверка применения требуется для', notApprovedItems: ['Среды, не указанные на странице', 'Работа выше опубликованного максимума', 'Неуточнённые данные портов или электрического интерфейса', 'Регулируемые, критичные для безопасности или особые условия без инженерной проверки проекта'],
  installHeading: 'Монтаж и ввод в эксплуатацию', installIntro: 'При сборке используйте чертёж модели и монтажный план машины.',
  installSteps: [['Обеспечьте безопасное состояние оборудования', 'Перед работами отключите и заблокируйте все источники энергии, полностью сбросьте давление во всех каналах и исключите непреднамеренное вращение.'], ['Определите неподвижную и вращающуюся стороны', 'Сориентируйте соединение по компоновке машины, затем совместите порты и монтажные элементы перед креплением.'], ['Сверьте интерфейсы до сборки', 'Точно сопоставьте резьбы, отверстия, уплотнительные поверхности, сопрягаемые размеры и ориентацию. Уточните переходники, момент затяжки и герметик для выбранных фитингов и сопрягаемых материалов.'], ['Контролируйте соосность и внешние нагрузки', 'Поддерживайте шланги и неподвижную сторону так, чтобы изгиб, растяжение, кручение, несоосность и нагрузки машины не передавались на соединение.'], ['Используйте указанную среду', 'Перед применением другой среды обратитесь к нам для проверки совместимости уплотнений и всех смачиваемых материалов.'], ['Вводите в эксплуатацию контролируемо', 'Начинайте с низких давления и скорости в указанных пределах. Проверьте каждый канал на утечку, трение, температуру, вибрацию и посторонний шум до повышения нагрузки.']],
  maintenanceTitle: 'Интервал проверки', maintenance: 'Назначайте интервалы проверки и замены по записанным условиям работы и результатам осмотра. Универсальный срок службы не указан.',
  downloadsHeading: 'Загрузки и конструкторские файлы', drawingTitle: '2D-чертёж (PDF)', drawingDescription: 'Чертёж модели с размерами, портами, монтажными элементами и опубликованными техническими данными.',
  drawingPendingTitle: 'Запросить файл конкретной модели', drawingPendingDescription: 'Перед техническими решениями или заказом запросите актуальный файл для конкретной модели.',
  cadTitle: 'Запросить 3D STEP/IGES', cadDescription: 'Для выбранного исполнения и проверки компоновки мы предоставляем модели STEP/IGES.',
  manualTitle: 'Общее руководство по монтажу (PDF)', manualDescription: 'Общие рекомендации по обращению, центровке, подключению, вводу в эксплуатацию и обслуживанию.',
  docsTitle: 'Документы контроля', docsDescription: 'Если вам нужен протокол контроля или документ на материал, укажите это в запросе.',
  commonLabel: 'Ошибки монтажа', commonHeading: 'Три частые ошибки при монтаже и вводе в эксплуатацию', commonIntro: 'Избегайте этих ошибок, чтобы снизить риск утечек, преждевременного износа и повторных работ при вводе в эксплуатацию.',
  commonCards: [['Передача нагрузок от труб и шлангов', 'Натяжение, изгиб или скручивание шланга, жёсткое крепление и несоосность могут передавать боковую нагрузку на вращающееся соединение. Поддерживайте трубопровод и оставляйте достаточную свободу перемещения.'], ['Подключение портов без проверки интерфейса', 'Перед монтажом подтвердите назначение, резьбу и способ уплотнения каждого порта. Не переносите интерфейс с другой модели и не используйте порты среды как монтажные отверстия.'], ['Запуск сразу в полном рабочем режиме', 'Начинайте ввод в эксплуатацию при низких давлении и скорости, затем постепенно переходите к фактическому рабочему режиму, проверяя каждый канал на утечки, нагрев, вибрацию и посторонний шум.']],
  relatedHeading: 'Связанные продукты', relatedIntro: 'Сравнивайте соседние модели по опубликованным спецификациям каждой модели.', relatedDescription: 'Откройте страницу модели, чтобы проверить её характеристики и соответствие применению.',
  compareTitle: 'Сравнить модели', compareDescription: 'Сформируйте короткий список на странице сравнения, затем подтвердите каждую модель по условиям применения.', customTitle: 'Инженерная проверка', customDescription: 'Сообщите требуемые каналы, среду, давление, скорость, температуру, монтаж, габариты и документацию.',
  viewModel: 'Открыть модель', compareModels: 'Сравнить модели', requestReview: 'Сравнить варианты',
};

const BUYER_COPY = Object.freeze({
  en: Object.freeze({
    compatTitle: 'Not sure this is the right model?',
    compatText: 'A model number, photo, drawing, or short description is enough to start. Add any operating details you already know; incomplete information is fine. We’ll check whether {model} fits, or suggest a closer catalog model or custom option.',
    compatAction: 'Ask Us to Check This Model',
    helpTitle: 'Need help choosing?',
    helpText: 'Send a model number, photo, drawing, or short description. We’ll compare the closest options.',
    helpAction: 'Ask us to compare',
    bottomTitle: 'Need a Different Configuration?',
    bottomText: 'Send what you already have. We’ll reply with a catalog model or custom option, quotation, estimated lead time, and the relevant 2D drawing and 3D STEP model.',
    bottomAction: 'Ask About Another Option',
    privacyLead: 'A model number, photo, drawing, or short description is enough to start.',
    privacy: 'We do not use your inquiries or drawings for marketing or public display.',
  }),
  de: Object.freeze({
    compatTitle: 'Unsicher, ob dieses Modell passt?',
    compatText: 'Eine Modellnummer, ein Foto, eine Zeichnung oder eine kurze Beschreibung reicht für den Anfang. Ergänzen Sie nur die Betriebsdaten, die Sie bereits kennen; unvollständige Angaben sind kein Problem. Wir prüfen, ob {model} passt, oder schlagen ein geeigneteres Katalogmodell bzw. eine kundenspezifische Ausführung vor.',
    compatAction: 'Dieses Modell prüfen lassen',
    helpTitle: 'Hilfe bei der Auswahl?',
    helpText: 'Senden Sie eine Modellnummer, ein Foto, eine Zeichnung oder eine kurze Beschreibung. Wir vergleichen die nächstliegenden Optionen.',
    helpAction: 'Modelle vergleichen lassen',
    bottomTitle: 'Benötigen Sie eine andere Ausführung?',
    bottomText: 'Senden Sie uns, was bereits vorliegt. Wir antworten mit einem passenden Katalogmodell oder einer kundenspezifischen Ausführung, Angebot, geschätzter Lieferzeit sowie der zugehörigen 2D-Zeichnung und dem 3D-STEP-Modell.',
    bottomAction: 'Andere Ausführung anfragen',
    privacyLead: 'Für den Anfang genügt eine Modellnummer, ein Foto, eine Zeichnung oder eine kurze Beschreibung.',
    privacy: 'Wir verwenden Ihre Anfragen oder Zeichnungen weder für Marketingzwecke noch zur öffentlichen Darstellung.',
  }),
  ja: Object.freeze({
    compatTitle: 'この型式でよいか迷っていますか？',
    compatText: '型式、写真、図面、または短い説明のいずれかがあれば始められます。分かる範囲の使用条件だけ添えてください。情報が不完全でも問題ありません。{model}が適するか確認し、より近い標準型式またはカスタム仕様をご提案します。',
    compatAction: 'この型式の適合を相談',
    helpTitle: '選定に迷っていますか？',
    helpText: '型式、写真、図面、または短い説明をお送りください。近い候補を比較してご案内します。',
    helpAction: '候補を比較してもらう',
    bottomTitle: '別の仕様が必要ですか？',
    bottomText: 'お手元の情報だけで構いません。適した標準型式またはカスタム仕様、見積り、概算納期、該当する2D図面と3D STEPモデルをご案内します。',
    bottomAction: '別仕様を相談',
    privacyLead: '型式、写真、図面、または短い説明のいずれかがあれば始められます。',
    privacy: 'お問い合わせ内容や図面を、マーケティングや一般公開に使用することはありません。',
  }),
  ru: Object.freeze({
    compatTitle: 'Не уверены, что эта модель подходит?',
    compatText: 'Для начала достаточно номера модели, фотографии, чертежа или краткого описания. Добавьте только те условия работы, которые уже известны; неполные данные не мешают начать. Мы проверим, подходит ли {model}, либо предложим более близкую серийную модель или заказное исполнение.',
    compatAction: 'Проверить эту модель',
    helpTitle: 'Нужна помощь с выбором?',
    helpText: 'Отправьте номер модели, фотографию, чертёж или краткое описание. Мы сравним наиболее близкие варианты.',
    helpAction: 'Сравнить варианты',
    bottomTitle: 'Нужно другое исполнение?',
    bottomText: 'Отправьте то, что уже есть. Мы предложим серийную модель или заказное исполнение и сообщим цену, ориентировочный срок, а также предоставим соответствующие 2D-чертёж и 3D-модель STEP.',
    bottomAction: 'Запросить другой вариант',
    privacyLead: 'Для начала достаточно номера модели, фотографии, чертежа или краткого описания.',
    privacy: 'Мы не используем ваши запросы или чертежи в маркетинговых материалах и не публикуем их в открытом доступе.',
  }),
});

const FAQ_COPY = Object.freeze({
  en: Object.freeze({
    heading: '{model} FAQs',
    fitQuestion: 'Is {model} suitable for my machine?',
    fitAnswer: '{model} uses a {passages}. Suitable media: {media}. Ports: {ports}. Mounting: {mounting}.',
    fitAnswerWithBore: '{model} uses a {passages}. Suitable media: {media}. Ports: {ports}. Mounting: {mounting}. Through bore: {bore}.',
    hybridFitAnswer: '{model} combines {passages} with six electrical leads. Suitable media: {media}. Pneumatic ports: {ports}. Mounting: {mounting}. Circuit allocation and ratings follow the selected electrical specification.',
    limitsQuestion: 'What are the maximum pressure and speed for {model}?',
    limitsAnswer: 'Maximum pressure: {pressure}. Maximum speed: {speed}. For continuous duty, send the medium, temperature, mounting, and duty cycle so we can confirm the operating point.',
    materialsQuestion: 'Can {model} be used with vacuum, water, or hydraulic oil?',
    materialsAnswer: '{model}’s catalog rating covers compressed air only. Vacuum, water, and hydraulic oil require a medium-specific engineering review and written compatibility confirmation. Send the medium, pressure, temperature, and speed so we can confirm the required seals, materials, and configuration.',
    interfaceQuestion: 'What ports and mounting does {model} use?',
    interfaceQuestionWithBore: 'What ports, mounting, and through bore does {model} use?',
    interfaceAnswer: 'Ports: {ports}. Mounting: {mounting}.',
    interfaceAnswerWithBore: 'Ports: {ports}. Mounting: {mounting}. Through bore: {bore}.',
    hybridInterfaceQuestion: 'What pneumatic and electrical interfaces does {model} provide?',
    hybridInterfaceAnswer: 'Pneumatic ports: {ports}. Electrical: six leads; confirm circuit allocation and ratings for the selected configuration. Mounting: {mounting}.',
    quoteQuestion: 'What should I send for a quote or CAD file for {model}?',
    quoteAnswer: 'The model number is enough to start. A photo, drawing, or any operating details you already know can help us confirm the fit. We normally reply within one business day.',
    hybridQuoteAnswer: 'The model number is enough to start. If known, add a photo or drawing and the required pneumatic and electrical functions. We normally reply within one business day.',
    pendingItems: Object.freeze([
      Object.freeze(['Is {model} ready for selection?', 'Application review is required before selecting {model}; model-specific operating limits and interfaces are not currently listed.']),
      Object.freeze(['What should I send for the application review?', 'Send the required passages, medium, working pressure, speed, temperature, duty cycle, mounting space, envelope, and quantity.']),
      Object.freeze(['Can I request the current 2D drawing for {model}?', 'Yes. Request the model-specific file and include the application requirements so the correct document can be supplied.']),
      Object.freeze(['Can I request 3D CAD for {model}?', 'Yes. CAD availability and file format are checked after the application and required configuration are reviewed.']),
      Object.freeze(['Can Begapunk review a custom interface for {model}?', 'Yes. Send the mating-part drawing, port layout, envelope, operating conditions, and quantity for an interface review and quotation.']),
    ]),
  }),
  de: Object.freeze({
    heading: 'Häufige Fragen zu {model}',
    fitQuestion: 'Passt {model} zu meiner Maschine?',
    fitAnswer: '{model} ist eine {passages}. Geeignete Medien: {media}. Anschlüsse: {ports}. Montage: {mounting}.',
    fitAnswerWithBore: '{model} ist eine {passages}. Geeignete Medien: {media}. Anschlüsse: {ports}. Montage: {mounting}. Durchgangsbohrung: {bore}.',
    hybridFitAnswer: '{model} kombiniert {passages} mit sechs elektrischen Leitungen. Geeignete Medien: {media}. Pneumatikanschlüsse: {ports}. Montage: {mounting}. Kreiszuordnung und Nennwerte folgen der gewählten Elektrospezifikation.',
    limitsQuestion: 'Welche maximalen Druck- und Drehzahlwerte gelten für {model}?',
    limitsAnswer: 'Maximaldruck: {pressure}. Maximale Drehzahl: {speed}. Für Dauerbetrieb nennen Sie bitte Medium, Temperatur, Montage und Lastprofil, damit wir den Betriebspunkt prüfen können.',
    materialsQuestion: 'Kann {model} mit Vakuum, Wasser oder Hydrauliköl eingesetzt werden?',
    materialsAnswer: 'Die Katalogangaben für {model} gelten nur für Druckluft. Vakuum, Wasser und Hydrauliköl erfordern eine medienbezogene Prüfung und eine schriftliche Kompatibilitätsbestätigung. Nennen Sie Medium, Druck, Temperatur und Drehzahl, damit wir Dichtungen, Werkstoffe und Ausführung bestätigen können.',
    interfaceQuestion: 'Welche Anschlüsse und Montagemerkmale hat {model}?',
    interfaceQuestionWithBore: 'Welche Anschlüsse, Montagemerkmale und Durchgangsbohrung hat {model}?',
    interfaceAnswer: 'Anschlüsse: {ports}. Montage: {mounting}.',
    interfaceAnswerWithBore: 'Anschlüsse: {ports}. Montage: {mounting}. Durchgangsbohrung: {bore}.',
    hybridInterfaceQuestion: 'Welche pneumatischen und elektrischen Schnittstellen bietet {model}?',
    hybridInterfaceAnswer: 'Pneumatikanschlüsse: {ports}. Elektrik: sechs Leitungen; Kreiszuordnung und Nennwerte für die gewählte Ausführung bestätigen. Montage: {mounting}.',
    quoteQuestion: 'Welche Angaben werden für ein Angebot oder eine CAD-Datei zu {model} benötigt?',
    quoteAnswer: 'Für den Anfang genügt die Modellnummer. Ein Foto, eine Zeichnung oder bereits bekannte Betriebsdaten helfen bei der Prüfung. Wir antworten normalerweise innerhalb eines Arbeitstags.',
    hybridQuoteAnswer: 'Für den Anfang genügt die Modellnummer. Falls bekannt, ergänzen Sie ein Foto oder eine Zeichnung sowie die benötigten pneumatischen und elektrischen Funktionen. Wir antworten normalerweise innerhalb eines Arbeitstags.',
    pendingItems: Object.freeze([
      Object.freeze(['Ist {model} bereits auswählbar?', 'Vor der Auswahl von {model} ist eine Anwendungsprüfung erforderlich; modellspezifische Betriebsgrenzen und Schnittstellen sind derzeit nicht angegeben.']),
      Object.freeze(['Welche Angaben werden für die Anwendungsprüfung benötigt?', 'Benötigte Kanäle, Medium, Betriebsdruck, Drehzahl, Temperatur, Einschaltdauer, Montageraum, Bauraum und Menge angeben.']),
      Object.freeze(['Kann ich die aktuelle 2D-Zeichnung für {model} anfordern?', 'Ja. Die modellspezifische Datei zusammen mit den Anwendungsanforderungen anfordern, damit das richtige Dokument bereitgestellt werden kann.']),
      Object.freeze(['Kann ich 3D-CAD für {model} anfordern?', 'Ja. CAD-Verfügbarkeit und Dateiformat werden nach Prüfung der Anwendung und benötigten Ausführung bestätigt.']),
      Object.freeze(['Kann Begapunk eine kundenspezifische Schnittstelle für {model} prüfen?', 'Ja. Gegenstückzeichnung, Anschlussanordnung, Bauraum, Betriebsbedingungen und Menge für Schnittstellenprüfung und Angebot senden.']),
    ]),
  }),
  ja: Object.freeze({
    heading: '{model} よくあるご質問',
    fitQuestion: '{model} は機械に適合しますか？',
    fitAnswer: '{model}は{passages}です。適用流体：{media}。ポート：{ports}。取付け：{mounting}。',
    fitAnswerWithBore: '{model}は{passages}です。適用流体：{media}。ポート：{ports}。取付け：{mounting}。貫通穴：{bore}。',
    hybridFitAnswer: '{model} は{passages}と電気リード6本を組み合わせています。適用流体：{media}。空圧ポート：{ports}。取付け：{mounting}。回路割当と定格は選定した電気仕様に従います。',
    limitsQuestion: '{model} の最高圧力と最高回転数は？',
    limitsAnswer: '最高圧力：{pressure}。最高回転数：{speed}。連続運転の場合は、流体、温度、取付け、デューティをお知らせください。実際の運転点を確認します。',
    materialsQuestion: '{model}は真空、水、作動油に使用できますか？',
    materialsAnswer: '{model}のカタログ仕様は圧縮空気用です。真空、水、作動油については、流体ごとの確認が必要です。運転前に書面で適合性を確認するため、流体、圧力、温度、回転数をお知らせください。必要なシール、材質、仕様をご案内します。',
    interfaceQuestion: '{model}のポートと取付仕様は？',
    interfaceQuestionWithBore: '{model}のポート、取付け、貫通穴の仕様は？',
    interfaceAnswer: 'ポート：{ports}。取付け：{mounting}。',
    interfaceAnswerWithBore: 'ポート：{ports}。取付け：{mounting}。貫通穴：{bore}。',
    hybridInterfaceQuestion: '{model} の空圧・電気インターフェースは？',
    hybridInterfaceAnswer: '空圧ポート：{ports}。電気：リード6本。選定仕様の回路割当と定格を確認してください。取付け：{mounting}。',
    quoteQuestion: '{model} の見積りやCADデータの依頼には何が必要ですか？',
    quoteAnswer: 'まずは型式だけで構いません。写真、図面、または分かる範囲の使用条件があれば、適合確認に役立ちます。通常1営業日以内にご返信します。',
    hybridQuoteAnswer: 'まずは型式だけで構いません。分かる範囲で、写真や図面、必要な空圧・電気機能を添えてください。通常1営業日以内にご返信します。',
    pendingItems: Object.freeze([
      Object.freeze(['{model} は現在の情報で選定できますか？', '{model} は選定前に用途確認が必要です。型式固有の使用限界と接続仕様は現在記載されていません。']),
      Object.freeze(['用途確認には何を知らせればよいですか？', '必要流路数、流体、使用圧力、回転数、温度、デューティ、取付空間、外形、数量をお知らせください。']),
      Object.freeze(['{model} の最新2D図面を依頼できますか？', 'はい。正しい型式専用資料を提供できるよう、用途条件と併せてご依頼ください。']),
      Object.freeze(['{model} の3D CADを依頼できますか？', 'はい。用途と必要仕様を確認後、CAD提供可否とファイル形式を回答します。']),
      Object.freeze(['{model} のカスタム接続仕様を相談できますか？', 'はい。相手部品図、ポート配置、外形、運転条件、数量をお送りください。接続仕様と見積りを確認します。']),
    ]),
  }),
  ru: Object.freeze({
    heading: 'Вопросы о {model}',
    fitQuestion: 'Подходит ли {model} для моего оборудования?',
    fitAnswer: '{model} — {passages}. Подходящая среда: {media}. Порты: {ports}. Монтаж: {mounting}.',
    fitAnswerWithBore: '{model} — {passages}. Подходящая среда: {media}. Порты: {ports}. Монтаж: {mounting}. Сквозное отверстие: {bore}.',
    hybridFitAnswer: '{model} сочетает {passages} и шесть электрических выводов. Подходящая среда: {media}. Пневматические порты: {ports}. Монтаж: {mounting}. Распределение цепей и номиналы задаются выбранной электрической спецификацией.',
    limitsQuestion: 'Каковы максимальные давление и частота вращения {model}?',
    limitsAnswer: 'Максимальное давление: {pressure}. Максимальная частота вращения: {speed}. Для непрерывной работы укажите среду, температуру, монтаж и рабочий цикл, чтобы мы проверили рабочую точку.',
    materialsQuestion: 'Можно ли использовать {model} с вакуумом, водой или гидравлическим маслом?',
    materialsAnswer: 'Каталожные характеристики {model} относятся только к сжатому воздуху. Для вакуума, воды и гидравлического масла требуется отдельная проверка среды и письменное подтверждение совместимости. Сообщите среду, давление, температуру и частоту вращения, чтобы мы подтвердили необходимые уплотнения, материалы и исполнение.',
    interfaceQuestion: 'Какие порты и монтажные элементы имеет {model}?',
    interfaceQuestionWithBore: 'Какие порты, монтажные элементы и сквозное отверстие имеет {model}?',
    interfaceAnswer: 'Порты: {ports}. Монтаж: {mounting}.',
    interfaceAnswerWithBore: 'Порты: {ports}. Монтаж: {mounting}. Сквозное отверстие: {bore}.',
    hybridInterfaceQuestion: 'Какие пневматические и электрические интерфейсы имеет {model}?',
    hybridInterfaceAnswer: 'Пневматические порты: {ports}. Электрика: шесть выводов; подтвердите распределение цепей и номиналы для выбранного исполнения. Монтаж: {mounting}.',
    quoteQuestion: 'Что указать для расчёта цены или запроса CAD по {model}?',
    quoteAnswer: 'Для начала достаточно номера модели. Фотография, чертёж или данные об условиях работы, которые у вас уже есть, помогут проверить применимость. Обычно мы отвечаем в течение одного рабочего дня.',
    hybridQuoteAnswer: 'Для начала достаточно номера модели. Если уже известно, приложите фотографию или чертёж и укажите нужные пневматические и электрические функции. Обычно мы отвечаем в течение одного рабочего дня.',
    pendingItems: Object.freeze([
      Object.freeze(['Готова ли {model} к выбору?', 'Перед выбором {model} требуется проверка применения; рабочие пределы и интерфейсы конкретной модели сейчас не указаны.']),
      Object.freeze(['Какие данные нужны для проверки применения?', 'Укажите требуемые каналы, среду, рабочее давление, скорость, температуру, цикл, монтажное пространство, габариты и количество.']),
      Object.freeze(['Можно ли запросить актуальный 2D-чертёж {model}?', 'Да. Запросите файл конкретной модели и приложите требования применения, чтобы получить правильный документ.']),
      Object.freeze(['Можно ли запросить 3D CAD для {model}?', 'Да. Доступность CAD и формат файла проверяются после рассмотрения применения и требуемого исполнения.']),
      Object.freeze(['Может ли Begapunk проверить заказной интерфейс для {model}?', 'Да. Отправьте чертёж сопрягаемой детали, схему портов, габариты, рабочие условия и количество для проверки интерфейса и расчёта цены.']),
    ]),
  }),
});

const SPECIAL_FAQ_COPY = Object.freeze({
  'BP-1P-0003': Object.freeze({
    en: Object.freeze({ materialsQuestion: 'Which media are listed for {model}?', materialsAnswer: 'The drawing lists air, oil, and water. Send the exact fluid, temperature, pressure, and speed so we can confirm compatibility; “oil” does not cover every hydraulic oil, and “water” does not automatically cover other water-based process fluids.' }),
    de: Object.freeze({ materialsQuestion: 'Welche Medien sind für {model} angegeben?', materialsAnswer: 'Die Zeichnung nennt Luft, Öl und Wasser. Nennen Sie das genaue Medium, Temperatur, Druck und Drehzahl, damit wir die Verträglichkeit prüfen können; „Öl“ umfasst nicht jedes Hydrauliköl und „Wasser“ bestätigt nicht automatisch andere wasserbasierte Prozessmedien.' }),
    ja: Object.freeze({ materialsQuestion: '{model}に記載されている流体は何ですか？', materialsAnswer: '図面には空気、油、水が記載されています。適合性を確認するため、具体的な流体、温度、圧力、回転数をお知らせください。「油」はすべての作動油を、「水」は他の水系プロセス流体を自動的に保証するものではありません。' }),
    ru: Object.freeze({ materialsQuestion: 'Какие среды указаны для {model}?', materialsAnswer: 'На чертеже указаны воздух, масло и вода. Сообщите точную среду, температуру, давление и частоту вращения, чтобы мы подтвердили совместимость; «масло» не означает любое гидравлическое масло, а «вода» не подтверждает автоматически другие технологические среды на водной основе.' }),
  }),
  'BP-1P-0006': Object.freeze({
    en: Object.freeze({ fitAnswer: '{model} distributes one shared air circuit from 1 inlet to 8 outlets; the outlets are not separate passages. Suitable medium: {media}. Mounting: {mounting}.' }),
    de: Object.freeze({ fitAnswer: '{model} verteilt einen gemeinsamen Druckluftkreis von 1 Eingang auf 8 Ausgänge; die Ausgänge sind keine getrennten Kanäle. Geeignetes Medium: {media}. Montage: {mounting}.' }),
    ja: Object.freeze({ fitAnswer: '{model}は、1つの共通エア回路を1入口から8出口へ分配する仕様です。8つの出口は別々の流路ではありません。適用流体：{media}。取付け：{mounting}。' }),
    ru: Object.freeze({ fitAnswer: '{model} распределяет один общий пневматический контур от 1 входа к 8 выходам; выходы не являются отдельными каналами. Подходящая среда: {media}. Монтаж: {mounting}.' }),
  }),
  'BP-2P-95-0005': Object.freeze({
    en: Object.freeze({ fitAnswer: '{model} uses a 2-in/4-out air layout: 2 outlets for clamp and 2 for release. Suitable medium: {media}. Mounting: {mounting}.' }),
    de: Object.freeze({ fitAnswer: '{model} hat eine Druckluftanordnung mit 2 Eingängen und 4 Ausgängen: 2 Ausgänge zum Spannen und 2 zum Lösen. Geeignetes Medium: {media}. Montage: {mounting}.' }),
    ja: Object.freeze({ fitAnswer: '{model}は2入力・4出力の空圧構成で、クランプ用2出力とアンクランプ用2出力を備えます。適用流体：{media}。取付け：{mounting}。' }),
    ru: Object.freeze({ fitAnswer: '{model} имеет пневматическую схему 2 входа / 4 выхода: 2 выхода для зажима и 2 для разжима. Подходящая среда: {media}. Монтаж: {mounting}.' }),
  }),
  'BP-3P-0006': Object.freeze({
    en: Object.freeze({ interfaceAnswer: 'The port thread is not listed. Mounting: {mounting}. Send the mating-part drawing before selecting fittings; no port direction is assumed here.' }),
    de: Object.freeze({ interfaceAnswer: 'Das Anschlussgewinde ist nicht angegeben. Montage: {mounting}. Senden Sie vor der Auswahl der Verschraubungen die Gegenstückzeichnung; eine Anschlussrichtung wird hier nicht angenommen.' }),
    ja: Object.freeze({ interfaceAnswer: 'ポートねじは記載されていません。取付け：{mounting}。継手選定前に相手部品図をお送りください。このページではポート方向を推定していません。' }),
    ru: Object.freeze({ interfaceAnswer: 'Резьба порта не указана. Монтаж: {mounting}. До выбора фитингов отправьте чертёж сопрягаемой детали; направление портов здесь не предполагается.' }),
  }),
  'BP-3P-S06-0001': Object.freeze({
    en: Object.freeze({
      fitAnswer: '{model} combines 3 pneumatic passages with 6 electrical leads. Suitable medium: {media}. Confirm the air inlet, circuit allocation, and electrical ratings for the selected configuration. Mounting: {mounting}.',
      interfaceAnswer: 'Pneumatic outlets: {ports}. Electrical: 6 leads. Confirm the air inlet, circuit allocation, and electrical ratings for the selected configuration. Mounting: {mounting}.',
    }),
    de: Object.freeze({
      fitAnswer: '{model} kombiniert 3 Pneumatikkanäle mit 6 elektrischen Leitungen. Geeignetes Medium: {media}. Lufteinlass, Kreiszuordnung und elektrische Nennwerte für die gewählte Ausführung bestätigen. Montage: {mounting}.',
      interfaceAnswer: 'Pneumatikausgänge: {ports}. Elektrik: 6 Leitungen. Lufteinlass, Kreiszuordnung und elektrische Nennwerte für die gewählte Ausführung bestätigen. Montage: {mounting}.',
    }),
    ja: Object.freeze({
      fitAnswer: '{model}は3つの空圧流路と電気リード6本を組み合わせた仕様です。適用流体：{media}。選定仕様のエア入口、回路割当、電気定格をご確認ください。取付け：{mounting}。',
      interfaceAnswer: '空圧出口：{ports}。電気：リード6本。選定仕様のエア入口、回路割当、電気定格をご確認ください。取付け：{mounting}。',
    }),
    ru: Object.freeze({
      fitAnswer: '{model} сочетает 3 пневматических канала и 6 электрических выводов. Подходящая среда: {media}. Для выбранного исполнения подтвердите вход воздуха, распределение цепей и электрические номиналы. Монтаж: {mounting}.',
      interfaceAnswer: 'Пневматические выходы: {ports}. Электрика: 6 выводов. Для выбранного исполнения подтвердите вход воздуха, распределение цепей и электрические номиналы. Монтаж: {mounting}.',
    }),
  }),
});

const MODEL_APPLICATION_COPY = Object.freeze({
  'BP-2P-130-0001': Object.freeze({
    en: Object.freeze({
      heading: 'Typical Equipment for BP-2P-130-0001 and Custom Hydraulic Variants',
      intro: 'BP-2P-130-0001 carries two fluid paths across a rotating interface. The standard page configuration is for compressed air; Begapunk also manufactures hydraulic versions with sealing selected for the hydraulic oil and operating conditions. The examples below show common equipment, the rotary-joint function in each machine, and the information needed for a useful recommendation and quotation.',
      cards: Object.freeze([
        Object.freeze([
          'CNC Indexing Tables and Rotary Clamping Fixtures',
          'Use the two passages to supply compressed air for clamp/release, fixture positioning, locating pins, or paired pneumatic actuators while the table or fixture rotates. The standard BP-2P-130-0001 configuration is a candidate for low-speed machines whose pressure, speed, G1/8 ports, six-hole mounting faces, and available installation space match the equipment.',
        ]),
        Object.freeze([
          'Welding Positioners and Heavy Rotary Fixtures',
          'Route compressed air to pneumatic clamps, stops, and fixture actuators on welding positioners, rotary welding tables, and assembly fixtures without twisting the supply hoses. Two passages can serve a paired clamp/release function or another two-function circuit after the port assignment is confirmed against the selected drawing; equipment requiring more functions should use a rotary joint with additional passages.',
        ]),
        Object.freeze([
          'Hydraulic Clamping and Indexing Equipment',
          'Begapunk can manufacture a custom hydraulic-oil configuration for hydraulic chucks, clamping fixtures, indexing tables, and slow rotary equipment. The sealing system is selected for the oil and operating conditions. Send the working and return pressure, flow rate, oil grade and temperature, rotation speed, duty cycle, port requirements, installation drawing, and quantity.',
        ]),
        Object.freeze([
          'Log Grapples, Forestry Grabs, and Excavator Rotary Attachments',
          'For log grapples, timber grabs, forestry rotators, and rotating excavator attachments, Begapunk can manufacture a two-passage hydraulic rotary joint for grapple open/close or another paired hydraulic function. Send maximum and return pressure, flow in both directions, oil specification, rotation speed, axial and radial loads, installation envelope, hose and port sizes, and quantity. Additional hydraulic functions require more passages.',
        ]),
      ]),
      inquiryTitle: 'Tell us about your machine',
      inquiryText: 'Send the equipment name, machine or attachment drawing, medium, working and return pressure, flow rate, rotation speed, duty cycle, passage count, external loads, available space, port threads, and quantity. Begapunk will recommend a standard pneumatic or custom hydraulic configuration and reply with a quotation and the available 2D or 3D files.',
      inquiryAction: 'Request a Custom Rotary Joint',
      requiredTerms: Object.freeze(['CNC Indexing Tables', 'Welding Positioners', 'Hydraulic Clamping', 'Log Grapples', 'Custom Hydraulic Variants']),
    }),
    de: Object.freeze({
      heading: 'Typische Maschinen für BP-2P-130-0001 und kundenspezifische Hydraulikausführungen',
      intro: 'BP-2P-130-0001 führt zwei Medienkanäle über eine drehende Schnittstelle. Die auf dieser Seite beschriebene Standardausführung ist für Druckluft vorgesehen; Begapunk fertigt außerdem Hydraulikausführungen mit auf Hydrauliköl und Betriebsbedingungen abgestimmter Dichtung. Die folgenden Beispiele nennen konkrete Maschinen, die Aufgabe der Drehdurchführung und die Angaben für eine belastbare Empfehlung und ein Angebot.',
      cards: Object.freeze([
        Object.freeze([
          'CNC-Rundschalttische und rotierende Spannvorrichtungen',
          'Die zwei Kanäle versorgen beim Drehen des Tisches oder der Vorrichtung Spann-/Lösefunktionen, Positionierelemente, Absteckbolzen oder zwei Pneumatikaktuatoren mit Druckluft. Die Standardausführung BP-2P-130-0001 kommt für langsam laufende Maschinen infrage, wenn Druck, Drehzahl, G1/8-Anschlüsse, die Montageflächen mit je sechs Bohrungen und der verfügbare Einbauraum passen.',
        ]),
        Object.freeze([
          'Schweißpositionierer und schwere Drehvorrichtungen',
          'Die Drehdurchführung führt Druckluft zu pneumatischen Spannern, Anschlägen und Vorrichtungsaktuatoren auf Schweißpositionierern, Drehtischen und Montagevorrichtungen, ohne dass sich Versorgungsschläuche verdrillen. Zwei Kanäle können eine gekoppelte Spann-/Lösefunktion oder eine andere Zweifunktionsschaltung versorgen, nachdem die Anschlussbelegung anhand der gewählten Zeichnung bestätigt wurde; für weitere Funktionen ist eine Ausführung mit mehr Kanälen erforderlich.',
        ]),
        Object.freeze([
          'Hydraulische Spann- und Indexiersysteme',
          'Begapunk kann eine kundenspezifische Hydraulikölausführung für hydraulische Spannfutter, Spannvorrichtungen, Rundschalttische und langsam laufende Drehmaschinen fertigen. Das Dichtungssystem wird auf Öl und Betriebsbedingungen abgestimmt. Senden Sie Arbeits- und Rücklaufdruck, Volumenstrom, Ölsorte und -temperatur, Drehzahl, Betriebszyklus, Anschlussanforderungen, Einbauzeichnung und Menge.',
        ]),
        Object.freeze([
          'Holzgreifer, Forstgreifer und rotierende Baggeranbaugeräte',
          'Für Holzgreifer, Stammgreifer, Forstrotatoren und rotierende Baggeranbaugeräte kann Begapunk eine hydraulische Zwei-Kanal-Drehdurchführung für Greifer öffnen/schließen oder eine andere gekoppelte Hydraulikfunktion fertigen. Benötigt werden Maximal- und Rücklaufdruck, Volumenstrom in beiden Richtungen, Ölspezifikation, Drehzahl, Axial- und Radiallasten, Einbauraum, Schlauch- und Anschlussgrößen sowie Menge. Zusätzliche Hydraulikfunktionen benötigen weitere Kanäle.',
        ]),
      ]),
      inquiryTitle: 'Beschreiben Sie uns Ihre Maschine',
      inquiryText: 'Senden Sie Maschinen- oder Anbaugerätetyp, Einbauzeichnung, Medium, Arbeits- und Rücklaufdruck, Volumenstrom, Drehzahl, Betriebszyklus, Kanalzahl, äußere Lasten, verfügbaren Bauraum, Anschlussgewinde und Menge. Begapunk empfiehlt eine pneumatische Standard- oder kundenspezifische Hydraulikausführung und antwortet mit Angebot sowie verfügbaren 2D- oder 3D-Dateien.',
      inquiryAction: 'Kundenspezifische Drehdurchführung anfragen',
      requiredTerms: Object.freeze(['CNC-Rundschalttische', 'Schweißpositionierer', 'Hydraulische Spann-', 'Holzgreifer', 'Hydraulikausführungen']),
    }),
    ja: Object.freeze({
      heading: 'BP-2P-130-0001と油圧カスタム仕様の主な搭載設備',
      intro: 'BP-2P-130-0001は、固定側と回転側の間で2つの流体経路を接続します。このページの標準仕様は圧縮空気用です。Begapunkでは、作動油と使用条件に合わせてシールを選定した油圧仕様も製作できます。以下では、具体的な搭載設備、各設備でのロータリージョイントの役割、選定・見積りに必要な情報をまとめています。',
      cards: Object.freeze([
        Object.freeze([
          'CNCインデックステーブル・回転クランプ治具',
          'テーブルや治具の回転中も、2流路からクランプ／アンクランプ、位置決め、ロケートピン、または2系統の空圧アクチュエータへ圧縮空気を供給できます。標準BP-2P-130-0001は、圧力、回転数、G1/8ポート、両面各6か所の取付穴、設置スペースが一致する低速設備の候補です。',
        ]),
        Object.freeze([
          '溶接ポジショナー・大型回転治具',
          '溶接ポジショナー、回転溶接テーブル、組立治具上の空圧クランプ、ストッパー、治具アクチュエータへ、供給ホースをねじらずに圧縮空気を送ります。2流路で1組のクランプ／アンクランプ機能、または別の2機能回路を構成できます。ポート割当は選定図面で確認してください。機能数が多い設備には、より多流路の型式を選定します。',
        ]),
        Object.freeze([
          '油圧クランプ・油圧インデックス装置',
          'Begapunkは、油圧チャック、油圧クランプ治具、インデックステーブル、低速回転装置向けに油圧カスタム仕様を製作できます。シールシステムは作動油と使用条件に合わせて選定します。作動圧力、戻り圧力、流量、油種・油温、回転数、デューティ、ポート要件、取付図、数量をお知らせください。',
        ]),
        Object.freeze([
          '木材グラップル・林業用グラブ・油圧ショベル旋回アタッチメント',
          '木材グラップル、林業用グラブ、フォレストリーローテータ、油圧ショベルの旋回アタッチメント向けに、Begapunkはグラップル開閉または一対の油圧機能を通す2流路油圧ロータリージョイントを製作できます。最高圧力と戻り圧力、双方向流量、作動油仕様、回転数、軸方向・径方向荷重、取付スペース、ホース・ポートサイズ、数量をご提示ください。追加の油圧機能には流路の追加が必要です。',
        ]),
      ]),
      inquiryTitle: '設備条件をお知らせください',
      inquiryText: '設備名、機械またはアタッチメントの取付図、流体、作動圧力と戻り圧力、流量、回転数、デューティ、必要流路数、外力、取付スペース、ポートねじ、数量をお送りください。Begapunkが標準空圧仕様または油圧カスタム仕様をご提案し、見積りと提供可能な2D／3Dデータをご案内します。',
      inquiryAction: 'カスタムロータリージョイントを相談',
      requiredTerms: Object.freeze(['CNCインデックステーブル', '溶接ポジショナー', '油圧クランプ', '木材グラップル', '油圧カスタム仕様']),
    }),
    ru: Object.freeze({
      heading: 'Типовое оборудование для BP-2P-130-0001 и заказных гидравлических исполнений',
      intro: 'BP-2P-130-0001 передаёт два канала через вращающийся интерфейс. Стандартное исполнение на этой странице предназначено для сжатого воздуха; Begapunk также изготавливает гидравлические исполнения с уплотнениями, подобранными под рабочее масло и режим эксплуатации. Ниже указаны конкретные виды оборудования, функция вращающегося соединения и данные, необходимые для содержательной рекомендации и расчёта цены.',
      cards: Object.freeze([
        Object.freeze([
          'Индексные столы ЧПУ и поворотные зажимные приспособления',
          'Два канала подают сжатый воздух на зажим/разжим, позиционирующие элементы, установочные штифты или два пневмопривода во время вращения стола либо приспособления. Стандартная BP-2P-130-0001 подходит для предварительного выбора низкооборотного оборудования, если совпадают давление, скорость, порты G1/8, монтажные поверхности с шестью отверстиями на каждой стороне и доступное пространство.',
        ]),
        Object.freeze([
          'Сварочные позиционеры и тяжёлые поворотные приспособления',
          'Вращающееся соединение подаёт сжатый воздух к пневмозажимам, упорам и приводам оснастки на сварочных позиционерах, поворотных сварочных столах и сборочных приспособлениях без перекручивания шлангов. Два канала обслуживают парную функцию зажима/разжима или другую двухфункциональную схему после подтверждения назначения портов по выбранному чертежу; для дополнительных функций требуется больше каналов.',
        ]),
        Object.freeze([
          'Гидравлические зажимные и индексирующие системы',
          'Begapunk может изготовить заказное исполнение для гидравлических патронов, зажимных приспособлений, индексных столов и тихоходного поворотного оборудования. Система уплотнений подбирается под масло и рабочие условия. Укажите рабочее и обратное давление, расход, марку и температуру масла, скорость, рабочий цикл, требования к портам, монтажный чертёж и количество.',
        ]),
        Object.freeze([
          'Лесные захваты, грейферы и поворотное навесное оборудование экскаваторов',
          'Для лесных захватов, грейферов, лесных ротаторов и поворотного навесного оборудования экскаваторов Begapunk может изготовить двухканальное гидравлическое вращающееся соединение для открытия/закрытия захвата или другой парной гидрофункции. Нужны максимальное и обратное давление, расход в обоих направлениях, спецификация масла, скорость, осевые и радиальные нагрузки, монтажный объём, размеры шлангов и портов, количество. Дополнительные гидрофункции требуют большего числа каналов.',
        ]),
      ]),
      inquiryTitle: 'Расскажите о вашем оборудовании',
      inquiryText: 'Отправьте тип машины или навесного оборудования, монтажный чертёж, среду, рабочее и обратное давление, расход, скорость, рабочий цикл, число каналов, внешние нагрузки, доступное пространство, резьбы портов и количество. Begapunk предложит стандартное пневматическое или заказное гидравлическое исполнение и ответит по цене и доступным 2D- или 3D-файлам.',
      inquiryAction: 'Запросить заказное вращающееся соединение',
      requiredTerms: Object.freeze(['Индексные столы ЧПУ', 'Сварочные позиционеры', 'Гидравлические зажимные', 'Лесные захваты', 'гидравлических исполнений']),
    }),
  }),
});

const OWNER_CONFIRMED_CUSTOM_HYDRAULIC_MODELS = new Set(['BP-2P-130-0001']);

const MODEL_APPLICATION_CONFIG = Object.freeze({
  'BP-1P-0003': Object.freeze({ mode: 'standard', cards: Object.freeze(['hoseReels', 'rotaryProcessStations', 'windingMachines', 'rotaryTestFixtures']) }),
  'BP-1P-0006': Object.freeze({ mode: 'distribution', cards: Object.freeze(['sharedIndexingTables', 'sharedPackagingCarousels', 'sharedAssemblyDials', 'sharedBlowOffManifolds']) }),
  'BP-2P-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['cncIndexingTables', 'weldingPositioners', 'packagingCarousels', 'hoseAntiTwist']) }),
  'BP-2P-0002': Object.freeze({ mode: 'standard', cards: Object.freeze(['assemblyDialTables', 'packagingCarousels', 'rotaryPickAndPlace', 'cappingHeads']) }),
  'BP-2P-08-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['laserRearChucks', 'pneumaticChucks', 'bottleCapGrippers', 'cncIndexingTables']) }),
  'BP-2P-16-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['bottleCapGrippers', 'cappingHeads', 'packagingCarousels', 'robotTooling']) }),
  'BP-2P-30-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['cncIndexingTables', 'packagingCarousels', 'weldingPositioners', 'customRotaryEquipment']) }),
  'BP-2P-50-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['heavyRotaryFixtures', 'weldingPositioners', 'cncIndexingTables', 'customRotaryEquipment']) }),
  'BP-2P-95-0005': Object.freeze({ mode: 'standard', cards: Object.freeze(['pneumaticChucks', 'laserRearChucks', 'cncIndexingTables', 'heavyRotaryFixtures']) }),
  'BP-3P-0004': Object.freeze({ mode: 'standard', cards: Object.freeze(['laserRearChucks', 'pneumaticChucks', 'cncIndexingTables', 'robotTooling']) }),
  'BP-3P-0006': Object.freeze({ mode: 'standard', cards: Object.freeze(['cncIndexingTables', 'weldingPositioners', 'rotaryTestFixtures', 'customRotaryEquipment']) }),
  'BP-3P-0007': Object.freeze({ mode: 'standard', cards: Object.freeze(['packagingCarousels', 'assemblyDialTables', 'rotaryPickAndPlace', 'cappingHeads']) }),
  'BP-3P-S06-0001': Object.freeze({ mode: 'hybrid', cards: Object.freeze(['hybridRobotTooling', 'hybridInspectionStations', 'hybridAssemblyTables', 'hybridPackagingMachines']) }),
  'BP-4P-30-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['robotTooling', 'cncIndexingTables', 'weldingPositioners', 'packagingCarousels']) }),
  'BP-8P-0001': Object.freeze({ mode: 'standard', cards: Object.freeze(['multiStationCarousels', 'rotaryTestFixtures', 'robotTooling', 'heavyRotaryFixtures']) }),
});

const APPLICATION_PANEL_COPY = Object.freeze({
  en: Object.freeze({
    modes: Object.freeze({
      standard: Object.freeze({
        heading: 'Typical Equipment for {model}',
        intro: '{model} provides {passages} across a rotating interface. Pressure / speed: {pressure} · {speed}; suitable media: {media}. Port arrangement: {ports}. Mounting: {mounting}. The examples below show where this passage arrangement is commonly useful and what must match before selection.',
        inquiryTitle: 'Send the machine conditions',
        inquiryText: 'Send the equipment name, machine or attachment drawing, function required from each passage, medium, working pressure, return pressure if applicable, flow rate, rotation speed, temperature, duty cycle, external loads, available space, port threads, mounting pattern, and quantity. Begapunk will recommend a standard model or custom configuration and reply with a quotation and the available 2D or 3D files.',
        inquiryAction: 'Request a Model Recommendation',
      }),
      distribution: Object.freeze({
        heading: 'Equipment Using the Shared Air Circuit of {model}',
        intro: '{model} uses one pneumatic passage with one inlet and eight outlets to distribute a shared air circuit to multiple points on a rotating assembly. Pressure / speed: {pressure} · {speed}. Port arrangement: {ports}. The outlets are part of the same circuit; independently controlled functions require rotating-side valves or additional passages.',
        inquiryTitle: 'Describe the outlet layout and simultaneous demand',
        inquiryText: 'Send the machine drawing, inlet supply, purpose and location of all eight outlets, whether the outlets operate simultaneously, total and peak flow, working pressure, rotation speed, temperature, duty cycle, valve arrangement, mounting space, and quantity. Begapunk will check whether a shared circuit is appropriate or whether the machine needs independently separated passages.',
        inquiryAction: 'Check the Air Distribution Layout',
      }),
      pending: Object.freeze({
        heading: 'Equipment Requests Begapunk Can Match for {model}',
        intro: '{model} is not ready for direct selection from the currently published values. The equipment categories below show common two-circuit rotary-joint requests that Begapunk can review. Send the actual machine conditions so we can match a verified standard model or prepare a custom quotation without relying on an unconfirmed interface or rating.',
        pendingCardText: 'This equipment category may need a rotary connection, but the current information is not sufficient to select {model}. Send the machine drawing, required circuit functions, medium, pressure, speed, mounting space, and quantity so Begapunk can match a verified standard model or quote a custom design.',
        inquiryTitle: 'Let us match the application',
        inquiryText: 'Send the equipment name, drawing, required circuit count and functions, medium, pressure, flow, speed, temperature, duty cycle, available space, preferred ports, mounting method, and quantity. Begapunk will reply with a suitable verified model or a custom-design proposal, quotation, and available technical files.',
        inquiryAction: 'Ask Begapunk to Match the Application',
      }),
      hybrid: Object.freeze({
        heading: 'Equipment Using Pneumatic Passages and Electrical Leads from {model}',
        intro: '{model} combines 3 pneumatic passages with 6 electrical leads. Pneumatic pressure / speed: {pressure} · {speed}; suitable medium: {media}. Port arrangement: {ports}. Confirm the air inlet, circuit allocation, and electrical ratings for the selected configuration.',
        inquiryTitle: 'Send both pneumatic and electrical requirements',
        inquiryText: 'Send the equipment drawing, pneumatic function for each passage, pressure, flow, speed, temperature and duty cycle, plus the voltage, current, signal type, circuit allocation, shielding or connector requirements, mounting space, cable routing, and quantity. Begapunk will check the combined interface and reply with a quotation and available technical files.',
        inquiryAction: 'Send Pneumatic and Electrical Requirements',
      }),
    }),
    cards: Object.freeze({
      hoseReels: Object.freeze(['Industrial Hose Reels, Coilers, and Service Drums', 'Carry one air, oil, or water circuit into a rotating hose reel, coiler, or service drum without winding the stationary supply line around the shaft. Match the fluid, temperature, pressure, speed, hose load, G3/8 inlet, M10×1.5 outlet, and available installation length.']),
      rotaryProcessStations: Object.freeze(['Rotary Filling, Rinsing, Dosing, and Leak-Test Stations', 'Feed one fluid circuit to an industrial rotary filling, rinsing, dosing, pressure-test, or leak-test fixture. State the exact air, oil, or water service, fluid temperature and cleanliness, required flow, pressure, rotational speed, and any material or regulatory requirements.']),
      windingMachines: Object.freeze(['Winding, Rewinding, and Rotary Tensioning Machines', 'Supply one pneumatic brake, tensioning actuator, lubrication point, or water service on a rotating winder or rewinder. Check hose routing, shaft support, start-stop duty, pressure spikes, speed, and whether a single circuit can perform the required machine function.']),
      rotaryTestFixtures: Object.freeze(['Rotary Pressure, Leak, and Functional Test Fixtures', 'Connect rotating test fixtures, endurance rigs, valve test stands, and indexing inspection stations without twisting the supply hoses. Define every test circuit, test medium, pressure range, flow, cycle frequency, rotation profile, leakage acceptance method, and fixture interface.']),
      sharedIndexingTables: Object.freeze(['Multi-Station Indexing Tables with a Shared Air Supply', 'Distribute one common compressed-air circuit to clamps, stops, blow-off points, or actuators around a rotating indexing table. The eight outlets share the same supply; use rotating-side valves when individual stations must be sequenced independently.']),
      sharedPackagingCarousels: Object.freeze(['Packaging Carousels with Multiple Shared Pneumatic Points', 'Feed a common air supply to several nozzles, ejectors, guides, or clamps on a packaging carousel. Calculate total and peak simultaneous flow, confirm the valve location, and check whether pressure drop across the eight outlets remains acceptable.']),
      sharedAssemblyDials: Object.freeze(['Assembly Dial Tables and Multi-Position Fixtures', 'Supply one shared air circuit to repeated fixture positions on assembly dial tables, rotary transfer machines, and inspection carousels. Confirm whether every station performs the same function; different independently timed functions need separate passages or rotating-side control valves.']),
      sharedBlowOffManifolds: Object.freeze(['Rotary Blow-Off, Purge, and Cleaning Manifolds', 'Distribute compressed air to multiple blow-off, purge, chip-clearing, or part-cleaning points on a rotating tool or table. Provide nozzle count, simultaneous demand, allowable pressure loss, contamination level, rotational speed, and the complete manifold drawing.']),
      cncIndexingTables: Object.freeze(['CNC Indexing Tables and Rotary Clamping Fixtures', 'Route independent circuits to clamp/release functions, locating pins, stops, or pneumatic actuators while a CNC indexing table or fixture rotates. Match the required function count, port assignment, pressure, speed, mounting pattern, center clearance, external loads, and hose routing.']),
      weldingPositioners: Object.freeze(['Welding Positioners and Rotary Welding Fixtures', 'Supply pneumatic clamps, stops, back-purge controls, or fixture actuators on welding positioners and rotary welding tables without twisting the hoses. Protect the joint from heat, spatter, dust, side load, and unsupported piping, and specify the actual combined duty.']),
      packagingCarousels: Object.freeze(['Packaging, Filling, Labeling, and Inspection Carousels', 'Transfer separate pneumatic functions to grippers, clamps, ejectors, stoppers, nozzles, or inspection fixtures on a rotating packaging carousel. List each function and its timing so the passage count and peak flow match the real machine cycle.']),
      hoseAntiTwist: Object.freeze(['Pneumatic Tools, Hose Reels, and Anti-Twist Rotary Connections', 'Prevent hose twisting on rotating pneumatic tools, manipulators, reels, and service fixtures while keeping separate supply and return or two independent air functions. Check hose torque, bending radius, supported load, speed, and the available installation envelope.']),
      assemblyDialTables: Object.freeze(['Automated Assembly Dial Tables', 'Feed clamps, locating pins, ejectors, part-present actuators, or test fixtures on an automated rotary dial table. Define which functions operate at each station and whether passages are independent, shared through rotating-side valves, or required simultaneously.']),
      rotaryPickAndPlace: Object.freeze(['Rotary Pick-and-Place Units and Transfer Arms', 'Supply gripper open/close, vacuum control, blow-off, or positioning functions on rotary transfer arms and pick-and-place units. Confirm that the selected passage count covers the required functions and provide acceleration, external load, hose routing, and cycle data.']),
      cappingHeads: Object.freeze(['Rotary Capping, Tightening, and Closing Heads', 'Route pneumatic grip/release and auxiliary functions to bottle-capping heads, closure tightening stations, and rotating assembly heads. Send the cap or part size range, required gripping sequence, torque-generation method, speed, duty cycle, and washdown or chemical exposure.']),
      laserRearChucks: Object.freeze(['Laser Tube Cutting Rear Chucks and Support Chucks', 'Transfer compressed-air circuits for clamp/release, jaw actuation, centering, or auxiliary chuck functions on laser tube cutting machines. Match the actual circuit count, port assignment, pressure, rotational speed, bore and mounting clearance, hose routing, and chuck service environment.']),
      pneumaticChucks: Object.freeze(['Pneumatic Chucks, Collet Fixtures, and Rotary Workholding', 'Supply clamp/release or multiple jaw-control functions to pneumatic chucks, collet fixtures, expanding mandrels, and rotary workholding systems. Define fail-safe behavior, function sequence, pressure, speed, mounting interface, part load, and required passage isolation.']),
      bottleCapGrippers: Object.freeze(['Bottle-Cap Grippers and Closure Handling Fixtures', 'Feed independent grip/release circuits to pneumatic three-jaw grippers and cap-handling fixtures on filling and capping machinery. Provide cap dimensions, gripping force requirement, machine speed, cycle timing, port assignment, installation drawing, and cleaning environment.']),
      robotTooling: Object.freeze(['Robot End-of-Arm Tooling and Rotary Grippers', 'Carry pneumatic functions to rotating robot grippers, tooling plates, indexable end effectors, and automatic tool fixtures. Assign every passage to a function and provide wrist motion, acceleration, radial and axial loads, hose routing, payload, ports, and mounting constraints.']),
      heavyRotaryFixtures: Object.freeze(['Heavy Rotary Fixtures, Positioners, and Large Clamping Tables', 'Supply clamps, supports, stops, or other pneumatic functions on large low-speed rotary fixtures and positioners. Provide the full installation drawing, external axial and radial loads, center clearance, pressure, speed, duty cycle, piping support, and required service access.']),
      customRotaryEquipment: Object.freeze(['Custom Machine Fixtures and Purpose-Built Rotary Equipment', 'For a machine that does not fit a standard category, send the complete rotating-interface drawing and a function list for every circuit. Begapunk can review passage count, ports, mounting, envelope, materials, sealing, speed, pressure, service environment, documentation, and quantity as one custom requirement.']),
      hybridRobotTooling: Object.freeze(['Robot Tooling with Pneumatic Actuation and Electrical Feedback', 'Combine air passages for gripper or clamp actuation with electrical leads for sensors, switches, or tool identification on rotating robot tooling. Define every pneumatic function and every electrical circuit; do not assume voltage, current, signal protocol, or shielding from the lead count alone.']),
      hybridInspectionStations: Object.freeze(['Rotary Inspection, Vision, and Sensor Stations', 'Use pneumatic passages for part clamping, ejecting, or air purge while electrical leads serve defined sensors or inspection circuits on a rotating station. Send the I/O list, voltage, current, signal type, grounding, shielding, connector, air-flow, and cycle requirements.']),
      hybridAssemblyTables: Object.freeze(['Automated Assembly Tables with Air and Electrical Circuits', 'Connect pneumatic fixtures and defined electrical devices across a rotating assembly dial or index table. Provide the station sequence, simultaneous pneumatic demand, complete circuit schedule, cable-flex requirements, mounting drawing, speed, duty cycle, and maintenance access.']),
      hybridPackagingMachines: Object.freeze(['Packaging, Capping, and Labeling Heads with Sensors', 'Carry pneumatic grip, release, blow-off, or actuator circuits together with defined sensor or switch wiring on rotating packaging heads. State the machine washdown environment, electrical ratings, signal allocation, cycle rate, air demand, connector strategy, and required passage count.']),
      multiStationCarousels: Object.freeze(['Multi-Station Assembly, Packaging, and Inspection Carousels', 'Use multiple independent passages for station-specific clamps, ejectors, blow-off, test, reject, or handling functions on a rotating carousel. Submit a circuit schedule showing each passage, simultaneous demand, station timing, required isolation, pressure, flow, and service access.']),
    }),
  }),
  de: Object.freeze({
    modes: Object.freeze({
      standard: Object.freeze({
        heading: 'Typische Maschinen für {model}',
        intro: '{model} führt {passages} über eine drehende Schnittstelle. Druck / Drehzahl: {pressure} · {speed}; geeignete Medien: {media}. Anschlussanordnung: {ports}. Montage: {mounting}. Die folgenden Beispiele zeigen typische Einsatzmaschinen und die Punkte, die vor der Auswahl übereinstimmen müssen.',
        inquiryTitle: 'Senden Sie die Maschinendaten',
        inquiryText: 'Senden Sie Maschinen- oder Anbaugerätetyp, Zeichnung, Funktion jedes Kanals, Medium, Arbeitsdruck, gegebenenfalls Rücklaufdruck, Volumenstrom, Drehzahl, Temperatur, Betriebszyklus, äußere Lasten, verfügbaren Bauraum, Anschlussgewinde, Lochbild und Menge. Begapunk empfiehlt ein Standardmodell oder eine kundenspezifische Ausführung und antwortet mit Angebot sowie verfügbaren 2D- oder 3D-Dateien.',
        inquiryAction: 'Modellempfehlung anfragen',
      }),
      distribution: Object.freeze({
        heading: 'Maschinen mit dem gemeinsamen Luftkreis von {model}',
        intro: '{model} verteilt einen gemeinsamen Druckluftkreis über einen Eingang und acht Ausgänge auf mehrere Stellen einer rotierenden Baugruppe. Druck / Drehzahl: {pressure} · {speed}. Anschlussanordnung: {ports}. Die Ausgänge gehören zum selben Kreis; unabhängig gesteuerte Funktionen benötigen Ventile auf der rotierenden Seite oder zusätzliche Kanäle.',
        inquiryTitle: 'Ausgangsanordnung und gleichzeitigen Bedarf beschreiben',
        inquiryText: 'Senden Sie Maschinenzeichnung, Eingangsdruckluft, Aufgabe und Position aller acht Ausgänge, Gleichzeitigkeit der Verbraucher, Gesamt- und Spitzenvolumenstrom, Arbeitsdruck, Drehzahl, Temperatur, Betriebszyklus, Ventilanordnung, Bauraum und Menge. Begapunk prüft, ob ein gemeinsamer Kreis ausreicht oder getrennte Kanäle erforderlich sind.',
        inquiryAction: 'Luftverteilung prüfen lassen',
      }),
      pending: Object.freeze({
        heading: 'Maschinenanfragen, die Begapunk für {model} zuordnen kann',
        intro: '{model} kann anhand der derzeit veröffentlichten Werte nicht direkt ausgewählt werden. Die folgenden Kategorien zeigen typische Anfragen für eine Zweikanal-Drehverbindung, die Begapunk prüfen kann. Senden Sie die realen Maschinendaten; wir ordnen ein bestätigtes Standardmodell zu oder erstellen ein kundenspezifisches Angebot, ohne eine unbestätigte Schnittstelle oder Belastungsgrenze zu übernehmen.',
        pendingCardText: 'Für diese Maschinenkategorie kann eine Drehverbindung erforderlich sein, die vorhandenen Angaben reichen jedoch nicht zur Auswahl von {model}. Senden Sie Maschinenzeichnung, Kreisfunktionen, Medium, Druck, Drehzahl, Bauraum und Menge, damit Begapunk ein bestätigtes Standardmodell zuordnet oder eine Sonderausführung anbietet.',
        inquiryTitle: 'Anwendung zuordnen lassen',
        inquiryText: 'Senden Sie Maschinentyp, Zeichnung, benötigte Kreiszahl und Funktionen, Medium, Druck, Volumenstrom, Drehzahl, Temperatur, Betriebszyklus, Bauraum, bevorzugte Anschlüsse, Montageart und Menge. Begapunk antwortet mit einem geeigneten bestätigten Modell oder einem Sondervorschlag, Angebot und verfügbaren technischen Dateien.',
        inquiryAction: 'Anwendung von Begapunk zuordnen lassen',
      }),
      hybrid: Object.freeze({
        heading: 'Maschinen mit Pneumatikkanälen und elektrischen Leitungen von {model}',
        intro: '{model} kombiniert 3 Pneumatikkanäle mit 6 elektrischen Leitungen. Pneumatikdruck / Drehzahl: {pressure} · {speed}; geeignetes Medium: {media}. Anschlussanordnung: {ports}. Lufteinlass, Kreiszuordnung und elektrische Nennwerte für die gewählte Ausführung bestätigen.',
        inquiryTitle: 'Pneumatische und elektrische Anforderungen senden',
        inquiryText: 'Senden Sie Anlagenzeichnung, Pneumatikfunktion jedes Kanals, Druck, Volumenstrom, Drehzahl, Temperatur und Betriebszyklus sowie Spannung, Strom, Signalart, Kreisbelegung, Schirmungs- oder Steckeranforderungen, Bauraum, Kabelführung und Menge. Begapunk prüft die kombinierte Schnittstelle und antwortet mit Angebot und verfügbaren technischen Dateien.',
        inquiryAction: 'Pneumatik-Elektro-Prüfung anfragen',
      }),
    }),
    cards: Object.freeze({
      hoseReels: Object.freeze(['Industrieschlauchtrommeln, Wickler und Versorgungstrommeln', 'Einen Luft-, Öl- oder Wasserkreis in eine rotierende Schlauchtrommel, einen Wickler oder eine Versorgungstrommel führen, ohne die stationäre Zuleitung um die Welle zu wickeln. Medium, Temperatur, Druck, Drehzahl, Schlauchlast, G3/8-Eingang, M10×1,5-Ausgang und Einbaulänge abgleichen.']),
      rotaryProcessStations: Object.freeze(['Rotierende Füll-, Spül-, Dosier- und Dichtheitsprüfstationen', 'Einen Medienkreis zu industriellen Füll-, Spül-, Dosier-, Druckprüf- oder Dichtheitsprüfvorrichtungen führen. Genaue Verwendung von Luft, Öl oder Wasser, Medientemperatur und -reinheit, Volumenstrom, Druck, Drehzahl sowie Werkstoff- oder Vorschriftenanforderungen angeben.']),
      windingMachines: Object.freeze(['Wickel-, Umwickel- und rotierende Spannmaschinen', 'Eine pneumatische Bremse, einen Spannaktor, eine Schmierstelle oder eine Wasserversorgung an einem rotierenden Wickler speisen. Schlauchführung, Wellenabstützung, Start-Stopp-Betrieb, Druckspitzen, Drehzahl und Eignung eines einzelnen Kreises prüfen.']),
      rotaryTestFixtures: Object.freeze(['Rotierende Druck-, Dichtheits- und Funktionsprüfvorrichtungen', 'Rotierende Prüfvorrichtungen, Dauerlaufstände, Ventilprüfstände und indexierende Inspektionsstationen anschließen, ohne Schläuche zu verdrillen. Jeden Prüfkreis, Medium, Druckbereich, Volumenstrom, Zyklus, Drehprofil, Leckagebewertung und die Vorrichtungsschnittstelle angeben.']),
      sharedIndexingTables: Object.freeze(['Mehrstationen-Rundschalttische mit gemeinsamer Luftversorgung', 'Einen gemeinsamen Druckluftkreis auf Spanner, Anschläge, Abblasstellen oder Aktoren eines Rundschalttisches verteilen. Die acht Ausgänge teilen sich eine Versorgung; für unabhängig getaktete Stationen Ventile auf der rotierenden Seite einsetzen.']),
      sharedPackagingCarousels: Object.freeze(['Verpackungskarussells mit mehreren gemeinsamen Pneumatikstellen', 'Eine gemeinsame Luftversorgung zu Düsen, Auswerfern, Führungen oder Spannern eines Verpackungskarussells führen. Gesamt- und Spitzengleichzeitigkeit berechnen, Ventilposition festlegen und zulässigen Druckabfall über die acht Ausgänge prüfen.']),
      sharedAssemblyDials: Object.freeze(['Montage-Rundtakttische und Mehrfachspannvorrichtungen', 'Einen gemeinsamen Luftkreis an wiederholte Vorrichtungspositionen von Rundtakttischen, Transfermaschinen und Prüfkarussells liefern. Prüfen, ob alle Stationen dieselbe Funktion ausführen; unterschiedlich getaktete Funktionen benötigen getrennte Kanäle oder rotierende Ventile.']),
      sharedBlowOffManifolds: Object.freeze(['Rotierende Abblas-, Spül- und Reinigungsverteiler', 'Druckluft auf mehrere Abblas-, Spül-, Spanentfernungs- oder Reinigungsstellen eines rotierenden Werkzeugs oder Tisches verteilen. Düsenanzahl, Gleichzeitigkeit, zulässigen Druckverlust, Verschmutzung, Drehzahl und vollständige Verteilerzeichnung angeben.']),
      cncIndexingTables: Object.freeze(['CNC-Rundschalttische und rotierende Spannvorrichtungen', 'Getrennte Kreise zu Spann-/Lösefunktionen, Absteckbolzen, Anschlägen oder Pneumatikaktoren eines drehenden CNC-Rundschalttisches führen. Funktionszahl, Anschlussbelegung, Druck, Drehzahl, Lochbild, Mittelfreiraum, äußere Lasten und Schlauchführung abgleichen.']),
      weldingPositioners: Object.freeze(['Schweißpositionierer und rotierende Schweißvorrichtungen', 'Pneumatikspanner, Anschläge, Formiergassteuerungen oder Vorrichtungsaktoren auf Schweißpositionierern und Drehtischen versorgen. Drehdurchführung vor Hitze, Spritzern, Staub, Seitenlast und unabgestützter Verrohrung schützen und den kombinierten Betrieb angeben.']),
      packagingCarousels: Object.freeze(['Verpackungs-, Füll-, Etikettier- und Prüfkarussells', 'Getrennte Pneumatikfunktionen zu Greifern, Spannern, Auswerfern, Stoppern, Düsen oder Prüfaufnahmen eines Verpackungskarussells übertragen. Jede Funktion und deren Takt angeben, damit Kanalzahl und Spitzenvolumenstrom zum realen Maschinenzyklus passen.']),
      hoseAntiTwist: Object.freeze(['Pneumatikwerkzeuge, Schlauchtrommeln und verdrehsichere Drehanschlüsse', 'Schlauchverdrehung an rotierenden Pneumatikwerkzeugen, Manipulatoren, Trommeln und Servicevorrichtungen vermeiden und dabei Vor-/Rücklauf oder zwei Luftfunktionen trennen. Schlauchmoment, Biegeradius, abgestützte Last, Drehzahl und Bauraum prüfen.']),
      assemblyDialTables: Object.freeze(['Automatisierte Montage-Rundtakttische', 'Spanner, Absteckbolzen, Auswerfer, Anwesenheitsaktoren oder Prüfvorrichtungen eines automatisierten Rundtakttisches versorgen. Festlegen, welche Funktionen je Station arbeiten und ob Kanäle getrennt, über rotierende Ventile geteilt oder gleichzeitig benötigt werden.']),
      rotaryPickAndPlace: Object.freeze(['Rotierende Pick-and-Place-Einheiten und Transferarme', 'Greifer öffnen/schließen, Vakuumsteuerung, Abblasen oder Positionierfunktionen an Transferarmen und Pick-and-Place-Einheiten versorgen. Prüfen, ob die Kanalzahl alle Funktionen abdeckt, und Beschleunigung, Lasten, Schlauchführung und Zyklusdaten angeben.']),
      cappingHeads: Object.freeze(['Rotierende Verschließ-, Schraub- und Montageköpfe', 'Pneumatische Greif-/Löse- und Hilfsfunktionen zu Flaschenverschließern, Schraubstationen und rotierenden Montageköpfen führen. Größenbereich, Greifablauf, Drehmomenterzeugung, Drehzahl, Betriebszyklus sowie Reinigungs- oder Chemikalienkontakt angeben.']),
      laserRearChucks: Object.freeze(['Hintere Spannfutter und Stützspannfutter für Laser-Rohrschneidmaschinen', 'Druckluftkreise für Spannen/Lösen, Backenbetätigung, Zentrierung oder Hilfsfunktionen von Laser-Rohrschneidmaschinen übertragen. Kreiszahl, Anschlussbelegung, Druck, Drehzahl, Bohrungs- und Montagefreiraum, Schlauchführung und Einsatzumgebung abgleichen.']),
      pneumaticChucks: Object.freeze(['Pneumatische Spannfutter, Spannzangen und rotierende Werkstückspannung', 'Spann-/Löse- oder mehrere Backenfunktionen von Pneumatikspannfuttern, Spannzangen, Spanndornen und rotierenden Werkstückaufnahmen versorgen. Ausfallsicheres Verhalten, Ablauf, Druck, Drehzahl, Schnittstelle, Werkstücklast und Kanaltrennung festlegen.']),
      bottleCapGrippers: Object.freeze(['Flaschenverschlussgreifer und Verschlusshandhabung', 'Getrennte Greif-/Lösekreise zu pneumatischen 3-Finger-Greifern und Verschlussaufnahmen an Füll- und Verschließmaschinen führen. Verschlussmaße, Greifkraft, Maschinendrehzahl, Takt, Anschlussbelegung, Einbauzeichnung und Reinigungsumgebung angeben.']),
      robotTooling: Object.freeze(['Roboter-Endwerkzeuge und rotierende Greifer', 'Pneumatikfunktionen zu rotierenden Robotergreifern, Werkzeugplatten, indexierbaren Endeffektoren und automatischen Werkzeugaufnahmen führen. Jeden Kanal zuordnen und Handgelenkbewegung, Beschleunigung, Axial-/Radiallasten, Schlauchführung, Nutzlast, Anschlüsse und Montage angeben.']),
      heavyRotaryFixtures: Object.freeze(['Schwere Drehvorrichtungen, Positionierer und große Spanntische', 'Spanner, Stützen, Anschläge oder andere Pneumatikfunktionen an großen, langsam laufenden Drehvorrichtungen versorgen. Einbauzeichnung, Axial-/Radiallasten, Mittelfreiraum, Druck, Drehzahl, Betriebszyklus, Rohrabstützung und Wartungszugang angeben.']),
      customRotaryEquipment: Object.freeze(['Sondermaschinen und kundenspezifische Drehvorrichtungen', 'Für Maschinen außerhalb der Standardkategorien die vollständige Dreh-Schnittstellenzeichnung und Funktionsliste jedes Kreises senden. Begapunk prüft Kanalzahl, Anschlüsse, Montage, Bauraum, Werkstoffe, Dichtung, Drehzahl, Druck, Umgebung, Dokumentation und Menge gemeinsam.']),
      hybridRobotTooling: Object.freeze(['Roboterwerkzeuge mit Pneumatikbetätigung und elektrischer Rückmeldung', 'Luftkanäle für Greifer oder Spanner mit elektrischen Leitungen für Sensoren, Schalter oder Werkzeugidentifikation kombinieren. Jede Pneumatikfunktion und jeden Stromkreis definieren; Spannung, Strom, Signalprotokoll und Schirmung nicht aus der Leitungszahl ableiten.']),
      hybridInspectionStations: Object.freeze(['Rotierende Prüf-, Bildverarbeitungs- und Sensorstationen', 'Pneumatikkanäle zum Spannen, Auswerfen oder Abblasen und elektrische Leitungen für definierte Sensor- oder Prüfkreise nutzen. E/A-Liste, Spannung, Strom, Signalart, Erdung, Schirmung, Steckverbinder, Luftbedarf und Zyklus angeben.']),
      hybridAssemblyTables: Object.freeze(['Automatisierte Montagetische mit Luft- und Stromkreisen', 'Pneumatikvorrichtungen und definierte elektrische Geräte über einen Rundtakt- oder Indexiertisch verbinden. Stationsablauf, gleichzeitigen Luftbedarf, Stromkreisliste, Kabelbewegung, Montagezeichnung, Drehzahl, Betriebszyklus und Wartungszugang angeben.']),
      hybridPackagingMachines: Object.freeze(['Verpackungs-, Verschließ- und Etikettierköpfe mit Sensoren', 'Pneumatische Greif-, Löse-, Abblas- oder Aktorfunktionen zusammen mit definierter Sensor- oder Schalterverdrahtung übertragen. Reinigungsumgebung, elektrische Nennwerte, Signalbelegung, Takt, Luftbedarf, Steckerkonzept und Kanalzahl angeben.']),
      multiStationCarousels: Object.freeze(['Mehrstationen-Montage-, Verpackungs- und Prüfkarussells', 'Mehrere getrennte Kanäle für stationsbezogene Spann-, Auswerf-, Abblas-, Prüf-, Ausschleus- oder Handhabungsfunktionen verwenden. Einen Kreisplan mit Kanal, Gleichzeitigkeit, Stationstakt, Trennanforderung, Druck, Volumenstrom und Wartungszugang senden.']),
    }),
  }),
  ja: Object.freeze({
    modes: Object.freeze({
      standard: Object.freeze({
        heading: '{model}の主な搭載設備',
        intro: '{model}は、固定側と回転側の間で{passages}を接続します。圧力／回転数：{pressure}・{speed}、適用流体：{media}。ポート構成：{ports}。取付：{mounting}。以下では、この流路構成が使われる代表的な設備と、選定前に一致させる条件を示します。',
        inquiryTitle: '設備条件をお知らせください',
        inquiryText: '設備名、機械またはアタッチメント図面、各流路の機能、流体、作動圧力、必要に応じた戻り圧力、流量、回転数、温度、デューティ、外力、取付スペース、ポートねじ、取付穴、数量をお送りください。Begapunkが標準型式またはカスタム仕様をご提案し、見積りと提供可能な2D／3Dデータをご案内します。',
        inquiryAction: '型式選定を相談',
      }),
      distribution: Object.freeze({
        heading: '{model}の共通エア回路を使用する設備',
        intro: '{model}は、1つの入口と8つの出口により、回転部の複数箇所へ1系統の共通エア回路を分配します。圧力／回転数：{pressure}・{speed}。ポート構成：{ports}。8つの出口は同一回路です。個別制御が必要な機能には、回転側バルブまたは独立流路の追加が必要です。',
        inquiryTitle: '出口配置と同時使用量をお知らせください',
        inquiryText: '設備図面、入口エア条件、8つの出口の用途と位置、同時動作の有無、総流量・ピーク流量、作動圧力、回転数、温度、デューティ、バルブ配置、取付スペース、数量をお送りください。共通回路で対応できるか、独立流路が必要かをBegapunkが確認します。',
        inquiryAction: 'エア分配構成を確認',
      }),
      pending: Object.freeze({
        heading: '{model}についてBegapunkが選定できる設備用途',
        intro: '{model}は、現在公開されている数値だけでは直接選定できません。以下は、2回路ロータリー接続としてBegapunkが検討できる代表的な設備用途です。実際の設備条件をご提示いただければ、未確認の取合いや定格を流用せず、確認済み標準型式またはカスタム見積りをご案内します。',
        pendingCardText: 'この設備では回転接続が必要になる場合がありますが、現時点の情報だけでは{model}を選定できません。設備図面、必要回路、流体、圧力、回転数、取付スペース、数量をご提示ください。Begapunkが確認済み標準型式またはカスタム仕様を選定します。',
        inquiryTitle: '用途に合う型式を選定します',
        inquiryText: '設備名、図面、必要回路数と機能、流体、圧力、流量、回転数、温度、デューティ、取付スペース、希望ポート、取付方法、数量をお送りください。Begapunkが適合する確認済み型式またはカスタム案、見積り、提供可能な技術データをご案内します。',
        inquiryAction: 'Begapunkに用途選定を依頼',
      }),
      hybrid: Object.freeze({
        heading: '{model}の空圧流路と電気リードを使用する設備',
        intro: '{model}は、空圧3流路と電気リード6本を組み合わせた仕様です。空圧の圧力／回転数：{pressure}・{speed}、適用流体：{media}。ポート構成：{ports}。選定仕様のエア入口、回路割当、電気定格をご確認ください。',
        inquiryTitle: '空圧条件と電気条件の両方をお送りください',
        inquiryText: '設備図面、各空圧流路の機能、圧力、流量、回転数、温度、デューティに加え、電圧、電流、信号種類、回路割当、シールド・コネクタ要件、取付スペース、ケーブル経路、数量をお送りください。Begapunkが複合インターフェースを確認し、見積りと技術データをご案内します。',
        inquiryAction: '空圧・電気複合仕様を相談',
      }),
    }),
    cards: Object.freeze({
      hoseReels: Object.freeze(['産業用ホースリール・巻取り機・回転サービスドラム', '固定側の供給配管を軸に巻き付けず、回転するホースリール、巻取り機、サービスドラムへ空気・油・水の1回路を送ります。流体、温度、圧力、回転数、ホース荷重、G3/8入口、M10×1.5出口、取付長さを確認してください。']),
      rotaryProcessStations: Object.freeze(['回転式充填・洗浄・定量供給・リーク試験装置', '産業用の回転充填、洗浄、定量供給、耐圧試験、リーク試験治具へ1つの流体回路を供給します。空気・油・水の用途、流体温度と清浄度、流量、圧力、回転数、材質・法規要件を明示してください。']),
      windingMachines: Object.freeze(['巻取り・巻戻し・回転テンション装置', '回転する巻取り機へ、空圧ブレーキ、テンションアクチュエータ、潤滑点、または水回路を供給します。ホース経路、軸支持、起動停止頻度、圧力変動、回転数、1回路で必要機能を満たせるかを確認してください。']),
      rotaryTestFixtures: Object.freeze(['回転式耐圧・リーク・機能試験治具', 'ホースをねじらずに、回転試験治具、耐久試験機、バルブ試験台、インデックス式検査ステーションへ接続します。各試験回路、流体、圧力範囲、流量、サイクル、回転条件、漏れ判定方法、治具取合いを提示してください。']),
      sharedIndexingTables: Object.freeze(['共通エア供給を使用する多工程インデックステーブル', '1系統の圧縮空気を、回転インデックステーブル上のクランプ、ストッパー、エアブロー、アクチュエータへ分配します。8つの出口は共通供給のため、工程ごとの個別制御には回転側バルブを使用します。']),
      sharedPackagingCarousels: Object.freeze(['複数の共通空圧点を持つ包装カルーセル', '包装カルーセル上の複数ノズル、エジェクタ、ガイド、クランプへ共通エアを供給します。総流量とピーク同時流量、バルブ位置を計算し、8出口での圧力低下が許容範囲か確認してください。']),
      sharedAssemblyDials: Object.freeze(['組立用ロータリーテーブル・多位置治具', '組立ロータリーテーブル、回転搬送機、検査カルーセルの各治具位置へ1系統の共通エアを供給します。全工程が同じ機能か確認し、異なるタイミングの機能には独立流路または回転側バルブを使用します。']),
      sharedBlowOffManifolds: Object.freeze(['回転式エアブロー・パージ・清掃マニホールド', '回転工具やテーブル上の複数のエアブロー、パージ、切粉除去、部品清掃点へ圧縮空気を分配します。ノズル数、同時使用量、許容圧力低下、汚染条件、回転数、マニホールド図面をご提示ください。']),
      cncIndexingTables: Object.freeze(['CNCインデックステーブル・回転クランプ治具', '回転中のCNCインデックステーブルや治具へ、クランプ／アンクランプ、位置決めピン、ストッパー、空圧アクチュエータ用の独立回路を送ります。機能数、ポート割当、圧力、回転数、取付穴、中央クリアランス、外力、ホース経路を確認してください。']),
      weldingPositioners: Object.freeze(['溶接ポジショナー・回転溶接治具', 'ホースをねじらずに、溶接ポジショナーや回転溶接テーブル上の空圧クランプ、ストッパー、バックパージ制御、治具アクチュエータへ供給します。熱、スパッタ、粉じん、横荷重、配管荷重から保護し、複合運転条件を提示してください。']),
      packagingCarousels: Object.freeze(['包装・充填・ラベリング・検査カルーセル', '回転包装カルーセル上のグリッパ、クランプ、エジェクタ、ストッパー、ノズル、検査治具へ独立した空圧機能を送ります。各機能と動作タイミングを明示し、流路数とピーク流量を実機サイクルに合わせてください。']),
      hoseAntiTwist: Object.freeze(['空圧工具・ホースリール・ねじれ防止回転接続', '回転空圧工具、マニピュレータ、リール、サービス治具でホースのねじれを防ぎ、供給／戻りまたは2つの空圧機能を分離します。ホーストルク、曲げ半径、支持荷重、回転数、取付スペースを確認してください。']),
      assemblyDialTables: Object.freeze(['自動組立ロータリーテーブル', '自動ロータリーテーブル上のクランプ、位置決めピン、エジェクタ、部品検出アクチュエータ、試験治具へ供給します。各工程の機能と、独立流路・回転側バルブによる共用・同時動作の必要性を定義してください。']),
      rotaryPickAndPlace: Object.freeze(['回転ピック＆プレース装置・搬送アーム', '回転搬送アームやピック＆プレース装置へ、グリッパ開閉、真空制御、エアブロー、位置決め機能を供給します。必要機能を流路数で満たせるか確認し、加速度、外力、ホース経路、サイクル条件をご提示ください。']),
      cappingHeads: Object.freeze(['回転式キャッピング・締付け・組立ヘッド', 'ボトルキャッピングヘッド、クロージャ締付け装置、回転組立ヘッドへ、空圧の把持／開放と補助機能を送ります。キャップ・部品寸法、把持手順、トルク発生方法、回転数、デューティ、洗浄・薬品接触条件をご提示ください。']),
      laserRearChucks: Object.freeze(['レーザー管切断機の後方チャック・サポートチャック', 'レーザー管切断機のチャックへ、クランプ／アンクランプ、爪駆動、芯出し、補助機能用の圧縮空気回路を送ります。回路数、ポート割当、圧力、回転数、中空・取付クリアランス、ホース経路、使用環境を確認してください。']),
      pneumaticChucks: Object.freeze(['空圧チャック・コレット治具・回転ワーク保持装置', '空圧チャック、コレット治具、拡張マンドレル、回転ワーク保持装置へ、クランプ／アンクランプまたは複数の爪制御機能を供給します。フェールセーフ動作、順序、圧力、回転数、取合い、ワーク荷重、流路分離を定義してください。']),
      bottleCapGrippers: Object.freeze(['ボトルキャップ用グリッパ・クロージャ搬送治具', '充填・キャッピング機の空圧3爪グリッパやキャップ搬送治具へ、独立した把持／開放回路を供給します。キャップ寸法、必要把持力、機械回転数、動作タイミング、ポート割当、取付図、洗浄環境をご提示ください。']),
      robotTooling: Object.freeze(['ロボット用エンドツール・回転グリッパ', '回転ロボットグリッパ、ツールプレート、インデックス式エンドエフェクタ、自動工具治具へ空圧機能を送ります。各流路の機能、手首動作、加速度、軸・径方向荷重、ホース経路、可搬質量、ポート、取付制約をご提示ください。']),
      heavyRotaryFixtures: Object.freeze(['大型回転治具・ポジショナー・大型クランプテーブル', '大型低速回転治具やポジショナー上のクランプ、支持、ストッパーなどへ空圧機能を供給します。取付図、軸・径方向荷重、中央クリアランス、圧力、回転数、デューティ、配管支持、保守スペースをご提示ください。']),
      customRotaryEquipment: Object.freeze(['専用機・特注回転設備', '標準分類に当てはまらない設備では、回転取合い図と全回路の機能一覧をお送りください。Begapunkが流路数、ポート、取付、外形、材質、シール、回転数、圧力、環境、必要資料、数量を一体で検討します。']),
      hybridRobotTooling: Object.freeze(['空圧駆動・電気フィードバック付きロボットツール', '回転ロボットツールで、グリッパ・クランプ用空圧流路とセンサ、スイッチ、工具識別用電気リードを組み合わせます。全空圧機能と全電気回路を定義し、リード本数だけから電圧、電流、信号方式、シールドを判断しないでください。']),
      hybridInspectionStations: Object.freeze(['回転検査・画像処理・センサステーション', '回転検査装置で、空圧流路をクランプ、排出、エアパージに使用し、電気リードを定義済みセンサ・検査回路に使用します。I/O一覧、電圧、電流、信号、接地、シールド、コネクタ、空気流量、サイクルをご提示ください。']),
      hybridAssemblyTables: Object.freeze(['空圧・電気回路を備えた自動組立テーブル', '回転組立・インデックステーブルを介して、空圧治具と定義済み電気機器を接続します。工程順序、同時空気需要、回路表、ケーブル可動条件、取付図、回転数、デューティ、保守スペースをご提示ください。']),
      hybridPackagingMachines: Object.freeze(['センサ付き包装・キャッピング・ラベリングヘッド', '回転包装ヘッドで、空圧把持、開放、エアブロー、アクチュエータ回路と定義済みセンサ・スイッチ配線を通します。洗浄環境、電気定格、信号割当、サイクル、空気需要、コネクタ、必要流路数をご提示ください。']),
      multiStationCarousels: Object.freeze(['多工程組立・包装・検査カルーセル', '回転カルーセル上の工程別クランプ、排出、エアブロー、試験、不良排出、搬送機能に複数の独立流路を使用します。各流路、同時使用量、工程タイミング、分離要件、圧力、流量、保守スペースを示す回路表をご提示ください。']),
    }),
  }),
  ru: Object.freeze({
    modes: Object.freeze({
      standard: Object.freeze({
        heading: 'Типовое оборудование для {model}',
        intro: '{model} передаёт {passages} через вращающийся интерфейс. Давление / скорость: {pressure} · {speed}; подходящие среды: {media}. Схема портов: {ports}. Монтаж: {mounting}. Ниже приведены типовые машины для такой схемы каналов и условия, которые необходимо сопоставить перед выбором.',
        inquiryTitle: 'Отправьте параметры машины',
        inquiryText: 'Отправьте тип машины или навесного оборудования, чертёж, функцию каждого канала, среду, рабочее и при необходимости обратное давление, расход, скорость, температуру, рабочий цикл, внешние нагрузки, доступное пространство, резьбы портов, схему крепления и количество. Begapunk предложит стандартную или заказную конфигурацию и ответит по цене и доступным 2D- или 3D-файлам.',
        inquiryAction: 'Запросить рекомендацию модели',
      }),
      distribution: Object.freeze({
        heading: 'Оборудование с общим воздушным контуром {model}',
        intro: '{model} распределяет один общий пневматический контур от одного входа к восьми выходам на вращающемся узле. Давление / скорость: {pressure} · {speed}. Схема портов: {ports}. Выходы относятся к одному контуру; для независимого управления нужны клапаны на вращающейся стороне или дополнительные каналы.',
        inquiryTitle: 'Опишите расположение выходов и одновременный расход',
        inquiryText: 'Отправьте чертёж машины, параметры входного воздуха, назначение и расположение всех восьми выходов, одновременность работы, общий и пиковый расход, рабочее давление, скорость, температуру, цикл, схему клапанов, монтажный объём и количество. Begapunk проверит, подходит ли общий контур или нужны раздельные каналы.',
        inquiryAction: 'Проверить схему распределения воздуха',
      }),
      pending: Object.freeze({
        heading: 'Запросы по оборудованию, которые Begapunk может подобрать для {model}',
        intro: '{model} нельзя напрямую выбрать по опубликованным сейчас значениям. Ниже показаны типовые запросы на двухконтурное вращающееся соединение, которые Begapunk может рассмотреть. Отправьте реальные условия машины; мы подберём подтверждённую стандартную модель или подготовим заказное предложение без переноса неподтверждённых интерфейсов или пределов.',
        pendingCardText: 'Для этого оборудования может потребоваться вращающееся соединение, но имеющихся данных недостаточно для выбора {model}. Отправьте чертёж машины, функции контуров, среду, давление, скорость, монтажное пространство и количество, чтобы Begapunk подобрал подтверждённую стандартную модель или заказную конструкцию.',
        inquiryTitle: 'Подберём соединение под применение',
        inquiryText: 'Отправьте тип оборудования, чертёж, необходимое число и функции контуров, среду, давление, расход, скорость, температуру, цикл, монтажное пространство, предпочтительные порты, способ крепления и количество. Begapunk ответит подходящей подтверждённой моделью или заказным предложением, ценой и доступными техническими файлами.',
        inquiryAction: 'Попросить Begapunk подобрать применение',
      }),
      hybrid: Object.freeze({
        heading: 'Оборудование с пневмоканалами и электрическими выводами {model}',
        intro: '{model} сочетает 3 пневматических канала и 6 электрических выводов. Давление / скорость пневматической части: {pressure} · {speed}; подходящая среда: {media}. Схема портов: {ports}. Для выбранного исполнения подтвердите вход воздуха, распределение цепей и электрические номиналы.',
        inquiryTitle: 'Отправьте пневматические и электрические требования',
        inquiryText: 'Отправьте чертёж оборудования, функцию каждого пневмоканала, давление, расход, скорость, температуру и цикл, а также напряжение, ток, тип сигнала, распределение цепей, требования к экранированию или разъёмам, монтажное пространство, прокладку кабеля и количество. Begapunk проверит комбинированный интерфейс и ответит по цене и техническим файлам.',
        inquiryAction: 'Запросить проверку пневмоэлектрической части',
      }),
    }),
    cards: Object.freeze({
      hoseReels: Object.freeze(['Промышленные шланговые барабаны, намотчики и сервисные катушки', 'Передавайте один контур воздуха, масла или воды во вращающийся шланговый барабан, намотчик или сервисную катушку без наматывания неподвижной линии на вал. Сопоставьте среду, температуру, давление, скорость, нагрузку шланга, вход G3/8, выход M10×1,5 и монтажную длину.']),
      rotaryProcessStations: Object.freeze(['Ротационные станции наполнения, промывки, дозирования и проверки герметичности', 'Подавайте один контур среды к промышленным ротационным устройствам наполнения, промывки, дозирования, опрессовки или проверки утечек. Укажите точное применение воздуха, масла или воды, температуру и чистоту среды, расход, давление, скорость, требования к материалам и нормам.']),
      windingMachines: Object.freeze(['Намоточные, перемоточные и ротационные натяжные машины', 'Подавайте среду к пневматическому тормозу, натяжному приводу, точке смазки или водяному контуру вращающегося намотчика. Проверьте прокладку шланга, опору вала, пуски и остановы, скачки давления, скорость и достаточность одного контура.']),
      rotaryTestFixtures: Object.freeze(['Ротационные стенды давления, герметичности и функциональных испытаний', 'Подключайте вращающиеся испытательные приспособления, ресурсные стенды, стенды клапанов и индексные контрольные станции без перекручивания шлангов. Укажите каждый контур, среду, диапазон давления, расход, цикл, профиль вращения, метод оценки утечки и интерфейс оснастки.']),
      sharedIndexingTables: Object.freeze(['Многопозиционные индексные столы с общим воздухом', 'Распределяйте один общий контур сжатого воздуха к зажимам, упорам, точкам обдува или приводам вращающегося индексного стола. Восемь выходов используют одну подачу; для независимой последовательности станций нужны клапаны на вращающейся стороне.']),
      sharedPackagingCarousels: Object.freeze(['Упаковочные карусели с несколькими общими пневмоточками', 'Подавайте общий воздух к нескольким соплам, выталкивателям, направляющим или зажимам упаковочной карусели. Рассчитайте общий и пиковый одновременный расход, определите место клапанов и проверьте допустимость падения давления на восьми выходах.']),
      sharedAssemblyDials: Object.freeze(['Сборочные поворотные столы и многопозиционная оснастка', 'Подавайте один общий воздушный контур к повторяющимся позициям оснастки сборочных столов, ротационных трансферных машин и контрольных каруселей. Проверьте одинаковость функций; раздельно синхронизируемым операциям нужны отдельные каналы или вращающиеся клапаны.']),
      sharedBlowOffManifolds: Object.freeze(['Вращающиеся коллекторы обдува, продувки и очистки', 'Распределяйте сжатый воздух по нескольким точкам обдува, продувки, удаления стружки или очистки детали на вращающемся инструменте или столе. Укажите число сопел, одновременный расход, допустимую потерю давления, загрязнение, скорость и чертёж коллектора.']),
      cncIndexingTables: Object.freeze(['Индексные столы ЧПУ и поворотные зажимные приспособления', 'Подавайте независимые контуры к зажиму/разжиму, установочным штифтам, упорам или пневмоприводам вращающегося индексного стола. Сопоставьте число функций, назначение портов, давление, скорость, крепление, центральный зазор, внешние нагрузки и прокладку шлангов.']),
      weldingPositioners: Object.freeze(['Сварочные позиционеры и поворотные сварочные приспособления', 'Подавайте воздух к пневмозажимам, упорам, управлению поддувом или приводам оснастки на сварочных позиционерах без перекручивания шлангов. Защитите соединение от нагрева, брызг, пыли, боковой нагрузки и неподдерживаемых труб и укажите совмещённый режим.']),
      packagingCarousels: Object.freeze(['Карусели упаковки, розлива, этикетирования и контроля', 'Передавайте раздельные пневмофункции к захватам, зажимам, выталкивателям, стопорам, соплам или контрольной оснастке вращающейся карусели. Укажите каждую функцию и её время, чтобы число каналов и пиковый расход соответствовали циклу машины.']),
      hoseAntiTwist: Object.freeze(['Пневмоинструмент, шланговые барабаны и соединения против перекручивания', 'Предотвращайте перекручивание шлангов на вращающемся пневмоинструменте, манипуляторах, барабанах и сервисной оснастке, сохраняя подачу/возврат или две функции. Проверьте момент шланга, радиус изгиба, опору нагрузки, скорость и монтажный объём.']),
      assemblyDialTables: Object.freeze(['Автоматические сборочные поворотные столы', 'Подавайте воздух к зажимам, установочным штифтам, выталкивателям, приводам контроля детали или испытательной оснастке автоматического стола. Определите функции каждой станции и необходимость независимых, общих через вращающиеся клапаны или одновременных каналов.']),
      rotaryPickAndPlace: Object.freeze(['Ротационные устройства pick-and-place и перегрузочные рычаги', 'Подавайте воздух на открытие/закрытие захвата, управление вакуумом, обдув или позиционирование перегрузочных рычагов. Проверьте достаточность каналов и укажите ускорение, внешние нагрузки, прокладку шлангов и цикл.']),
      cappingHeads: Object.freeze(['Ротационные укупорочные, затяжные и сборочные головки', 'Передавайте пневмофункции захвата/освобождения и вспомогательные операции к укупорочным, затяжным и сборочным головкам. Укажите диапазон крышек или деталей, последовательность захвата, способ создания момента, скорость, цикл, мойку и воздействие химии.']),
      laserRearChucks: Object.freeze(['Задние и поддерживающие патроны станков лазерной резки труб', 'Передавайте контуры сжатого воздуха для зажима/разжима, привода кулачков, центрирования или вспомогательных функций патрона. Сопоставьте число контуров, порты, давление, скорость, проходной и монтажный зазор, шланги и среду эксплуатации.']),
      pneumaticChucks: Object.freeze(['Пневматические патроны, цанговая оснастка и вращающееся крепление деталей', 'Подавайте воздух на зажим/разжим или несколько функций кулачков пневмопатронов, цанг, разжимных оправок и вращающейся оснастки. Определите безопасное состояние, последовательность, давление, скорость, интерфейс, нагрузку детали и изоляцию каналов.']),
      bottleCapGrippers: Object.freeze(['Захваты бутылочных крышек и оснастка для работы с укупоркой', 'Подавайте раздельные контуры захвата/освобождения к трёхкулачковым пневмозахватам и оснастке крышек на линиях розлива и укупорки. Укажите размеры крышек, усилие, скорость машины, время цикла, назначение портов, монтажный чертёж и условия мойки.']),
      robotTooling: Object.freeze(['Концевая оснастка роботов и вращающиеся захваты', 'Передавайте пневмофункции к вращающимся роботизированным захватам, инструментальным плитам, индексируемым эффекторам и автоматической оснастке. Назначьте каждый канал и укажите движение запястья, ускорение, осевые/радиальные нагрузки, шланги, полезную нагрузку, порты и крепление.']),
      heavyRotaryFixtures: Object.freeze(['Тяжёлая вращающаяся оснастка, позиционеры и большие зажимные столы', 'Подавайте воздух к зажимам, опорам, упорам и другим функциям крупных тихоходных приспособлений. Отправьте монтажный чертёж, осевые/радиальные нагрузки, центральный зазор, давление, скорость, цикл, опору труб и доступ для обслуживания.']),
      customRotaryEquipment: Object.freeze(['Специальные станочные приспособления и заказное вращающееся оборудование', 'Для нестандартной машины отправьте полный чертёж вращающегося интерфейса и перечень функций каждого контура. Begapunk совместно рассмотрит число каналов, порты, крепление, габариты, материалы, уплотнение, скорость, давление, среду эксплуатации, документацию и количество.']),
      hybridRobotTooling: Object.freeze(['Роботизированная оснастка с пневмоприводом и электрической обратной связью', 'Совмещайте воздушные каналы захватов или зажимов с электрическими выводами датчиков, переключателей или идентификации инструмента. Определите каждую пневмофункцию и цепь; не выводите напряжение, ток, протокол или экранирование только из числа проводов.']),
      hybridInspectionStations: Object.freeze(['Вращающиеся станции контроля, машинного зрения и датчиков', 'Используйте пневмоканалы для зажима, выталкивания или продувки, а электрические выводы — для заданных датчиков или контрольных цепей. Отправьте список I/O, напряжение, ток, сигнал, заземление, экранирование, разъёмы, расход воздуха и цикл.']),
      hybridAssemblyTables: Object.freeze(['Автоматические сборочные столы с воздушными и электрическими цепями', 'Соединяйте пневматическую оснастку и заданные электрические устройства через сборочный поворотный стол. Укажите последовательность станций, одновременный расход воздуха, схему цепей, подвижность кабеля, монтажный чертёж, скорость, цикл и обслуживание.']),
      hybridPackagingMachines: Object.freeze(['Упаковочные, укупорочные и этикетировочные головки с датчиками', 'Передавайте пневмоцепи захвата, освобождения, обдува или приводов вместе с заданной проводкой датчиков и переключателей. Укажите условия мойки, электрические номиналы, назначение сигналов, цикл, расход воздуха, разъёмы и число каналов.']),
      multiStationCarousels: Object.freeze(['Многопозиционные сборочные, упаковочные и контрольные карусели', 'Используйте независимые каналы для станционных зажимов, выталкивателей, обдува, испытаний, отбраковки и перемещения на вращающейся карусели. Отправьте таблицу каналов, одновременный расход, время станций, изоляцию, давление, расход и доступ обслуживания.']),
    }),
  }),
});

if (Object.keys(MODEL_APPLICATION_CONFIG).length + Object.keys(MODEL_APPLICATION_COPY).length !== 16) {
  throw new Error('Equipment-application copy must cover all 16 product models.');
}

const ENGINEERING_PENDING_MODELS = new Set();
const ELECTRICAL_LEADS_MODEL = 'BP-3P-S06-0001';
const EXPECTED_APPLICATION_EVIDENCE = Object.freeze({
  'BP-2P-08-0001': [
    'verified-application:laser-rear-chuck',
    'confirmed-application-fit:bottle-capping-three-jaw-gripper',
  ],
  'BP-2P-130-0001': ['verified-application:cnc-circular-saw-fixture'],
  'BP-2P-16-0001': ['verified-application:bottle-capping-three-jaw-gripper'],
  'BP-3P-0004': ['verified-application:laser-rear-chuck'],
});
const CUSTOMER_APPLICATION_COPY = Object.freeze({
  en: Object.freeze({
    laserTitle: 'Application: Laser Tube Cutting Rear Chuck',
    laserText: ({ model, passages }) => `${model} has ${passages} independent passages and is used for the rear chuck's compressed-air circuits on laser tube cutting machines. Check passage assignment, pressure, speed, mounting dimensions, and hose routing against the chuck drawing and operating conditions. The case photographs show this application type; select the ordered model from the machine requirements.`,
    laserCaseLink: 'View the application case →',
    laserGuideLink: 'Read the application guide →',
    bottleTitle: 'Application: Pneumatic Three-Jaw Bottle-Cap Gripper',
    bottleText: 'BP-2P-08-0001 is another two-passage option for pneumatic three-jaw bottle-cap grippers. Compare its mounting dimensions and operating limits with BP-2P-16-0001 before selection. The linked production example uses BP-2P-16-0001.',
    bottleLink: 'Compare the application and models →',
  }),
  de: Object.freeze({
    laserTitle: 'Anwendung: Hinteres Spannfutter einer Laser-Rohrschneidmaschine',
    laserText: ({ model, passages }) => `${model} verfügt über ${passages} getrennte Kanäle und wird für die Druckluftkreise hinterer Spannfutter an Laser-Rohrschneidmaschinen eingesetzt. Gleichen Sie Kanalbelegung, Druck, Drehzahl, Einbaumaße und Schlauchführung mit Spannfutterzeichnung und Betriebsbedingungen ab. Die Fotos im Fallbeispiel zeigen diesen Anwendungstyp; wählen Sie die Bestellausführung anhand der Maschinenanforderungen.`,
    laserCaseLink: 'Anwendungsfall ansehen →',
    laserGuideLink: 'Anwendungsleitfaden lesen →',
    bottleTitle: 'Anwendung: pneumatischer 3-Finger-Zentrischgreifer für Flaschenverschlüsse',
    bottleText: 'BP-2P-08-0001 ist eine weitere Zweikanal-Option für pneumatische 3-Finger-Zentrischgreifer von Flaschenverschlüssen. Vergleichen Sie vor der Auswahl Einbaumaße und Betriebsgrenzen mit BP-2P-16-0001. Im verlinkten Produktionsbeispiel wird BP-2P-16-0001 eingesetzt.',
    bottleLink: 'Anwendung und Modelle vergleichen →',
  }),
  ja: Object.freeze({
    laserTitle: '用途：レーザー管切断機の後方チャック',
    laserText: ({ model, passages }) => `${model}は独立した${passages}流路を備え、レーザー管切断機の後方チャック空圧回路に使用されています。流路割当て、圧力、回転数、取付寸法、配管経路をチャック図面と使用条件に照らして確認してください。事例写真はこの用途の組込み例です。発注型式は装置要件に基づいて選定してください。`,
    laserCaseLink: '用途事例を見る →',
    laserGuideLink: '用途ガイドを読む →',
    bottleTitle: '用途：ボトルキャップ用3爪エアチャック',
    bottleText: 'BP-2P-08-0001は、ボトルキャップ用3爪エアチャックに対応する別の2流路仕様です。選定前に、取付寸法と使用限界をBP-2P-16-0001と比較してください。リンク先の量産事例ではBP-2P-16-0001を使用しています。',
    bottleLink: '用途と型式を比較 →',
  }),
  ru: Object.freeze({
    laserTitle: 'Применение: задний патрон станка лазерной резки труб',
    laserText: ({ model, passages }) => `${model} имеет ${passages} независимых канала и применяется в пневматических контурах задних патронов станков лазерной резки труб. Сопоставьте назначение каналов, давление, частоту вращения, монтажные размеры и прокладку шлангов с чертежом патрона и условиями работы. Фотографии показывают такой тип установки; заказную модель выбирают по требованиям станка.`,
    laserCaseLink: 'Посмотреть пример применения →',
    laserGuideLink: 'Открыть руководство по применению →',
    bottleTitle: 'Применение: трёхкулачковый пневматический захват для крышек',
    bottleText: 'BP-2P-08-0001 — ещё один двухканальный вариант для трёхкулачковых пневматических захватов крышек. Перед выбором сравните его монтажные размеры и рабочие пределы с BP-2P-16-0001. В связанном производственном примере используется BP-2P-16-0001.',
    bottleLink: 'Сравнить применение и модели →',
  }),
});
const VISIBLE_DRAWING_FIELD_ORDER = [
  'pressure', 'speed', 'body', 'seal', 'media', 'temperature', 'weight',
  'dimensions', 'bore', 'mount', 'ports',
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function drawingDocumentValue(product) {
  const date = product.drawing.date ? ` · ${product.drawing.date}` : '';
  return `${product.drawing.documentControlNumber}${date}`;
}

function productFacts(model, product, locale, ui = drawingBackedUiContract(locale, model)) {
  const copy = COPY[locale];
  const pending = product.status === 'identity-pending' || ENGINEERING_PENDING_MODELS.has(model);
  if (pending) {
    return {
      pending: true,
      status: copy.statusPending,
      warranty: copy.warranty,
    };
  }
  return {
    pending: false,
    status: copy.statusVerified,
    document: drawingDocumentValue(product),
    pressure: ui.fields.pressure,
    speed: ui.fields.speed,
    media: ui.fields.media,
    body: ui.fields.body,
    seal: ui.fields.seal,
    ports: ui.fields.ports,
    mounting: ui.fields.mount,
    envelope: ui.fields.dimensions,
    // A missing bore field is not evidence that the product has no through bore.
    // Keep it absent unless the reviewed UI contract explicitly publishes it.
    bore: ui.requiredJsonFields.includes('bore') ? ui.fields.bore : null,
    temperature: ui.fields.temperature,
    weight: ui.fields.weight,
    electrical: ui.hybridInterfacePropertyName ? ui.keyValues.channels : null,
    warranty: copy.warranty,
  };
}

function specRows(model, product, locale, ui = drawingBackedUiContract(locale, model)) {
  const copy = COPY[locale];
  const facts = productFacts(model, product, locale, ui);
  const rows = [
    { name: copy.labels.model, value: model, field: null },
  ];
  if (!facts.pending) {
    if (ui.hybridInterfacePropertyName) {
      rows.push({ name: ui.hybridInterfacePropertyName, value: ui.keyValues.channels, field: null });
    }
    const visibleFields = VISIBLE_DRAWING_FIELD_ORDER.filter((field) => ui.requiredJsonFields.includes(field));
    for (const field of visibleFields) {
      rows.push({ name: ui.jsonPropertyNames[field], value: ui.fields[field], field });
    }
  }
  rows.push({ name: copy.labels.warranty, value: facts.warranty, field: null });
  return rows;
}

function identityContract(model, locale) {
  const metadata = drawingBackedProductMetadata(locale, model);
  if (!metadata) throw new Error(`${model}/${locale}: compact drawing-backed metadata contract is missing`);
  return {
    linkLabel: metadata.linkLabel,
    h1: metadata.h1,
    breadcrumb: metadata.breadcrumb,
    description: metadata.description,
    title: metadata.title,
    openGraphTitle: metadata.openGraphTitle,
    openGraphDescription: metadata.openGraphDescription,
    twitterTitle: metadata.twitterTitle,
    twitterDescription: metadata.twitterDescription,
    imageAlt: metadata.imageAlt,
    openGraphImageAlt: metadata.openGraphImageAlt,
    twitterImageAlt: metadata.twitterImageAlt,
  };
}

function renderRows(rows) {
  return rows.map(({ name, value, field }) => `     <tr${field ? ` data-drawing-fact="${escapeHtml(field)}"` : ''}><th>${escapeHtml(name)}</th><td>${escapeHtml(value)}</td></tr>`).join('\n');
}

function renderFaqItem(question, answer, open = false) {
  return `   <details class="faq-item"${open ? ' open' : ''}>
    <summary class="faq-question">${escapeHtml(question)} <span class="icon notranslate" translate="no" aria-hidden="true"></span></summary>
    <div class="faq-answer"><p>${escapeHtml(answer)}</p></div>
   </details>`;
}

function interpolateFaq(template, values, label) {
  return template.replace(/\{([A-Za-z]+)\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`${label}: missing FAQ value ${key}`);
    return String(values[key]);
  });
}

function localizedPassagePhrase(locale, count) {
  // The model identity supports a passage count, but not an assumption that
  // every passage is independent. Independence must come from an explicit
  // model-specific fact, never from a missing drawing field.
  if (locale === 'en') return `${count}-passage configuration`;
  if (locale === 'de') return `${count}-Kanal-Ausführung`;
  if (locale === 'ja') return `${count}流路仕様`;
  if (count === 1) return 'исполнение с 1 каналом';
  return `исполнение с ${count} каналами`;
}

function interpolateApplicationCopy(template, values, label) {
  return template.replace(/\{([A-Za-z]+)\}/g, (_, key) => {
    if (!(key in values) || values[key] === null || values[key] === undefined) {
      throw new Error(`${label}: missing equipment-application value ${key}`);
    }
    return String(values[key]);
  });
}

function applicationCopyForModel(model, locale, facts) {
  const approvedOverride = MODEL_APPLICATION_COPY[model]?.[locale] ?? null;
  if (approvedOverride) return approvedOverride;

  const config = MODEL_APPLICATION_CONFIG[model] ?? null;
  if (!config) return null;
  const localeCopy = APPLICATION_PANEL_COPY[locale];
  const modeCopy = localeCopy?.modes?.[config.mode];
  if (!localeCopy || !modeCopy) throw new Error(`${model}/${locale}: equipment-application mode is missing`);

  const passageMatch = model.match(/^BP-(\d+)P-/);
  if (!passageMatch) throw new Error(`${model}/${locale}: passage count is not encoded in the model`);
  const values = {
    model,
    passages: localizedPassagePhrase(locale, Number(passageMatch[1])),
    pressure: facts.pressure ?? '',
    speed: facts.speed ?? '',
    media: facts.media ?? '',
    ports: facts.ports ?? '',
    mounting: facts.mounting ?? '',
    electrical: facts.electrical ?? '',
  };
  const render = (template, surface) => interpolateApplicationCopy(template, values, `${model}/${locale}: ${surface}`);
  const cards = config.cards.map((key) => {
    const card = localeCopy.cards?.[key];
    if (!card) throw new Error(`${model}/${locale}: equipment-application card is missing: ${key}`);
    const title = render(card[0], `${key} title`);
    const textTemplate = config.mode === 'pending' ? modeCopy.pendingCardText : card[1];
    return Object.freeze([title, render(textTemplate, `${key} text`)]);
  });

  return Object.freeze({
    heading: render(modeCopy.heading, 'heading'),
    intro: render(modeCopy.intro, 'intro'),
    cards: Object.freeze(cards),
    inquiryTitle: render(modeCopy.inquiryTitle, 'inquiry title'),
    inquiryText: render(modeCopy.inquiryText, 'inquiry text'),
    inquiryAction: render(modeCopy.inquiryAction, 'inquiry action'),
    requiredTerms: Object.freeze(cards.map(([title]) => title)),
  });
}

function productFaq(model, facts, locale) {
  const copy = FAQ_COPY[locale];
  if (!copy) throw new Error(`${model}/${locale}: FAQ copy is missing`);
  const label = `${model}/${locale}`;
  const interpolate = (template, values = {}) => interpolateFaq(template, { model, ...values }, label);
  if (facts.pending) {
    return {
      heading: interpolate(copy.heading),
      items: copy.pendingItems.map(([question, answer]) => [interpolate(question), interpolate(answer)]),
    };
  }

  const passageMatch = model.match(/^BP-(\d+)P-/);
  if (!passageMatch) throw new Error(`${label}: passage count is not encoded in the model`);
  const values = {
    passages: localizedPassagePhrase(locale, Number(passageMatch[1])),
    pressure: facts.pressure,
    speed: facts.speed,
    media: facts.media,
    body: facts.body,
    seal: facts.seal,
    ports: facts.ports,
    mounting: facts.mounting,
    bore: facts.bore,
    electrical: facts.electrical ?? '',
  };
  const hybrid = model === ELECTRICAL_LEADS_MODEL;
  const special = SPECIAL_FAQ_COPY[model]?.[locale] ?? {};
  const fitTemplate = special.fitAnswer
    ?? (hybrid ? copy.hybridFitAnswer : (facts.bore ? copy.fitAnswerWithBore : copy.fitAnswer));
  const interfaceQuestionTemplate = hybrid
    ? copy.hybridInterfaceQuestion
    : (facts.bore ? copy.interfaceQuestionWithBore : copy.interfaceQuestion);
  const interfaceAnswerTemplate = special.interfaceAnswer
    ?? (hybrid ? copy.hybridInterfaceAnswer : (facts.bore ? copy.interfaceAnswerWithBore : copy.interfaceAnswer));
  return {
    heading: interpolate(copy.heading),
    items: [
      [interpolate(copy.fitQuestion), interpolate(fitTemplate, values)],
      [interpolate(copy.limitsQuestion), interpolate(copy.limitsAnswer, values)],
      [interpolate(special.materialsQuestion ?? copy.materialsQuestion), interpolate(special.materialsAnswer ?? copy.materialsAnswer, values)],
      [
        interpolate(interfaceQuestionTemplate),
        interpolate(interfaceAnswerTemplate, values),
      ],
      [interpolate(copy.quoteQuestion), interpolate(hybrid ? copy.hybridQuoteAnswer : copy.quoteAnswer, values)],
    ],
  };
}

function productPaths(model) {
  return Object.entries(LOCALES).map(([locale, config]) => ({
    locale,
    relativePath: config.dir ? path.join(config.dir, `${model}.html`) : `${model}.html`,
  }));
}

const RELATED_MODELS_BY_MODEL = Object.freeze({
  'BP-1P-0003': Object.freeze(['BP-1P-0006', 'BP-2P-0001', 'BP-2P-0002']),
  'BP-1P-0006': Object.freeze(['BP-1P-0003', 'BP-2P-0001', 'BP-2P-0002']),
  'BP-2P-0001': Object.freeze(['BP-2P-0002', 'BP-2P-08-0001', 'BP-2P-130-0001']),
  'BP-2P-0002': Object.freeze(['BP-2P-0001', 'BP-2P-08-0001', 'BP-2P-16-0001']),
  'BP-2P-08-0001': Object.freeze(['BP-2P-16-0001', 'BP-2P-0001', 'BP-2P-0002']),
  'BP-2P-130-0001': Object.freeze(['BP-2P-95-0005', 'BP-2P-50-0001', 'BP-2P-0001']),
  'BP-2P-16-0001': Object.freeze(['BP-2P-08-0001', 'BP-2P-30-0001', 'BP-2P-0001']),
  'BP-2P-30-0001': Object.freeze(['BP-2P-16-0001', 'BP-2P-50-0001', 'BP-4P-30-0001']),
  'BP-2P-50-0001': Object.freeze(['BP-2P-30-0001', 'BP-2P-130-0001', 'BP-4P-30-0001']),
  'BP-2P-95-0005': Object.freeze(['BP-2P-130-0001', 'BP-2P-50-0001', 'BP-2P-0001']),
  'BP-3P-0004': Object.freeze(['BP-3P-0007', 'BP-3P-0006', 'BP-3P-S06-0001']),
  'BP-3P-0006': Object.freeze(['BP-3P-0004', 'BP-3P-0007', 'BP-3P-S06-0001']),
  'BP-3P-0007': Object.freeze(['BP-3P-0004', 'BP-3P-0006', 'BP-3P-S06-0001']),
  'BP-3P-S06-0001': Object.freeze(['BP-3P-0004', 'BP-3P-0007', 'BP-2P-16-0001']),
  'BP-4P-30-0001': Object.freeze(['BP-2P-30-0001', 'BP-3P-0004', 'BP-8P-0001']),
  'BP-8P-0001': Object.freeze(['BP-4P-30-0001', 'BP-3P-0007', 'BP-3P-S06-0001']),
});

function relatedModels(model, orderedModels, products) {
  const related = RELATED_MODELS_BY_MODEL[model];
  if (!related || related.length !== 3 || new Set(related).size !== 3) {
    throw new Error(`${model}: related-model contract must contain three unique models.`);
  }
  for (const candidate of related) {
    if (candidate === model || !orderedModels.includes(candidate) || products[candidate]?.status === 'identity-pending') {
      throw new Error(`${model}: invalid related model ${candidate}.`);
    }
  }
  return related;
}

const RELATED_FACT_COPY = Object.freeze({
  en: ({ pressure, speed, bore, envelope }) => `Maximum pressure: ${pressure}; maximum speed: ${speed}. ${bore ? `Through bore: ${bore}.` : `Listed envelope: ${envelope}.`}`,
  de: ({ pressure, speed, bore, envelope }) => `Maximaldruck: ${pressure}; maximale Drehzahl: ${speed}. ${bore ? `Durchgangsbohrung: ${bore}.` : `Angegebene Außenabmessungen: ${envelope}.`}`,
  ja: ({ pressure, speed, bore, envelope }) => `最高使用圧力：${pressure}。最高回転数：${speed}。${bore ? `貫通穴：${bore}。` : `記載外形：${envelope}。`}`,
  ru: ({ pressure, speed, bore, envelope }) => `Максимальное давление: ${pressure}; максимальная частота вращения: ${speed}. ${bore ? `Сквозное отверстие: ${bore}.` : `Указанные габариты: ${envelope}.`}`,
});

const SPECIAL_RELATED_MODEL_COPY = Object.freeze({
  'BP-1P-0003': Object.freeze({
    en: (facts) => `Three suitable media are listed on this model page. Maximum pressure: ${facts.pressure}; maximum speed: ${facts.speed}.`,
    de: (facts) => `Auf dieser Modellseite sind drei geeignete Medien angegeben. Maximaldruck: ${facts.pressure}; maximale Drehzahl: ${facts.speed}.`,
    ja: (facts) => `この型式ページには3種類の適用流体が記載されています。最高使用圧力：${facts.pressure}。最高回転数：${facts.speed}。`,
    ru: (facts) => `На странице этой модели указаны три подходящие среды. Максимальное давление: ${facts.pressure}; максимальная частота вращения: ${facts.speed}.`,
  }),
  'BP-1P-0006': Object.freeze({
    en: (facts) => `One shared air circuit with 1 inlet and 8 outlets; this is not an eight-passage configuration. ${facts.pressure} maximum pressure · ${facts.speed} maximum speed.`,
    de: (facts) => `Ein gemeinsamer Druckluftkreis mit 1 Eingang und 8 Ausgängen; dies ist keine 8-Kanal-Ausführung. Maximaldruck ${facts.pressure} · maximale Drehzahl ${facts.speed}.`,
    ja: (facts) => `1つの共通エア回路を1入口から8出口へ分配する仕様で、8流路仕様ではありません。最高使用圧力${facts.pressure}・最高回転数${facts.speed}。`,
    ru: (facts) => `Один общий пневматический контур с 1 входом и 8 выходами; это не восьмиканальное исполнение. Максимальное давление ${facts.pressure} · максимальная частота вращения ${facts.speed}.`,
  }),
  'BP-2P-95-0005': Object.freeze({
    en: (facts) => `2-in/4-out air layout with 2 clamp and 2 release outlets. ${facts.pressure} maximum pressure · ${facts.speed} maximum speed.`,
    de: (facts) => `Druckluftanordnung mit 2 Eingängen und 4 Ausgängen: 2 zum Spannen und 2 zum Lösen. Maximaldruck ${facts.pressure} · maximale Drehzahl ${facts.speed}.`,
    ja: (facts) => `2入力・4出力の空圧構成で、クランプ用2出力とアンクランプ用2出力を備えます。最高使用圧力${facts.pressure}・最高回転数${facts.speed}。`,
    ru: (facts) => `Пневматическая схема 2 входа / 4 выхода: 2 выхода для зажима и 2 для разжима. Максимальное давление ${facts.pressure} · максимальная частота вращения ${facts.speed}.`,
  }),
  'BP-3P-0006': Object.freeze({
    en: (facts) => `The port thread is not listed; confirm the mating interface before selecting fittings. ${facts.pressure} maximum pressure · ${facts.speed} maximum speed.`,
    de: (facts) => `Das Anschlussgewinde ist nicht angegeben; die Gegenstelle vor der Auswahl der Verschraubungen bestätigen. Maximaldruck ${facts.pressure} · maximale Drehzahl ${facts.speed}.`,
    ja: (facts) => `ポートねじは記載されていません。継手選定前に相手側インターフェースをご確認ください。最高使用圧力${facts.pressure}・最高回転数${facts.speed}。`,
    ru: (facts) => `Резьба порта не указана; до выбора фитингов подтвердите сопрягаемый интерфейс. Максимальное давление ${facts.pressure} · максимальная частота вращения ${facts.speed}.`,
  }),
  'BP-3P-S06-0001': Object.freeze({
    en: (facts) => `3 pneumatic passages plus 6 electrical leads; confirm the air inlet, circuit allocation, and electrical ratings. ${facts.pressure} · ${facts.speed}.`,
    de: (facts) => `3 Pneumatikkanäle plus 6 elektrische Leitungen; Lufteinlass, Kreiszuordnung und elektrische Nennwerte bestätigen. ${facts.pressure} · ${facts.speed}.`,
    ja: (facts) => `空圧3流路と電気リード6本の仕様です。エア入口、回路割当、電気定格をご確認ください。${facts.pressure}・${facts.speed}。`,
    ru: (facts) => `3 пневматических канала и 6 электрических выводов; подтвердите вход воздуха, распределение цепей и электрические номиналы. ${facts.pressure} · ${facts.speed}.`,
  }),
});

function relatedModelDescription(model, product, locale) {
  const facts = productFacts(model, product, locale);
  const special = SPECIAL_RELATED_MODEL_COPY[model]?.[locale];
  return special ? special(facts) : RELATED_FACT_COPY[locale](facts);
}

function extractApplicationEvidence(value, label) {
  const evidence = [];
  const elementRegex = /<div\b[^>]*\bdata-(verified-application|confirmed-application-fit)="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi;
  for (const match of value.matchAll(elementRegex)) {
    let start = match.index;
    let end = match.index + match[0].length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const startComment = before.match(/<!--\s*([A-Z0-9-]+):START\s*-->\s*$/i);
    const endComment = after.match(/^\s*<!--\s*([A-Z0-9-]+):END\s*-->/i);
    if (startComment && endComment && startComment[1].toLowerCase() === endComment[1].toLowerCase()) {
      start -= startComment[0].length;
      end += endComment[0].length;
    }
    evidence.push({
      key: `${match[1]}:${match[2]}`,
      html: value.slice(start, end).trim().replaceAll('\r\n', '\n'),
    });
  }
  const keys = evidence.map((item) => item.key);
  if (new Set(keys).size !== keys.length) throw new Error(`${label}: duplicate verified-application evidence key`);
  return evidence;
}

function renderCustomerApplicationEvidence(model, locale, item) {
  const copy = CUSTOMER_APPLICATION_COPY[locale];
  if (item.key === 'verified-application:laser-rear-chuck'
      && ['BP-2P-08-0001', 'BP-3P-0004'].includes(model)) {
    const passages = {
      en: model === 'BP-2P-08-0001' ? 'two' : 'three',
      de: model === 'BP-2P-08-0001' ? 'zwei' : 'drei',
      ja: model === 'BP-2P-08-0001' ? '2' : '3',
      ru: model === 'BP-2P-08-0001' ? 'два' : 'три',
    }[locale];
    return `<div class="compat-item" data-verified-application="laser-rear-chuck"><strong>${copy.laserTitle}</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">${copy.laserText({ model, passages })} <a href="case-studies.html#laser-tube-rear-chuck">${copy.laserCaseLink}</a> <a href="application-laser-tube-cutting.html">${copy.laserGuideLink}</a></span></div>`;
  }
  if (model === 'BP-2P-08-0001'
      && item.key === 'confirmed-application-fit:bottle-capping-three-jaw-gripper') {
    return `<div class="compat-item" data-confirmed-application-fit="bottle-capping-three-jaw-gripper"><strong>${copy.bottleTitle}</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">${copy.bottleText} <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">${copy.bottleLink}</a></span></div>`;
  }
  return item.html;
}

function renderDeepContent(model, product, locale, orderedModels, products, applicationEvidenceBlocks) {
  const copy = COPY[locale];
  const buyerCopy = BUYER_COPY[locale];
  const config = LOCALES[locale];
  const ui = drawingBackedUiContract(locale, model);
  const facts = productFacts(model, product, locale, ui);
  const contract = identityContract(model, locale);
  const rows = specRows(model, product, locale, ui);
  const fileName = `${model}.html`;
  const encodedLabel = encodeURIComponent(contract.linkLabel);
  const drawingLink = facts.pending
    ? `contact.html?request=verified-drawing&amp;model=${encodeURIComponent(model)}`
    : `${config.prefix}${product.drawing.path}`;
  const drawingDownload = facts.pending ? '' : ' download=""';
  const drawingTitle = facts.pending ? copy.drawingPendingTitle : copy.drawingTitle;
  const drawingDescription = facts.pending ? copy.drawingPendingDescription : copy.drawingDescription;
  const factSeparator = locale === 'ja' ? '・' : ' · ';
  const labelSeparator = locale === 'ja' ? '：' : ':';
  const tabs = controlledTabs(locale);

  const keyPoints = facts.pending
    ? [
      `<strong>${escapeHtml(copy.drawingBasis)}${labelSeparator}</strong> ${escapeHtml(copy.pendingBasis)}`,
      `<strong>${escapeHtml(copy.selectionStatus)}${labelSeparator}</strong> ${escapeHtml(copy.pendingAction)}`,
      `<strong>${escapeHtml(copy.labels.warranty)}${labelSeparator}</strong> ${escapeHtml(copy.warranty)}`,
    ]
    : [
      `<strong>${escapeHtml(copy.operatingLimits)}${labelSeparator}</strong> ${escapeHtml(facts.pressure)}${factSeparator}${escapeHtml(facts.speed)}${factSeparator}${escapeHtml(facts.temperature)}`,
      `<strong>${escapeHtml(copy.materialsMedia)}${labelSeparator}</strong> ${escapeHtml(facts.body)}${factSeparator}${escapeHtml(facts.seal)}${factSeparator}${escapeHtml(facts.media)}`,
      `<strong>${escapeHtml(copy.interfaces)}${labelSeparator}</strong> ${escapeHtml(facts.ports)}${locale === 'ja' ? '／' : '; '}${escapeHtml(facts.mounting)}`,
    ];
  if (facts.electrical) {
    keyPoints.push(`<strong>${escapeHtml(copy.labels.electrical)}${labelSeparator}</strong> ${escapeHtml(facts.electrical)}`);
  }

  const modelApplicationCopy = applicationCopyForModel(model, locale, facts);
  const applicationCards = modelApplicationCopy?.cards ?? copy.compatCards;
  const applicationCardTextStyle = modelApplicationCopy
    ? 'display:block;font-size:0.85rem;color:var(--text-light);margin-top:6px;line-height:1.7;'
    : 'display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;';
  const compatCards = applicationCards.map(([title, text]) => `    <div class="compat-item"><strong>${escapeHtml(title)}</strong><span style="${applicationCardTextStyle}">${escapeHtml(text)}</span></div>`).join('\n');
  const applicationPanelHeading = modelApplicationCopy?.heading ?? copy.compatHeading;
  const applicationPanelIntro = facts.pending ? copy.pendingAction : (modelApplicationCopy?.intro ?? copy.compatIntro);
  const applicationPanelIntroStyle = modelApplicationCopy
    ? 'font-size:0.95rem;color:var(--text-light);margin-bottom:24px;line-height:1.75;'
    : 'font-size:0.95rem;color:var(--text-light);margin-bottom:24px;';
  const applicationPanelFooter = `   <div style="margin-top:24px;padding:20px;background:var(--bg-alt);border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:8px;">
    <h3 style="margin:0 0 10px;font-size:1.05rem;color:var(--dark-soft);">${escapeHtml(buyerCopy.compatTitle)}</h3>
    <p style="margin:0;font-size:0.92rem;color:var(--text-light);line-height:1.75;">${escapeHtml(buyerCopy.compatText.replace('{model}', model))}</p>
    <a href="contact.html?request=application-review&amp;model=${encodeURIComponent(model)}&amp;product=${encodedLabel}&amp;source=${fileName}#quoteForm" class="btn btn-primary" style="margin-top:16px;max-width:100%;white-space:normal;text-align:center;">${escapeHtml(buyerCopy.compatAction)} →</a>
   </div>`;
  const installSteps = copy.installSteps.map(([title, text], index) => `    <div class="install-step">
     <div class="install-step-num">${index + 1}</div>
     <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>
    </div>`).join('\n');
  // The six installation steps already contain the actionable checks. Keep the
  // same lean structure in all four languages instead of adding a duplicate
  // inspection-interval card to only some locales.
  const maintenanceBlock = '';
  const commonCards = copy.commonCards.map(([title, text]) => `   <div class="app-detail-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`).join('\n');
  const relatedCards = relatedModels(model, orderedModels, products).map((relatedModel) => {
    const relatedMetadata = drawingBackedProductMetadata(locale, relatedModel);
    if (!relatedMetadata) throw new Error(`${relatedModel}/${locale}: compact metadata missing for related-product label`);
    return `   <a href="${relatedModel}.html" class="related-card">
    <h3>${escapeHtml(relatedMetadata.linkLabel)}</h3>
    <p>${escapeHtml(relatedModelDescription(relatedModel, products[relatedModel], locale))}</p>
    <div class="price">${escapeHtml(copy.viewModel)}</div>
   </a>`;
  }).join('\n');

  const faq = productFaq(model, facts, locale);
  const faqHtml = faq.items.map(([question, answer], index) => renderFaqItem(question, answer, index === 0)).join('\n');
  // Keep the marker as a stable synchronization anchor, but do not restore the
  // retired summary card in any language. The first-view key specifications
  // already carry these facts without adding another boxed section.
  const keyTakeawaySection = '';

  return `${START_MARKER}
${keyTakeawaySection}

<!-- ===== TABS SECTION ===== -->
<section class="section" style="padding-top:0;">
 <div class="container">
  <div class="pd-tabs">
   <a class="pd-tab" href="#panel-specs">${escapeHtml(tabs[0])}</a>
   <a class="pd-tab" href="#panel-compat">${escapeHtml(tabs[1])}</a>
   <a class="pd-tab" href="#panel-install">${escapeHtml(tabs[2])}</a>
   <a class="pd-tab" href="#panel-downloads">${escapeHtml(tabs[3])}</a>
  </div>

  <!-- Panel: Specifications -->
  <div class="pd-panel" id="panel-specs">
   <h2>${escapeHtml(copy.specHeading)}</h2>
   <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:20px;">${escapeHtml(facts.pending ? copy.specIntroPending : copy.specIntro)}</p>
   <table class="spec-table">
    <tbody>
${renderRows(rows)}
    </tbody>
   </table>
  </div>

  <!-- Panel: Compatible Machines -->
  <div class="pd-panel" id="panel-compat">
   <h2>${escapeHtml(applicationPanelHeading)}</h2>
   <p style="${applicationPanelIntroStyle}">${escapeHtml(applicationPanelIntro)}</p>
   <div class="compat-grid">
${applicationEvidenceBlocks.length ? `${applicationEvidenceBlocks.join('\n')}\n` : ''}${compatCards}
   </div>
${applicationPanelFooter}
  </div>

  <!-- Panel: Installation -->
  <div class="pd-panel" id="panel-install">
   <h2>${escapeHtml(copy.installHeading)}</h2>
   <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:24px;">${escapeHtml(facts.pending ? copy.pendingAction : copy.installIntro)}</p>
   <div class="install-steps">
${installSteps}
   </div>
${maintenanceBlock}
  </div>

  <!-- Panel: Downloads -->
  <div class="pd-panel" id="panel-downloads">
   <h2>${escapeHtml(copy.downloadsHeading)}</h2>
   <div class="download-grid">
    <div class="download-item">
     <span class="dl-icon">📄</span>
     <div><h3><a href="${drawingLink}"${drawingDownload}>${escapeHtml(drawingTitle)}</a></h3><p>${escapeHtml(drawingDescription)}</p></div>
    </div>
    <div class="download-item">
     <span class="dl-icon">📄</span>
     <div><h3><a href="contact.html?request=3d-step&amp;model=${encodeURIComponent(model)}&amp;product=${encodedLabel}&amp;source=${fileName}">${escapeHtml(copy.cadTitle)}</a></h3><p>${escapeHtml(copy.cadDescription)}</p></div>
    </div>
    <div class="download-item">
     <span class="dl-icon">📄</span>
     <div><h3><a href="${config.prefix}downloads/Begapunk_Rotary_Joint_Installation_Manual.pdf" download="">${escapeHtml(copy.manualTitle)}</a></h3><p>${escapeHtml(copy.manualDescription)}</p></div>
    </div>
    <div class="download-item">
     <span class="dl-icon">📄</span>
     <div><h3>${escapeHtml(copy.docsTitle)}</h3><p>${escapeHtml(copy.docsDescription)}</p></div>
    </div>
   </div>
  </div>
 </div>
</section>

<!-- ===== COMMON MISTAKES ===== -->
<section class="section">
 <div class="container">
  <div class="section-header"><span class="section-label">${escapeHtml(copy.commonLabel)}</span><h2 class="section-title">${escapeHtml(copy.commonHeading)}</h2></div>
  <p class="common-mistakes-note" style="max-width:860px;margin:-8px auto 28px;color:var(--text-light);text-align:center;line-height:1.7;">${escapeHtml(copy.commonIntro)}</p>
  <div class="app-detail-grid">
${commonCards}
  </div>
 </div>
</section>

<!-- ===== RELATED PRODUCTS ===== -->
<section class="section section-alt">
 <div class="container">
  <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);margin-bottom:8px;">${escapeHtml(copy.relatedHeading)}</h2>
  <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:32px;">${escapeHtml(copy.relatedIntro)}</p>
  <div class="related-grid">
${relatedCards}
   <a href="contact.html?request=application-review&amp;model=${encodeURIComponent(model)}&amp;product=${encodedLabel}&amp;source=${fileName}#quoteForm" class="related-card"><h3>${escapeHtml(buyerCopy.helpTitle)}</h3><p>${escapeHtml(buyerCopy.helpText)}</p><div class="price">${escapeHtml(buyerCopy.helpAction)}</div></a>
  </div>
 </div>
</section>

<!-- ===== FAQ ===== -->
<section class="section" id="faq">
 <div class="container">
  <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);margin-bottom:24px;">${escapeHtml(faq.heading)}</h2>
  <div class="faq-mini">
${faqHtml}
  </div>
 </div>
</section>`;
}

function replaceOnce(value, regex, replacement, label) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const matches = [...value.matchAll(new RegExp(regex.source, flags))];
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one match, found ${matches.length}`);
  return value.replace(regex, replacement);
}

function setMeta(value, attribute, key, content, label) {
  const regex = new RegExp(`(<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content=")[^"]*("[^>]*>)`, 'i');
  return replaceOnce(value, regex, `$1${escapeHtml(content)}$2`, label);
}

function removeLegacyMetaKeywords(value, label) {
  const pattern = /^[ \t]*<meta\b(?=[^>]*\bname="keywords")[^>]*>\r?\n?/gmi;
  const matches = [...value.matchAll(pattern)];
  if (matches.length > 1) throw new Error(`${label}: expected at most one legacy meta keywords tag, found ${matches.length}`);
  return matches.length ? value.replace(pattern, '') : value;
}

function assertUiJsonProperties(productNode, ui, model, locale) {
  if (!Array.isArray(productNode.additionalProperty)) throw new Error(`${model}/${locale}: Product JSON-LD additionalProperty missing`);
  if (ui.status === 'identity-pending') {
    const allowed = new Set(['SKU', COPY[locale].labels.warranty]);
    const unsupported = productNode.additionalProperty.filter((item) => !allowed.has(item?.name));
    if (unsupported.length || productNode.additionalProperty.length !== 2) {
      throw new Error(`${model}/${locale}: identity-pending Product JSON-LD must contain only SKU and warranty properties`);
    }
  }
  for (const field of ui.requiredJsonFields) {
    const name = ui.jsonPropertyNames[field];
    const matches = productNode.additionalProperty.filter((item) => item?.name === name);
    if (matches.length !== 1 || matches[0].value !== ui.fields[field]) {
      throw new Error(`${model}/${locale}: Product JSON-LD ${field} is not synchronized with drawingBackedUiContract`);
    }
  }
  if (ui.hybridInterfacePropertyName) {
    const matches = productNode.additionalProperty.filter((item) => item?.name === ui.hybridInterfacePropertyName);
    if (matches.length !== 1 || matches[0].value !== ui.keyValues.channels) {
      throw new Error(`${model}/${locale}: Product JSON-LD hybrid interface is not synchronized with drawingBackedUiContract`);
    }
  }
}

function locateProductJsonScript(value, label) {
  const scripts = [];
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  for (const match of value.matchAll(regex)) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${label}: invalid JSON-LD: ${error.message}`);
    }
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
    const productNode = graph.find((item) => item['@type'] === 'Product');
    if (!productNode) continue;
    scripts.push({
      start: match.index,
      end: match.index + match[0].length,
      data,
      graph,
      productNode,
      breadcrumb: graph.find((item) => item['@type'] === 'BreadcrumbList'),
    });
  }
  if (scripts.length !== 1) throw new Error(`${label}: expected one Product JSON-LD script, found ${scripts.length}`);
  return scripts[0];
}

function updateStructuredData(value, model, product, locale, contract, ui) {
  const located = locateProductJsonScript(value, `${model}/${locale}`);
  const { data, productNode, breadcrumb } = located;
  if (!breadcrumb || !productNode) throw new Error(`${model}/${locale}: Product/Breadcrumb JSON-LD nodes missing`);
  const lastCrumb = breadcrumb.itemListElement?.at(-1);
  if (!lastCrumb) throw new Error(`${model}/${locale}: final JSON-LD breadcrumb missing`);
  if (ui.hybridInterfacePropertyName) {
    const hybridProperties = productNode.additionalProperty?.filter((item) => item?.name === ui.hybridInterfacePropertyName) ?? [];
    if (hybridProperties.length !== 1) throw new Error(`${model}/${locale}: Product JSON-LD hybrid interface property is missing or duplicated`);
    hybridProperties[0].value = ui.keyValues.channels;
  }
  assertUiJsonProperties(productNode, ui, model, locale);
  lastCrumb.name = contract.breadcrumb;
  productNode.name = ui.productName || contract.h1;
  productNode.description = ui.structuredDescription;
  productNode.category = COPY[locale].category;
  productNode.inLanguage = LOCALES[locale].htmlLang;
  assertUiJsonProperties(productNode, ui, model, locale);
  const replacement = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  return `${value.slice(0, located.start)}${replacement}${value.slice(located.end)}`;
}

function updateBreadcrumb(value, locale, contract, label) {
  const block = `<div class="breadcrumb">
   <a href="index.html">${escapeHtml(COPY[locale].home)}</a> /
   <a href="products.html">${escapeHtml(COPY[locale].products)}</a> /
   ${escapeHtml(contract.breadcrumb)}
  </div>`;
  return replaceOnce(value, /<div class="breadcrumb">[\s\S]*?<\/div>/i, block, `${label}: breadcrumb`);
}

function canonicalShareHref(channel, publicUrl, linkLabel) {
  const endpoints = {
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
    x: 'https://twitter.com/intent/tweet',
    facebook: 'https://www.facebook.com/sharer/sharer.php',
    whatsapp: 'https://api.whatsapp.com/send',
  };
  const target = new URL(endpoints[channel]);
  if (channel === 'linkedin') target.searchParams.set('url', publicUrl);
  else if (channel === 'x') {
    target.searchParams.set('url', publicUrl);
    target.searchParams.set('text', `${linkLabel} | Begapunk`);
  } else if (channel === 'facebook') target.searchParams.set('u', publicUrl);
  else if (channel === 'whatsapp') {
    target.searchParams.set('text', `${linkLabel} | Begapunk - ${publicUrl}`);
  }
  return escapeHtml(target.toString());
}

function updateFirstViewIdentity(value, model, locale, contract) {
  let next = value;
  const label = `${model}/${locale}`;
  next = updateBreadcrumb(next, locale, contract, label);
  next = replaceOnce(next, /(<div class="pd-info"[^>]*>[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i, `$1${escapeHtml(contract.h1)}$2`, `${label}: H1`);
  next = replaceOnce(next, /(<img id="main-img"[^>]*\salt=")[^"]*(")/i, `$1${escapeHtml(contract.imageAlt)}$2`, `${label}: main image alt`);

  const encodedLabel = encodeURIComponent(contract.linkLabel);
  next = next.replace(/(href="contact\.html\?request=(?:quote|3d-step)&amp;model=[^"]*?&amp;product=)[^&"]+(&amp;source=)/gi, `$1${encodedLabel}$2`);

  const localePath = locale === 'en' ? '' : `${locale}/`;
  const publicUrl = `https://www.begapunk.com/${localePath}${model}.html`;
  next = replaceOnce(
    next,
    /href="https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=[^"]+"/i,
    `href="${canonicalShareHref('linkedin', publicUrl, contract.linkLabel)}"`,
    `${label}: LinkedIn share URL`,
  );
  next = replaceOnce(
    next,
    /href="https:\/\/twitter\.com\/intent\/tweet\?url=[^&"]+&amp;text=[^"]+"/i,
    `href="${canonicalShareHref('x', publicUrl, contract.linkLabel)}"`,
    `${label}: X share URL`,
  );
  next = replaceOnce(
    next,
    /href="https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=[^"]+"/i,
    `href="${canonicalShareHref('facebook', publicUrl, contract.linkLabel)}"`,
    `${label}: Facebook share URL`,
  );
  next = replaceOnce(
    next,
    /href="https:\/\/api\.whatsapp\.com\/send\?text=[^"]+"/i,
    `href="${canonicalShareHref('whatsapp', publicUrl, contract.linkLabel)}"`,
    `${label}: WhatsApp share URL`,
  );
  return next;
}

function updateHeadIdentity(value, contract, label) {
  let next = value;
  next = replaceOnce(next, /(<title>)[\s\S]*?(<\/title>)/i, `$1${escapeHtml(contract.title)}$2`, `${label}: title`);
  next = setMeta(next, 'name', 'description', contract.description, `${label}: meta description`);
  next = setMeta(next, 'property', 'og:title', contract.openGraphTitle, `${label}: og:title`);
  next = setMeta(next, 'property', 'og:description', contract.openGraphDescription, `${label}: og:description`);
  next = setMeta(next, 'name', 'twitter:title', contract.twitterTitle, `${label}: twitter:title`);
  next = setMeta(next, 'name', 'twitter:description', contract.twitterDescription, `${label}: twitter:description`);
  next = setMeta(next, 'property', 'og:image:alt', contract.openGraphImageAlt, `${label}: og:image:alt`);
  next = setMeta(next, 'name', 'twitter:image:alt', contract.twitterImageAlt, `${label}: twitter:image:alt`);
  // Meta keywords are ignored by modern search engines and the existing EN-only
  // tags contain stale engineering claims. Remove them uniformly rather than
  // inventing a fourth metadata keyword surface beside search-index and llms.txt.
  next = removeLegacyMetaKeywords(next, label);
  return next;
}

function replaceDeepContent(value, generated, newline, label) {
  const start = value.indexOf(START_MARKER);
  const end = value.indexOf(END_MARKER);
  if (start < 0 || end < 0 || end <= start) throw new Error(`${label}: deep-content markers missing or out of order`);
  if (value.indexOf(START_MARKER, start + START_MARKER.length) !== -1) throw new Error(`${label}: duplicate start marker`);
  if (value.indexOf(END_MARKER, end + END_MARKER.length) !== -1) throw new Error(`${label}: duplicate end marker`);
  const normalized = generated.replaceAll('\n', newline);
  return `${value.slice(0, start)}${normalized}${newline}${newline}${value.slice(end)}`;
}

const BOTTOM_CTA_PATTERN = /<!-- ===== CTA SECTION ===== -->\s*<section class="section cta-section"[^>]*>[\s\S]*?<\/section>/i;
const TECHNICAL_NOTE_PATTERN = /<!-- ===== TECHNICAL NOTE ===== -->\s*<section class="section pd-technical-note"[^>]*>[\s\S]*?<\/section>/i;

function renderBottomCta(model, locale, contract) {
  const buyerCopy = BUYER_COPY[locale];
  const fileName = `${model}.html`;
  const href = `contact.html?request=application-review&amp;model=${encodeURIComponent(model)}&amp;product=${encodeURIComponent(contract.linkLabel)}&amp;source=${fileName}#quoteForm`;
  return `<!-- ===== CTA SECTION ===== -->
<section class="section cta-section">
 <div class="container">
  <h2>${escapeHtml(buyerCopy.bottomTitle)}</h2>
  <p>${escapeHtml(buyerCopy.bottomText)}</p>
  <a href="${href}" class="btn btn-primary">${escapeHtml(buyerCopy.bottomAction)} →</a>
  <p style="margin:16px auto 0;max-width:760px;font-size:0.88rem;opacity:0.82;">${escapeHtml(buyerCopy.privacyLead)} ${escapeHtml(buyerCopy.privacy)}</p>
 </div>
</section>`;
}

function replaceBottomCta(value, generated, newline, label) {
  return replaceOnce(
    value,
    BOTTOM_CTA_PATTERN,
    generated.replaceAll('\n', newline),
    `${label}: bottom CTA`,
  );
}

function removeLegacyTechnicalNote(value, label) {
  const matches = [...value.matchAll(new RegExp(TECHNICAL_NOTE_PATTERN.source, 'gi'))];
  if (matches.length > 1) throw new Error(`${label}: expected at most one legacy technical note, found ${matches.length}`);
  return matches.length ? value.replace(TECHNICAL_NOTE_PATTERN, '') : value;
}

function getOne(value, regex, label) {
  const matches = [...value.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one match, found ${matches.length}`);
  return matches[0][0];
}

function markerSlice(value, startMarker, endMarker, label) {
  const start = value.indexOf(startMarker);
  const end = value.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`${label}: protected markers missing`);
  return value.slice(start, end);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: protected content changed`);
}

function normalizeProductQueryLabels(value) {
  return value.replace(/(&amp;product=)[^&"]+/gi, '$1{product-label}');
}

function normalizeProtectedTail(value, label) {
  const cta = getOne(value, BOTTOM_CTA_PATTERN, `${label}: bottom CTA`);
  const technicalNotes = [...value.matchAll(new RegExp(TECHNICAL_NOTE_PATTERN.source, 'gi'))];
  if (technicalNotes.length > 1) throw new Error(`${label}: expected at most one legacy technical note, found ${technicalNotes.length}`);
  let normalized = normalizeProductQueryLabels(value.replace(cta, '{drawing-backed-bottom-cta}'));
  if (technicalNotes.length) normalized = normalized.replace(technicalNotes[0][0], '');
  return normalized;
}

function actionSignature(value, label) {
  const block = getOne(value, /<div class="pd-actions">[\s\S]*?<\/div>/i, `${label}: actions`);
  return [...block.matchAll(/<a\s+href="([^"]+)"\s+class="([^"]+)"/gi)].map((match) => ({
    href: match[1].replace(/(&amp;product=)[^&"]+/, '$1{label}'),
    className: match[2],
  }));
}

function shareSignature(value, label) {
  const block = getOne(value, /<details class="pd-share-menu"[\s\S]*?<\/details>/i, `${label}: share menu`);
  return [...block.matchAll(/data-share-channel="([^"]+)"\s+href="([^"]+)"/gi)].map((match) => ({
    channel: match[1],
    endpoint: match[2].split('?')[0],
  }));
}

function assertLocalizedShareTargets(value, model, locale, label) {
  const block = getOne(value, /<details class="pd-share-menu"[\s\S]*?<\/details>/i, `${label}: share menu`);
  const targets = [...block.matchAll(/data-share-channel="([^"]+)"\s+href="([^"]+)"/gi)];
  const expectedChannels = ['linkedin', 'x', 'facebook', 'whatsapp'];
  if (targets.length !== expectedChannels.length) throw new Error(`${label}: expected four share targets, found ${targets.length}`);
  const localePath = locale === 'en' ? '' : `${locale}/`;
  const publicUrl = `https://www.begapunk.com/${localePath}${model}.html`;
  for (const channel of expectedChannels) {
    const target = targets.find((match) => match[1].toLowerCase() === channel);
    if (!target) throw new Error(`${label}: missing ${channel} share target`);
    const decoded = decodeURIComponent(target[2].replaceAll('&amp;', '&'));
    if (!decoded.includes(publicUrl)) throw new Error(`${label}: ${channel} share target is not localized to ${publicUrl}`);
  }
}

function utilityCoreSignature(value, label) {
  const block = getOne(value, /<div class="pd-utility-links">[\s\S]*?(?=<details class="pd-share-menu")/i, `${label}: utility links`);
  return [...block.matchAll(/<(?:a|span)\b[^>]*>[\s\S]*?<\/(?:a|span)>/gi)].map((match) => match[0]);
}

function galleryAssetSignature(value, label) {
  const block = getOne(value, /<div class="pd-gallery"[\s\S]*?(?=\n\s*(?:<!-- SECTION -->\s*)?<div class="pd-info")/i, `${label}: gallery`);
  return [...block.matchAll(/\s(?:src|href)="([^"]+)"/gi)].map((match) => match[1]);
}

function countMatches(value, regex) {
  return [...value.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`))].length;
}

function assertMainHeadingOrder(value, label) {
  const main = getOne(value, /<main\b[^>]*>[\s\S]*?<\/main>/i, `${label}: main content`);
  const levels = [...main.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  if (levels.filter((level) => level === 1).length !== 1 || levels[0] !== 1) {
    throw new Error(`${label}: main content must start with exactly one H1`);
  }
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index] > levels[index - 1] + 1) {
      throw new Error(`${label}: heading level jumps from H${levels[index - 1]} to H${levels[index]}`);
    }
  }
}

function decodedRiskText(value) {
  return value
    .replace(/(?:%[0-9A-Fa-f]{2})+/g, (token) => {
      try { return decodeURIComponent(token); } catch { return token; }
    })
    .replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&#47;', '/');
}

function controlledRegion(value) {
  const end = value.indexOf('</main>');
  if (end < 0) throw new Error('controlled main-content end marker missing');
  return decodedRiskText(value.slice(0, end));
}

function riskRulesFor(model, product) {
  const rules = [
    ['customer-facing internal audit label', /Drawing max|Drawing-listed|Drawing-backed summary|Drawing status|Drawing control|QC-\d{4}-\d{4}-\d{3}|title[- ]block|Schriftfeld|Zeichnungsbasierte Zusammenfassung|Zeichnungsgrundlage|Zeichnungsstatus|Zeichnungsnummer|図面に基づく要約|図面根拠|図面状態|図面管理番号|図面表題欄|Сводка по чертежу|Статус чертежа|Номер чертежа|основн\w*\s+надпис/giu],
    ['customer-facing internal release language', /Release note|before release|design release|released documents|approved revision|releasing procurement|Do not approve from this page alone|approved project limits|approved medium|approved electrical specification|approved drawing|approved product data|written approval|pending engineering confirmation|Freigabehinweis|vor Freigabe|Konstruktionsfreigabe|Beschaffungsfreigabe|Freigegebene Unterlagen|Freigabe-Checkliste|freigegebene Projektgrenzen|freigegebenes Medium|freigegebene Elektrospezifikation|freigegebene Zeichnung|freigegebenen Produktdaten|schriftliche Freigabe|technischen Bestätigung offen|承認上の注意|リリース前|設計承認|調達承認|承認文書|承認流体|承認図面|承認済み製品データ|承認済みの個別運転限界|設計承認チェックリスト|書面承認|承認済み電気仕様書|担当設計部門の確認待ち|Примечание к выпуску|до выпуска конструкции|выпуска конструкторской документации|выпущенные документы|Контрольный перечень для согласования|согласованных проектных пределов|согласованную среду|утверждённ(?:ый|ому|ым)\s+чертёж|утверждённым данным изделия|письменное согласование|ответственной конструкторской службой/giu],
    ['customer-facing page-status checklist', /Selection Checklist|Page status|Published only where legible|pending or anomalous annotation|Auswahl-Checkliste|Status auf der Seite|Nur bei lesbarer Angabe veröffentlicht|Offene oder ungewöhnliche Angaben|選定チェックリスト|ページの状態|判読できる記載のみ公開|未確定または異常な注記|Контрольный список выбора|Статус на странице|Публикуются только читаемые данные|неясные или нестандартные обозначения/giu],
    ['generic product FAQ copy', /What defines the delivered configuration\?|Are the listed pressure and speed continuous-duty ratings\?|Which media are stated for this model\?|How should the ports and mounting be confirmed\?|Can I request a technical file or 3D CAD file\?|Was bestimmt die gelieferte Ausführung\?|Sind Druck und Drehzahl Dauernennwerte\?|Welche Medien sind für dieses Modell geeignet\?|Wie werden Anschlüsse und Montage bestätigt\?|Kann ich eine technische Datei oder 3D-CAD-Datei anfordern\?|納入仕様はどのように決まりますか？|記載圧力と回転数は連続運転定格ですか？|この型式に適用できる流体は何ですか？|ポートと取付仕様はどのように確認しますか？|技術ファイルや3D CADを依頼できますか？|Что определяет поставляемое исполнение\?|Являются ли давление и скорость номиналами непрерывной работы\?|Какая среда подходит для этой модели\?|Как подтвердить порты и монтаж\?|Можно ли запросить технический файл или 3D CAD\?/giu],
    ['customer-facing internal application status', /factory-confirmed|Verified Application:|Verified Production Application:|Verified Customer Application:|Confirmed Application Fit:|werkseitig bestätigt|Nachgewiesene Anwendung:|Bestätigte Produktionsanwendung:|Bestätigte Kundenanwendung:|Bestätigte Eignung für die Anwendung:|工場確認済み|確認済みの量産用途：|確認済みのお客様用途：|確認済みの適用範囲：|подтверждена заводом|Подтверждённое применение:|Подтверждённое применение на производстве:|Подтверждённое применение у заказчика:|Подтверждённая применимость:/giu],
    ['unsupported composite/FKM seal claim', /PTFE[\s-]*(?:composite|Verbund|複合)|FKM|ФКМ|композит[^<]{0,20}ПТФЭ/giu],
    ['unsupported specialty material', /Graphite|Graphit|グラファイト|графит|PEEK|Si3N4|silicon nitride|Siliziumnitrid|窒化ケイ素|нитрид кремния/giu],
    ['unsupported numeric tightening torque', /\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?)?\s*N[·.]?m/giu],
    ['unsupported bearing specification', /deep[- ]groove ball bearing|Rillenkugellager|深溝玉軸受|радиальн[^<]{0,20}шарикоподшип/giu],
    ['unsupported electrical rating/material', /(?:24|250|500)\s*V|2\s*A(?:\s|<)|gold[- ]plated|vergoldet|金メッキ|позолоч/giu],
  ];
  if (product.status === 'identity-pending' || ENGINEERING_PENDING_MODELS.has(model)) {
    rules.push(
      ['quarantined pressure/speed', /(?:1\s*(?:MPa|МПа)|(?:150|200)\s*(?:RPM|U\/min|min⁻¹|об\/мин))/giu],
      ['quarantined interfaces/materials', /G1\/8|G1\/4|6061|PTFE|ПТФЭ|O[- ]Ring|Oリング|уплотнительн[^<]{0,20}кольц/giu],
      ['quarantined dimensions', /(?:Ø\s*)?(?:30|76|95|162)\s*(?:mm|мм)/giu],
      ['quarantined media', /\bair\b|\bLuft\b|空気|воздух/giu],
    );
  } else if (!(product.drawingFacts.media.includes('water') || product.drawingFacts.media.includes('oil'))) {
    const ownerConfirmedHydraulicVariant = OWNER_CONFIRMED_CUSTOM_HYDRAULIC_MODELS.has(model);
    rules.push([
      'media beyond drawing',
      ownerConfirmedHydraulicVariant
        ? /\bwater\b|\bcoolant\b|\bWasser\b|Kühlmittel|クーラント|水|СОЖ|охлаждающ|\bвода\b/giu
        : /\bwater\b|\bcoolant\b|hydraulic oil|\bWasser\b|Kühlmittel|Hydrauliköl|クーラント|作動油|水|СОЖ|охлаждающ|гидравлическ[^<]{0,20}масл|\bвода\b/giu,
    ]);
  } else {
    rules.push(['coolant beyond drawing', /\bcoolant\b|Kühlmittel|クーラント|СОЖ|охлаждающ/giu]);
  }
  if (model === 'BP-1P-0003') rules.push(['legacy BP-1P-0003 port', /G1\/4|G1\/8/giu]);
  if (model === 'BP-2P-08-0001') rules.push(['legacy BP-2P-08 mount', /(?:^|[^\w])M5(?:[^\w]|$)/giu]);
  if (model === 'BP-3P-0006') rules.push(['unresolved BP-3P-0006 port size', /G1\/4|G4\/1/giu]);
  if (['BP-1P-0006', 'BP-2P-0002', 'BP-3P-0007'].includes(model)) {
    rules.push(['unsupported orifice claim', /4\s*mm[^<]{0,24}(?:orifice|bore)|4[- ]mm[- ]Bohrung|4\s*mm[^<]{0,20}オリフィス|проходн[^<]{0,20}4\s*мм/giu]);
  }
  if (model === 'BP-8P-0001') rules.push(['legacy BP-8P identity', /4[- ]passage|4[- ]Kanal|4流路|4[- ]канальн|Ø\s*30\s*(?:mm|мм)/giu]);
  return rules;
}

function findRisks(value, model, product) {
  let text = controlledRegion(value);
  const relatedStart = text.indexOf('<div class="related-grid">');
  const relatedEnd = relatedStart >= 0 ? text.indexOf('<!-- ===== FAQ ===== -->', relatedStart) : -1;
  if (relatedStart >= 0 && relatedEnd > relatedStart) {
    text = text.slice(0, relatedStart)
      + text.slice(relatedStart, relatedEnd).replace(/[^\r\n]/g, ' ')
      + text.slice(relatedEnd);
  }
  const localeMatch = /<html\b[^>]*\blang="(en|de|ja|ru)"/i.exec(value);
  const locale = localeMatch?.[1]?.toLowerCase();
  if (locale && model !== 'BP-1P-0003' && product.status !== 'identity-pending') {
    const mediaFaq = productFaq(model, productFacts(model, product, locale), locale).items[2];
    for (const approvedText of mediaFaq) {
      text = text.replaceAll(approvedText, '').replaceAll(escapeHtml(approvedText), '');
    }
  }
  const findings = [];
  for (const [label, regex] of riskRulesFor(model, product)) {
    const matches = [...text.matchAll(regex)];
    if (matches.length) {
      const samples = matches.map((item) => text
        .slice(Math.max(0, item.index - 60), item.index + item[0].length + 60)
        .replace(/\s+/g, ' ')
        .trim());
      findings.push({ label, count: matches.length, samples: [...new Set(samples)].slice(0, 3) });
    }
  }
  return findings;
}

function parseStructuredData(value, label) {
  return locateProductJsonScript(value, label).data;
}

function validateProtectedContent(original, next, model, product, locale) {
  const label = `${model}/${locale}`;
  const copy = COPY[locale];
  const buyerCopy = BUYER_COPY[locale];
  const originalEvidence = extractApplicationEvidence(original, `${label}: original application evidence`);
  const nextEvidence = extractApplicationEvidence(next, `${label}: generated application evidence`);
  const expectedEvidenceKeys = EXPECTED_APPLICATION_EVIDENCE[model] ?? [];
  assertEqual(
    JSON.stringify(originalEvidence.map((item) => item.key)),
    JSON.stringify(expectedEvidenceKeys),
    `${label}: approved application-evidence contract`,
  );
  assertEqual(
    markerSlice(next, '<!-- ===== HEADER ===== -->', '<!-- ===== BREADCRUMB ===== -->', `${label}: header`),
    markerSlice(original, '<!-- ===== HEADER ===== -->', '<!-- ===== BREADCRUMB ===== -->', `${label}: header`),
    `${label}: header`,
  );
  assertEqual(
    normalizeProtectedTail(next.slice(next.indexOf(END_MARKER)), label),
    normalizeProtectedTail(original.slice(original.indexOf(END_MARKER)), label),
    `${label}: related resources/page tail`,
  );
  assertEqual(
    getOne(next, /<nav class="pd-jump-nav"[\s\S]*?<\/nav>/i, `${label}: jump navigation`),
    getOne(original, /<nav class="pd-jump-nav"[\s\S]*?<\/nav>/i, `${label}: jump navigation`),
    `${label}: jump navigation`,
  );
  assertEqual(JSON.stringify(utilityCoreSignature(next, label)), JSON.stringify(utilityCoreSignature(original, label)), `${label}: download/compare utilities`);
  assertEqual(
    getOne(next, /<dl class="pd-key-specs"[\s\S]*?<\/dl>/i, `${label}: key specs`),
    getOne(original, /<dl class="pd-key-specs"[\s\S]*?<\/dl>/i, `${label}: key specs`),
    `${label}: first-view key specs`,
  );
  assertEqual(JSON.stringify(actionSignature(next, label)), JSON.stringify(actionSignature(original, label)), `${label}: quote/CAD actions`);
  assertEqual(JSON.stringify(shareSignature(next, label)), JSON.stringify(shareSignature(original, label)), `${label}: share channels`);
  assertLocalizedShareTargets(next, model, locale, label);
  assertEqual(JSON.stringify(galleryAssetSignature(next, label)), JSON.stringify(galleryAssetSignature(original, label)), `${label}: gallery assets`);
  const expectedCustomerEvidence = originalEvidence.map((item) => ({
    ...item,
    html: renderCustomerApplicationEvidence(model, locale, item),
  }));
  assertEqual(JSON.stringify(nextEvidence), JSON.stringify(expectedCustomerEvidence), `${label}: customer-facing application copy`);
  if (countMatches(next, /<form\b/gi) !== countMatches(original, /<form\b/gi)) throw new Error(`${label}: form count changed`);

  for (const id of ['panel-specs', 'panel-compat', 'panel-install', 'panel-downloads', 'faq']) {
    if (countMatches(next, new RegExp(`id="${id}"`, 'g')) !== 1) throw new Error(`${label}: required section #${id} missing or duplicated`);
  }
  if (countMatches(next, /class="faq-item"/g) !== 5
    || countMatches(next, /<details class="faq-item" open>/g) !== 1
    || !/<div class="faq-mini">\s*<details class="faq-item" open>/i.test(next)) {
    throw new Error(`${label}: FAQ source must contain five details items with only the first item open`);
  }
  if (/"@type"\s*:\s*"FAQPage"/i.test(next)) throw new Error(`${label}: FAQPage structured data must not be generated`);
  const relatedPanel = markerSlice(next, '<!-- ===== RELATED PRODUCTS ===== -->', '<!-- ===== FAQ ===== -->', `${label}: related products`);
  if (countMatches(relatedPanel, /class="related-card"/g) !== 4
    || countMatches(relatedPanel, /<a href="BP-[^"]+\.html" class="related-card">/g) !== 3
    || countMatches(relatedPanel, /href="contact\.html\?request=application-review/gi) !== 1
    || !relatedPanel.includes(buyerCopy.helpAction)) {
    throw new Error(`${label}: related products must contain three model cards and one application-review help card`);
  }
  const expectedBottomHref = `contact.html?request=application-review&amp;model=${encodeURIComponent(model)}&amp;product=${encodeURIComponent(identityContract(model, locale).linkLabel)}&amp;source=${model}.html#quoteForm`;
  const bottomCta = getOne(next, BOTTOM_CTA_PATTERN, `${label}: generated bottom CTA`);
  if (!bottomCta.includes(`href="${expectedBottomHref}"`)
    || !bottomCta.includes(buyerCopy.bottomAction)
    || !bottomCta.includes(buyerCopy.privacyLead)
    || !bottomCta.includes(buyerCopy.privacy)) {
    throw new Error(`${label}: bottom application-review CTA is incomplete`);
  }
  if (countMatches(next, TECHNICAL_NOTE_PATTERN) !== 0) throw new Error(`${label}: retired technical-note block remains`);
  assertMainHeadingOrder(next, label);
  const modelApplicationCopy = applicationCopyForModel(model, locale, productFacts(model, product, locale));
  if (modelApplicationCopy) {
    const applicationPanel = markerSlice(
      next,
      '<!-- Panel: Compatible Machines -->',
      '<!-- Panel: Installation -->',
      `${label}: equipment application panel`,
    );
    const expectedCardCount = expectedEvidenceKeys.length + modelApplicationCopy.cards.length;
    if (countMatches(applicationPanel, /class="compat-item"/g) !== expectedCardCount) {
      throw new Error(`${label}: expected ${expectedCardCount} equipment application cards`);
    }
    for (const term of modelApplicationCopy.requiredTerms) {
      if (!applicationPanel.includes(term)) throw new Error(`${label}: equipment application term is missing: ${term}`);
    }
    if (countMatches(applicationPanel, /href="contact\.html\?request=application-review/gi) !== 1
      || !applicationPanel.includes(buyerCopy.compatAction)
      || !applicationPanel.includes(buyerCopy.compatTitle)
      || applicationPanel.includes(copy.notApproved)) {
      throw new Error(`${label}: equipment application inquiry module is incomplete or the retired warning remains`);
    }
  }
  if (/\bundefined\b/i.test(controlledRegion(next))) throw new Error(`${label}: generated customer-facing content contains undefined`);
  if (locale !== 'en' && /\b(?:View model|Compare models|Request review|Make the machine safe)\b/.test(controlledRegion(next))) {
    throw new Error(`${label}: generated customer-facing content contains an untranslated English sentinel`);
  }

  const warrantyRow = `<tr><th>${escapeHtml(copy.labels.warranty)}</th><td>${escapeHtml(copy.warranty)}</td></tr>`;
  if (!next.includes(warrantyRow)) throw new Error(`${label}: exact one-year warranty row missing`);
  const structured = parseStructuredData(next, label);
  const graph = Array.isArray(structured['@graph']) ? structured['@graph'] : [structured];
  const productNode = graph.find((item) => item['@type'] === 'Product');
  const ui = drawingBackedUiContract(locale, model);
  const metadata = identityContract(model, locale);
  if (productNode?.description !== ui.structuredDescription) throw new Error(`${label}: Product JSON-LD description drifted from drawingBackedUiContract`);
  if (productNode?.name !== (ui.productName || metadata.h1)) throw new Error(`${label}: Product JSON-LD name drifted from shared contract`);
  assertUiJsonProperties(productNode, ui, model, locale);
  const warrantyProperty = productNode?.additionalProperty?.find((item) => item.name === copy.labels.warranty);
  if (warrantyProperty?.value !== copy.warranty) throw new Error(`${label}: JSON-LD one-year warranty missing`);

  if (ENGINEERING_PENDING_MODELS.has(model)) {
    const direct = new RegExp(`(?:\.\./)?downloads/${escapeRegExp(model)}\\.pdf`, 'i');
    if (direct.test(next)) throw new Error(`${label}: identity-pending drawing remains directly linked`);
  }
  const afterRisks = findRisks(next, model, product);
  if (afterRisks.length) {
    throw new Error(`${label}: residual controlled-content risks: ${afterRisks.map((item) => `${item.label} (${item.count}: ${item.samples.join(', ')})`).join('; ')}`);
  }
}

function transformPage(original, model, product, locale, orderedModels, products) {
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const contract = identityContract(model, locale);
  const ui = drawingBackedUiContract(locale, model);
  const applicationEvidenceBlocks = extractApplicationEvidence(original, `${model}/${locale}: application evidence`)
    .map((item) => renderCustomerApplicationEvidence(model, locale, item));
  const surfaces = new Set();
  let next = original;
  const applySurface = (name, operation) => {
    const before = next;
    next = operation(next);
    if (next !== before) surfaces.add(name);
  };
  applySurface('metadata', (value) => updateHeadIdentity(value, contract, `${model}/${locale}`));
  applySurface('structured-data', (value) => updateStructuredData(value, model, product, locale, contract, ui));
  applySurface('visible-identity-and-share', (value) => updateFirstViewIdentity(value, model, locale, contract));
  applySurface('long-form-content', (value) => replaceDeepContent(
    value,
    renderDeepContent(model, product, locale, orderedModels, products, applicationEvidenceBlocks),
    newline,
    `${model}/${locale}`,
  ));
  applySurface('bottom-cta', (value) => replaceBottomCta(
    value,
    renderBottomCta(model, locale, contract),
    newline,
    `${model}/${locale}`,
  ));
  applySurface('legacy-technical-note-removal', (value) => removeLegacyTechnicalNote(value, `${model}/${locale}`));
  validateProtectedContent(original, next, model, product, locale);
  return { next, surfaces, beforeRisks: findRisks(original, model, product), afterRisks: findRisks(next, model, product) };
}

function parseMode(argv) {
  const supported = new Set(['--check', '--write']);
  const unknown = argv.filter((item) => !supported.has(item));
  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  if (argv.includes('--check') && argv.includes('--write')) throw new Error('Choose --check or --write, not both');
  if (argv.includes('--write')) return 'write';
  if (argv.includes('--check')) return 'check';
  return 'preview';
}

function printRiskSummary(items, key) {
  const counts = new Map();
  for (const item of items) {
    for (const finding of item[key]) counts.set(finding.label, (counts.get(finding.label) ?? 0) + finding.count);
  }
  if (!counts.size) return 'none';
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => `${label}: ${count}`).join('; ');
}

function printBoundarySamples() {
  const models = ['BP-1P-0006', 'BP-2P-30-0001', 'BP-2P-95-0005', 'BP-3P-0006', 'BP-3P-S06-0001'];
  console.log('\nBoundary identity samples (shared metadata contract):');
  for (const model of models) {
    for (const locale of Object.keys(LOCALES)) {
      const contract = identityContract(model, locale);
      const ui = drawingBackedUiContract(locale, model);
      console.log(`- ${locale}/${model}`);
      console.log(`  title: ${contract.title}`);
      console.log(`  H1: ${contract.h1}`);
      console.log(`  breadcrumb: ${contract.breadcrumb}`);
      console.log(`  description: ${contract.description}`);
      if (ui.status === 'identity-pending') {
        console.log(`  engineering fields: ${ui.fields.pressure}`);
      } else {
        console.log(`  ports: ${ui.fields.ports}`);
        console.log(`  medium: ${ui.fields.media}`);
        if (ui.hybridInterfacePropertyName) console.log(`  hybrid interface: ${ui.keyValues.channels}`);
      }
    }
  }
}

export function drawingBackedDeepIdentity(model, locale) {
  if (!LOCALES[locale]) throw new Error(`Unsupported locale: ${locale}`);
  return identityContract(model, locale);
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const products = manifest.products ?? {};
  const orderedModels = Object.keys(products);
  if (orderedModels.length !== 16) throw new Error(`Expected 16 drawing-manifest products, found ${orderedModels.length}`);

  const plans = [];
  for (const model of orderedModels) {
    const product = products[model];
    for (const { locale, relativePath } of productPaths(model)) {
      if (relativePath.toLowerCase().includes('catalog-project')) throw new Error(`Protected path rejected: ${relativePath}`);
      const absolutePath = path.resolve(ROOT_DIR, relativePath);
      if (!absolutePath.startsWith(`${ROOT_DIR}${path.sep}`)) throw new Error(`Path escaped repository root: ${relativePath}`);
      const original = await fs.readFile(absolutePath, 'utf8');
      const result = transformPage(original, model, product, locale, orderedModels, products);
      plans.push({ model, locale, relativePath, absolutePath, original, ...result });
    }
  }

  const changed = plans.filter((item) => item.next !== item.original);
  const surfaceCounts = new Map();
  for (const item of changed) for (const surface of item.surfaces) surfaceCounts.set(surface, (surfaceCounts.get(surface) ?? 0) + 1);

  console.log(`Drawing-backed long-form product content: ${mode}`);
  console.log(`Pages scanned: ${plans.length} (16 models × 4 languages)`);
  console.log(`Pages requiring synchronization: ${changed.length}`);
  if (changed.length) console.log(`Files requiring synchronization: ${changed.map((item) => item.relativePath).join(', ')}`);
  console.log(`Changed surfaces: ${[...surfaceCounts.entries()].map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Controlled legacy-risk matches before: ${printRiskSummary(plans, 'beforeRisks')}`);
  console.log(`Controlled residual-risk matches after proposed transform: ${printRiskSummary(plans, 'afterRisks')}`);
  console.log('Protected unchanged surfaces: header, jump navigation, quote/CAD actions, first-view download/compare utilities, share channels, first-view key specs, gallery assets, related resources, footer, and forms. Bottom CTA is drawing-controlled; the retired technical-note block is removed when present.');
  console.log('Engineering holds: BP-3P-0006 port specification; BP-3P-S06-0001 electrical allocation/ratings.');

  if (mode === 'write') {
    for (const item of changed) await fs.writeFile(item.absolutePath, item.next, 'utf8');
    console.log(`Wrote ${changed.length} page(s). No commit, push, deployment, form, email, or server action was performed.`);
  } else {
    console.log('Read-only run: no website file was modified. Use --write only after explicit review approval.');
  }

  if (mode === 'check') printBoundarySamples();
  if (mode === 'check' && changed.length) process.exitCode = 1;
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
