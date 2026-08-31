import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const i18nConfig = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const productPageNames = (i18nConfig.translationManagedPages || i18nConfig.pages)
  .filter((pageName) => /^BP-[A-Za-z0-9-]+\.html$/.test(pageName));
const productWarrantyByLocale = Object.freeze({
  en: Object.freeze({
    prefix: '',
    legacyName: 'Warranty terms',
    legacyValue: 'Confirmed in quotation/order',
    name: 'Warranty period',
    value: '1 year from shipment',
  }),
  de: Object.freeze({
    prefix: 'de',
    legacyName: 'Garantiebedingungen',
    legacyValue: 'Im Angebot/Auftrag bestätigt',
    name: 'Garantiezeitraum',
    value: '1 Jahr ab Versand',
  }),
  ja: Object.freeze({
    prefix: 'ja',
    legacyName: '保証条件',
    legacyValue: '見積書・注文書で確認',
    name: '保証期間',
    value: '出荷日から1年',
  }),
  ru: Object.freeze({
    prefix: 'ru',
    legacyName: 'Условия гарантии',
    legacyValue: 'Указаны в коммерческом предложении/заказе',
    name: 'Гарантийный срок',
    value: '1 год с даты отгрузки',
  }),
});
const bottleCappingProductPage = 'BP-2P-16-0001.html';
const legacyBottleCappingProductClaim = 'A customer-authorized production application uses BP-2P-16-0001 to supply two compressed-air circuits for clamp and release of a pneumatic three-jaw bottle-cap gripper.';
const previousBottleCappingProductClaim = 'A customer-authorized production application uses BP-2P-16-0001 to supply clamp and release air through two independent compressed-air passages to a pneumatic three-jaw bottle-cap gripper.';
const approvedBottleCappingProductClaim = 'A customer-authorized production application uses BP-2P-16-0001 to route compressed air through two independent passages for clamping and releasing a pneumatic three-jaw bottle-cap gripper.';

const technicalNoteVariants = [
  { sourceThreshold: '', deThreshold: '', jaThreshold: '', ruThreshold: '', sourceDate: 'June 11, 2026', deDate: '11. Juni 2026', jaDate: '2026年6月11日', ruDate: '11 июня 2026 г.' },
  { sourceThreshold: '', deThreshold: '', jaThreshold: '', ruThreshold: '', sourceDate: 'August 7, 2026', deDate: '7. August 2026', jaDate: '2026年8月7日', ruDate: '7 августа 2026 г.' },
  { sourceThreshold: ' above 5 MPa', deThreshold: ' über 5 MPa', jaThreshold: '（5 MPa超）', ruThreshold: ' свыше 5 МПа', sourceDate: 'June 11, 2026', deDate: '11. Juni 2026', jaDate: '2026年6月11日', ruDate: '11 июня 2026 г.' },
  { sourceThreshold: ' above 1 MPa', deThreshold: ' über 1 MPa', jaThreshold: '（1 MPa超）', ruThreshold: ' свыше 1 МПа', sourceDate: 'August 7, 2026', deDate: '7. August 2026', jaDate: '2026年8月7日', ruDate: '7 августа 2026 г.' },
  { sourceThreshold: ' above 1 MPa', deThreshold: ' über 1 MPa', jaThreshold: '（1 MPa超）', ruThreshold: ' свыше 1 МПа', sourceDate: 'June 11, 2026', deDate: '11. Juni 2026', jaDate: '2026年6月11日', ruDate: '11 июня 2026 г.' },
];

const technicalNoteRows = technicalNoteVariants.map((variant) => ({
  legacySource: `<strong>Technical Note:</strong> Published operating limits must be confirmed against the current product page and approved drawing; production inspection is separate from operating-rating validation. Actual performance depends on operating conditions, media quality, installation practices, and maintenance schedule. For applications outside standard ratings — including high-pressure hydraulic${variant.sourceThreshold}, continuous water immersion, food-grade, or cleanroom environments — consult Begapunk factory engineering before specification. <strong>Last updated:</strong> ${variant.sourceDate}.`,
  source: `<strong>Technical Note:</strong> Use the current product page and approved drawing to select and operate the model within its published limits. Each finished unit follows the documented production inspection process. Actual performance depends on operating conditions, media quality, installation practices, and maintenance schedule. For applications outside standard ratings — including high-pressure hydraulic${variant.sourceThreshold}, continuous water immersion, food-grade, or cleanroom environments — consult Begapunk factory engineering before specification. <strong>Last updated:</strong> ${variant.sourceDate}.`,
  de: `<strong>Technischer Hinweis:</strong> Für Auswahl und Betrieb des Modells gelten die veröffentlichten Grenzen auf der aktuellen Produktseite und in der freigegebenen Zeichnung. Jede fertige Einheit durchläuft den dokumentierten Produktionsprüfprozess. Die tatsächliche Leistung hängt von den Betriebsbedingungen, der Medienqualität, der Montage und den Wartungsintervallen ab. Bei Anwendungen außerhalb der Standardgrenzen – einschließlich Hochdruckhydraulik${variant.deThreshold}, dauerhaftem Eintauchen in Wasser, Lebensmittelanwendungen oder Reinraumumgebungen – ist vor der Spezifikation eine Abstimmung mit der Anwendungstechnik von Begapunk erforderlich. <strong>Letzte Aktualisierung:</strong> ${variant.deDate}.`,
  ja: `<strong>技術注記：</strong> 型式の選定・使用は、最新の製品ページおよび承認図面に記載された公開限界内で行ってください。完成品はすべて、公開された生産検査工程に従って検査します。実際の性能は、運転条件、使用流体の品質、取付方法および保守周期によって異なります。高圧油圧${variant.jaThreshold}、水中での連続使用、食品用途、クリーンルーム環境など、標準定格外の用途については、仕様決定前にBegapunkの技術部門へご相談ください。<strong>最終更新：</strong>${variant.jaDate}`,
  ru: `<strong>Техническое примечание:</strong> При выборе и эксплуатации модели соблюдайте опубликованные пределы, указанные на актуальной странице изделия и согласованном чертеже. Каждое готовое изделие проходит предусмотренный производственный контроль. Фактические характеристики зависят от условий эксплуатации, качества рабочей среды, монтажа и графика технического обслуживания. Для применений за пределами стандартных характеристик — включая гидравлические системы высокого давления${variant.ruThreshold}, длительное погружение в воду, пищевые применения и чистые помещения — до выбора спецификации необходимо проконсультироваться с инженерной службой Begapunk. <strong>Последнее обновление:</strong> ${variant.ruDate}`,
}));

const retiredAboutSources = [
  `Precision Machining Career Begins`,
  `Founder GuangCheng Cao began working in precision machining.`,
  `Founder &amp; Chief Engineer<br>Working in precision machining since 2006`,
  `Meet Begapunk, a Ningbo-based manufacturer of pneumatic rotary unions established in 2022, led by a founder working in precision machining since 2006.`,
  `Ningbo-based rotary joint manufacturer established in 2022, led by a founder working in precision machining since 2006.`,
  `Leadership`,
  `Meet the Team`,
  `Founder &amp; Chief Engineer`,
  `Production Manager`,
  `International Sales<br>Fluent in EN/DE/ES`,
  `Begapunk is a specialized rotary joint (rotary union) manufacturer based in Ningbo, Zhejiang Province, China. We design and produce single-passage and multi-passage rotary unions for industrial automation, CNC machining, laser cutting, plastic extrusion, wind energy, and other rotating machinery applications.`,
  `Unlike general-purpose hydraulic component suppliers, we focus exclusively on rotary joints. This specialization allows us to offer deeper engineering support, faster custom prototyping, and more competitive pricing than multi-product competitors like Deublin or Kadant for equivalent specifications.`,
  `Our Ningbo facility combines CNC machining, assembly, inspection, and engineering support. Inspection scope, test pressure, and acceptance criteria are confirmed for each model and order.`,
];

const retiredHomepageSources = [
  `Rotary Joint Manufacturing | Established 2022 | Standard & Custom Designs`,
  `Standard and custom pneumatic rotary joints for CNC, packaging, filling, laser cutting, and automation equipment.`,
  `Company established in 2022`,
];

const retiredBottleCappingSources = [
  `This customer-authorized photograph shows BP-2P-08-0001 installed on a customer production machine. Two independent compressed-air circuits control clamping and release of a pneumatic three-jaw gripper, allowing it to hold the bottle cap and rotate during the capping operation.`,
  `The photograph and project-owner confirmation establish the application, product model, and clamp/release function. They do not establish port numbering, operating pressure, rotational speed, duty cycle, service life, leakage performance, or production output. Confirm these conditions from the machine design and approved product data.`,
  `Two independent compressed-air circuits for gripper clamp and release`,
  `Owner-Confirmed Application Fit: Pneumatic Three-Jaw Bottle-Cap Gripper`,
  `This customer-authorized photograph shows BP-2P-16-0001 installed on a customer production machine. Two independent compressed-air circuits control clamping and release of a pneumatic three-jaw gripper, allowing it to hold the bottle cap and rotate during the capping operation.`,
  `BP-2P-16-0001 supplies two independent compressed-air circuits for clamp and release of a pneumatic three-jaw gripper on a customer production capping machine. The gripper holds and rotates the bottle cap during capping. The customer remains anonymous. Port numbering, operating pressure, rotational speed, and machine interface remain machine-specific and must be confirmed against the machine design and approved product data. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">View the verified production application →</a>`,
  `BP-2P-16-0001 supplies clamp and release air through two independent compressed-air passages to a pneumatic three-jaw gripper on a customer production capping machine. The gripper holds and rotates the bottle cap during capping. The customer remains anonymous. Port numbering, operating pressure, rotational speed, and machine interface remain machine-specific and must be confirmed against the machine design and approved product data. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">View the verified production application →</a>`,
];

const retiredCommercialPolicySources = [
  `Warranty terms`,
  `Warranty duration, start date, coverage, exclusions, evidence requirements, and remedies are established only by the formal quotation, accepted order, and any written warranty document supplied for that order.`,
  `Production lead time, estimated dispatch date, shipping method, carrier, and transit estimate are confirmed for the specific quotation and accepted order. Unless expressly guaranteed in writing, dates are estimates rather than fixed delivery commitments.`,
  `Custom-product lead time depends on drawing approval, material availability, inspection scope, quantity, destination, and other order requirements; it is confirmed in writing for each order.`,
  `Customs, weather, carrier disruption, force majeure, or other events outside the parties' reasonable control may affect estimated dates; any resulting handling follows the accepted order and applicable law.`,
  `The warranty period for all Begapunk products is one year. The warranty start date, coverage, exclusions, evidence requirements, and remedies are established by the formal quotation, accepted order, and any written warranty document supplied for the order.`,
  `Repair, replacement, credit, refund, or another remedy is not automatic. The approved remedy, timing, return requirement, and shipping responsibility are confirmed in writing for the specific claim.`,
  `<strong>Effective Date:</strong> June 11, 2026<br>\n\n    <strong>Last Updated:</strong> July 31, 2026`,
  `Begapunk Precision Rotary Joint Manufacturer ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or submit an inquiry.`,
  `These Terms of Service ("Terms") govern your use of the Begapunk website and the purchase of rotary joint products from Begapunk Precision Rotary Joint Manufacturer ("we", "us", or "our"). By accessing our website or placing an order, you agree to these Terms.`,
  `These Terms are governed by the laws of the People's Republic of China. Any disputes shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the Ningbo International Arbitration Court.`,
];

const rows = [
  {
    source: `Ningbo factory · established in 2022`,
    de: `Werk in Ningbo · gegründet 2022`,
    ja: `寧波工場 · 2022年設立`,
    ru: `Завод в Нинбо · основан в 2022 году`,
  },
  {
    source: `Ningbo-based manufacturer of standard and custom rotary joints for industrial automation, established in 2022.`,
    de: `2022 gegründeter Hersteller von Standard- und Sonderdrehdurchführungen für die industrielle Automatisierung mit Sitz in Ningbo.`,
    ja: `2022年設立、寧波を拠点に産業オートメーション向けの標準・特注ロータリージョイントを製造しています。`,
    ru: `Основанный в 2022 году производитель стандартных и специальных вращающихся соединений для промышленной автоматизации, расположенный в Нинбо.`,
  },
  {
    source: `Begapunk Established in Ningbo`,
    de: `Gründung von Begapunk in Ningbo`,
    ja: `寧波でBegapunkを設立`,
    ru: `Компания Begapunk основана в Нинбо`,
  },
  {
    source: `Ningbo Begapunk Pneumatic Components Co., Ltd. was established to develop and manufacture pneumatic rotary joints for industrial machinery.`,
    de: `Ningbo Begapunk Pneumatic Components Co., Ltd. wurde gegründet, um pneumatische Drehdurchführungen für Industriemaschinen zu entwickeln und herzustellen.`,
    ja: `Ningbo Begapunk Pneumatic Components Co., Ltd.は、産業機械向け空圧ロータリージョイントの開発・製造を目的として設立されました。`,
    ru: `Компания Ningbo Begapunk Pneumatic Components Co., Ltd. была основана для разработки и производства пневматических вращающихся соединений для промышленного оборудования.`,
  },
  {
    source: `Project Support`,
    de: `Projektunterstützung`,
    ja: `案件対応`,
    ru: `Поддержка проектов`,
  },
  {
    source: `Engineering, Production &amp; Sales`,
    de: `Technik, Fertigung &amp; Vertrieb`,
    ja: `技術・製造・営業`,
    ru: `Инженерная поддержка, производство и продажи`,
  },
  {
    source: `Founder &amp; Engineer`,
    de: `Gründer &amp; Ingenieur`,
    ja: `創業者・エンジニア`,
    ru: `Основатель и инженер`,
  },
  {
    source: `Production &amp; Quality`,
    de: `Fertigung &amp; Qualität`,
    ja: `製造・品質管理`,
    ru: `Производство и качество`,
  },
  {
    source: `Machining, assembly, and passage-by-passage inspection`,
    de: `Koordination von Bearbeitung, Montage und Prüfung jedes einzelnen Kanals`,
    ja: `加工・組立・各流路の検査を調整`,
    ru: `Координация обработки, сборки и проверки каждого канала`,
  },
  {
    source: `International Sales`,
    de: `Internationaler Vertrieb`,
    ja: `海外営業`,
    ru: `Международные продажи`,
  },
  {
    source: `Inquiry, drawing, quotation, and order coordination`,
    de: `Koordination von Anfragen, Zeichnungen, Angeboten und Aufträgen`,
    ja: `お問い合わせ・図面・見積・注文を調整`,
    ru: `Координация запросов, чертежей, предложений и заказов`,
  },
  {
    source: `Aluminum, carbon-steel, and stainless-steel components are machined to the approved drawing.`,
    de: `Bauteile aus Aluminium, Kohlenstoffstahl und Edelstahl werden nach der freigegebenen Zeichnung bearbeitet.`,
    ja: `アルミニウム、炭素鋼、ステンレス鋼の部品を承認図面に基づいて加工します。`,
    ru: `Компоненты из алюминия, углеродистой и нержавеющей стали обрабатываются по согласованному чертежу.`,
  },
  {
    source: `Each finished unit is leak-tested passage by passage. If your project requires a specific test record, tell us before ordering.`,
    de: `Jede fertige Einheit wird Kanal für Kanal auf Dichtheit geprüft. Wenn Sie ein bestimmtes Prüfprotokoll benötigen, teilen Sie uns dies bitte vor der Bestellung mit.`,
    ja: `完成品は流路ごとに漏れ検査を行います。特定の検査記録が必要な場合は、ご注文前にお知らせください。`,
    ru: `Каждое готовое изделие проверяется на герметичность по каждому каналу. Если вам нужен конкретный протокол испытаний, сообщите об этом до заказа.`,
  },
  {
    source: `Products are packed for shipment with the agreed documents. We provide 2D drawings and STEP/IGES models for the selected configuration.`,
    de: `Die Produkte werden mit den vereinbarten Unterlagen versandfertig verpackt. Für die ausgewählte Ausführung stellen wir 2D-Zeichnungen und STEP-/IGES-Modelle bereit.`,
    ja: `製品は、合意した書類とともに出荷用に梱包します。選定仕様の2D図面とSTEP／IGESモデルを提供します。`,
    ru: `Изделия упаковываются для отправки с согласованными документами. Для выбранного исполнения мы предоставляем 2D-чертежи и модели STEP/IGES.`,
  },
  {
    source: `See our manufacturing and inspection process.`,
    de: `Mehr über unsere Fertigung und Prüfung erfahren.`,
    ja: `製造・検査工程を見る。`,
    ru: `Подробнее о производстве и контроле.`,
  },
  {
    source: `Meet Begapunk, a Ningbo-based manufacturer of standard and custom pneumatic rotary joints for industrial automation and rotating machinery.`,
    de: `Lernen Sie Begapunk kennen, einen Hersteller von Standard- und Sonderdrehdurchführungen für industrielle Automatisierung und rotierende Maschinen mit Sitz in Ningbo.`,
    ja: `Begapunkは、産業オートメーションおよび回転機械向けの標準・特注空圧用ロータリージョイントを製造する寧波のメーカーです。`,
    ru: `Begapunk — производитель стандартных и специальных пневматических вращающихся соединений из Нинбо для промышленной автоматизации и вращающегося оборудования.`,
  },
  {
    source: `Ningbo-based pneumatic rotary joint manufacturer established in 2022, serving industrial automation and rotating machinery projects.`,
    de: `2022 gegründeter Hersteller pneumatischer Drehdurchführungen mit Sitz in Ningbo für Projekte in der industriellen Automatisierung und im Maschinenbau.`,
    ja: `2022年設立、産業オートメーションおよび回転機械プロジェクト向けの空圧用ロータリージョイントを製造する寧波のメーカーです。`,
    ru: `Основанный в 2022 году производитель пневматических вращающихся соединений из Нинбо для проектов промышленной автоматизации и вращающегося оборудования.`,
  },
  {
    source: `Begapunk is a Ningbo-based manufacturer of pneumatic rotary joints for industrial automation and rotating machinery. Established in 2022, we develop standard and custom single-passage and multi-passage solutions for transferring compressed air between stationary and rotating machine components.`,
    de: `Begapunk ist ein in Ningbo ansässiger Hersteller pneumatischer Drehdurchführungen für industrielle Automatisierung und rotierende Maschinen. Seit der Gründung im Jahr 2022 entwickeln wir Standard- und Sonderausführungen mit einem oder mehreren Kanälen für die Druckluftübertragung zwischen feststehenden und rotierenden Maschinenteilen.`,
    ja: `Begapunkは、産業オートメーションおよび回転機械向けの空圧用ロータリージョイントを製造する寧波のメーカーです。2022年の設立以来、固定側と回転側の機械部品間で圧縮空気を供給する、1流路・多流路の標準品および特注品を開発しています。`,
    ru: `Begapunk — производитель пневматических вращающихся соединений из Нинбо для промышленной автоматизации и вращающегося оборудования. Компания основана в 2022 году и разрабатывает стандартные и специальные одно- и многоканальные решения для передачи сжатого воздуха между неподвижными и вращающимися частями машин.`,
  },
  {
    source: `Our team works with machine builders to review passage count, pressure, speed, mounting space, materials, and connection requirements before production. This helps align each standard model or custom configuration with the actual machine layout and operating conditions.`,
    de: `Unser Team stimmt mit Maschinenbauern Kanalzahl, Druck, Drehzahl, Einbauraum, Werkstoffe und Anschlussanforderungen vor Fertigungsbeginn ab. So lässt sich jedes Standardmodell oder jede Sonderausführung auf den tatsächlichen Maschinenaufbau und die Betriebsbedingungen abstimmen.`,
    ja: `製造前に、機械メーカーと流路数、圧力、回転数、設置スペース、材質、接続条件を確認します。これにより、標準型式または特注仕様を実際の機械レイアウトと運転条件に合わせます。`,
    ru: `До начала производства наша команда согласует с изготовителями оборудования количество каналов, давление, частоту вращения, монтажное пространство, материалы и требования к присоединению. Это позволяет подобрать стандартную модель или специальное исполнение с учётом фактической компоновки машины и условий эксплуатации.`,
  },
  {
    source: `Components are machined to the approved drawing, assembled, and inspected in Ningbo. Each finished rotary joint is leak-tested passage by passage before packing. Any project-specific test or document requirements are agreed before production.`,
    de: `In Ningbo bearbeiten wir Bauteile nach der freigegebenen Zeichnung, montieren sie und prüfen die fertigen Einheiten. Jede fertige Drehdurchführung wird vor dem Verpacken Kanal für Kanal auf Dichtheit geprüft. Projektspezifische Prüf- oder Dokumentationsanforderungen stimmen wir vor Fertigungsbeginn ab.`,
    ja: `寧波で、承認図面に基づく部品加工、組立、検査を行っています。完成したロータリージョイントは、梱包前に各流路ごとに漏れ検査を実施します。案件固有の試験や提出資料が必要な場合は、製造前に内容を確認します。`,
    ru: `В Нинбо мы изготавливаем детали по согласованным чертежам, собираем и проверяем готовые узлы. Перед упаковкой каждое готовое вращающееся соединение проверяется на герметичность по каждому каналу. Специальные требования к испытаниям или документам согласуются до начала производства.`,
  },
  {
    source: `Warranty period`,
    de: `Garantiezeitraum`,
    ja: `保証期間`,
    ru: `Гарантийный срок`,
  },
  {
    source: `1 year`,
    de: `1 Jahr`,
    ja: `1年`,
    ru: `1 год`,
  },
  {
    source: `Confirmed in quotation/order`,
    de: `Im Angebot/Auftrag bestätigt`,
    ja: `見積書・注文書で確認`,
    ru: `Указаны в коммерческом предложении/заказе`,
  },
  {
    source: `Production Application: Pneumatic Three-Jaw Bottle-Cap Gripper`,
    de: `Produktionsanwendung: pneumatischer 3-Finger-Zentrischgreifer für Flaschenverschlüsse`,
    ja: `量産用途：ボトルキャップ用3爪エアチャック`,
    ru: `Производственное применение: трёхкулачковый пневматический захват для крышек`,
  },
  {
    source: `BP-2P-16-0001 routes compressed air through two independent passages for clamping and releasing a pneumatic three-jaw gripper on a customer's production capping machine. The gripper holds and rotates the bottle cap during capping. The customer remains anonymous. Check the required port functions, operating pressure, rotational speed, and machine interface against the machine requirements and current BP-2P-16-0001 drawing. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">View the production application →</a>`,
    de: `BP-2P-16-0001 führt einem pneumatischen 3-Finger-Zentrischgreifer in einer Produktionsmaschine des Kunden über zwei getrennte Druckluftkanäle Druckluft zum Schließen und Öffnen zu. Der Greifer hält und dreht den Flaschenverschluss beim Verschließen. Die Identität des Kunden bleibt anonym. Erforderliche Anschlussfunktionen, Betriebsdruck, Drehzahl und Maschinenschnittstelle mit den Maschinenanforderungen und der aktuellen Zeichnung für BP-2P-16-0001 abgleichen. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Produktionsanwendung ansehen →</a>`,
    ja: `BP-2P-16-0001は、お客様の量産用キャッピング機で、独立した2流路を介して3爪エアチャックの把持・開放用圧縮空気を供給しています。エアチャックはキャッピング時にボトルキャップを把持して回転させます。お客様名は非公開です。必要なポート機能、使用圧力、回転数、装置取合いを、装置要件と最新のBP-2P-16-0001図面に照らして確認してください。<a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">量産用途を見る →</a>`,
    ru: `BP-2P-16-0001 по двум независимым каналам подаёт сжатый воздух для зажима и разжима трёхкулачкового пневматического захвата на производственной укупорочной машине заказчика. Захват удерживает и вращает крышку при укупорке. Название заказчика не раскрывается. Сопоставьте требуемые функции портов, рабочее давление, частоту вращения и интерфейс машины с требованиями оборудования и актуальным чертежом BP-2P-16-0001. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Посмотреть производственное применение →</a>`,
  },
  {
    source: `Application Fit: Pneumatic Three-Jaw Bottle-Cap Gripper`,
    de: `Anwendungseignung: pneumatischer 3-Finger-Zentrischgreifer für Flaschenverschlüsse`,
    ja: `適用範囲：ボトルキャップ用3爪エアチャック`,
    ru: `Применимость: трёхкулачковый пневматический захват для крышек`,
  },
  {
    source: `BP-2P-08-0001 is another two-passage option for pneumatic three-jaw bottle-cap grippers. Compare its mounting dimensions and operating limits with BP-2P-16-0001 before selection. The linked production example uses BP-2P-16-0001. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Compare the application and models →</a>`,
    de: `BP-2P-08-0001 ist eine weitere Zweikanal-Option für pneumatische 3-Finger-Zentrischgreifer von Flaschenverschlüssen. Vergleichen Sie vor der Auswahl Einbaumaße und Betriebsgrenzen mit BP-2P-16-0001. Im verlinkten Produktionsbeispiel wird BP-2P-16-0001 eingesetzt. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Anwendung und Modelle vergleichen →</a>`,
    ja: `BP-2P-08-0001は、ボトルキャップ用3爪エアチャックに対応する別の2流路仕様です。選定前に、取付寸法と使用限界をBP-2P-16-0001と比較してください。リンク先の量産事例ではBP-2P-16-0001を使用しています。<a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">用途と型式を比較 →</a>`,
    ru: `BP-2P-08-0001 — ещё один двухканальный вариант для трёхкулачковых пневматических захватов крышек. Перед выбором сравните его монтажные размеры и рабочие пределы с BP-2P-16-0001. В связанном производственном примере используется BP-2P-16-0001. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Сравнить применение и модели →</a>`,
  },
  ...technicalNoteRows,
  {
    source: `Specification mismatches are an avoidable source of application problems. Operating above a model's published limits, or selecting a seal and material combination without reviewing the medium and duty, can lead to leakage or damage. Confirm the current product page and approved drawing before ordering.`,
    de: `Abweichungen zwischen Anwendung und Spezifikation sind eine vermeidbare Ursache für Probleme. Werden die veröffentlichten Grenzwerte eines Modells überschritten oder Dichtungs- und Werkstoffkombinationen gewählt, ohne Medium und Einsatzbedingungen zu prüfen, können Leckagen oder Schäden entstehen. Prüfen Sie deshalb vor der Bestellung die aktuelle Produktseite und die freigegebene Zeichnung.`,
    ja: `仕様の不一致は、回避できる用途トラブルの原因です。各型式の公開限界を超えて使用したり、使用流体や運転条件を確認せずにシールと材質の組合せを選定したりすると、漏れや損傷につながるおそれがあります。ご注文前に、最新の製品ページと承認図面をご確認ください。`,
    ru: `Несоответствие спецификации — предотвратимая причина проблем при эксплуатации. Работа за пределами опубликованных характеристик модели или выбор сочетания уплотнения и материала без учета рабочей среды и режима эксплуатации может привести к утечке или повреждению. Перед заказом проверьте актуальную страницу изделия и согласованный чертеж.`,
  },
  {
    source: `<strong>Effective Date:</strong> June 11, 2026<br>\n\n    <strong>Last Updated:</strong> August 28, 2026`,
    de: `<strong>Gültig ab:</strong> 11. Juni 2026<br>\n\n    <strong>Zuletzt aktualisiert:</strong> 28. August 2026`,
    ja: `<strong>施行日：</strong>2026年6月11日<br>\n\n    <strong>最終更新日：</strong>2026年8月28日`,
    ru: `<strong>Дата вступления в силу:</strong> 11 июня 2026 г.<br>\n\n    <strong>Последнее обновление:</strong> 28 августа 2026 г.`,
  },
  {
    source: `Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or submit an inquiry.`,
    de: `Ningbo Begapunk Pneumatic Components Co., Ltd. (nachfolgend „Begapunk“, „wir“ oder „uns“) respektiert Ihre Privatsphäre. Diese Datenschutzerklärung erläutert, wie wir Daten erheben, verwenden, weitergeben und schützen, wenn Sie unsere Website besuchen oder eine Anfrage senden.`,
    ja: `Ningbo Begapunk Pneumatic Components Co., Ltd.（以下「Begapunk」または「当社」）は、お客様のプライバシーを尊重します。本プライバシーポリシーは、当社ウェブサイトの利用またはお問い合わせ時に、情報をどのように取得、利用、提供、保護するかを説明するものです。`,
    ru: `Компания Ningbo Begapunk Pneumatic Components Co., Ltd. (далее — «Begapunk», «мы») уважает вашу конфиденциальность. Настоящая Политика объясняет, как мы собираем, используем, передаём и защищаем данные при посещении сайта или отправке запроса.`,
  },
  {
    source: `These Terms of Service ("Terms") govern your use of the Begapunk website and the purchase of rotary joint products from Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our"). By accessing our website or placing an order, you agree to these Terms.`,
    de: `Diese Allgemeinen Geschäftsbedingungen („Bedingungen“) regeln die Nutzung der Begapunk-Website und den Kauf von Drehdurchführungen bei Ningbo Begapunk Pneumatic Components Co., Ltd. (nachfolgend „Begapunk“, „wir“ oder „uns“). Mit dem Zugriff auf unsere Website oder der Erteilung einer Bestellung stimmen Sie diesen Bedingungen zu.`,
    ja: `本利用規約・取引条件（以下「本規約」）は、Begapunkウェブサイトの利用およびNingbo Begapunk Pneumatic Components Co., Ltd.（以下「Begapunk」または「当社」）からのロータリージョイント製品の購入に適用されます。本ウェブサイトへのアクセスまたは注文をもって、本規約に同意したものとみなします。`,
    ru: `Настоящие условия поставки и использования («Условия») регулируют использование сайта Begapunk и приобретение ротационных соединений у компании Ningbo Begapunk Pneumatic Components Co., Ltd. (далее — «Begapunk», «мы»). Используя сайт или размещая заказ, вы соглашаетесь с настоящими Условиями.`,
  },
  {
    source: `These Terms are governed by the laws of the People's Republic of China. Any dispute arising from or in connection with these Terms shall first be resolved through good-faith negotiation. If negotiation fails, the dispute shall be submitted to Ningbo Arbitration Commission for arbitration in accordance with its arbitration rules in effect at the time of submission.`,
    de: `Diese Bedingungen unterliegen dem Recht der Volksrepublik China. Jede Streitigkeit aus oder im Zusammenhang mit diesen Bedingungen soll zunächst durch Verhandlungen nach Treu und Glauben beigelegt werden. Scheitern die Verhandlungen, wird die Streitigkeit der Ningbo Arbitration Commission zur Schiedsentscheidung nach deren zum Zeitpunkt der Einreichung geltender Schiedsordnung vorgelegt.`,
    ja: `本規約は中華人民共和国の法律に準拠します。本規約に起因し、または関連する紛争は、まず誠実な協議により解決を図るものとします。協議で解決できない場合、当該紛争をNingbo Arbitration Commission（寧波仲裁委員会）に付託し、申立時に有効な同委員会の仲裁規則に従って仲裁により解決します。`,
    ru: `Настоящие Условия регулируются законодательством Китайской Народной Республики. Любой спор, возникающий из настоящих Условий или в связи с ними, стороны сначала стремятся урегулировать путём добросовестных переговоров. Если договориться не удаётся, спор передаётся в Ningbo Arbitration Commission (Арбитражную комиссию Нинбо) для разрешения в соответствии с её арбитражным регламентом, действующим на момент подачи заявления.`,
  },
  {
    source: `Any prices shown on the website are indicative only. The formal quotation and accepted order govern the final price, currency, quantity, specification, and commercial conditions.`,
    de: `Alle auf der Website genannten Preise sind ausschließlich unverbindliche Richtwerte. Für den endgültigen Preis, die Währung, Menge, Spezifikation und die kaufmännischen Bedingungen sind das formelle Angebot und der angenommene Auftrag maßgeblich.`,
    ja: `ウェブサイトに表示される価格は参考価格にすぎません。最終的な価格、通貨、数量、仕様および取引条件は、正式な見積書および受諾済み注文書に従います。`,
    ru: `Все цены, указанные на сайте, носят исключительно ориентировочный характер. Окончательные цена, валюта, количество, спецификация и коммерческие условия определяются официальным коммерческим предложением и принятым заказом.`,
  },
  {
    source: `Quotation validity and any conditions for acceptance are stated in the formal quotation; no fixed validity period is promised by this page.`,
    de: `Die Gültigkeitsdauer des Angebots und etwaige Annahmebedingungen sind im formellen Angebot angegeben; diese Seite sagt keine feste Gültigkeitsdauer zu.`,
    ja: `見積書の有効期間および受諾条件は正式な見積書に記載されます。本ページは一律の有効期間を保証するものではありません。`,
    ru: `Срок действия коммерческого предложения и условия его принятия указываются в официальном коммерческом предложении; настоящая страница не устанавливает фиксированный срок действия.`,
  },
  {
    source: `Freight, insurance, customs clearance, duties, taxes, and other destination charges are allocated only by the Incoterm and written conditions stated in the formal quotation and accepted order.`,
    de: `Die Zuordnung von Fracht-, Versicherungs-, Zollabfertigungs-, Zoll-, Steuer- und sonstigen Bestimmungsortkosten richtet sich ausschließlich nach dem Incoterm und den schriftlichen Bedingungen im formellen Angebot und angenommenen Auftrag.`,
    ja: `運賃、保険、通関、関税、税金および仕向地で発生するその他の費用の負担は、正式な見積書および受諾済み注文書に記載されたインコタームズと書面条件によってのみ決定されます。`,
    ru: `Распределение расходов на перевозку, страхование, таможенное оформление, пошлины, налоги и иных расходов в пункте назначения определяется исключительно условием Incoterms и письменными условиями, указанными в официальном коммерческом предложении и принятом заказе.`,
  },
  {
    source: `An order is confirmed only when its commercial and technical conditions have been accepted in writing by both parties.`,
    de: `Ein Auftrag gilt erst als bestätigt, wenn beide Parteien seine kaufmännischen und technischen Bedingungen schriftlich angenommen haben.`,
    ja: `注文は、その取引条件および技術条件について両当事者が書面で合意した時点で確定します。`,
    ru: `Заказ считается подтвержденным только после письменного принятия его коммерческих и технических условий обеими сторонами.`,
  },
  {
    source: `Deposit, balance, credit, and payment timing are confirmed in the formal quotation and accepted order; this page does not establish a standard deposit percentage.`,
    de: `Anzahlung, Restzahlung, Zahlungsziel und Zahlungstermine werden im formellen Angebot und angenommenen Auftrag festgelegt; diese Seite legt keinen einheitlichen Anzahlungsprozentsatz fest.`,
    ja: `前払金、残金、掛取引および支払時期は、正式な見積書および受諾済み注文書で確定します。本ページは一律の前払率を定めるものではありません。`,
    ru: `Размер аванса, остаточный платеж, условия кредита и сроки оплаты указываются в официальном коммерческом предложении и принятом заказе; настоящая страница не устанавливает стандартный размер аванса.`,
  },
  {
    source: `Available payment methods and any transaction fees are confirmed for the specific quotation and order.`,
    de: `Die verfügbaren Zahlungsmethoden und etwaige Transaktionsgebühren werden für das jeweilige Angebot und den jeweiligen Auftrag bestätigt.`,
    ja: `利用可能な支払方法および取引手数料は、個別の見積書および注文書で確認されます。`,
    ru: `Доступные способы оплаты и возможные комиссии подтверждаются для конкретного коммерческого предложения и заказа.`,
  },
  {
    source: `The minimum order quantity is one unit for both catalog and custom products.`,
    de: `Die Mindestbestellmenge beträgt sowohl für Katalogmodelle als auch für Sonderanfertigungen 1 Stück.`,
    ja: `カタログ品、特注品ともに最小注文数量は1個です。`,
    ru: `Минимальный заказ составляет 1 шт. как для каталожных моделей, так и для заказных изделий.`,
  },
  {
    source: `Catalog models typically take about 20 calendar days to produce. Custom products are completed within 30 calendar days. Production time starts when payment is received and does not include international shipping.`,
    de: `Die Fertigungszeit für Katalogmodelle beträgt typischerweise etwa 20 Kalendertage. Sonderanfertigungen werden innerhalb von 30 Kalendertagen fertiggestellt. Die Fertigungszeit beginnt mit dem Zahlungseingang und umfasst nicht den internationalen Transport.`,
    ja: `カタログ品の製作期間は通常約20暦日です。特注品は30暦日以内に製作を完了します。製作期間は入金確認後から起算し、国際輸送期間は含みません。`,
    ru: `Срок изготовления каталожных моделей обычно составляет около 20 календарных дней. Заказные изделия изготавливаются в течение 30 календарных дней. Срок изготовления исчисляется с момента получения оплаты и не включает международную перевозку.`,
  },
  {
    source: `The estimated dispatch date, shipping method, carrier, and transit estimate are confirmed in the formal quotation and accepted order.`,
    de: `Der voraussichtliche Versandtermin, die Versandart, der Frachtführer und die voraussichtliche Transportzeit werden im formellen Angebot und angenommenen Auftrag bestätigt.`,
    ja: `出荷予定日、輸送方法、運送業者および輸送所要日数の見込みは、正式な見積書および受諾済み注文書で確認します。`,
    ru: `Расчетная дата отгрузки, способ перевозки, перевозчик и расчетный срок доставки подтверждаются в официальном коммерческом предложении и принятом заказе.`,
  },
  {
    source: `EXW, FOB, CIF, DDP, or another Incoterm may be considered when expressly stated in the formal quotation and accepted order. Mention of an Incoterm on this page does not promise its availability for every order.`,
    de: `EXW, FOB, CIF, DDP oder ein anderer Incoterm kann vereinbart werden, wenn er ausdrücklich im formellen Angebot und angenommenen Auftrag genannt ist. Die Erwähnung eines Incoterms auf dieser Seite bedeutet nicht, dass er für jeden Auftrag verfügbar ist.`,
    ja: `EXW、FOB、CIF、DDPその他のインコタームズは、正式な見積書および受諾済み注文書に明記される場合に検討できます。本ページにインコタームズを記載していても、すべての注文で利用できることを保証するものではありません。`,
    ru: `EXW, FOB, CIF, DDP или иное условие Incoterms может применяться, если оно прямо указано в официальном коммерческом предложении и принятом заказе. Упоминание условия Incoterms на этой странице не означает, что оно доступно для каждого заказа.`,
  },
  {
    source: `Responsibility for freight, insurance, export or import clearance, duties, taxes, transfer of risk, and delivery is determined only by the confirmed Incoterm and written order conditions. Begapunk does not assume import clearance, duties, or taxes unless that responsibility is expressly accepted in writing.`,
    de: `Die Verantwortung für Fracht, Versicherung, Ausfuhr- oder Einfuhrabfertigung, Zölle, Steuern, Gefahrübergang und Lieferung richtet sich ausschließlich nach dem bestätigten Incoterm und den schriftlichen Auftragsbedingungen. Begapunk übernimmt Einfuhrabfertigung, Zölle oder Steuern nur, wenn diese Verantwortung ausdrücklich schriftlich übernommen wurde.`,
    ja: `運賃、保険、輸出入通関、関税、税金、危険負担の移転および引渡しに関する責任は、確定したインコタームズと書面による注文条件によってのみ決定されます。Begapunkは、その責任を書面で明示的に引き受けない限り、輸入通関、関税または税金を負担しません。`,
    ru: `Ответственность за перевозку, страхование, экспортное или импортное таможенное оформление, пошлины, налоги, переход рисков и поставку определяется исключительно согласованным условием Incoterms и письменными условиями заказа. Begapunk не принимает на себя импортное оформление, пошлины или налоги, если такая ответственность прямо не принята в письменной форме.`,
  },
  {
    source: `Customs clearance, weather, carrier disruption, or other events outside the parties' reasonable control may affect dispatch or international transit after production is completed; any resulting handling follows the accepted order and applicable law.`,
    de: `Zollabwicklung, Wetter, Störungen beim Frachtführer oder andere Ereignisse außerhalb der zumutbaren Kontrolle der Parteien können den Versand oder den internationalen Transport nach Fertigstellung der Produktion beeinflussen; die weitere Behandlung richtet sich nach dem angenommenen Auftrag und dem anwendbaren Recht.`,
    ja: `通関、天候、運送業者の混乱その他当事者の合理的な支配を超える事象により、製作完了後の出荷または国際輸送に影響が生じる場合があります。その際の対応は、受諾済み注文書および適用法令に従います。`,
    ru: `Таможенные процедуры, погодные условия, сбои в работе перевозчика и другие события вне разумного контроля сторон могут повлиять на отгрузку или международную перевозку после завершения производства; последующие действия определяются принятым заказом и применимым законодательством.`,
  },
  {
    source: `Begapunk's standard warranty period is one year from the shipment date for all products, subject to the approved specification and written order terms.`,
    de: `Die reguläre Garantiezeit für alle Begapunk-Produkte beträgt ein Jahr ab Versanddatum und gilt im Rahmen der freigegebenen Spezifikation und der schriftlichen Auftragsbedingungen.`,
    ja: `Begapunk全製品の標準保証期間は出荷日から1年間とし、承認済み仕様および書面による注文条件に従います。`,
    ru: `Стандартный гарантийный срок на всю продукцию Begapunk составляет один год с даты отгрузки и действует в рамках согласованной спецификации и письменных условий заказа.`,
  },
  {
    source: `A reported issue is subject to review against the approved specification, documented operating conditions, installation, maintenance, and inspection information.`,
    de: `Eine gemeldete Beanstandung wird anhand der freigegebenen Spezifikation sowie der dokumentierten Betriebs-, Montage-, Wartungs- und Prüfinformationen bewertet.`,
    ja: `申告された不具合は、承認済み仕様、記録された運転条件、取付状況、保守内容および検査情報に照らして審査されます。`,
    ru: `Заявленная проблема рассматривается с учетом согласованной спецификации, документированных условий эксплуатации, монтажа, технического обслуживания и данных контроля.`,
  },
  {
    source: `Begapunk may require photographs, operating records, inspection results, or return of the unit before determining whether a claim is covered.`,
    de: `Bevor über die Deckung eines Anspruchs entschieden wird, kann Begapunk Fotos, Betriebsaufzeichnungen, Prüfergebnisse oder die Rücksendung der Einheit verlangen.`,
    ja: `Begapunkは、申請が保証対象に該当するかを判断する前に、写真、運転記録、検査結果または製品の返送を求める場合があります。`,
    ru: `До принятия решения о том, подпадает ли претензия под гарантию, Begapunk может запросить фотографии, эксплуатационные записи, результаты контроля или возврат изделия.`,
  },
  {
    source: `If Begapunk confirms a covered product or manufacturing defect for which it is responsible, the standard remedy is a replacement at no charge. Begapunk covers the return and replacement-shipment costs agreed in writing for that claim. Other issues are handled according to the inspection findings and the written agreement between the parties.`,
    de: `Bestätigt Begapunk einen von der Garantie gedeckten Produkt- oder Fertigungsfehler, für den Begapunk verantwortlich ist, erfolgt als reguläre Abhilfe ein kostenloser Ersatz. Begapunk übernimmt die für diesen Fall schriftlich vereinbarten Kosten der Rücksendung und Ersatzlieferung. Andere Fälle werden anhand der Prüfergebnisse und der schriftlichen Vereinbarung zwischen den Parteien behandelt.`,
    ja: `Begapunkが自社の責任による保証対象の製品不良または製造不良であると確認した場合、標準対応として無償で交換します。Begapunkは、当該申請について書面で合意した返送費用および交換品の発送費用を負担します。その他の場合は、検査結果および両当事者間の書面による合意に基づいて対応します。`,
    ru: `Если Begapunk подтверждает покрываемый гарантией дефект изделия или производства, за который несет ответственность, стандартной мерой является бесплатная замена. Begapunk оплачивает согласованные в письменной форме расходы на возврат и отправку замены по данной претензии. В остальных случаях решение принимается на основании результатов проверки и письменного соглашения сторон.`,
  },
  {
    source: `No automatic return period or full-refund right is promised by this page. Any return or refund requires prior written authorization and follows the formal quotation, accepted order, and applicable law.`,
    de: `Diese Seite gewährt weder eine automatische Rückgabefrist noch einen Anspruch auf vollständige Rückerstattung. Jede Rückgabe oder Rückerstattung bedarf der vorherigen schriftlichen Genehmigung und richtet sich nach dem formellen Angebot, dem angenommenen Auftrag und dem anwendbaren Recht.`,
    ja: `本ページは、自動的な返品期間または全額返金の権利を保証するものではありません。返品または返金には事前の書面による承認が必要であり、正式な見積書、受諾済み注文書および適用法令に従います。`,
    ru: `Настоящая страница не предоставляет автоматического срока возврата или права на полный возврат денежных средств. Любой возврат изделия или денежных средств требует предварительного письменного разрешения и регулируется официальным коммерческим предложением, принятым заказом и применимым законодательством.`,
  },
  {
    source: `Eligibility for standard or custom products depends on the approved specification, product condition, production status, reason for the request, and written order conditions.`,
    de: `Ob Standard- oder Sonderprodukte für eine Rückgabe oder andere Abwicklung in Betracht kommen, hängt von der freigegebenen Spezifikation, dem Produktzustand, dem Produktionsstatus, dem Grund der Anfrage und den schriftlichen Auftragsbedingungen ab.`,
    ja: `標準品または特注品が返品その他の対応対象となるかは、承認済み仕様、製品の状態、生産状況、申請理由および書面による注文条件に基づいて判断されます。`,
    ru: `Возможность возврата или иного урегулирования для стандартных и специальных изделий зависит от согласованной спецификации, состояния изделия, стадии производства, причины обращения и письменных условий заказа.`,
  },
  {
    source: `Return address, inspection procedure, freight, insurance, customs charges, duties, taxes, restocking costs, and any refund or credit amount are confirmed in the written return authorization.`,
    de: `Rücksendeadresse, Prüfverfahren, Fracht, Versicherung, Zollkosten, Zölle, Steuern, Wiedereinlagerungskosten sowie die Höhe einer etwaigen Rückerstattung oder Gutschrift werden in der schriftlichen Rücksendegenehmigung bestätigt.`,
    ja: `返送先、検査手順、運賃、保険、通関費用、関税、税金、再入庫費用ならびに返金額または相殺額は、書面による返品承認書で確認されます。`,
    ru: `Адрес возврата, процедура проверки, расходы на перевозку, страхование, таможенное оформление, пошлины, налоги, повторное размещение на складе, а также сумма возврата или зачета указываются в письменном разрешении на возврат.`,
  },
  {
    source: `Nothing in these Terms limits rights or obligations that cannot lawfully be excluded under the applicable law.`,
    de: `Diese Bedingungen beschränken keine Rechte oder Pflichten, die nach dem anwendbaren Recht nicht wirksam ausgeschlossen werden können.`,
    ja: `本規約のいかなる条項も、適用法令上適法に排除できない権利または義務を制限するものではありません。`,
    ru: `Ничто в настоящих Условиях не ограничивает права или обязанности, которые в соответствии с применимым законодательством не могут быть правомерно исключены.`,
  },
];

const sourceSet = new Set(rows.map((row) => row.source));
if (sourceSet.size !== rows.length) {
  throw new Error('Owner-confirmed translation rows contain duplicate source strings.');
}

const directManagedProductSources = new Set([
  `Warranty period`,
  `1 year`,
  `Confirmed in quotation/order`,
  `Production Application: Pneumatic Three-Jaw Bottle-Cap Gripper`,
  `BP-2P-16-0001 routes compressed air through two independent passages for clamping and releasing a pneumatic three-jaw gripper on a customer's production capping machine. The gripper holds and rotates the bottle cap during capping. The customer remains anonymous. Check the required port functions, operating pressure, rotational speed, and machine interface against the machine requirements and current BP-2P-16-0001 drawing. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">View the production application →</a>`,
  `Application Fit: Pneumatic Three-Jaw Bottle-Cap Gripper`,
  `BP-2P-08-0001 is another two-passage option for pneumatic three-jaw bottle-cap grippers. Compare its mounting dimensions and operating limits with BP-2P-16-0001 before selection. The linked production example uses BP-2P-16-0001. <a href="application-bottle-filling-capping.html#verified-bp-2p-16-capping">Compare the application and models →</a>`,
  ...technicalNoteRows.map((row) => row.source),
]);
if (directManagedProductSources.size !== 12
  || [...directManagedProductSources].some((source) => !sourceSet.has(source))) {
  throw new Error('Direct-managed product owner facts must identify exactly 12 declared translation rows.');
}

const catalog = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'source-catalog.json'), 'utf8'));
const catalogSources = new Set(catalog.entries.map((entry) => entry.source));
const absentSourceSet = new Set(rows.filter((row) => !catalogSources.has(row.source)).map((row) => row.source));
const unexpectedAbsentSources = [...absentSourceSet].filter((source) => !directManagedProductSources.has(source));
const unexpectedlyCatalogedDirectSources = [...directManagedProductSources]
  .filter((source) => !absentSourceSet.has(source));
if (unexpectedAbsentSources.length || unexpectedlyCatalogedDirectSources.length) {
  throw new Error(
    `Owner-confirmed catalog boundary differs from the explicit 12-row direct-managed product contract:`
    + `\n- unexpected catalog absences: ${unexpectedAbsentSources.join(' | ') || 'none'}`
    + `\n- direct-managed sources still in catalog: ${unexpectedlyCatalogedDirectSources.join(' | ') || 'none'}`,
  );
}
const catalogManagedRows = rows.filter((row) => !directManagedProductSources.has(row.source));

let changed = 0;
const checkFailures = [];
for (const language of ['de', 'ja', 'ru']) {
  const filePath = path.join(root, 'i18n', 'overrides', `${language}.json`);
  const before = await fs.readFile(filePath, 'utf8');
  const current = JSON.parse(before);
  const retiredSources = [
    ...technicalNoteRows.map((row) => row.legacySource),
    ...retiredHomepageSources,
    ...retiredAboutSources,
    ...retiredBottleCappingSources,
    ...retiredCommercialPolicySources,
  ];
  const retiredPresent = retiredSources.filter((source) => Object.hasOwn(current, source));
  const directManagedPresent = [...directManagedProductSources]
    .filter((source) => Object.hasOwn(current, source));
  const missing = catalogManagedRows.filter((row) => current[row.source] !== row[language]);
  if (checkOnly) {
    if (missing.length || retiredPresent.length || directManagedPresent.length) {
      const missingSources = missing.map((row) => `\n    missing: ${row.source}`).join('');
      checkFailures.push(
        `${language}: missing catalog-managed=${missing.length}; retired legacy=${retiredPresent.length}; direct-managed orphan=${directManagedPresent.length}.${missingSources}`,
      );
    }
    continue;
  }
  for (const legacySource of [...retiredPresent, ...directManagedPresent]) delete current[legacySource];
  if (!missing.length && !retiredPresent.length && !directManagedPresent.length) continue;
  for (const row of catalogManagedRows) current[row.source] = row[language];
  await fs.writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  changed += 1;
}

if (productPageNames.length !== 16) {
  throw new Error(`Expected 16 translation-managed product pages; found ${productPageNames.length}.`);
}

const exactCount = (source, value) => source.split(value).length - 1;
for (const [language, warranty] of Object.entries(productWarrantyByLocale)) {
  for (const pageName of productPageNames) {
    const relativePath = warranty.prefix ? `${warranty.prefix}/${pageName}` : pageName;
    const filePath = path.join(root, ...relativePath.split('/'));
    const before = await fs.readFile(filePath, 'utf8');
    const legacyVisible = `<th>${warranty.legacyName}</th><td>${warranty.legacyValue}</td>`;
    const currentVisible = `<th>${warranty.name}</th><td>${warranty.value}</td>`;
    const legacyStructured = `"name":"${warranty.legacyName}","value":"${warranty.legacyValue}"`;
    const currentStructured = `"name":"${warranty.name}","value":"${warranty.value}"`;
    const visibleLegacyCount = exactCount(before, legacyVisible);
    const visibleCurrentCount = exactCount(before, currentVisible);
    const structuredLegacyCount = exactCount(before, legacyStructured);
    const structuredCurrentCount = exactCount(before, currentStructured);
    if (visibleLegacyCount + visibleCurrentCount !== 1
      || structuredLegacyCount + structuredCurrentCount !== 1) {
      throw new Error(
        `${relativePath}: expected exactly one visible and one structured warranty pair; `
        + `found visible legacy/current ${visibleLegacyCount}/${visibleCurrentCount} and `
        + `structured legacy/current ${structuredLegacyCount}/${structuredCurrentCount}.`,
      );
    }
    const synchronized = visibleCurrentCount === 1 && structuredCurrentCount === 1;
    if (checkOnly) {
      if (!synchronized) throw new Error(`${relativePath}: one-year product warranty is not synchronized.`);
      continue;
    }
    if (synchronized) continue;
    const after = before
      .replace(legacyVisible, currentVisible)
      .replace(legacyStructured, currentStructured);
    if (after === before
      || exactCount(after, currentVisible) !== 1
      || exactCount(after, currentStructured) !== 1) {
      throw new Error(`${relativePath}: failed to synchronize the one-year warranty atomically.`);
    }
    await fs.writeFile(filePath, after, 'utf8');
    changed += 1;
  }
}

const bottleProductPath = path.join(root, bottleCappingProductPage);
const bottleProductHtml = await fs.readFile(bottleProductPath, 'utf8');
const bottleProductClaimIsCurrent = bottleProductHtml.includes(approvedBottleCappingProductClaim)
  && !bottleProductHtml.includes(legacyBottleCappingProductClaim);
if (checkOnly) {
  if (!bottleProductClaimIsCurrent) {
    throw new Error(`${bottleCappingProductPage}: bottle-capping Product JSON-LD claim is not synchronized.`);
  }
} else if (!bottleProductClaimIsCurrent) {
  const replacedClaim = [legacyBottleCappingProductClaim, previousBottleCappingProductClaim]
    .find((claim) => bottleProductHtml.includes(claim));
  if (!replacedClaim) {
    throw new Error(`${bottleCappingProductPage}: expected legacy bottle-capping Product JSON-LD claim was not found.`);
  }
  await fs.writeFile(
    bottleProductPath,
    bottleProductHtml.replace(replacedClaim, approvedBottleCappingProductClaim),
    'utf8',
  );
  changed += 1;
}

if (checkOnly && checkFailures.length) {
  throw new Error(`Owner-confirmed translation synchronization required:\n${checkFailures.map((item) => `- ${item}`).join('\n')}`);
}

console.log(checkOnly
  ? `Owner-confirmed translations, 64 one-year product warranties, and bottle-capping structured data are synchronized for ${catalogManagedRows.length} catalog-managed and ${directManagedProductSources.size} direct-managed source statements in three languages.`
  : `Synchronized owner-confirmed translations and structured data in ${changed} file(s).`);
