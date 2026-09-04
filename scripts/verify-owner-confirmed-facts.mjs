import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const failures = [];

const locales = {
  en: {
    prefix: '',
    warrantyName: 'Warranty period',
    warrantyValue: '1 year from shipment',
    privacyIdentity: 'Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or submit an inquiry.',
    termsIdentity: 'These Terms of Service ("Terms") govern your use of the Begapunk website and the purchase of rotary joint products from Ningbo Begapunk Pneumatic Components Co., Ltd. ("Begapunk", "we", "us", or "our"). By accessing our website or placing an order, you agree to these Terms.',
    termsArbitration: "These Terms are governed by the laws of the People's Republic of China. Any dispute arising from or in connection with these Terms shall first be resolved through good-faith negotiation. If negotiation fails, the dispute shall be submitted to Ningbo Arbitration Commission for arbitration in accordance with its arbitration rules in effect at the time of submission.",
    aboutRoleTitles: ['GuangCheng Cao', 'Production & Quality', 'International Sales'],
    aboutRoleDescriptions: ['Founder & Engineer', 'Machining, assembly, and passage-by-passage inspection', 'Inquiry, drawing, quotation, and order coordination'],
    termsPolicies: [
      'The minimum order quantity is one unit for both catalog and custom products.',
      'Catalog models typically take about 20 calendar days to produce. Custom products are completed within 30 calendar days. Production time starts when payment is received and does not include international shipping.',
      "Begapunk's standard warranty period is one year from the shipment date for all products, subject to the approved specification and written order terms.",
      'If Begapunk confirms a covered product or manufacturing defect for which it is responsible, the standard remedy is a replacement at no charge. Begapunk covers the return and replacement-shipment costs agreed in writing for that claim. Other issues are handled according to the inspection findings and the written agreement between the parties.',
    ],
    selectionBoundaries: [
      'Send the medium, temperature, mounting, duty cycle, and required pressure and speed for an operating-point review.',
      'Send the application requirements and request the current model-specific file before selecting or ordering this model.',
      'For continuous rotation, send your duty cycle. We will confirm the operating point before production.',
    ],
    caseFacts: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': [
        'BP-2P-95-0005',
        'Compressed air',
        'Stationary-to-rotating compressed-air connection at the chuck',
      ],
      'case-bp-3p-s06-sensor-monitored-chuck.html': [
        'Clamping, unclamping and blow-off in this installation',
        'Transfer path for external sensor signals across the rotating interface',
        'The external sensors and machine controller perform the actual detection; the rotary union does not detect a workpiece or determine clamp status by itself.',
      ],
    },
  },
  de: {
    prefix: 'de',
    warrantyName: 'Garantiezeitraum',
    warrantyValue: '1 Jahr ab Versand',
    privacyIdentity: 'Ningbo Begapunk Pneumatic Components Co., Ltd. (nachfolgend „Begapunk“, „wir“ oder „uns“) respektiert Ihre Privatsphäre. Diese Datenschutzerklärung erläutert, wie wir Daten erheben, verwenden, weitergeben und schützen, wenn Sie unsere Website besuchen oder eine Anfrage senden.',
    termsIdentity: 'Diese Allgemeinen Geschäftsbedingungen („Bedingungen“) regeln die Nutzung der Begapunk-Website und den Kauf von Drehdurchführungen bei Ningbo Begapunk Pneumatic Components Co., Ltd. (nachfolgend „Begapunk“, „wir“ oder „uns“). Mit dem Zugriff auf unsere Website oder der Erteilung einer Bestellung stimmen Sie diesen Bedingungen zu.',
    termsArbitration: 'Diese Bedingungen unterliegen dem Recht der Volksrepublik China. Jede Streitigkeit aus oder im Zusammenhang mit diesen Bedingungen soll zunächst durch Verhandlungen nach Treu und Glauben beigelegt werden. Scheitern die Verhandlungen, wird die Streitigkeit der Ningbo Arbitration Commission zur Schiedsentscheidung nach deren zum Zeitpunkt der Einreichung geltender Schiedsordnung vorgelegt.',
    aboutRoleTitles: ['GuangCheng Cao', 'Fertigung & Qualität', 'Internationaler Vertrieb'],
    aboutRoleDescriptions: ['Gründer & Ingenieur', 'Koordination von Bearbeitung, Montage und Prüfung jedes einzelnen Kanals', 'Koordination von Anfragen, Zeichnungen, Angeboten und Aufträgen'],
    termsPolicies: [
      'Die Mindestbestellmenge beträgt sowohl für Katalogmodelle als auch für Sonderanfertigungen 1 Stück.',
      'Die Fertigungszeit für Katalogmodelle beträgt typischerweise etwa 20 Kalendertage. Sonderanfertigungen werden innerhalb von 30 Kalendertagen fertiggestellt. Die Fertigungszeit beginnt mit dem Zahlungseingang und umfasst nicht den internationalen Transport.',
      'Die reguläre Garantiezeit für alle Begapunk-Produkte beträgt ein Jahr ab Versanddatum und gilt im Rahmen der freigegebenen Spezifikation und der schriftlichen Auftragsbedingungen.',
      'Bestätigt Begapunk einen von der Garantie gedeckten Produkt- oder Fertigungsfehler, für den Begapunk verantwortlich ist, erfolgt als reguläre Abhilfe ein kostenloser Ersatz. Begapunk übernimmt die für diesen Fall schriftlich vereinbarten Kosten der Rücksendung und Ersatzlieferung. Andere Fälle werden anhand der Prüfergebnisse und der schriftlichen Vereinbarung zwischen den Parteien behandelt.',
    ],
    selectionBoundaries: [
      'Senden Sie Medium, Temperatur, Montage, Lastprofil sowie den erforderlichen Druck und die Drehzahl für eine Prüfung des Betriebspunkts.',
      'Anwendungsanforderungen senden und vor Auswahl oder Bestellung die aktuelle modellspezifische Datei anfordern.',
      'Für Dauerbetrieb nennen Sie bitte Ihr Lastprofil. Wir bestätigen den Betriebspunkt vor der Fertigung.',
    ],
    caseFacts: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': [
        'BP-2P-95-0005',
        'Druckluft',
        'Druckluftübertragung von der stationären auf die rotierende Seite des Spannfutters',
      ],
      'case-bp-3p-s06-sensor-monitored-chuck.html': [
        'Spannen, Lösen und Ausblasen in diesem Einbau',
        'Übertragungsweg für externe Sensorsignale über die rotierende Schnittstelle',
        'Die eigentliche Erkennung erfolgt durch externe Sensoren und die Maschinensteuerung; die Drehdurchführung selbst erkennt weder ein Werkstück noch den Spannzustand.',
      ],
    },
  },
  fr: {
    prefix: 'fr',
    warrantyName: 'Durée de garantie',
    warrantyValue: '1 an à compter de l\'expédition',
    privacyIdentity: 'Ningbo Begapunk Pneumatic Components Co., Ltd. (« Begapunk », « nous » ou « notre ») respecte votre vie privée. La présente politique de confidentialité explique comment nous recueillons, utilisons, communiquons et protégeons vos informations lorsque vous consultez notre site ou envoyez une demande.',
    termsIdentity: 'Les présentes Conditions d\'utilisation (« Conditions ») régissent votre utilisation du site Begapunk et l\'achat de raccords tournants auprès de Ningbo Begapunk Pneumatic Components Co., Ltd. (« Begapunk », « nous » ou « notre »). En accédant à notre site ou en passant une commande, vous acceptez ces Conditions.',
    termsArbitration: 'Les présentes Conditions sont régies par le droit de la République populaire de Chine. Tout litige découlant des présentes Conditions ou s\'y rapportant doit d\'abord faire l\'objet d\'une tentative de règlement amiable de bonne foi. À défaut d\'accord, le litige sera soumis à la Commission d\'arbitrage de Ningbo conformément au règlement d\'arbitrage en vigueur au moment de la saisine.',
    aboutRoleTitles: ['GuangCheng Cao', 'Production et qualité', 'Ventes internationales'],
    aboutRoleDescriptions: ['Fondateur et ingénieur', 'Usinage, assemblage et contrôle circuit par circuit', 'Coordination des demandes, plans, devis et commandes'],
    termsPolicies: [
      'La quantité minimale de commande est d\'une unité, tant pour les modèles du catalogue que pour les produits sur mesure.',
      'La fabrication des modèles du catalogue prend généralement environ 20 jours calendaires. Les produits sur mesure sont achevés dans un délai de 30 jours calendaires. Le délai de fabrication commence à réception du paiement et n\'inclut pas le transport international.',
      'La durée de garantie standard de Begapunk est d\'un an à compter de la date d\'expédition pour tous les produits, sous réserve des caractéristiques approuvées et des conditions écrites de la commande.',
      'Si Begapunk confirme un défaut de produit ou de fabrication couvert dont elle est responsable, la mesure standard consiste en un remplacement sans frais. Begapunk prend en charge les frais de retour et d\'expédition du produit de remplacement convenus par écrit pour cette réclamation. Les autres problèmes sont traités selon les conclusions du contrôle et l\'accord écrit entre les parties.',
    ],
    selectionBoundaries: [
      /(?:envoyez|indiquez)[\s\S]{0,100}(?:fluide|milieu)[\s\S]{0,160}température[\s\S]{0,160}(?:montage|fixation)[\s\S]{0,160}(?:cycle de fonctionnement|cycle de travail|cycle de service)[\s\S]{0,180}(?:pression|vitesse)/iu,
      /(?:envoyez|indiquez)[\s\S]{0,100}(?:exigences|conditions) de l['’]application[\s\S]{0,220}(?:fichier|document)[\s\S]{0,100}(?:modèle|référence)[\s\S]{0,160}(?:sélectionner|commander)/iu,
      /rotation continue[\s\S]{0,160}(?:cycle de fonctionnement|cycle de travail|cycle de service)[\s\S]{0,180}(?:point de fonctionnement|point d['’]exploitation)[\s\S]{0,120}(?:production|fabrication)/iu,
    ],
    caseFacts: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': [
        'BP-2P-95-0005',
        'Air comprimé',
        'Transfert d’air comprimé de la partie fixe vers le mandrin en rotation',
      ],
      'case-bp-3p-s06-sensor-monitored-chuck.html': [
        'Serrage, desserrage et soufflage dans cette installation',
        'Transfert des signaux de capteurs externes à travers l\'interface tournante',
        'La détection assurée par des capteurs externes et le système de commande reste indépendante du raccord tournant. Celui-ci ne détecte donc pas lui-même la présence d\'une pièce ni l\'état du serrage.',
      ],
    },
  },
  ja: {
    prefix: 'ja',
    warrantyName: '保証期間',
    warrantyValue: '出荷日から1年',
    privacyIdentity: 'Ningbo Begapunk Pneumatic Components Co., Ltd.（以下「Begapunk」または「当社」）は、お客様のプライバシーを尊重します。本プライバシーポリシーは、当社ウェブサイトの利用またはお問い合わせ時に、情報をどのように取得、利用、提供、保護するかを説明するものです。',
    termsIdentity: '本利用規約・取引条件（以下「本規約」）は、Begapunkウェブサイトの利用およびNingbo Begapunk Pneumatic Components Co., Ltd.（以下「Begapunk」または「当社」）からのロータリージョイント製品の購入に適用されます。本ウェブサイトへのアクセスまたは注文をもって、本規約に同意したものとみなします。',
    termsArbitration: '本規約は中華人民共和国の法律に準拠します。本規約に起因し、または関連する紛争は、まず誠実な協議により解決を図るものとします。協議で解決できない場合、当該紛争をNingbo Arbitration Commission（寧波仲裁委員会）に付託し、申立時に有効な同委員会の仲裁規則に従って仲裁により解決します。',
    aboutRoleTitles: ['GuangCheng Cao', '製造・品質管理', '海外営業'],
    aboutRoleDescriptions: ['創業者・エンジニア', '加工・組立・各流路の検査を調整', 'お問い合わせ・図面・見積・注文を調整'],
    termsPolicies: [
      'カタログ品、特注品ともに最小注文数量は1個です。',
      'カタログ品の製作期間は通常約20暦日です。特注品は30暦日以内に製作を完了します。製作期間は入金確認後から起算し、国際輸送期間は含みません。',
      'Begapunk全製品の標準保証期間は出荷日から1年間とし、承認済み仕様および書面による注文条件に従います。',
      'Begapunkが自社の責任による保証対象の製品不良または製造不良であると確認した場合、標準対応として無償で交換します。Begapunkは、当該申請について書面で合意した返送費用および交換品の発送費用を負担します。その他の場合は、検査結果および両当事者間の書面による合意に基づいて対応します。',
    ],
    selectionBoundaries: [
      '運転点の確認には、流体、温度、取付け、デューティ、必要圧力、回転数をお知らせください。',
      '用途条件をお知らせのうえ、選定・発注前に現在の型式専用ファイルをご依頼ください。',
      '連続回転の場合はデューティをお知らせください。生産前に運転点を確認します。',
    ],
    caseFacts: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': [
        'BP-2P-95-0005',
        '空気（圧縮空気）',
        'チャック部での固定側から回転側への圧縮空気の供給',
      ],
      'case-bp-3p-s06-sensor-monitored-chuck.html': [
        'この組込みではクランプ、アンクランプ、除塵用エアブロー',
        '回転部をまたぐ外部センサ信号の伝送経路',
        '検出を行うのは外部センサと機械制御装置であり、ロータリージョイント自体がワーク有無やクランプ状態を判定するものではありません。',
      ],
    },
  },
  ru: {
    prefix: 'ru',
    warrantyName: 'Гарантийный срок',
    warrantyValue: '1 год с даты отгрузки',
    privacyIdentity: 'Компания Ningbo Begapunk Pneumatic Components Co., Ltd. (далее — «Begapunk», «мы») уважает вашу конфиденциальность. Настоящая Политика объясняет, как мы собираем, используем, передаём и защищаем данные при посещении сайта или отправке запроса.',
    termsIdentity: 'Настоящие условия поставки и использования («Условия») регулируют использование сайта Begapunk и приобретение ротационных соединений у компании Ningbo Begapunk Pneumatic Components Co., Ltd. (далее — «Begapunk», «мы»). Используя сайт или размещая заказ, вы соглашаетесь с настоящими Условиями.',
    termsArbitration: 'Настоящие Условия регулируются законодательством Китайской Народной Республики. Любой спор, возникающий из настоящих Условий или в связи с ними, стороны сначала стремятся урегулировать путём добросовестных переговоров. Если договориться не удаётся, спор передаётся в Ningbo Arbitration Commission (Арбитражную комиссию Нинбо) для разрешения в соответствии с её арбитражным регламентом, действующим на момент подачи заявления.',
    aboutRoleTitles: ['GuangCheng Cao', 'Производство и качество', 'Международные продажи'],
    aboutRoleDescriptions: ['Основатель и инженер', 'Координация обработки, сборки и проверки каждого канала', 'Координация запросов, чертежей, предложений и заказов'],
    termsPolicies: [
      'Минимальный заказ составляет 1 шт. как для каталожных моделей, так и для заказных изделий.',
      'Срок изготовления каталожных моделей обычно составляет около 20 календарных дней. Заказные изделия изготавливаются в течение 30 календарных дней. Срок изготовления исчисляется с момента получения оплаты и не включает международную перевозку.',
      'Стандартный гарантийный срок на всю продукцию Begapunk составляет один год с даты отгрузки и действует в рамках согласованной спецификации и письменных условий заказа.',
      'Если Begapunk подтверждает покрываемый гарантией дефект изделия или производства, за который несет ответственность, стандартной мерой является бесплатная замена. Begapunk оплачивает согласованные в письменной форме расходы на возврат и отправку замены по данной претензии. В остальных случаях решение принимается на основании результатов проверки и письменного соглашения сторон.',
    ],
    selectionBoundaries: [
      'Для проверки рабочей точки укажите среду, температуру, монтаж, рабочий цикл, требуемые давление и частоту вращения.',
      'Сообщите условия применения и запросите актуальный файл конкретной модели до выбора или заказа.',
      'Для непрерывного вращения укажите рабочий цикл. Мы подтвердим рабочую точку до производства.',
    ],
    caseFacts: {
      'case-bp-2p-95-pneumatic-chuck-integration.html': [
        'BP-2P-95-0005',
        'Сжатый воздух',
        'Подача сжатого воздуха от неподвижной к вращающейся стороне патрона',
      ],
      'case-bp-3p-s06-sensor-monitored-chuck.html': [
        'Зажим, разжим и обдув в этой установке',
        'Передача сигналов внешних датчиков через вращающийся интерфейс',
        'Наличие заготовки и состояние зажима определяются внешними датчиками и системой управления станка; само вращающееся соединение этих функций не выполняет.',
      ],
    },
  },
};

const expectedBusiness = {
  streetAddress: '88 Yugong Road, Zonghan Industrial Park',
  addressLocality: 'Ningbo',
  addressRegion: 'Zhejiang',
  postalCode: '315300',
  addressCountry: 'CN',
  latitude: 29.8683,
  longitude: 121.544,
  openingHours: 'Mo-Fr 08:30-17:30',
};

const productPages = config.pages.filter((pageName) => /^BP-[\w-]+\.html$/.test(pageName));
const casePages = [
  'case-bp-2p-95-pneumatic-chuck-integration.html',
  'case-bp-3p-s06-sensor-monitored-chuck.html',
];
const retiredCaseAuditCopy = /Photo note:|project owner confirmed|photographs? (?:alone )?(?:do not|does not)|Fotohinweis:|Projektverantwortlich|Fotos? (?:allein )?(?:nicht|keine)|Note sur les photographies\s*:|responsable du projet|les photographies? seules? ne|写真に関する注記|案件責任者|写真だけでは|Примечание к фотографиям|Владелец проекта|по самим фотографиям/iu;

const expectedLocaleCodes = [config.sourceLanguage.code, ...(config.activeLanguageCodes || [])];
if (JSON.stringify(Object.keys(locales)) !== JSON.stringify(expectedLocaleCodes)) {
  fail(`owner-confirmed locale contract must exactly match source + active languages (${expectedLocaleCodes.join(', ')}).`);
}

function fail(message) {
  failures.push(message);
}

function compact(value = '') {
  return String(value).replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}

function relativeFile(locale, pageName) {
  return locale.prefix ? path.join(locale.prefix, pageName) : pageName;
}

async function read(relativePath) {
  try {
    return await fs.readFile(path.join(root, relativePath), 'utf8');
  } catch (error) {
    fail(`${relativePath}: cannot be read (${error.message}).`);
    return '';
  }
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

function parseJsonLd($, relativePath) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).html();
    if (!raw) return;
    try {
      const value = JSON.parse(raw);
      walkJson(value, (node) => nodes.push(node));
    } catch (error) {
      fail(`${relativePath}: invalid JSON-LD (${error.message}).`);
    }
  });
  return nodes;
}

function visiblePageText($) {
  const body = $('body').clone();
  body.find('script, style, noscript, template, header, nav, footer').remove();
  return compact(body.text());
}

function containsText(haystack, needle) {
  if (needle instanceof RegExp) return needle.test(compact(haystack));
  return compact(haystack).toLocaleLowerCase().includes(compact(needle).toLocaleLowerCase());
}

function checkOrganizationFacts($, relativePath, locale) {
  const nodes = parseJsonLd($, relativePath);
  const organizations = nodes.filter((node) => node['@type'] === 'Organization'
    && node['@id'] === 'https://www.begapunk.com/#organization');
  if (organizations.length !== 1) {
    fail(`${relativePath}: expected exactly one canonical Organization JSON-LD node, found ${organizations.length}.`);
    return;
  }
  const organization = organizations[0];
  if (String(organization.foundingDate) !== '2022') {
    fail(`${relativePath}: Organization foundingDate must be exactly 2022.`);
  }
  if (!organization.founder || organization.founder['@type'] !== 'Person') {
    fail(`${relativePath}: Organization founder must be a Person.`);
  } else if (Object.hasOwn(organization.founder, 'description')) {
    fail(`${relativePath}: the founder JSON-LD must not publish a biographical description.`);
  }
}

function checkLocalBusiness(node, relativePath, sourceName) {
  if (!node) {
    fail(`${relativePath}: missing canonical LocalBusiness in ${sourceName}.`);
    return;
  }
  for (const [key, expected] of Object.entries(expectedBusiness)) {
    let actual;
    if (key === 'latitude' || key === 'longitude') actual = node.geo?.[key];
    else if (key === 'openingHours') actual = node.openingHours;
    else actual = node.address?.[key];
    if (actual !== expected) {
      fail(`${relativePath}: LocalBusiness ${key} must be exactly ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}.`);
    }
  }
}

async function collectFiles(directory, predicate) {
  const results = [];
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return results;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await collectFiles(absolute, predicate));
    else if (predicate(entry.name)) results.push(absolute);
  }
  return results;
}

// Current public source only. Audit evidence, built releases, tooling, and the protected
// catalog project are intentionally outside this verifier's scan scope.
const claimFiles = [];
for (const entry of await fs.readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && /^(?:.+\.html|search-index\.json|llms\.txt)$/i.test(entry.name)) {
    claimFiles.push(path.join(root, entry.name));
  }
}
for (const language of config.activeLanguageCodes || []) {
  claimFiles.push(...await collectFiles(path.join(root, language), (name) => /\.(?:html|json|txt)$/i.test(name)));
}
claimFiles.push(...await collectFiles(path.join(root, 'i18n'), (name) => /\.json$/i.test(name)));

const globalForbidden = [
  { label: 'retired founder-history claim from 2006', pattern: /\b2006\b|2006年/i },
  { label: 'unsupported 200,000/200K production-volume claim', pattern: /\b(?:200(?:,|\s)?000\+?|200K\+?)\b/i },
  { label: 'unsupported 20+ years claim', pattern: /\b20\+\s*years?\b|\b20\+\s*Jahre\b|\b20\+\s*ans?\b|20年以上|\b20\+\s*лет\b/i },
  { label: 'controlled-laboratory validation claim', pattern: /controlled\s+laboratory\s+conditions|kontrollierten?\s+Laborbedingungen|conditions?\s+(?:contrôlées?\s+)?(?:de|en)\s+laboratoire|管理された(?:試験|実験)(?:条件|環境)|контролируем(?:ых|ые)\s+лабораторн(?:ых|ые)\s+услов/i },
];

for (const absolute of claimFiles) {
  const source = await fs.readFile(absolute, 'utf8');
  const relativePath = path.relative(root, absolute);
  for (const { label, pattern } of globalForbidden) {
    if (pattern.test(source)) fail(`${relativePath}: contains ${label}.`);
  }
}

const commercialPages = ['terms.html', 'faq.html', ...productPages];
const commercialForbidden = [
  { label: 'fixed quotation-validity period', pattern: /\bquotation[^.!?]{0,80}\bvalid\s+for\s+30\s+days\b|Angebot[^.!?]{0,80}30\s*Tage[^.!?]{0,30}gültig|devis[^.!?]{0,80}(?:valable|validité)[^.!?]{0,30}30\s*jours|見積[^。]{0,80}30日[^。]{0,30}有効|предложени[^.!?]{0,80}действительн[^.!?]{0,30}30\s*дн/i },
  { label: 'fixed three-week production lead time', pattern: /\b3\s*weeks?\b|\b3\s*Wochen\b|\b3\s*semaines?\b|3週間|\b3\s*недел/i },
  { label: 'fixed 5-10 day shipping time', pattern: /\b5\s*[-–—]\s*10\s*(?:business\s*)?days?\b|\b5\s*[-–—]\s*10\s*(?:Werk)?tage\b|\b5\s*[-–—]\s*10\s*jours?(?:\s+ouvrés?)?\b|5\s*[-–—]\s*10営業日|\b5\s*[-–—]\s*10\s*(?:рабочих\s*)?дн/i },
  { label: 'fixed deposit/balance split', pattern: /\b60\s*%[^.!?]{0,80}\bdeposit\b|\b40\s*%[^.!?]{0,80}\bbalance\b|\b60\s*%[^.!?]{0,80}(?:Anzahlung|acompte|dépot|депозит)|\b40\s*%[^.!?]{0,80}solde|60\s*%[^。]{0,80}(?:前金|着手金)/i },
  { label: 'fixed PayPal order-value cutoff', pattern: /PayPal[^.!?。]{0,80}(?:under|below|less\s+than)\s*(?:USD\s*)?\$?\s*500|PayPal[^.!?。]{0,80}(?:unter|weniger\s+als)\s*500|PayPal[^.!?。]{0,80}(?:moins de|inférieur à)\s*(?:USD\s*)?500|PayPal[^。]{0,80}500(?:米ドル|ドル)未満|PayPal[^.!?]{0,80}(?:менее|до)\s*500/i },
  { label: 'default EXW Incoterm', pattern: /(?:default|standard)\s+(?:shipping\s+)?(?:term|Incoterm)[^.!?]{0,30}\bEXW\b|Standard-Lieferbedingung[^.!?]{0,30}\bEXW\b|(?:Incoterm|condition de livraison)\s+(?:par défaut|standard)[^.!?]{0,30}\bEXW\b|標準の取引条件[^。]{0,30}EXW|Стандартное\s+условие\s+поставки[^.!?]{0,30}\bEXW\b/i },
  { label: 'automatic immediate replacement', pattern: /\bimmediate\s+replacement\b|sofortig(?:er|e|en)\s+Ersatz|remplacement\s+(?:automatique|immédiat)|即時交換|немедленн(?:ая|ую)\s+замен/i },
  { label: 'no-return replacement promise', pattern: /\b(?:no|without)\s+return\s+(?:is\s+)?required\b|Rücksendung\s+nicht\s+erforderlich|(?:aucun|sans)\s+retour\s+(?:n['’]est\s+)?(?:requis|nécessaire)|返品不要|без\s+возврат/i },
  { label: 'fixed 30-day full-refund promise', pattern: /\b30[-\s]?day[^.!?]{0,80}\bfull\s+refund\b|\b30\s*Tage[^.!?]{0,80}(?:volle|vollständige)\s+Erstattung|30\s*jours[^.!?]{0,80}remboursement\s+intégral|30日[^。]{0,80}全額返金|\b30\s*дн[^.!?]{0,80}полн[^.!?]{0,30}возврат/i },
];

for (const [language, locale] of Object.entries(locales)) {
  for (const pageName of commercialPages) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    for (const { label, pattern } of commercialForbidden) {
      if (pattern.test(source)) fail(`${relativePath}: contains ${label}.`);
    }
  }

  const termsPath = relativeFile(locale, 'terms.html');
  const termsSource = await read(termsPath);
  if (termsSource) {
    const $ = load(termsSource, { decodeEntities: false });
    for (const policy of locale.termsPolicies) {
      const matchingTerms = $('li').filter((_, item) => compact($(item).text()) === policy);
      if (matchingTerms.length !== 1) {
        fail(`${termsPath}: expected one exact commercial-policy statement, found ${matchingTerms.length}: ${policy}`);
      }
    }
    for (const [label, statement] of [
      ['legal identity', locale.termsIdentity],
      ['arbitration clause', locale.termsArbitration],
    ]) {
      const matchingParagraphs = $('p').filter((_, item) => compact($(item).text()) === statement);
      if (matchingParagraphs.length !== 1) {
        fail(`${termsPath}: expected one exact ${label}, found ${matchingParagraphs.length}.`);
      }
    }
  }

  const privacyPath = relativeFile(locale, 'privacy.html');
  const privacySource = await read(privacyPath);
  if (privacySource) {
    const $ = load(privacySource, { decodeEntities: false });
    const matchingPrivacyIdentity = $('p').filter((_, item) => compact($(item).text()) === locale.privacyIdentity);
    if (matchingPrivacyIdentity.length !== 1) {
      fail(`${privacyPath}: expected one exact legal identity statement, found ${matchingPrivacyIdentity.length}.`);
    }
  }

  for (const pageName of productPages) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    if (!source) continue;
    const $ = load(source, { decodeEntities: false });
    const matchingRows = $('table.spec-table tr').filter((_, row) => {
      const name = compact($(row).find('th').first().text());
      const value = compact($(row).find('td').first().text());
      return name === locale.warrantyName && value === locale.warrantyValue;
    });
    if (matchingRows.length !== 1) {
      fail(`${relativePath}: expected one visible warranty row ${JSON.stringify(locale.warrantyName)} = ${JSON.stringify(locale.warrantyValue)}, found ${matchingRows.length}.`);
    }

    const products = parseJsonLd($, relativePath).filter((node) => node['@type'] === 'Product');
    if (products.length !== 1) {
      fail(`${relativePath}: expected exactly one Product JSON-LD node, found ${products.length}.`);
    } else {
      const warranties = Array.isArray(products[0].additionalProperty)
        ? products[0].additionalProperty.filter((property) => compact(property?.name) === locale.warrantyName
          && compact(property?.value) === locale.warrantyValue)
        : [];
      if (warranties.length !== 1) {
        fail(`${relativePath}: Product JSON-LD must contain one matching warranty name/value pair, found ${warranties.length}.`);
      }
    }

    const pageText = visiblePageText($);
    const hasSelectionBoundary = locale.selectionBoundaries.some((boundary) => containsText(pageText, boundary));
    if (!hasSelectionBoundary) {
      fail(`${relativePath}: missing the customer-facing operating-limit or model-file selection boundary.`);
    }
  }

  for (const casePage of casePages) {
    const localizedCase = relativeFile(locale, casePage);
    const caseSource = await read(localizedCase);
    if (caseSource) {
      const $ = load(caseSource, { decodeEntities: false });
      const pageText = visiblePageText($);
      if ($('.tech-note').length || retiredCaseAuditCopy.test(pageText)) {
        fail(`${localizedCase}: customer-facing case copy still contains an internal photo-audit note.`);
      }
      if ($('.case-summary-table tbody tr').length !== 4) {
        fail(`${localizedCase}: expected four buyer-facing application summary rows.`);
      }
      for (const requiredFact of locale.caseFacts[casePage] || []) {
        if (!containsText(pageText, requiredFact)) {
          fail(`${localizedCase}: required confirmed application fact is missing: ${requiredFact}`);
        }
      }
    }
  }

  for (const pageName of ['index.html', 'about.html']) {
    const relativePath = relativeFile(locale, pageName);
    const source = await read(relativePath);
    if (!source) continue;
    const $ = load(source, { decodeEntities: false });
    checkOrganizationFacts($, relativePath, locale);
    if (pageName === 'about.html') {
      const text = visiblePageText($);
      if (!/\b2022\b/.test(text)) fail(`${relativePath}: visible company history must state establishment in 2022.`);
      if (/\b2006\b|2006年/.test(text)) fail(`${relativePath}: visible company copy must not publish the retired founder-history claim.`);
      if (/Li Wei|Sarah Zhang|Fluent in EN\/DE\/ES/.test(text)) {
        fail(`${relativePath}: unsupported legacy personnel or language-proficiency claims remain visible.`);
      }
      const teamCards = $('.team-card');
      const teamInitials = teamCards.find('.team-avatar').map((_, element) => compact($(element).text())).get();
      const teamTitles = teamCards.find('h3').map((_, element) => compact($(element).text())).get();
      const teamDescriptions = teamCards.find('p').map((_, element) => compact($(element).text())).get();
      if (teamCards.length !== 3 || teamInitials.join('|') !== 'GC|PQ|IS') {
        fail(`${relativePath}: About project-support cards must use the confirmed GC/PQ/IS structure.`);
      }
      if (teamTitles.join('|') !== locale.aboutRoleTitles.join('|')) {
        fail(`${relativePath}: About project-support titles do not match the approved factual roles.`);
      }
      if (teamDescriptions.join('|') !== locale.aboutRoleDescriptions.join('|')) {
        fail(`${relativePath}: About project-support descriptions do not match the approved factual scope.`);
      }
      const personNames = $('.team-person-name').map((_, element) => compact($(element).text())).get();
      if (personNames.join('|') !== 'GuangCheng Cao') {
        fail(`${relativePath}: only the confirmed founder name may appear as a preserved team person name.`);
      }
      const businesses = parseJsonLd($, relativePath).filter((node) => node['@type'] === 'LocalBusiness'
        && node['@id'] === 'https://www.begapunk.com/#localbusiness');
      if (businesses.length !== 1) fail(`${relativePath}: expected exactly one canonical LocalBusiness, found ${businesses.length}.`);
      else checkLocalBusiness(businesses[0], relativePath, 'about-page JSON-LD');
    }
  }

  const contactPath = relativeFile(locale, 'contact.html');
  const contactSource = await read(contactPath);
  if (contactSource) {
    const $ = load(contactSource, { decodeEntities: false });
    const businesses = parseJsonLd($, contactPath).filter((node) => node['@type'] === 'LocalBusiness'
      && node['@id'] === 'https://www.begapunk.com/#localbusiness');
    if (businesses.length !== 1) fail(`${contactPath}: expected exactly one canonical LocalBusiness, found ${businesses.length}.`);
    else checkLocalBusiness(businesses[0], contactPath, 'contact-page JSON-LD');
  }
}

const hydraulicPage = 'custom-hydraulic-rotary-unions.html';
const hydraulicFacts = {
  en: ['30 MPa', '300 bar', '4350 psi', '2 passages typical', 'Up to 12 custom', 'Carbon-fiber Glyd ring', 'MOQ 1', 'Within 30 days after payment', 'Ningbo facility'],
  de: ['30 MPa', '300 bar', '2-Wege', '12 Wege', 'Glyd-Ring', 'MOQ 1', 'Innerhalb von 30 Tagen nach Zahlungseingang'],
  fr: ['30 MPa', '300 bar', '2 circuits standard', 'jusqu\'à 12 circuits sur mesure', 'bague Glyd en PTFE renforcé de fibres de carbone', 'Quantité minimale : 1 pièce', 'Dans les 30 jours suivant le paiement', 'site de Ningbo'],
  ja: ['30 MPa', '2\u6d41\u8def', '12\u6d41\u8def', '\u30b0\u30e9\u30a4\u30c9\u30ea\u30f3\u30b0', 'MOQ 1', '\u5165\u91d1\u5f8c 30\u65e5\u4ee5\u5185'],
  ru: ['30 \u041c\u041f\u0430', '300 \u0431\u0430\u0440', '2 \u043f\u0440\u043e\u0445\u043e\u0434', 'Glyd', 'MOQ 1', '\u0412 \u0442\u0435\u0447\u0435\u043d\u0438\u0435 30 \u0434\u043d\u0435\u0439 \u043f\u043e\u0441\u043b\u0435 \u043e\u043f\u043b\u0430\u0442\u044b'],
};
for (const [language, locale] of Object.entries(locales)) {
  const relativePath = relativeFile(locale, hydraulicPage);
  const source = await read(relativePath);
  if (!source) continue;
  const $ = load(source, { decodeEntities: false });
  const pageText = visiblePageText($);
  for (const fact of hydraulicFacts[language] || []) {
    if (!containsText(pageText, fact)) fail(relativePath + ': missing owner-confirmed hydraulic fact: ' + fact);
  }
  if (/every unit is 30 MPa/i.test(pageText)) fail(relativePath + ': must not claim every unit is 30 MPa.');
}

if (productPages.length !== 16) {
  fail(`i18n/config.json: expected exactly 16 product pages, found ${productPages.length}.`);
}

if (failures.length) {
  console.error(`Owner-confirmed facts verification failed with ${failures.length} issue(s):`);
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exitCode = 1;
} else {
  console.log(`Owner-confirmed facts verified: ${productPages.length} products × ${Object.keys(locales).length} languages, 2022 company history, commercial boundaries, buyer-facing case facts, and LocalBusiness facts.`);
}
