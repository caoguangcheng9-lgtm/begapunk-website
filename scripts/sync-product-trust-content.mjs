import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const productPages = config.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));

const copy = {
  installRisks: 'Overtightening, rigid piping, skipped run-in checks, and unsuitable filtration are common installation risks that can contribute to premature wear or leakage.',
  installIntro: 'Correct installation helps reduce premature seal and bearing wear. Verify mounting, alignment, connections, and the approved operating limits before commissioning.',
  cad: 'STEP/IGES files may be provided for qualified projects after the application requirements and selected configuration are reviewed. Available formats and delivery timing are confirmed for each project.',
  custom: 'Custom passage count, connection, and mounting options can be reviewed against the application. CAD availability and lead time are confirmed for the selected model, quantity, customization, and destination.',
  scenario: 'This scenario illustrates a selection or installation risk, not a documented customer failure timeline. Confirm passage count, pressure, speed, medium, connection, alignment, and mounting instructions for the approved configuration before commissioning.',
  upgrade: 'Review another configuration when the required passage count, pressure, speed, bore, mounting, medium, or environmental protection falls outside the published limits of this model. The final model, custom scope, price, and lead time are confirmed after engineering review.',
  materials: 'Material and seal suitability is configuration-specific. Confirm the current approved drawing, exact body alloy, seal compound, medium, pressure, speed, temperature, duty cycle, and environment before order. This summary does not claim universal chemical compatibility, regulatory approval, or service life.',
  electrical: 'Electrical circuit life and signal performance depend on current, voltage, speed, duty cycle, environment, and the selected slip-ring configuration. Confirm the approved specification before order.',
  maintenance: 'Inspection and replacement intervals must be established from the actual medium, pressure, speed, temperature, alignment, filtration, duty cycle, leakage trend, bearing condition, and recorded inspection results.',
  regulated: 'Regulated or food-contact service requires documented review of the complete wetted-material list, exact seal compound, cleaning chemistry, temperature, and applicable requirements. No product-level FDA compliance is claimed unless it is documented for the selected configuration.',
  multiPassage: 'A multi-passage body can reduce external plumbing components compared with multiple separate joints. The actual layout and service implications depend on the machine design.',
};

const translations = {
  de: {
    [copy.installRisks]: 'Zu den typischen Montagerisiken zählen zu hohes Anzugsdrehmoment, starre Verrohrung, ausgelassene Einlaufkontrollen und ungeeignete Filtration; sie können vorzeitigen Verschleiß oder Leckage begünstigen.',
    [copy.installIntro]: 'Eine fachgerechte Montage hilft, vorzeitigen Verschleiß an Dichtungen und Lagern zu vermeiden. Prüfen Sie vor der Inbetriebnahme Befestigung, Ausrichtung, Anschlüsse und die freigegebenen Betriebsgrenzen.',
    [copy.cad]: 'STEP-/IGES-Dateien können nach Prüfung der Anwendung und der ausgewählten Ausführung für qualifizierte Projekte bereitgestellt werden. Verfügbare Formate und Bereitstellungszeitpunkt werden projektbezogen bestätigt.',
    [copy.custom]: 'Kanalzahl, Anschlüsse und Befestigung können anwendungsbezogen geprüft werden. CAD-Verfügbarkeit und Lieferzeit werden für Modell, Menge, Anpassungsumfang und Zielort bestätigt.',
    [copy.scenario]: 'Dieses Beispiel veranschaulicht ein Auswahl- oder Montagerisiko und keinen dokumentierten Ausfallzeitraum beim Kunden. Prüfen Sie vor der Inbetriebnahme Kanalzahl, Druck, Drehzahl, Medium, Anschluss, Ausrichtung und Montagevorgaben der freigegebenen Ausführung.',
    [copy.upgrade]: 'Prüfen Sie eine andere Ausführung, wenn Kanalzahl, Druck, Drehzahl, Bohrung, Befestigung, Medium oder Umgebungsschutz außerhalb der veröffentlichten Grenzen dieses Modells liegen. Endgültiges Modell, Sonderumfang, Preis und Lieferzeit werden nach technischer Prüfung bestätigt.',
    [copy.materials]: 'Die Eignung von Werkstoffen und Dichtungen ist ausführungsabhängig. Bestätigen Sie vor der Bestellung die freigegebene Zeichnung, die genaue Gehäuselegierung, den Dichtungswerkstoff, Medium, Druck, Drehzahl, Temperatur, Einschaltdauer und Umgebung. Diese Zusammenfassung stellt keine allgemeine Chemikalienverträglichkeit, Zulassung oder Lebensdauer in Aussicht.',
    [copy.electrical]: 'Lebensdauer und Signalverhalten der Stromkreise hängen von Strom, Spannung, Drehzahl, Einschaltdauer, Umgebung und der gewählten Schleifringausführung ab. Bestätigen Sie vor der Bestellung die freigegebene Spezifikation.',
    [copy.maintenance]: 'Inspektions- und Austauschintervalle sind aus dem tatsächlichen Medium, Druck, der Drehzahl, Temperatur, Ausrichtung, Filtration, Einschaltdauer, Leckageentwicklung, dem Lagerzustand und den dokumentierten Prüfergebnissen abzuleiten.',
    [copy.regulated]: 'Für regulierte Anwendungen oder Lebensmittelkontakt ist eine dokumentierte Prüfung der vollständigen Liste medienberührter Werkstoffe, des genauen Dichtungswerkstoffs, der Reinigungschemie, der Temperatur und der geltenden Anforderungen erforderlich. Eine FDA-Konformität des Produkts wird nur beansprucht, wenn sie für die ausgewählte Ausführung dokumentiert ist.',
    [copy.multiPassage]: 'Ein Mehrkanalgehäuse kann gegenüber mehreren einzelnen Drehdurchführungen die externe Verrohrung reduzieren. Die tatsächliche Anordnung und die Auswirkungen auf den Service hängen von der Maschinenkonstruktion ab.',
  },
  ja: {
    [copy.installRisks]: '締付け過多、剛性配管、ならし運転時の確認不足、不適切なろ過は、早期摩耗や漏れにつながる代表的な取付リスクです。',
    [copy.installIntro]: '適切な取付けは、シールや軸受の早期摩耗を抑えるうえで重要です。運転開始前に、取付け、芯出し、接続、および承認された使用限界を確認してください。',
    [copy.cad]: 'STEP／IGESデータは、用途条件と選定仕様を確認したうえで、対象案件に提供できる場合があります。対応形式と提供時期は案件ごとに確認します。',
    [copy.custom]: '流路数、接続、取付方法の特注可否は、用途条件に基づいて検討します。CADデータの提供可否と納期は、型式、数量、特注範囲、納入先を確認後に回答します。',
    [copy.scenario]: 'これは選定または取付上のリスクを説明する例であり、実際の顧客設備における故障時期を示すものではありません。運転開始前に、承認仕様の流路数、圧力、回転数、流体、接続、芯出し、取付指示を確認してください。',
    [copy.upgrade]: '必要な流路数、圧力、回転数、中空径、取付方法、流体、環境保護が本型式の公開範囲を外れる場合は、別仕様を検討してください。最終型式、特注範囲、価格、納期は技術確認後に回答します。',
    [copy.materials]: '材料とシールの適合性は仕様ごとに異なります。注文前に、承認図面、正確な本体合金、シール材質、流体、圧力、回転数、温度、デューティ、使用環境を確認してください。この概要は、あらゆる薬品への適合、規制適合、または寿命を保証するものではありません。',
    [copy.electrical]: '電気回路の寿命と信号性能は、電流、電圧、回転数、デューティ、使用環境、選定したスリップリング仕様によって異なります。注文前に承認仕様を確認してください。',
    [copy.maintenance]: '点検・交換間隔は、実際の流体、圧力、回転数、温度、芯出し、ろ過、デューティ、漏れ傾向、軸受状態、および記録された点検結果に基づいて設定してください。',
    [copy.regulated]: '規制対象または食品接触用途では、接液部材の全一覧、正確なシール材質、洗浄薬品、温度、適用要件を書面で確認する必要があります。選定仕様について文書化されていない限り、製品としてのFDA適合は表明しません。',
    [copy.multiPassage]: '多流路構造は、複数の単独ロータリジョイントと比べて外部配管部品を減らせる場合があります。実際の配管構成と保守性は、機械設計によって異なります。',
  },
  ru: {
    [copy.installRisks]: 'Чрезмерная затяжка, жёсткая подводка, пропуск проверки при обкатке и неподходящая фильтрация являются типичными монтажными рисками и могут привести к преждевременному износу или утечке.',
    [copy.installIntro]: 'Правильный монтаж помогает снизить риск преждевременного износа уплотнений и подшипников. Перед вводом в эксплуатацию проверьте крепление, соосность, соединения и утверждённые рабочие пределы.',
    [copy.cad]: 'Файлы STEP/IGES могут предоставляться для согласованных проектов после проверки требований применения и выбранного исполнения. Форматы и срок предоставления подтверждаются для каждого проекта.',
    [copy.custom]: 'Число каналов, присоединения и способ монтажа могут быть рассмотрены под конкретное применение. Доступность CAD и срок поставки подтверждаются с учётом модели, количества, объёма доработок и места назначения.',
    [copy.scenario]: 'Этот пример показывает риск выбора или монтажа, а не документированный срок отказа у заказчика. Перед вводом в эксплуатацию подтвердите число каналов, давление, частоту вращения, среду, соединения, соосность и монтажные указания для утверждённого исполнения.',
    [copy.upgrade]: 'Рассмотрите другое исполнение, если требуемые число каналов, давление, частота вращения, проходное отверстие, монтаж, среда или защита от окружающей среды выходят за опубликованные пределы этой модели. Окончательная модель, объём доработок, цена и срок поставки подтверждаются после технической проверки.',
    [copy.materials]: 'Пригодность материалов и уплотнений зависит от конкретного исполнения. До заказа подтвердите утверждённый чертёж, точный сплав корпуса, материал уплотнения, среду, давление, частоту вращения, температуру, режим работы и окружающие условия. Это описание не заявляет универсальную химическую совместимость, нормативное одобрение или срок службы.',
    [copy.electrical]: 'Срок службы электрических цепей и качество сигнала зависят от тока, напряжения, частоты вращения, режима работы, окружающих условий и выбранного исполнения токосъёмника. До заказа подтвердите утверждённую спецификацию.',
    [copy.maintenance]: 'Интервалы осмотра и замены следует устанавливать по фактической среде, давлению, частоте вращения, температуре, соосности, фильтрации, режиму работы, динамике утечки, состоянию подшипников и зарегистрированным результатам проверок.',
    [copy.regulated]: 'Для регулируемых применений или контакта с пищевой продукцией требуется документированная проверка полного перечня смачиваемых материалов, точного состава уплотнения, моющих средств, температуры и применимых требований. Соответствие изделия требованиям FDA не заявляется без документации для выбранного исполнения.',
    [copy.multiPassage]: 'Многоканальный корпус может сократить число внешних трубопроводных компонентов по сравнению с несколькими отдельными вращающимися соединениями. Фактическая компоновка и условия обслуживания зависят от конструкции машины.',
  },
};

function compact(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

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

  $('.related-card .price').each((_, element) => {
    if (compact($(element).text()) !== 'Request Quote') {
      throw new Error(`${pageName}: related-product pricing must use Request Quote.`);
    }
  });

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

for (const pageName of productPages) {
  const filePath = path.join(root, pageName);
  const before = await fs.readFile(filePath, 'utf8');
  snapshots.set(filePath, before);
  const current = load(before, { decodeEntities: false });
  try {
    assertProductTrustContent(current, pageName);
  } catch (error) {
    if (checkOnly) throw error;
    pendingUpdates.push(`${pageName}: ${error.message}`);
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

console.log(`Product trust content is synchronized across ${productPages.length} English source pages and three localization override files; no files changed.`);
