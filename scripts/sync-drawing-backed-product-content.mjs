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
if (productDetailUiContract.schemaVersion !== 4) {
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
    verifiedBasis: 'Use this model page for initial selection and confirm the final order configuration before release.',
    pendingBasis: 'Project confirmation is required before technical selection.',
    pendingAction: 'Request the current model-specific file before selection, design release, quotation acceptance, or ordering.',
    approvedUse: 'Confirm the actual medium, pressure, speed, temperature, duty cycle, mounting, and environment for the selected configuration.',
    specHeading: 'Technical Data',
    specIntro: 'The table below lists the confirmed technical values for this model. Unstated values are not inferred.',
    specIntroPending: 'Technical values are withheld until the model-specific file is confirmed for the project.',
    labels: {
      model: 'Model number', status: 'Project status', document: 'Reference file', pressure: 'Maximum pressure',
      speed: 'Maximum speed', media: 'Suitable media', body: 'Body material', seal: 'Seal materials',
      ports: 'Port annotations', mounting: 'Mounting features', envelope: 'Envelope', bore: 'Through bore',
      temperature: 'Temperature range', weight: 'Weight', electrical: 'Electrical interface', warranty: 'Warranty period',
    },
    statusVerified: 'Ready for project confirmation',
    statusPending: 'Project confirmation required before selection',
    portsCountPending: 'Outlet count pending engineering confirmation; no outlet count is published as confirmed',
    portsSizePending: 'Port specification pending an approved corrected drawing',
    inletPending: 'Air inlet connection is not unambiguously identified in the drawing',
    mountNotStated: 'Separate mounting features are not stated in the drawing',
    noBore: 'No through-bore value is published from the drawing',
    warranty: '1 year',
    electrical: 'The drawing shows 6 electrical leads; circuit allocation and electrical ratings require an approved specification',
    selectionNoteTitle: 'Release note',
    selectionNote: 'Do not transfer dimensions, ports, materials, ratings, or installation values from another model or an older web page.',
    compatHeading: 'Machine Compatibility and Application Fit',
    compatIntro: 'Compatibility is determined by the machine requirements and the approved model-specific drawing, not by product-family similarity alone.',
    compatCards: [
      ['Circuit and port match', 'Compare every machine circuit and port role with the selected configuration. Resolve any pending port annotation before design release.'],
      ['Pressure and speed', 'Confirm the combined medium, pressure, speed, temperature, and duty cycle for the selected configuration.'],
      ['Mounting and envelope', 'Check the stated mounting features, surrounding clearance, hose routing, shaft alignment, and external loads in the machine assembly.'],
      ['Documentation', 'Freeze the final revision and order specification before machining mating parts or releasing procurement.'],
    ],
    notApproved: 'Do not approve from this page alone',
    notApprovedItems: [
      'Media not listed on the page', 'Operation above a published maximum',
      'Unresolved port or electrical-interface details',
      'Regulated, safety-critical, food-contact, vacuum, or special-environment service without project review',
    ],
    installHeading: 'Installation and Commissioning Guidance',
    installIntro: 'The approved drawing and order specification take precedence over this general guidance.',
    installSteps: [
      ['Make the machine safe', 'Before work, isolate and lock out every energy source, fully depressurize all passages, and prevent any unintended rotation.'],
      ['Verify the released documents', 'Confirm the model, revision, port annotations, mounting features, and ordered configuration before installation.'],
      ['Check interfaces before assembly', 'Match threads, holes, sealing faces, mating dimensions, and orientation exactly. Do not infer adapters, tightening torque, or sealant from another model.'],
      ['Control alignment and external loads', 'Support hoses and fixed-side hardware so bending, tension, torsion, misalignment, and machine loads are not transferred into the rotary joint.'],
      ['Connect the approved medium', 'Use only the listed medium unless a different medium and all wetted materials have been approved in writing for the order.'],
      ['Commission under controlled conditions', 'Start below the approved project limits. Check every passage for leakage and monitor friction, temperature, vibration, and abnormal noise before increasing duty.'],
    ],
    maintenanceTitle: 'Inspection interval',
    maintenance: 'Set inspection and replacement intervals from recorded operating conditions and inspection results. The drawing does not state a universal service-life interval.',
    downloadsHeading: 'Downloads and Engineering Files',
    drawingTitle: '2D engineering drawing (PDF)', drawingDescription: 'Reviewed drawing file for this website model. Confirm the approved revision before design release or ordering.',
    drawingPendingTitle: 'Request model-specific file', drawingPendingDescription: 'Request the current model-specific file before technical selection or ordering.',
    cadTitle: 'Request 3D STEP/IGES file', cadDescription: 'CAD availability and revision are confirmed after the model and application requirements are reviewed.',
    manualTitle: 'General installation manual (PDF)', manualDescription: 'General handling and commissioning guidance. The order specification and final revision take precedence.',
    docsTitle: 'Inspection and order documentation', docsDescription: 'State required inspection records, material documents, and acceptance criteria before ordering.',
    selectLabel: 'Model selection', selectHeading: 'Release Checklist',
    selectIntro: 'Use this checklist before accepting the model for a machine design.',
    selectHeaders: ['Check', 'Page status', 'Required action'],
    selectRows: [
      ['Model identity', 'Use this model number', 'Confirm the selected model matches the order requirement.'],
      ['Ports and mounting', 'Published only where legible', 'Resolve every pending or anomalous annotation before machining mating parts.'],
      ['Operating limits', 'Published maximums', 'Approve the combined operating condition; do not treat maximums as a duty-cycle guarantee.'],
      ['Media and materials', 'Listed values only', 'Obtain written approval for any different medium, seal, body material, or environment.'],
    ],
    commonLabel: 'Common mistakes', commonHeading: 'Three Selection and Installation Risks',
    commonIntro: 'These controls prevent unsupported web claims from becoming machine specifications.',
    commonCards: [
      ['Using the wrong model reference', 'Confirm that the selected model matches the website SKU and purchase order.'],
      ['Filling in an unstated value', 'Do not infer port size, torque, bearing type, seal compound, media compatibility, electrical rating, or service life.'],
      ['Treating a maximum as a continuous rating', 'Approve the actual combined duty and verify the installation under controlled commissioning conditions.'],
    ],
    relatedHeading: 'Related Products', relatedIntro: 'Compare nearby models by their own specifications; facts are not transferable between SKUs.',
    relatedDescription: 'Open this model page and check its own specification before comparison or selection.',
    compareTitle: 'Compare models', compareDescription: 'Use the comparison page to shortlist models, then confirm each shortlisted model against its approved drawing.',
    customTitle: 'Engineering review', customDescription: 'Send the required passages, medium, pressure, speed, temperature, mounting, envelope, and documentation needs for review.',
    viewModel: 'View model', compareModels: 'Compare models', requestReview: 'Request review',
    technicalNoteLabel: 'Technical Note:',
    technicalNote: 'Each finished unit follows the documented production inspection process. Published technical values are maximums for model selection, not a guarantee of continuous-duty performance. Confirm the final revision, medium, pressure, speed, temperature, mounting, duty cycle, environment, and maintenance plan for the order.',
    technicalNotePending: 'Each finished unit follows the documented production inspection process. Request the current model-specific file before design release or ordering.',
    faqHeading: 'Frequently Asked Questions',
    faqSourceQ: 'Which source controls the technical data on this page?',
    faqSourceA: 'The published values are model-specific technical data. The confirmed order specification controls the delivered configuration.',
    faqMaxQ: 'Are the listed pressure and speed continuous-duty ratings?',
    faqMaxA: 'No. They are maximum values for selection. The allowable combined duty must be confirmed for the actual medium, pressure, speed, temperature, mounting, environment, and duty cycle.',
    faqMediaQ: 'Which media are stated for this model?',
    faqPortsQ: 'How should the ports and mounting be confirmed?',
    faqPortsA: 'Use the latest approved model-specific drawing. Do not normalize an unusual annotation or reuse another model’s interface.',
    faqCadQ: 'Can I request a technical file or 3D CAD file?',
    faqCadA: 'Yes. Use the drawing or CAD request link and include the model, machine requirements, quantity, and required file format. Availability and revision are confirmed per project.',
    faqPendingA: 'Technical values are published after project confirmation. Request the current model-specific file before using this SKU in a design or order.',
    faqElectricalQ: 'Are six electrical circuits and their ratings defined?',
    faqElectricalA: 'No. This model has six electrical leads. Circuit allocation, voltage, current, contact material, and other ratings require an approved electrical specification.',
  },
  de: {
    home: 'Startseite', products: 'Produkte', category: 'Pneumatische Drehdurchführung', productOverview: 'Produktübersicht',
    drawingSummary: 'Technische Zusammenfassung', drawingBasis: 'Auswahlbasis', operatingLimits: 'Betriebsgrenzen',
    materialsMedia: 'Werkstoffe und Medium', interfaces: 'Anschlüsse', selectionStatus: 'Freigabestatus',
    verifiedBasis: 'Diese Modellseite für die Vorauswahl nutzen und die endgültige Auftragsausführung vor Freigabe bestätigen.',
    pendingBasis: 'Vor der technischen Auswahl ist eine projektbezogene Bestätigung erforderlich.',
    pendingAction: 'Vor Auswahl, Konstruktionsfreigabe, Angebotsannahme oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    approvedUse: 'Medium, Druck, Drehzahl, Temperatur, Einschaltdauer, Montage und Umgebung für die gewählte Ausführung bestätigen.',
    specHeading: 'Technische Daten',
    specIntro: 'Die Tabelle enthält bestätigte technische Werte für dieses Modell. Fehlende Werte werden nicht abgeleitet.',
    specIntroPending: 'Technische Werte bleiben gesperrt, bis die modellspezifische Datei projektbezogen bestätigt ist.',
    labels: {
      model: 'Modellnummer', status: 'Projektstatus', document: 'Referenzdatei', pressure: 'Maximaldruck',
      speed: 'Maximale Drehzahl', media: 'Geeignete Medien', body: 'Gehäusewerkstoff', seal: 'Dichtungswerkstoffe',
      ports: 'Anschlussangaben', mounting: 'Montagemerkmale', envelope: 'Außenabmessungen', bore: 'Durchgangsbohrung',
      temperature: 'Temperaturbereich', weight: 'Gewicht', electrical: 'Elektrische Schnittstelle', warranty: 'Garantiezeitraum',
    },
    statusVerified: 'Bereit zur Projektbestätigung',
    statusPending: 'Projektbestätigung vor Auswahl erforderlich',
    portsCountPending: 'Ausgangsanzahl bis zur technischen Bestätigung offen; keine Ausgangsanzahl wird als bestätigt veröffentlicht',
    portsSizePending: 'Anschlussspezifikation bis zu einer freigegebenen korrigierten Zeichnung offen',
    inletPending: 'Der Luftanschluss auf der Eingangsseite ist in der Zeichnung nicht eindeutig gekennzeichnet',
    mountNotStated: 'Separate Montagemerkmale sind in der Zeichnung nicht angegeben',
    noBore: 'Aus der Zeichnung wird kein Wert für eine Durchgangsbohrung veröffentlicht',
    warranty: '1 Jahr',
    electrical: 'Die Zeichnung zeigt 6 elektrische Leitungen; Kreiszuordnung und elektrische Nennwerte erfordern eine freigegebene Spezifikation',
    selectionNoteTitle: 'Freigabehinweis',
    selectionNote: 'Abmessungen, Anschlüsse, Werkstoffe, Nennwerte oder Montagewerte dürfen nicht von einem anderen Modell oder einer älteren Webseite übernommen werden.',
    compatHeading: 'Maschinenkompatibilität und Anwendungseignung',
    compatIntro: 'Die Eignung ergibt sich aus den Maschinenanforderungen und der gewählten modellspezifischen Ausführung, nicht allein aus der Ähnlichkeit innerhalb der Baureihe.',
    compatCards: [
      ['Kreise und Anschlüsse', 'Jeden Maschinenkreis und jede Anschlussfunktion mit der gewählten Ausführung vergleichen. Offene Anschlussangaben vor der Konstruktionsfreigabe klären.'],
      ['Druck und Drehzahl', 'Die kombinierte Belastung aus Medium, Druck, Drehzahl, Temperatur und Einschaltdauer für die gewählte Ausführung bestätigen.'],
      ['Montage und Bauraum', 'Montagemerkmale, Freiraum, Schlauchführung, Ausrichtung und äußere Lasten in der Baugruppe prüfen.'],
      ['Dokumentation', 'Auftragsspezifikation und endgültige Revision vor Bearbeitung der Gegenstücke oder Beschaffungsfreigabe festschreiben.'],
    ],
    notApproved: 'Nicht allein anhand dieser Seite freigeben',
    notApprovedItems: ['Nicht gelistete Medien', 'Betrieb oberhalb eines veröffentlichten Höchstwerts', 'Offene Anschluss- oder Elektroschnittstellenangaben', 'Regulierte, sicherheitskritische oder besondere Umgebungen ohne Projektprüfung'],
    installHeading: 'Montage- und Inbetriebnahmehinweise', installIntro: 'Auftragsspezifikation und endgültige Revision haben Vorrang vor diesen allgemeinen Hinweisen.',
    installSteps: [
      ['Anlage sicher stillsetzen', 'Vor Arbeiten alle Energiequellen abschalten und gegen Wiedereinschalten sichern, alle Kanäle vollständig drucklos machen und unbeabsichtigte Drehbewegung verhindern.'],
      ['Freigegebene Unterlagen prüfen', 'Modell, Revision, Anschlussangaben, Montagemerkmale und bestellte Ausführung vor der Montage bestätigen.'],
      ['Schnittstellen vor der Montage prüfen', 'Gewinde, Bohrungen, Dichtflächen, Gegenmaße und Orientierung exakt abgleichen. Adapter, Anzugsmoment oder Dichtmittel nicht von einem anderen Modell ableiten.'],
      ['Ausrichtung und äußere Lasten beherrschen', 'Schläuche und Festseite so abstützen, dass Biegung, Zug, Torsion, Fluchtfehler und Maschinenlasten nicht in die Drehdurchführung eingeleitet werden.'],
      ['Freigegebenes Medium anschließen', 'Nur das gelistete Medium verwenden, sofern kein anderes Medium einschließlich aller medienberührten Werkstoffe schriftlich freigegeben wurde.'],
      ['Kontrolliert in Betrieb nehmen', 'Unterhalb der freigegebenen Projektgrenzen beginnen. Alle Kanäle auf Leckage prüfen und Reibung, Temperatur, Schwingung sowie ungewöhnliche Geräusche überwachen.'],
    ],
    maintenanceTitle: 'Prüfintervall', maintenance: 'Prüf- und Austauschintervalle aus dokumentierten Betriebsbedingungen und Prüfergebnissen festlegen. Ein universeller Lebensdauerwert ist nicht angegeben.',
    downloadsHeading: 'Downloads und Konstruktionsdaten', drawingTitle: '2D-Technikzeichnung (PDF)', drawingDescription: 'Technische Datei für dieses Website-Modell. Vor Konstruktionsfreigabe oder Bestellung die endgültige Revision bestätigen.',
    drawingPendingTitle: 'Modellspezifische Datei anfordern', drawingPendingDescription: 'Vor technischen Entscheidungen oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    cadTitle: '3D-STEP-/IGES-Datei anfordern', cadDescription: 'CAD-Verfügbarkeit und Revision werden nach Prüfung von Modell und Anwendungsanforderungen bestätigt.',
    manualTitle: 'Allgemeine Montageanleitung (PDF)', manualDescription: 'Allgemeine Hinweise zu Handhabung und Inbetriebnahme. Freigegebene Modellzeichnung und Auftragsspezifikation haben Vorrang.',
    docsTitle: 'Prüf- und Auftragsdokumentation', docsDescription: 'Benötigte Prüfprotokolle, Werkstoffunterlagen und Abnahmekriterien vor der Bestellung angeben.',
    selectLabel: 'Modellauswahl', selectHeading: 'Freigabe-Checkliste', selectIntro: 'Diese Punkte vor der Übernahme des Modells in eine Maschinenkonstruktion prüfen.',
    selectHeaders: ['Prüfpunkt', 'Status auf der Seite', 'Erforderliche Maßnahme'],
    selectRows: [['Modellauswahl', 'Modellnummer verwenden', 'Bestätigen, dass das ausgewählte Modell zu Website-Artikelnummer und Bestellung passt.'], ['Anschlüsse und Montage', 'Nur bei lesbarer Angabe veröffentlicht', 'Offene oder ungewöhnliche Angaben vor Bearbeitung der Gegenstücke klären.'], ['Betriebsgrenzen', 'Veröffentlichte Höchstwerte', 'Kombinierte Betriebsbedingungen freigeben; Höchstwerte sind keine Dauerbetriebszusage.'], ['Medien und Werkstoffe', 'Gelistete Werte', 'Für andere Medien, Dichtungen, Gehäusewerkstoffe oder Umgebungen schriftliche Freigabe einholen.']],
    commonLabel: 'Häufige Fehler', commonHeading: 'Drei Risiken bei Auswahl und Montage', commonIntro: 'Diese Kontrollen verhindern, dass unbelegte Webangaben zu Maschinenspezifikationen werden.',
    commonCards: [['Falsche Modellreferenz verwenden', 'Bestätigen, dass das ausgewählte Modell zu Website-Artikelnummer und Bestellung passt.'], ['Fehlende Werte ergänzen', 'Anschlussgröße, Anzugsmoment, Lagertyp, Dichtungswerkstoff, Medienverträglichkeit, elektrische Nennwerte oder Lebensdauer nicht ableiten.'], ['Höchstwert als Dauernennwert behandeln', 'Tatsächliche kombinierte Belastung freigeben und die Montage kontrolliert in Betrieb nehmen.']],
    relatedHeading: 'Verwandte Produkte', relatedIntro: 'Benachbarte Modelle anhand ihrer eigenen Spezifikationen vergleichen; Daten sind nicht zwischen Artikelnummern übertragbar.', relatedDescription: 'Modellseite öffnen und vor Vergleich oder Auswahl die Spezifikation prüfen.',
    compareTitle: 'Modelle vergleichen', compareDescription: 'Auf der Vergleichsseite Modelle vorsortieren und anschließend jedes Modell für die gewählte Anwendung bestätigen.',
    customTitle: 'Technische Prüfung', customDescription: 'Benötigte Kanäle, Medium, Druck, Drehzahl, Temperatur, Montage, Bauraum und Dokumentation zur Prüfung senden.',
    viewModel: 'Modell ansehen', compareModels: 'Modelle vergleichen', requestReview: 'Prüfung anfragen',
    technicalNoteLabel: 'Technischer Hinweis:',
    technicalNote: 'Jede fertige Einheit durchläuft den dokumentierten Produktionsprüfprozess. Veröffentlichte technische Werte sind Höchstwerte für die Modellauswahl und keine Zusage für Dauerbetrieb. Endgültige Revision, Medium, Druck, Drehzahl, Temperatur, Montage, Einschaltdauer, Umgebung und Wartungsplan für den Auftrag bestätigen.',
    technicalNotePending: 'Jede fertige Einheit durchläuft den dokumentierten Produktionsprüfprozess. Vor Konstruktionsfreigabe oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    faqHeading: 'Häufig gestellte Fragen', faqSourceQ: 'Welche Quelle bestimmt die technischen Daten dieser Seite?', faqSourceA: 'Die veröffentlichten Werte sind modellspezifische technische Daten. Für die Lieferung gilt die bestätigte Auftragsspezifikation.',
    faqMaxQ: 'Sind Druck und Drehzahl für Dauerbetrieb freigegeben?', faqMaxA: 'Nein. Es sind Höchstwerte für die Auswahl. Die zulässige kombinierte Belastung ist für Medium, Druck, Drehzahl, Temperatur, Montage, Umgebung und Einschaltdauer zu bestätigen.',
    faqMediaQ: 'Welche Medien sind für dieses Modell geeignet?', faqPortsQ: 'Wie werden Anschlüsse und Montage bestätigt?', faqPortsA: 'Die aktuelle modellspezifische Spezifikation verwenden. Ungewöhnliche Angaben nicht normalisieren und keine Schnittstelle eines anderen Modells übernehmen.',
    faqCadQ: 'Kann ich eine technische Datei oder 3D-CAD-Datei anfordern?', faqCadA: 'Ja. Modell, Maschinenanforderungen, Menge und Dateiformat angeben. Verfügbarkeit und Revision werden projektbezogen bestätigt.',
    faqPendingA: 'Technische Werte werden erst nach projektbezogener Bestätigung veröffentlicht. Vor Konstruktion oder Bestellung die aktuelle modellspezifische Datei anfordern.',
    faqElectricalQ: 'Definiert die technische Datei sechs Stromkreise oder deren Nennwerte?', faqElectricalA: 'Nein. Sie zeigt sechs elektrische Leitungen. Kreiszuordnung, Spannung, Strom, Kontaktwerkstoff und weitere Nennwerte erfordern eine freigegebene Elektrospezifikation.',
  },
};

COPY.ja = {
  ...COPY.en,
  home: 'ホーム', products: '製品', category: '空圧ロータリージョイント', productOverview: '製品概要',
  drawingSummary: '技術要約', drawingBasis: '選定条件', operatingLimits: '使用限界', materialsMedia: '材質・流体', interfaces: '接続仕様', selectionStatus: '選定状態',
  verifiedBasis: 'この型式ページを初期選定に使用し、最終注文仕様はリリース前に確認してください。',
  pendingBasis: '技術選定前に案件ごとの確認が必要です。',
  pendingAction: '選定、設計承認、見積承認、発注の前に、現在の型式専用ファイルを入手してください。',
  approvedUse: '実際の流体、圧力、回転数、温度、デューティ、取付け、環境を選定仕様で確認してください。',
  specHeading: '技術情報',
  specIntro: '以下はこの型式の確認済み技術値です。記載のない値は推定していません。',
  specIntroPending: '型式専用ファイルを案件ごとに確認できるまで、技術値は公開しません。',
  labels: { model: '型式', status: '案件状態', document: '参照ファイル', pressure: '最高使用圧力', speed: '最高回転数', media: '適用流体', body: 'ボディ材質', seal: 'シール材質', ports: 'ポート注記', mounting: '取付仕様', envelope: '外形寸法', bore: '貫通穴', temperature: '温度範囲', weight: '質量', electrical: '電気インターフェース', warranty: '保証期間' },
  statusVerified: '案件確認の対象', statusPending: '選定前に案件確認が必要',
  portsCountPending: '出口数は担当設計部門の確認待ちで、確定値は公開しません', portsSizePending: 'ポート仕様は承認済みの訂正版図面での確認待ちです',
  inletPending: '空気入口接続は明確に特定できません', mountNotStated: '独立した取付仕様は記載されていません', noBore: '貫通穴寸法は公開していません',
  warranty: '1年', electrical: '電気リード6本です。回路割当と電気定格は承認済み仕様書で確認します',
  selectionNoteTitle: '承認上の注意', selectionNote: '別型式や旧ページの寸法、ポート、材質、定格、取付値を転用しないでください。',
  compatHeading: '適合機械と用途条件', compatIntro: '適合性は、製品系列の類似性ではなく、機械要件と選定仕様で判断します。',
  compatCards: [['回路・ポートの一致', '機械の全回路と各ポート機能を選定仕様と照合し、未確定の注記は設計承認前に解決してください。'], ['圧力・回転数', '流体、圧力、回転数、温度、デューティの組合せを選定仕様で確認してください。'], ['取付け・外形', '取付仕様、周囲すきま、ホース経路、軸芯、外力を機械組立状態で確認してください。'], ['文書管理', '相手部品の加工や調達承認前に、最終版と注文仕様を固定してください。']],
  notApproved: 'このページだけでは承認できない条件', notApprovedItems: ['記載されていない流体', '公開最大値を超える運転', '未解決のポートまたは電気仕様', '規制対象、安全上重要な用途、食品接触、真空、特殊環境で個別技術審査を受けていない場合'],
  installHeading: '取付け・試運転ガイド', installIntro: '注文仕様と最終版が、この一般ガイドより優先されます。',
  installSteps: [['設備を安全状態にする', '作業前にすべてのエネルギー源を遮断・ロックアウトし、全流路を完全に減圧し、意図しない回転を防止してください。'], ['承認文書を確認する', '取付け前に型式、版、ポート注記、取付仕様、注文構成を確認してください。'], ['組立前に接続部を照合する', 'ねじ、穴、シール面、相手寸法、向きを正確に照合し、別型式からアダプタ、締付トルク、シール剤を推定しないでください。'], ['芯出しと外力を管理する', '曲げ、引張り、ねじり、芯ずれ、機械荷重が本体へ伝わらないよう、ホースと固定側部品を支持してください。'], ['承認流体を接続する', '別流体と全接液材が注文仕様で書面承認されていない限り、記載された流体だけを使用してください。'], ['管理条件で試運転する', '承認済みの個別運転限界より低い条件から開始し、各流路の漏れ、摩擦、温度、振動、異音を確認してから負荷を上げてください。']],
  maintenanceTitle: '点検周期', maintenance: '記録した運転条件と点検結果に基づいて点検・交換周期を設定してください。共通の寿命値はありません。',
  downloadsHeading: 'ダウンロード・設計データ', drawingTitle: '2D技術図面（PDF）', drawingDescription: '本ページの型式用の技術ファイルです。設計承認・発注前に最終版を確認してください。',
  drawingPendingTitle: '型式専用ファイルを依頼', drawingPendingDescription: '技術判断または発注前に、現在の型式専用ファイルを依頼してください。',
  cadTitle: '3D STEP／IGESデータを依頼', cadDescription: '型式と用途条件を確認後、CADデータの提供可否とリビジョンを回答します。',
  manualTitle: '一般取付説明書（PDF）', manualDescription: '一般的な取扱い・試運転ガイドです。注文仕様と最終版が優先されます。',
  docsTitle: '検査・注文書類', docsDescription: '必要な検査記録、材質書類、受入基準は発注前に指定してください。',
  selectLabel: '型式選定', selectHeading: '設計承認チェックリスト', selectIntro: '機械設計で型式を承認する前に確認してください。',
  selectHeaders: ['確認項目', 'ページの状態', '必要な対応'], selectRows: [['型式の選定', '型式番号を使用', '選定型式が本ページの型式・注文型式と一致することを確認します。'], ['ポート・取付け', '判読できる記載のみ公開', '未確定または異常な注記は相手部品加工前に解決します。'], ['使用限界', '公開最大値', '組合せ使用条件を承認し、最大値を連続定格として扱いません。'], ['流体・材質', '記載値のみ', '別流体、シール、ボディ材、環境には書面承認を取得します。']],
  commonLabel: 'よくあるミス', commonHeading: '選定・取付けの3つのリスク', commonIntro: '根拠のないウェブ情報を機械仕様へ転記しないための確認事項です。',
  commonCards: [['誤った型式参照を使う', '選定型式が本ページの型式と注文型式に一致することを確認してください。'], ['未記載値を補完する', 'ポート寸法、締付トルク、軸受形式、シール材質、流体適合性、電気定格、寿命を推定しないでください。'], ['最大値を連続定格として扱う', '実際の組合せ条件を承認し、管理された試運転で取付状態を確認してください。']],
  relatedHeading: '関連製品', relatedIntro: '近い型式も各々の仕様で比較し、型式間で技術情報を転用しないでください。', relatedDescription: 'この型式ページを開き、比較・選定前にその型式の仕様を確認してください。',
  compareTitle: '型式を比較', compareDescription: '比較ページで候補を絞り、各候補を用途条件で最終確認してください。', customTitle: '技術確認', customDescription: '必要流路、流体、圧力、回転数、温度、取付け、外形、必要書類をお知らせください。',
  viewModel: '型式を見る', compareModels: '型式を比較', requestReview: '技術確認を依頼',
  technicalNoteLabel: '技術上の注意：',
  technicalNote: '完成品はすべて、公開された生産検査工程に従って検査します。公開技術値は型式選定用の最大値であり、連続運転性能を保証するものではありません。最終版、流体、圧力、回転数、温度、取付け、デューティ、環境、保守計画を注文仕様で確認してください。',
  technicalNotePending: '完成品はすべて、公開された生産検査工程に従って検査します。設計承認または発注の前に、現在の型式専用ファイルを依頼してください。',
  faqHeading: 'よくあるご質問', faqSourceQ: 'このページの技術情報は何を根拠にしていますか？', faqSourceA: '公開値は型式専用の技術データです。納入仕様は確認済みの注文仕様書で確定します。',
  faqMaxQ: '記載圧力と回転数は連続運転定格ですか？', faqMaxA: 'いいえ、選定用の最大値です。実際の流体、圧力、回転数、温度、取付け、環境、デューティを組み合わせて許容条件を確認します。',
  faqMediaQ: 'この型式に適用できる流体は何ですか？', faqPortsQ: 'ポートと取付仕様はどのように確認しますか？', faqPortsA: '最新版の型式専用仕様を使用してください。異常な注記を独自に読み替えたり、別型式の接続仕様を転用したりしないでください。',
  faqCadQ: '技術ファイルや3D CADを依頼できますか？', faqCadA: 'はい。型式、機械条件、数量、必要形式をお知らせください。提供可否と版は案件ごとに確認します。', faqPendingA: '案件確認が完了するまで技術値は公開しません。設計・発注前に現在の型式専用ファイルを依頼してください。',
  faqElectricalQ: '技術ファイルは電気6回路や定格を定義していますか？', faqElectricalA: 'いいえ。示されているのは電気リード6本です。回路割当、電圧、電流、接点材質、その他の定格は承認済み電気仕様書で確認します。',
};

COPY.ru = {
  ...COPY.en,
  home: 'Главная', products: 'Продукция', category: 'Пневматическое вращающееся соединение', productOverview: 'обзор изделия',
  drawingSummary: 'Техническая сводка', drawingBasis: 'Условия выбора', operatingLimits: 'Рабочие пределы', materialsMedia: 'Материалы и среда', interfaces: 'Присоединения', selectionStatus: 'Условия выбора',
  verifiedBasis: 'Используйте эту страницу модели для предварительного выбора и подтвердите окончательную конфигурацию заказа до выпуска.',
  pendingBasis: 'Перед техническим выбором требуется проектное подтверждение.',
  pendingAction: 'До выбора, выпуска конструкторской документации, согласования предложения или размещения заказа запросите актуальный файл для конкретной модели.',
  approvedUse: 'Фактические среда, давление, скорость, температура, цикл, монтаж и условия должны быть подтверждены для выбранного исполнения.',
  specHeading: 'Технические данные',
  specIntro: 'В таблице приведены подтверждённые технические значения для этой модели. Неуказанные значения не добавляются и не выводятся по аналогии.',
  specIntroPending: 'Технические значения не публикуются, пока файл конкретной модели не подтверждён для проекта.',
  labels: { model: 'Модель', status: 'Статус проекта', document: 'Справочный файл', pressure: 'Максимальное давление', speed: 'Максимальная частота вращения', media: 'Подходящая среда', body: 'Материал корпуса', seal: 'Материалы уплотнений', ports: 'Обозначения портов', mounting: 'Монтажные элементы', envelope: 'Габариты', bore: 'Сквозное отверстие', temperature: 'Температурный диапазон', weight: 'Масса', electrical: 'Электрический интерфейс', warranty: 'Гарантийный срок' },
  statusVerified: 'Готово к проектному подтверждению', statusPending: 'Перед выбором требуется проектное подтверждение',
  portsCountPending: 'Количество выходов должно быть подтверждено ответственной конструкторской службой; подтверждённое количество не публикуется', portsSizePending: 'Спецификация портов не подтверждена до выпуска согласованного исправленного чертежа',
  inletPending: 'Вход воздуха однозначно не обозначен', mountNotStated: 'Отдельные монтажные элементы не указаны', noBore: 'Размер сквозного отверстия не публикуется',
  warranty: '1 год', electrical: 'На чертеже показано 6 электрических выводов; распределение цепей и электрические номиналы требуют согласованной спецификации',
  selectionNoteTitle: 'Примечание к выпуску', selectionNote: 'Не переносите размеры, порты, материалы, номиналы или монтажные значения с другой модели или старой страницы.',
  compatHeading: 'Совместимость с оборудованием и условия применения', compatIntro: 'Совместимость определяется требованиями машины и выбранным исполнением конкретной модели, а не только сходством серии.',
  compatCards: [['Контуры и порты', 'Сопоставьте каждый контур машины и назначение порта с выбранным исполнением. Уточните все неясные обозначения до выпуска конструкторской документации.'], ['Давление и скорость', 'Согласуйте сочетание среды, давления, скорости, температуры и рабочего цикла для выбранного исполнения.'], ['Монтаж и габариты', 'Проверьте монтажные элементы, зазоры, трассировку шлангов, соосность и внешние нагрузки в сборке машины.'], ['Документация', 'Зафиксируйте окончательную ревизию и спецификацию заказа до обработки сопрягаемых деталей или размещения заказа.']],
  notApproved: 'Нельзя согласовывать только по этой странице', notApprovedItems: ['Среды, не указанные на странице', 'Работа выше опубликованного максимума', 'Неуточнённые данные портов или электрического интерфейса', 'Регулируемые, критичные для безопасности или особые условия без инженерной проверки проекта'],
  installHeading: 'Монтаж и ввод в эксплуатацию', installIntro: 'Спецификация заказа и окончательная ревизия имеют приоритет над этими общими рекомендациями.',
  installSteps: [['Обеспечьте безопасное состояние оборудования', 'Перед работами отключите и заблокируйте все источники энергии, полностью сбросьте давление во всех каналах и исключите непреднамеренное вращение.'], ['Проверьте выпущенные документы', 'До монтажа подтвердите модель, ревизию, обозначения портов, монтажные элементы и заказанную конфигурацию.'], ['Сверьте интерфейсы до сборки', 'Точно сопоставьте резьбы, отверстия, уплотнительные поверхности, сопрягаемые размеры и ориентацию. Не переносите переходники, момент затяжки или герметик с другой модели.'], ['Контролируйте соосность и внешние нагрузки', 'Поддерживайте шланги и неподвижную сторону так, чтобы изгиб, растяжение, кручение, несоосность и нагрузки машины не передавались на соединение.'], ['Подключайте согласованную среду', 'Используйте только указанную среду, если другая среда и все смачиваемые материалы не согласованы письменно для заказа.'], ['Вводите в эксплуатацию контролируемо', 'Начинайте ниже согласованных проектных пределов. Проверьте каждый канал на утечку, трение, температуру, вибрацию и посторонний шум до повышения нагрузки.']],
  maintenanceTitle: 'Интервал проверки', maintenance: 'Назначайте интервалы проверки и замены по записанным условиям работы и результатам осмотра. Универсальный срок службы не указан.',
  downloadsHeading: 'Загрузки и конструкторские файлы', drawingTitle: '2D-чертёж (PDF)', drawingDescription: 'Технический файл для этой модели на сайте. До выпуска конструкции или заказа подтвердите окончательную ревизию.',
  drawingPendingTitle: 'Запросить файл конкретной модели', drawingPendingDescription: 'Перед техническими решениями или заказом запросите актуальный файл для конкретной модели.',
  cadTitle: 'Запросить 3D STEP/IGES', cadDescription: 'Доступность и ревизия CAD подтверждаются после проверки модели и требований применения.',
  manualTitle: 'Общее руководство по монтажу (PDF)', manualDescription: 'Общие рекомендации по обращению и вводу в эксплуатацию. Спецификация заказа и окончательная ревизия имеют приоритет.',
  docsTitle: 'Инспекционная и заказная документация', docsDescription: 'Укажите требуемые протоколы, документы на материалы и критерии приёмки до заказа.',
  selectLabel: 'Выбор модели', selectHeading: 'Контрольный перечень для согласования', selectIntro: 'Проверьте эти пункты до утверждения модели для применения в конструкции машины.',
  selectHeaders: ['Проверка', 'Статус на странице', 'Требуемое действие'], selectRows: [['Выбор модели', 'Используйте номер модели', 'Подтвердите, что выбранная модель соответствует сайту и заказу.'], ['Порты и монтаж', 'Публикуются только читаемые данные', 'Уточните все неясные или нестандартные обозначения до обработки сопрягаемых деталей.'], ['Рабочие пределы', 'Опубликованные максимумы', 'Согласуйте комбинированный режим; не считайте максимумы гарантией непрерывной работы.'], ['Среда и материалы', 'Указанные значения', 'Получите письменное согласование другой среды, уплотнения, корпуса или условий.']],
  commonLabel: 'Типичные ошибки', commonHeading: 'Три риска выбора и монтажа', commonIntro: 'Эти проверки не позволяют неподтверждённым данным сайта стать спецификацией машины.',
  commonCards: [['Использование неверной ссылки на модель', 'Убедитесь, что выбранная модель совпадает с моделью сайта и заказа.'], ['Заполнение неуказанного значения', 'Не предполагайте размер порта, момент затяжки, тип подшипника, состав уплотнения, совместимость среды, электрические номиналы или ресурс.'], ['Максимум принимается за непрерывный номинал', 'Согласуйте фактический комбинированный режим и проверьте монтаж при контролируемом вводе.']],
  relatedHeading: 'Связанные продукты', relatedIntro: 'Сравнивайте соседние модели по их собственным спецификациям; данные нельзя переносить между артикулами.', relatedDescription: 'Откройте страницу модели и проверьте её спецификацию до сравнения или выбора.',
  compareTitle: 'Сравнить модели', compareDescription: 'Сформируйте короткий список на странице сравнения, затем подтвердите каждую модель по условиям применения.', customTitle: 'Инженерная проверка', customDescription: 'Сообщите требуемые каналы, среду, давление, скорость, температуру, монтаж, габариты и документацию.',
  viewModel: 'Открыть модель', compareModels: 'Сравнить модели', requestReview: 'Запросить проверку',
  technicalNoteLabel: 'Техническое примечание:',
  technicalNote: 'Каждое готовое изделие проходит предусмотренный производственный контроль. Опубликованные технические значения являются максимумами для выбора модели, а не гарантией непрерывного режима. Подтвердите для заказа окончательную ревизию, среду, давление, скорость, температуру, монтаж, рабочий цикл, условия и план обслуживания.',
  technicalNotePending: 'Каждое готовое изделие проходит предусмотренный производственный контроль. До выпуска конструкции или заказа запросите актуальный файл для конкретной модели.',
  faqHeading: 'Часто задаваемые вопросы', faqSourceQ: 'Какой источник определяет технические данные этой страницы?', faqSourceA: 'Опубликованные значения являются техническими данными конкретной модели. Поставляемую конфигурацию определяет подтверждённая спецификация заказа.',
  faqMaxQ: 'Являются ли давление и скорость номиналами непрерывной работы?', faqMaxA: 'Нет. Это максимальные значения для выбора. Допустимый комбинированный режим подтверждается для фактической среды, давления, скорости, температуры, монтажа, условий и цикла.',
  faqMediaQ: 'Какая среда подходит для этой модели?', faqPortsQ: 'Как подтвердить порты и монтаж?', faqPortsA: 'Используйте актуальную спецификацию конкретной модели. Не исправляйте необычное обозначение самостоятельно и не переносите интерфейс другой модели.',
  faqCadQ: 'Можно ли запросить технический файл или 3D CAD?', faqCadA: 'Да. Укажите модель, требования машины, количество и формат файла. Доступность и ревизия подтверждаются для проекта.', faqPendingA: 'Технические значения публикуются после проектного подтверждения. До начала проектирования или размещения заказа запросите актуальный файл для конкретной модели.',
  faqElectricalQ: 'Определяет ли технический файл шесть электрических цепей или их номиналы?', faqElectricalA: 'Нет. Показаны шесть электрических выводов. Распределение цепей, напряжение, ток, материал контактов и другие номиналы требуют согласованной электрической спецификации.',
};

const ENGINEERING_PENDING_MODELS = new Set(['BP-2P-30-0001']);
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
    bore: ui.fields.bore ?? copy.noBore,
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
    <summary class="faq-question">${escapeHtml(question)} <span class="icon notranslate" translate="no">${open ? '—' : '+'}</span></summary>
    <div class="faq-answer"><p>${escapeHtml(answer)}</p></div>
   </details>`;
}

function localizedSentences(locale, ...parts) {
  const terminator = locale === 'ja' ? '。' : '.';
  const separator = locale === 'ja' ? '。' : '. ';
  const cleaned = parts.map((part) => String(part).trim().replace(/[.。]+$/u, '')).filter(Boolean);
  return `${cleaned.join(separator)}${terminator}`;
}

function productPaths(model) {
  return Object.entries(LOCALES).map(([locale, config]) => ({
    locale,
    relativePath: config.dir ? path.join(config.dir, `${model}.html`) : `${model}.html`,
  }));
}

function relatedModels(model, orderedModels, products) {
  const family = model.match(/^BP-(\d+)P-/)?.[1] ?? null;
  const verified = orderedModels.filter((candidate) => (
    candidate !== model && products[candidate]?.status !== 'identity-pending'
  ));
  const sameFamily = family
    ? verified.filter((candidate) => candidate.match(/^BP-(\d+)P-/)?.[1] === family)
    : [];
  return [...sameFamily, ...verified.filter((candidate) => !sameFamily.includes(candidate))].slice(0, 3);
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

function renderDeepContent(model, product, locale, orderedModels, products, applicationEvidenceBlocks) {
  const copy = COPY[locale];
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
      `<strong>${escapeHtml(copy.drawingBasis)}${labelSeparator}</strong> ${escapeHtml(copy.verifiedBasis)}`,
      `<strong>${escapeHtml(copy.operatingLimits)}${labelSeparator}</strong> ${escapeHtml(facts.pressure)}${factSeparator}${escapeHtml(facts.speed)}${factSeparator}${escapeHtml(facts.temperature)}`,
      `<strong>${escapeHtml(copy.materialsMedia)}${labelSeparator}</strong> ${escapeHtml(facts.body)}${factSeparator}${escapeHtml(facts.seal)}${factSeparator}${escapeHtml(facts.media)}`,
      `<strong>${escapeHtml(copy.interfaces)}${labelSeparator}</strong> ${escapeHtml(facts.ports)}${locale === 'ja' ? '／' : '; '}${escapeHtml(facts.mounting)}`,
      `<strong>${escapeHtml(copy.selectionStatus)}${labelSeparator}</strong> ${escapeHtml(copy.approvedUse)}`,
    ];
  if (facts.electrical) {
    keyPoints.splice(4, 0, `<strong>${escapeHtml(copy.labels.electrical)}${labelSeparator}</strong> ${escapeHtml(facts.electrical)}`);
  }

  const compatCards = copy.compatCards.map(([title, text]) => `    <div class="compat-item"><strong>${escapeHtml(title)}</strong><span style="display:block;font-size:0.85rem;color:var(--text-light);margin-top:4px;">${escapeHtml(text)}</span></div>`).join('\n');
  const installSteps = copy.installSteps.map(([title, text], index) => `    <div class="install-step">
     <div class="install-step-num">${index + 1}</div>
     <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>
    </div>`).join('\n');
  const selectionRows = copy.selectRows.map(([check, status, action]) => `     <tr><td>${escapeHtml(check)}</td><td>${escapeHtml(status)}</td><td>${escapeHtml(action)}</td></tr>`).join('\n');
  const commonCards = copy.commonCards.map(([title, text]) => `   <div class="app-detail-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`).join('\n');
  const relatedCards = relatedModels(model, orderedModels, products).map((relatedModel) => {
    const relatedMetadata = drawingBackedProductMetadata(locale, relatedModel);
    if (!relatedMetadata) throw new Error(`${relatedModel}/${locale}: compact metadata missing for related-product label`);
    return `   <a href="${relatedModel}.html" class="related-card">
    <h3>${escapeHtml(relatedMetadata.linkLabel)}</h3>
    <p>${escapeHtml(copy.relatedDescription)}</p>
    <div class="price">${escapeHtml(copy.viewModel)}</div>
   </a>`;
  }).join('\n');

  const mediaAnswer = facts.pending ? copy.faqPendingA : localizedSentences(locale, facts.media, copy.approvedUse);
  const portsAnswer = facts.pending ? copy.faqPendingA : localizedSentences(locale, facts.ports, copy.faqPortsA);
  const faqs = [
    [copy.faqSourceQ, facts.pending ? copy.faqPendingA : copy.faqSourceA],
    [copy.faqMaxQ, facts.pending ? copy.faqPendingA : copy.faqMaxA],
    [copy.faqMediaQ, mediaAnswer],
    [copy.faqPortsQ, portsAnswer],
    [copy.faqCadQ, copy.faqCadA],
  ];
  if (model === ELECTRICAL_LEADS_MODEL) faqs[4] = [copy.faqElectricalQ, copy.faqElectricalA];
  const faqHtml = faqs.map(([question, answer]) => renderFaqItem(question, answer, true)).join('\n');

  return `${START_MARKER}
<section class="section" style="padding-top:0;">
 <div class="container">
  <div style="background:var(--bg-alt);border-left:4px solid var(--primary);padding:24px 28px;border-radius:8px;">
   <h2 style="margin:0 0 14px;font-size:1.15rem;color:var(--dark-soft);">${escapeHtml(copy.drawingSummary)} — ${escapeHtml(model)}</h2>
   <ul style="margin:0;padding-left:22px;line-height:1.9;font-size:0.95rem;">
${keyPoints.map((item) => `    <li>${item}</li>`).join('\n')}
   </ul>
  </div>
 </div>
</section>

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
   <div style="margin-top:24px;padding:16px 20px;background:#fff;border:1px solid var(--border);border-radius:8px;">
    <h3 style="margin:0 0 10px;font-size:1rem;color:var(--dark-soft);">${escapeHtml(copy.selectionNoteTitle)}</h3>
    <p style="margin:0;font-size:0.9rem;color:var(--text-light);line-height:1.7;">${escapeHtml(copy.selectionNote)}</p>
   </div>
  </div>

  <!-- Panel: Compatible Machines -->
  <div class="pd-panel" id="panel-compat">
   <h2>${escapeHtml(copy.compatHeading)}</h2>
   <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:24px;">${escapeHtml(facts.pending ? copy.pendingAction : copy.compatIntro)}</p>
   <div class="compat-grid">
${applicationEvidenceBlocks.length ? `${applicationEvidenceBlocks.join('\n')}\n` : ''}${compatCards}
   </div>
   <div style="margin-top:24px;padding:16px 20px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;">
    <h3 style="margin:0 0 10px;font-size:1rem;color:#8a6d04;">⚠️ ${escapeHtml(copy.notApproved)}</h3>
    <ul style="margin:0;padding-left:20px;font-size:0.9rem;color:var(--text);line-height:1.8;">
${copy.notApprovedItems.map((item) => `     <li>${escapeHtml(item)}</li>`).join('\n')}
    </ul>
   </div>
  </div>

  <!-- Panel: Installation -->
  <div class="pd-panel" id="panel-install">
   <h2>${escapeHtml(copy.installHeading)}</h2>
   <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:24px;">${escapeHtml(facts.pending ? copy.pendingAction : copy.installIntro)}</p>
   <div class="install-steps">
${installSteps}
   </div>
   <div style="margin-top:24px;padding:16px 20px;background:var(--bg-alt);border:1px solid var(--border);border-radius:8px;">
    <h3 style="margin:0 0 10px;font-size:1rem;color:var(--dark-soft);">${escapeHtml(copy.maintenanceTitle)}</h3>
    <p style="margin:0;font-size:0.9rem;color:var(--text-light);line-height:1.7;">${escapeHtml(copy.maintenance)}</p>
   </div>
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

<!-- ===== WHEN TO CHOOSE vs UPGRADE ===== -->
<section class="section section-alt">
 <div class="container">
  <div class="section-header"><span class="section-label">${escapeHtml(copy.selectLabel)}</span><h2 class="section-title">${escapeHtml(model)} — ${escapeHtml(copy.selectHeading)}</h2></div>
  <p style="font-size:0.95rem;color:var(--text-light);margin-bottom:24px;">${escapeHtml(facts.pending ? copy.pendingAction : copy.selectIntro)}</p>
  <div class="app-detail-table-wrap">
   <table class="app-detail-table">
    <thead><tr>${copy.selectHeaders.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead>
    <tbody>
${selectionRows}
    </tbody>
   </table>
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
   <a href="product-comparison.html" class="related-card"><h3>${escapeHtml(copy.compareTitle)}</h3><p>${escapeHtml(copy.compareDescription)}</p><div class="price">${escapeHtml(copy.compareModels)}</div></a>
   <a href="contact.html?request=application-review&amp;model=${encodeURIComponent(model)}&amp;product=${encodedLabel}&amp;source=${fileName}#quoteForm" class="related-card"><h3>${escapeHtml(copy.customTitle)}</h3><p>${escapeHtml(copy.customDescription)}</p><div class="price">${escapeHtml(copy.requestReview)}</div></a>
  </div>
 </div>
</section>

<!-- ===== FAQ ===== -->
<section class="section" id="faq">
 <div class="container">
  <h2 style="font-size:1.5rem;font-weight:700;color:var(--dark-soft);margin-bottom:24px;">${escapeHtml(copy.faqHeading)}</h2>
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

function renderTechnicalNote(product, locale) {
  const copy = COPY[locale];
  const note = product.status === 'identity-pending' ? copy.technicalNotePending : copy.technicalNote;
  return `<!-- ===== TECHNICAL NOTE ===== -->
<section class="section pd-technical-note" style="padding-top:0;">
 <div class="container">
  <p style="font-size:0.85rem;color:var(--text-light);text-align:center;">
   <strong>${escapeHtml(copy.technicalNoteLabel)}</strong> ${escapeHtml(note)}
  </p>
 </div>
</section>`;
}

function replaceTechnicalNote(value, generated, newline, label) {
  const normalized = generated.replaceAll('\n', newline);
  return replaceOnce(
    value,
    /<!-- ===== TECHNICAL NOTE ===== -->\s*<section class="section pd-technical-note"[^>]*>[\s\S]*?<\/section>/i,
    normalized,
    `${label}: technical note`,
  );
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
  const technicalNote = getOne(
    value,
    /<!-- ===== TECHNICAL NOTE ===== -->\s*<section class="section pd-technical-note"[^>]*>[\s\S]*?<\/section>/i,
    `${label}: technical note`,
  );
  return normalizeProductQueryLabels(value).replace(technicalNote, '{drawing-backed-technical-note}');
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
    rules.push(['media beyond drawing', /\bwater\b|\bcoolant\b|hydraulic oil|\bWasser\b|Kühlmittel|Hydrauliköl|クーラント|作動油|水|СОЖ|охлаждающ|гидравлическ[^<]{0,20}масл|\bвода\b/giu]);
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
  const text = controlledRegion(value);
  const findings = [];
  for (const [label, regex] of riskRulesFor(model, product)) {
    const matches = [...text.matchAll(regex)].map((item) => item[0]);
    if (matches.length) findings.push({ label, count: matches.length, samples: [...new Set(matches)].slice(0, 3) });
  }
  return findings;
}

function parseStructuredData(value, label) {
  return locateProductJsonScript(value, label).data;
}

function validateProtectedContent(original, next, model, product, locale) {
  const label = `${model}/${locale}`;
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
  assertEqual(JSON.stringify(nextEvidence), JSON.stringify(originalEvidence), `${label}: verified application evidence`);
  if (countMatches(next, /<form\b/gi) !== countMatches(original, /<form\b/gi)) throw new Error(`${label}: form count changed`);

  for (const id of ['panel-specs', 'panel-compat', 'panel-install', 'panel-downloads', 'faq']) {
    if (countMatches(next, new RegExp(`id="${id}"`, 'g')) !== 1) throw new Error(`${label}: required section #${id} missing or duplicated`);
  }
  if (countMatches(next, /class="faq-item"/g) !== 5
    || countMatches(next, /<details class="faq-item" open>/g) !== 5) {
    throw new Error(`${label}: FAQ source must contain exactly five fail-open details items`);
  }
  assertMainHeadingOrder(next, label);
  if (/\bundefined\b/i.test(controlledRegion(next))) throw new Error(`${label}: generated customer-facing content contains undefined`);
  if (locale !== 'en' && /\b(?:View model|Compare models|Request review|Make the machine safe)\b/.test(controlledRegion(next))) {
    throw new Error(`${label}: generated customer-facing content contains an untranslated English sentinel`);
  }

  const copy = COPY[locale];
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
  const applicationEvidenceBlocks = extractApplicationEvidence(original, `${model}/${locale}: application evidence`).map((item) => item.html);
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
  applySurface('technical-note', (value) => replaceTechnicalNote(
    value,
    renderTechnicalNote(product, locale),
    newline,
    `${model}/${locale}`,
  ));
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
  console.log(`Changed surfaces: ${[...surfaceCounts.entries()].map(([name, count]) => `${name}=${count}`).join(', ') || 'none'}`);
  console.log(`Controlled legacy-risk matches before: ${printRiskSummary(plans, 'beforeRisks')}`);
  console.log(`Controlled residual-risk matches after proposed transform: ${printRiskSummary(plans, 'afterRisks')}`);
  console.log('Protected unchanged surfaces: header, jump navigation, quote/CAD actions, first-view download/compare utilities, share channels, first-view key specs, gallery assets, related resources, CTA, footer, forms. Technical note is drawing-controlled.');
  console.log('Engineering holds: BP-3P-0006 port specification; BP-2P-30-0001 drawing identity; BP-3P-S06-0001 electrical allocation/ratings.');

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
