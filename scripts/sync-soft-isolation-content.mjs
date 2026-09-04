import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  DETAILED_SOFT_ISOLATION_ROUTES,
  SOFT_ISOLATION_TOPIC_CONTENT,
} from './lib/soft-isolation-topic-content.mjs';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const config = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languageCodes = [config.sourceLanguage.code, ...config.activeLanguageCodes];
const targetLanguageCodes = [...config.activeLanguageCodes];

const routes = [];

const locales = {
  en: {
    directory: '',
    metaDescription: 'Plan rotary-joint selection with Begapunk product data, an engineering input checklist, application cases, quality information, and application review.',
    eyebrow: 'Application planning',
    status: 'Use the checklist and current resources below to prepare an accurate rotary-joint selection.',
    withdrawn: 'A reliable recommendation starts with the actual medium, pressure, speed, passage count, mounting space, environment, and duty cycle. Match these inputs to the current product page and model-specific drawing.',
    reviewHeading: 'Information to prepare',
    reviewItems: [
      'Operating medium, pressure, speed, temperature, and duty cycle',
      'Passage count, port functions, and required flow',
      'Mounting space, connection interfaces, hose routing, and environment',
    ],
    resourcesHeading: 'Current selection resources',
    resources: [
      ['products.html', 'Product Catalog', 'Review current model pages and published specifications.'],
      ['case-studies.html', 'Case Studies', 'See real machine installations and practical integration details.'],
      ['manufacturing-quality.html', 'Manufacturing & Quality', 'See how components are manufactured and inspected.'],
      ['production-inspection-testing.html', '100% Leak Testing', 'See the current passage-by-passage production inspection process.'],
      ['contact.html', 'Contact', 'Send your actual medium, pressure, speed, passage count, mounting, and duty-cycle requirements for an application-specific review.'],
    ],
    helpHeading: 'Get an engineering review for your application',
    helpText: 'Send the operating conditions and drawing. We will compare current standard models and identify any custom interface or documentation requirement.',
    contactCta: 'Contact Engineering',
    closingNote: 'Use these inputs to compare current models and request an application-specific engineering review.',
    bottleCappingCase: {
      label: 'Customer production application',
      heading: 'BP-2P-16-0001 in a bottle-capping head',
      intro: "This customer-authorized photograph shows BP-2P-16-0001 installed in a customer's production capping machine. Two independent passages carry compressed air for clamping and releasing a pneumatic three-jaw gripper. The gripper holds the bottle cap and rotates it during the capping operation.",
      imageAlt: "BP-2P-16-0001 routing compressed air through two passages to clamp and release a pneumatic three-jaw bottle-cap gripper in a customer's production capping machine",
      imageCaption: 'Customer-authorized production photograph; customer identity and machine brand are not disclosed.',
      productLinkLabel: 'View BP-2P-16-0001 product details',
      factsHeading: 'Application details',
      facts: [
        ['Equipment', "Customer's production bottle-capping machine"],
        ['Rotary union', 'BP-2P-16-0001', 'BP-2P-16-0001.html'],
        ['Pneumatic function', 'Two independent passages carry compressed air for gripper clamping and release'],
        ['Operation', 'The pneumatic three-jaw gripper holds and rotates the bottle cap during capping'],
        ['Customer privacy', 'Customer identity and machine brand are not disclosed'],
      ],
      boundaryHeading: 'For a similar capping machine',
      boundary: 'A model number, photo, or drawing is enough to start. If available, include the pressure, speed, mounting dimensions, and operating cycle so we can check the closest configuration.',
      alternativeHeading: 'Another option for this application',
      alternative: 'BP-2P-08-0001 is another option for a pneumatic three-jaw bottle-cap gripper. The installation shown uses BP-2P-16-0001. We will compare the passage count, mounting interface, pressure, speed, and dimensions before recommending either model.',
      alternativeCta: 'View BP-2P-08-0001 →',
      productCta: 'View BP-2P-16-0001',
      contactCta: 'Discuss a similar capping application',
    },
  },
  de: {
    directory: 'de',
    metaDescription: 'Planen Sie die Auswahl einer Drehdurchführung mit aktuellen Begapunk-Produktdaten, einer Checkliste, Anwendungsfällen, Qualitätsinformationen und technischer Prüfung.',
    eyebrow: 'Anwendungsplanung',
    status: 'Mit der folgenden Checkliste und den aktuellen Unterlagen können Sie eine belastbare Vorauswahl der Drehdurchführung vorbereiten.',
    withdrawn: 'Eine zuverlässige Empfehlung beginnt mit Betriebsmedium, Druck, Drehzahl, Kanalzahl, Einbauraum, Umgebung und Betriebszyklus. Gleichen Sie diese Angaben mit der aktuellen Produktseite und der modellspezifischen Zeichnung ab.',
    reviewHeading: 'Erforderliche Angaben',
    reviewItems: [
      'Betriebsmedium, Druck, Drehzahl, Temperatur und Betriebszyklus',
      'Kanalzahl, Anschlussfunktionen und erforderlicher Durchfluss',
      'Einbauraum, Anschlussschnittstellen, Schlauchführung und Umgebung',
    ],
    resourcesHeading: 'Aktuelle Auswahlunterlagen',
    resources: [
      ['products.html', 'Produktkatalog', 'Aktuelle Modellseiten und veröffentlichte Spezifikationen ansehen.'],
      ['case-studies.html', 'Anwendungsfälle', 'Einbaubeispiele aus realen Maschinen und praktische Integrationsdetails ansehen.'],
      ['manufacturing-quality.html', 'Fertigung & Qualität', 'Fertigung und Prüfung der Komponenten ansehen.'],
      ['production-inspection-testing.html', '100%-Dichtheitsprüfung', 'Den aktuellen kanalweisen Produktionsprüfprozess ansehen.'],
      ['contact.html', 'Kontakt', 'Senden Sie Medium, Druck, Drehzahl, Kanalzahl, Einbauart und Lastprofil für eine anwendungsspezifische Prüfung.'],
    ],
    helpHeading: 'Technische Auswahl für Ihre Anwendung anfragen',
    helpText: 'Senden Sie die Einsatzbedingungen und eine Zeichnung. Wir vergleichen die aktuellen Standardmodelle und klären kundenspezifische Schnittstellen oder Dokumentationsanforderungen.',
    contactCta: 'Technische Prüfung anfragen',
    closingNote: 'Nutzen Sie diese Angaben, um aktuelle Modelle zu vergleichen und eine anwendungsspezifische technische Prüfung anzufragen.',
    bottleCappingCase: {
      label: 'Kundenanwendung in der Produktion',
      heading: 'BP-2P-16-0001 in einem Verschließkopf',
      intro: 'Dieses vom Kunden zur Veröffentlichung freigegebene Foto zeigt BP-2P-16-0001 in einer Produktionsmaschine des Kunden. Zwei getrennte Druckluftkanäle führen einem pneumatischen 3-Finger-Zentrischgreifer Druckluft zum Schließen und Öffnen zu. Der Greifer hält den Flaschenverschluss und dreht ihn während des Verschließvorgangs.',
      imageAlt: 'BP-2P-16-0001 zur Druckluftversorgung eines pneumatischen 3-Finger-Zentrischgreifers beim Schließen und Öffnen in einer Produktionsmaschine des Kunden',
      imageCaption: 'Vom Kunden zur Veröffentlichung freigegebenes Produktionsfoto; Identität des Kunden und Maschinenfabrikat werden nicht genannt.',
      productLinkLabel: 'Produktdetails zu BP-2P-16-0001 ansehen',
      factsHeading: 'Details zur Anwendung',
      facts: [
        ['Anlage', 'Kunden-Produktionsmaschine zum Verschließen von Flaschen'],
        ['Drehdurchführung', 'BP-2P-16-0001', 'BP-2P-16-0001.html'],
        ['Pneumatikfunktion', 'Zwei getrennte Druckluftkanäle führen dem Greifer Druckluft zum Schließen und Öffnen zu'],
        ['Funktion', 'Der pneumatische 3-Finger-Zentrischgreifer hält und dreht den Flaschenverschluss beim Verschließen'],
        ['Kundenschutz', 'Identität des Kunden und Maschinenfabrikat werden nicht genannt'],
      ],
      boundaryHeading: 'Für eine ähnliche Verschließmaschine',
      boundary: 'Für den Einstieg genügt eine Modellnummer, ein Foto oder eine Zeichnung. Falls vorhanden, senden Sie außerdem Druck, Drehzahl, Einbaumaße und Betriebszyklus; wir prüfen dann die nächstliegende Ausführung.',
      alternativeHeading: 'Eine weitere Option für diese Anwendung',
      alternative: 'BP-2P-08-0001 ist eine weitere Option für einen pneumatischen 3-Finger-Zentrischgreifer. Im gezeigten Einbau wird BP-2P-16-0001 verwendet. Vor unserer Empfehlung vergleichen wir die Zahl der Wege, Einbauschnittstelle, Druck, Drehzahl und Abmessungen.',
      alternativeCta: 'BP-2P-08-0001 ansehen →',
      productCta: 'BP-2P-16-0001 ansehen',
      contactCta: 'Ähnliche Verschließanwendung besprechen',
    },
  },
  fr: {
    directory: 'fr',
    metaDescription: 'Préparez la sélection d\'un raccord tournant avec les données produit Begapunk, une liste d\'informations techniques, des études de cas, les données qualité et une revue d\'application.',
    eyebrow: 'Préparation de l\'application',
    status: 'Utilisez la liste et les ressources actuelles ci-dessous pour préparer une sélection fiable du raccord tournant.',
    withdrawn: 'Une recommandation fiable commence par le fluide réel, la pression, la vitesse, le nombre de circuits, l\'espace de montage, l\'environnement et le cycle de fonctionnement. Comparez ces données à la page produit actuelle et au plan propre au modèle.',
    reviewHeading: 'Informations à préparer',
    reviewItems: [
      'Fluide de service, pression, vitesse, température et cycle de fonctionnement',
      'Nombre de circuits, fonction des orifices et débit requis',
      'Espace de montage, interfaces de raccordement, cheminement des flexibles et environnement',
    ],
    resourcesHeading: 'Ressources de sélection actuelles',
    resources: [
      ['products.html', 'Catalogue produits', 'Consultez les pages modèles actuelles et les caractéristiques publiées.'],
      ['case-studies.html', 'Études de cas', 'Consultez des installations sur des machines réelles et les détails pratiques d\'intégration.'],
      ['manufacturing-quality.html', 'Fabrication et qualité', 'Découvrez comment les composants sont fabriqués et contrôlés.'],
      ['production-inspection-testing.html', 'Essai d\'étanchéité à 100 %', 'Consultez le processus actuel de contrôle en production, circuit par circuit.'],
      ['contact.html', 'Contact', 'Envoyez le fluide, la pression, la vitesse, le nombre de circuits, le montage et le cycle de fonctionnement réels pour une revue propre à l\'application.'],
    ],
    helpHeading: 'Demandez une revue technique de votre application',
    helpText: 'Envoyez les conditions de fonctionnement et le plan. Nous comparerons les modèles standard actuels et identifierons toute exigence d\'interface sur mesure ou de documentation.',
    contactCta: 'Contacter l\'équipe technique',
    closingNote: 'Utilisez ces informations pour comparer les modèles actuels et demander une revue technique propre à votre application.',
    bottleCappingCase: {
      label: 'Application en production chez un client',
      heading: 'BP-2P-16-0001 dans une tête de bouchage',
      intro: 'Cette photographie dont le client a autorisé la publication montre le BP-2P-16-0001 installé sur sa machine de bouchage en production. Deux circuits indépendants acheminent l\'air comprimé pour serrer et desserrer une pince pneumatique concentrique à trois mors. La pince maintient et fait tourner le bouchon pendant l\'opération de bouchage.',
      imageAlt: 'BP-2P-16-0001 acheminant l\'air comprimé par deux circuits pour serrer et desserrer une pince pneumatique à trois mors sur une machine de bouchage en production chez un client',
      imageCaption: 'Photographie de production publiée avec l\'autorisation du client ; l\'identité du client et la marque de la machine ne sont pas divulguées.',
      productLinkLabel: 'Voir les détails du BP-2P-16-0001',
      factsHeading: 'Détails de l\'application',
      facts: [
        ['Équipement', 'Machine de bouchage de bouteilles en production chez un client'],
        ['Raccord tournant', 'BP-2P-16-0001', 'BP-2P-16-0001.html'],
        ['Fonction pneumatique', 'Deux circuits indépendants acheminent l\'air comprimé pour serrer et desserrer la pince'],
        ['Opération', 'La pince pneumatique à trois mors maintient et fait tourner le bouchon pendant le bouchage'],
        ['Confidentialité du client', 'L\'identité du client et la marque de la machine ne sont pas divulguées'],
      ],
      boundaryHeading: 'Pour une machine de bouchage comparable',
      boundary: 'Une référence, une photo ou un plan suffit pour commencer. Si vous les connaissez, indiquez aussi la pression, la vitesse, les cotes de montage et le cycle de fonctionnement afin que nous puissions vérifier la configuration la plus proche.',
      alternativeHeading: 'Une autre option pour cette application',
      alternative: 'Le BP-2P-08-0001 constitue une autre option pour une pince pneumatique à trois mors destinée aux bouchons. L\'installation illustrée utilise le BP-2P-16-0001. Avant toute recommandation, nous comparerons le nombre de circuits, l\'interface de montage, la pression, la vitesse et les dimensions.',
      alternativeCta: 'Voir le BP-2P-08-0001 →',
      productCta: 'Voir le BP-2P-16-0001',
      contactCta: 'Discuter d\'une application de bouchage comparable',
    },
  },
  ja: {
    directory: 'ja',
    metaDescription: 'Begapunkの最新製品データ、技術入力チェックリスト、導入事例、品質情報を使って、ロータリージョイントの選定を計画できます。',
    eyebrow: '用途選定の準備',
    status: '以下のチェックリストと最新資料を使って、ロータリージョイントの選定条件を整理できます。',
    withdrawn: '適切な型式選定には、使用流体、圧力、回転数、流路数、取付スペース、周囲環境、運転サイクルが必要です。最新の製品ページと型式専用図面に照らして確認します。',
    reviewHeading: 'ご用意いただく情報',
    reviewItems: [
      '使用流体、圧力、回転数、温度、運転サイクル',
      '流路数、各ポートの機能、必要流量',
      '取付スペース、接続インターフェース、配管、周囲環境',
    ],
    resourcesHeading: '現在の選定資料',
    resources: [
      ['products.html', '製品カタログ', '現在公開中の型式ページと仕様をご確認ください。'],
      ['case-studies.html', '導入事例', '実機での設置例とインテグレーションの要点をご確認ください。'],
      ['manufacturing-quality.html', '製造・品質', '部品の製造工程と検査方法をご確認ください。'],
      ['production-inspection-testing.html', '全数漏れ検査', '現在実施している流路別の量産検査工程をご確認ください。'],
      ['contact.html', 'お問い合わせ', '媒体、圧力、回転数、流路数、取付方法、運転条件をお送りください。用途ごとに確認します。'],
    ],
    helpHeading: '用途に合わせた技術選定をご依頼ください',
    helpText: '使用条件と図面をお送りください。現在の標準型式を比較し、特注インターフェースや必要書類の有無を確認します。',
    contactCta: '技術確認を依頼',
    closingNote: 'これらの情報を使って現行型式を比較し、用途別の技術確認をご依頼ください。',
    bottleCappingCase: {
      label: 'お客様の生産設備での使用例',
      heading: 'キャッピングヘッドに組み込まれたBP-2P-16-0001',
      intro: 'お客様から公開許可を得た写真は、実際の生産設備に組み込まれたBP-2P-16-0001を示しています。独立した2流路を介して圧縮空気を供給し、3爪エアチャックの把持・開放動作を制御します。エアチャックはキャッピング時にボトルキャップを把持して回転させます。',
      imageAlt: '実際の生産用キャッピング機で、3爪エアチャックの把持・開放用に2流路の圧縮空気を供給するBP-2P-16-0001',
      imageCaption: 'お客様の許可を得た生産設備の写真です。お客様名および装置メーカー名は非公開です。',
      productLinkLabel: 'BP-2P-16-0001の製品詳細を見る',
      factsHeading: '用途の詳細',
      facts: [
        ['設備', 'お客様のボトルキャッピング生産設備'],
        ['ロータリジョイント', 'BP-2P-16-0001', 'BP-2P-16-0001.html'],
        ['空圧機能', '独立した2流路を介して、3爪エアチャックの把持・開放動作用に圧縮空気を供給'],
        ['動作', '3爪エアチャックでボトルキャップを把持し、キャッピング時に回転'],
        ['お客様情報', 'お客様名および装置メーカー名は非公開'],
      ],
      boundaryHeading: '同様のキャッピング設備をご検討の場合',
      boundary: '型式、写真、図面のいずれかがあれば確認を始められます。分かる範囲で圧力、回転数、取付寸法、運転サイクルもお知らせいただければ、近い仕様をご提案します。',
      alternativeHeading: 'この用途の別候補',
      alternative: 'BP-2P-08-0001も、3爪エアチャック用の候補です。写真の設備ではBP-2P-16-0001を使用しています。流路数、取付インターフェース、圧力、回転数、寸法を比較したうえで、適切な型式をご提案します。',
      alternativeCta: 'BP-2P-08-0001を見る →',
      productCta: 'BP-2P-16-0001を見る',
      contactCta: '同様のキャッピング用途を相談',
    },
  },
  ru: {
    directory: 'ru',
    metaDescription: 'Планируйте подбор вращающегося соединения по актуальным данным Begapunk, перечню исходных данных, примерам применения и информации о качестве.',
    eyebrow: 'Планирование применения',
    status: 'Используйте приведённый ниже перечень и актуальные материалы для точного подбора вращающегося соединения.',
    withdrawn: 'Надёжная рекомендация требует данных о рабочей среде, давлении, скорости, числе каналов, монтажном объёме, окружающей среде и рабочем цикле. Сопоставьте эти данные с актуальной страницей изделия и чертежом конкретной модели.',
    reviewHeading: 'Исходные данные',
    reviewItems: [
      'Рабочая среда, давление, скорость, температура и рабочий цикл',
      'Число каналов, функции портов и требуемый расход',
      'Монтажный объём, присоединительные интерфейсы, прокладка шлангов и условия окружающей среды',
    ],
    resourcesHeading: 'Актуальные материалы для выбора',
    resources: [
      ['products.html', 'Каталог продукции', 'См. актуальные страницы моделей и опубликованные характеристики.'],
      ['case-studies.html', 'Примеры применения', 'Посмотрите примеры установки на реальном оборудовании и практические детали интеграции.'],
      ['manufacturing-quality.html', 'Производство и качество', 'См. процессы изготовления и контроля компонентов.'],
      ['production-inspection-testing.html', '100%-ный контроль герметичности', 'См. действующий поканальный процесс производственного контроля.'],
      ['contact.html', 'Контакты', 'Отправьте данные о среде, давлении, скорости, числе каналов, монтаже и рабочем цикле для проверки конкретного применения.'],
    ],
    helpHeading: 'Запросите инженерный анализ для вашего применения',
    helpText: 'Отправьте условия эксплуатации и чертеж. Мы сравним актуальные стандартные модели и определим требования к специальному интерфейсу или документации.',
    contactCta: 'Запросить инженерный анализ',
    closingNote: 'Используйте эти данные для сравнения актуальных моделей и запроса инженерного анализа конкретного применения.',
    bottleCappingCase: {
      label: 'Применение на оборудовании заказчика',
      heading: 'BP-2P-16-0001 в укупорочной головке',
      intro: 'На опубликованной с разрешения заказчика фотографии показано ротационное соединение BP-2P-16-0001, установленное на его производственной машине. По двум независимым каналам подаётся сжатый воздух для зажима и разжима трёхкулачкового пневматического захвата. Захват удерживает крышку и вращает её при укупорке.',
      imageAlt: 'Ротационное соединение BP-2P-16-0001 подаёт сжатый воздух для зажима и разжима трёхкулачкового пневматического захвата в производственной укупорочной машине',
      imageCaption: 'Производственная фотография опубликована с разрешения заказчика; название заказчика и марка машины не раскрываются.',
      productLinkLabel: 'Посмотреть характеристики BP-2P-16-0001',
      factsHeading: 'Данные по применению',
      facts: [
        ['Оборудование', 'Производственная машина заказчика для укупорки бутылок'],
        ['Ротационное соединение', 'BP-2P-16-0001', 'BP-2P-16-0001.html'],
        ['Пневматическая функция', 'Два независимых канала подачи сжатого воздуха для зажима и разжима захвата'],
        ['Операция', 'Трёхкулачковый пневматический захват удерживает и вращает крышку при укупорке'],
        ['Данные заказчика', 'Название заказчика и марка машины не раскрываются'],
      ],
      boundaryHeading: 'Для аналогичной укупорочной машины',
      boundary: 'Для начала достаточно номера модели, фотографии или чертежа. Если известны давление, частота вращения, монтажные размеры и рабочий цикл, добавьте их — мы подберём наиболее близкое исполнение.',
      alternativeHeading: 'Ещё один вариант для этого применения',
      alternative: 'BP-2P-08-0001 — ещё один вариант для трёхкулачкового пневматического захвата. В показанной установке используется BP-2P-16-0001. Перед рекомендацией мы сравним число проходов, монтажный интерфейс, давление, частоту вращения и размеры.',
      alternativeCta: 'Посмотреть BP-2P-08-0001 →',
      productCta: 'Посмотреть BP-2P-16-0001',
      contactCta: 'Обсудить аналогичную укупорочную установку',
    },
  },
};

const retiredBottleCappingOverrideSources = [
  'This customer-authorized photograph shows BP-2P-16-0001 installed on a customer production machine. Two independent compressed-air passages supply the clamp and release functions of a pneumatic three-jaw gripper. The gripper holds the bottle cap and rotates it during the capping operation.',
  'BP-2P-16-0001 supplying clamp and release air to a pneumatic three-jaw bottle-cap gripper on a customer production capping machine',
  'Customer production bottle-capping machine',
  'Two independent compressed-air passages supply clamp and release air to the gripper',
  "The photograph and Begapunk's confirmed application record establish the application, product model, and clamp/release function. They do not establish port numbering, operating pressure, rotational speed, duty cycle, service life, leakage performance, or production output. Confirm these conditions from the machine design and approved product data.",
  'BP-2P-08-0001 can also be used for this pneumatic three-jaw bottle-cap-gripper application. The product identified in the photograph is BP-2P-16-0001, not BP-2P-08-0001. Confirm the passage count, mounting interface, pressure, speed, dimensions, and approved drawing before selection.',
];

const htmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function buildBottleCappingCase(strings) {
  const content = strings.bottleCappingCase;
  const assetPrefix = strings.directory ? '../' : '';
  const facts = content.facts
    .map(([term, description, href]) => {
      const value = href
        ? `<a class="bottle-capping-model-link" href="${htmlEscape(href)}">${htmlEscape(description)}</a>`
        : htmlEscape(description);
      return `       <div class="bottle-capping-fact"><dt>${htmlEscape(term)}</dt><dd>${value}</dd></div>`;
    })
    .join('\n');
  return `   <section class="bottle-capping-case" id="verified-bp-2p-16-capping" data-verified-application="bp-2p-16-bottle-capping">
    <div class="bottle-capping-case__header">
     <span class="section-label">${htmlEscape(content.label)}</span>
     <h2>${htmlEscape(content.heading)}</h2>
     <p>${htmlEscape(content.intro)}</p>
    </div>
     <div class="bottle-capping-case__grid">
      <figure class="bottle-capping-case__media">
       <a class="bottle-capping-case__image-link" href="BP-2P-16-0001.html" aria-label="${htmlEscape(content.productLinkLabel)}">
        <picture>
         <source srcset="${assetPrefix}images/applications/bottle-filling-capping/bp-2p-16-bottle-capping-three-jaw-gripper.webp" type="image/webp">
         <img src="${assetPrefix}images/applications/bottle-filling-capping/bp-2p-16-bottle-capping-three-jaw-gripper.jpg" alt="${htmlEscape(content.imageAlt)}" width="960" height="1304" loading="lazy" decoding="async">
        </picture>
       </a>
      <figcaption>${htmlEscape(content.imageCaption)}</figcaption>
     </figure>
     <div class="bottle-capping-case__details">
      <h3>${htmlEscape(content.factsHeading)}</h3>
      <dl class="bottle-capping-facts">
${facts}
      </dl>
      <aside class="bottle-capping-boundary" role="note">
       <strong>${htmlEscape(content.boundaryHeading)}</strong>
       <p>${htmlEscape(content.boundary)}</p>
      </aside>
      <aside class="bottle-capping-alternative" role="note">
       <strong>${htmlEscape(content.alternativeHeading)}</strong>
       <p>${htmlEscape(content.alternative)}</p>
       <a href="BP-2P-08-0001.html">${htmlEscape(content.alternativeCta)}</a>
      </aside>
      <div class="bottle-capping-actions">
       <a class="btn btn-primary" href="BP-2P-16-0001.html">${htmlEscape(content.productCta)}</a>
       <a class="btn btn-outline" href="contact.html?source=application-bottle-filling-capping&amp;model=BP-2P-16-0001#quoteForm">${htmlEscape(content.contactCta)}</a>
      </div>
     </div>
    </div>
   </section>`;
}

function buildTopicGuide(topic, route) {
  if (!topic) return '';
  const sections = topic.sections.map((section, sectionIndex) => {
    const paragraphs = (section.paragraphs || [])
      .map((paragraph) => `     <p style="margin:0 0 14px;line-height:1.8;color:var(--text);">${htmlEscape(paragraph)}</p>`)
      .join('\n');
    const points = (section.points || []).map(([title, description]) => `      <li style="padding:16px 18px;border:1px solid var(--border);border-radius:8px;background:#fff;line-height:1.65;color:var(--text);">
       <strong style="display:block;margin-bottom:5px;color:var(--dark-soft);">${htmlEscape(title)}</strong>
       <span>${htmlEscape(description)}</span>
      </li>`).join('\n');
    const list = points
      ? `     <${section.ordered ? 'ol' : 'ul'} style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:18px 0 0;padding:${section.ordered ? '0 0 0 1.35rem' : '0'};${section.ordered ? '' : 'list-style:none;'}">
${points}
     </${section.ordered ? 'ol' : 'ul'}>`
      : '';
    return `    <section class="soft-topic-section" aria-labelledby="soft-topic-${sectionIndex + 1}" style="margin:0 0 36px;">
     <h2 id="soft-topic-${sectionIndex + 1}" style="margin-bottom:14px;">${htmlEscape(section.heading)}</h2>
${paragraphs}
${list}
    </section>`;
  }).join('\n');
  return `   <div class="soft-topic-guide" data-topic-route="${htmlEscape(route)}">
${sections}
   </div>`;
}

function buildBody(strings, preservedH1, route, localeCode) {
  const topic = SOFT_ISOLATION_TOPIC_CONTENT[localeCode]?.[route];
  const reviewItems = strings.reviewItems
    .map((item) => `      <li>${htmlEscape(item)}</li>`)
    .join('\n');
  const resources = strings.resources
    .map(([href, label, description]) => `      <a href="${href}" style="display:flex;flex-direction:column;gap:7px;padding:18px;border:1px solid var(--border);border-radius:10px;background:#fff;color:inherit;text-decoration:none;">\n       <strong style="color:var(--dark-soft);">${htmlEscape(label)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(description)}</span>\n      </a>`)
    .join('\n');
  const verifiedCase = route === 'application-bottle-filling-capping.html'
    ? `\n${buildBottleCappingCase(strings)}\n`
    : '';
  const topicGuide = topic ? `${buildTopicGuide(topic, route)}\n` : '';
  const heroClass = route.startsWith('blog-') ? 'blog-hero' : 'app-hero';
  const contactHref = topic
    ? `contact.html?request=application-review&amp;source=${encodeURIComponent(route)}#quoteForm`
    : 'contact.html';
  const closingNote = topic
    ? ''
    : `   <p style="margin:24px 0 0;color:var(--text-light);font-size:0.9rem;line-height:1.7;">${htmlEscape(strings.closingNote)}</p>`;

  return `<!-- SOFT-ISOLATION-CONTENT:START -->
<main id="main-content" class="soft-isolation-page">
 <section class="${heroClass} soft-isolation-hero">
  <div class="container" style="max-width:980px;">
   <span class="section-label">${htmlEscape(strings.eyebrow)}</span>
   ${preservedH1}
   <p>${htmlEscape(topic?.heroText || strings.status)}</p>
  </div>
 </section>
 <section class="section soft-isolation-content">
  <div class="container" style="max-width:980px;">
   <div style="padding:22px 24px;border-left:4px solid var(--primary);background:var(--bg-alt);border-radius:8px;margin-bottom:30px;">
    <p style="margin:0;line-height:1.8;color:var(--text);">${htmlEscape(topic?.opening || strings.withdrawn)}</p>
   </div>
${verifiedCase}${topicGuide}   <h2 style="margin-bottom:12px;">${htmlEscape(strings.reviewHeading)}</h2>
   <ul style="margin:0 0 34px;padding-left:22px;line-height:1.9;color:var(--text);">
${reviewItems}
   </ul>
   <h2 style="margin-bottom:16px;">${htmlEscape(strings.resourcesHeading)}</h2>
   <nav aria-label="${htmlEscape(strings.resourcesHeading)}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-bottom:34px;">
${resources}
   </nav>
   <div class="app-detail-cta" style="align-items:center;">
    <div>
     <h2>${htmlEscape(topic?.inquiryHeading || strings.helpHeading)}</h2>
     <p>${htmlEscape(topic?.inquiryText || strings.helpText)}</p>
    </div>
    <a href="${contactHref}" class="btn btn-primary">${htmlEscape(strings.contactCta)}</a>
   </div>
${closingNote}
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

function ensureBottleCappingStyles(prefix, strings, route) {
  if (route !== 'application-bottle-filling-capping.html') return prefix;
  const assetPrefix = strings.directory ? '../' : '';
  const href = `${assetPrefix}css/application-bottle-capping-case.css?v=20260813-production-case3`;
  const stylesheetPattern = /<link\s+rel=["']stylesheet["'][^>]*href=["'][^"']*css\/application-bottle-capping-case\.css(?:\?[^"']*)?["'][^>]*>\s*/gi;
  const cleanedPrefix = prefix.replace(stylesheetPattern, '');
  return cleanedPrefix.replace(/<\/head>/i, `<link rel="stylesheet" href="${href}">\n</head>`);
}

function isolatePage(html, strings, relativePath, route, localeCode) {
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
  const topic = SOFT_ISOLATION_TOPIC_CONTENT[localeCode]?.[route];
  prefix = updateDescriptionMeta(prefix, topic?.metaDescription || strings.metaDescription);
  prefix = ensureNoindex(prefix);
  prefix = ensureBottleCappingStyles(prefix, strings, route);

  const next = `${prefix}${originalHeader}\n\n${buildBody(strings, preservedH1, route, localeCode)}\n\n${originalFooter}`;
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
  if (topic) {
    if ((next.match(/class="soft-topic-section"/g) || []).length !== 3) {
      throw new Error(`${relativePath}: expected three route-specific topic sections.`);
    }
    if (!next.includes(`data-topic-route="${route}"`)) {
      throw new Error(`${relativePath}: route-specific topic marker is missing.`);
    }
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
  for (const key of ['label', 'heading', 'intro', 'imageAlt', 'imageCaption', 'productLinkLabel', 'factsHeading', 'boundaryHeading', 'boundary', 'alternativeHeading', 'alternative', 'alternativeCta', 'productCta', 'contactCta']) {
    pairs.push([source.bottleCappingCase[key], localized.bottleCappingCase[key]]);
  }
  source.bottleCappingCase.facts.forEach(([term, description], index) => {
    const [localizedTerm, localizedDescription] = localized.bottleCappingCase.facts[index];
    pairs.push([term, localizedTerm], [description, localizedDescription]);
  });
  const localizedTopics = SOFT_ISOLATION_TOPIC_CONTENT[localized.directory || 'en'];
  // Detailed soft-isolation routes are retired (`routes` is empty). Their legacy
  // override corpus is synchronized only where an explicit locale corpus exists;
  // active locales without one continue to use their curated page translations.
  for (const route of localizedTopics ? DETAILED_SOFT_ISOLATION_ROUTES : []) {
    const sourceTopic = SOFT_ISOLATION_TOPIC_CONTENT.en[route];
    const localizedTopic = localizedTopics[route];
    pairs.push(
      [sourceTopic.metaDescription, localizedTopic.metaDescription],
      [sourceTopic.heroText, localizedTopic.heroText],
      [sourceTopic.opening, localizedTopic.opening],
      [sourceTopic.inquiryHeading, localizedTopic.inquiryHeading],
      [sourceTopic.inquiryText, localizedTopic.inquiryText],
    );
    sourceTopic.sections.forEach((section, sectionIndex) => {
      const localizedSection = localizedTopic.sections[sectionIndex];
      pairs.push([section.heading, localizedSection.heading]);
      (section.paragraphs || []).forEach((paragraph, paragraphIndex) => {
        pairs.push([paragraph, localizedSection.paragraphs[paragraphIndex]]);
      });
      (section.points || []).forEach(([title, description], pointIndex) => {
        const [localizedTitle, localizedDescription] = localizedSection.points[pointIndex];
        pairs.push(
          [title, localizedTitle],
          [description, localizedDescription],
          [
            `<strong style="display:block;margin-bottom:5px;color:var(--dark-soft);">${htmlEscape(title)}</strong>\n       <span>${htmlEscape(description)}</span>`,
            `<strong style="display:block;margin-bottom:5px;color:var(--dark-soft);">${htmlEscape(localizedTitle)}</strong>\n       <span>${htmlEscape(localizedDescription)}</span>`,
          ],
        );
      });
    });
  }
  return pairs;
}

for (const localeCode of languageCodes) {
  if (!locales[localeCode]) throw new Error(`${localeCode}: core soft-isolation copy is missing.`);
  const topics = SOFT_ISOLATION_TOPIC_CONTENT[localeCode];
  if (!topics) {
    if (routes.length) throw new Error(`${localeCode}: route-specific topic content is missing.`);
    continue;
  }
  const topicRoutes = Object.keys(topics).sort();
  const expectedRoutes = [...DETAILED_SOFT_ISOLATION_ROUTES].sort();
  if (JSON.stringify(topicRoutes) !== JSON.stringify(expectedRoutes)) {
    throw new Error(`${localeCode}: route-specific topic inventory does not match the eight controlled routes.`);
  }
  if (new Set(Object.values(topics).map((topic) => topic.opening)).size !== expectedRoutes.length) {
    throw new Error(`${localeCode}: route-specific openings must be unique.`);
  }
  for (const [route, topic] of Object.entries(topics)) {
    if (topic.sections.length !== 3
      || topic.sections.some((section) => !section.heading || !(section.paragraphs?.length || section.points?.length))) {
      throw new Error(`${localeCode}/${route}: incomplete route-specific topic structure.`);
    }
  }
}

const pending = [];
const plannedWrites = new Map();
const pendingDetails = new Map();

for (const localeCode of languageCodes) {
  const strings = locales[localeCode];
  for (const route of routes) {
    const relativePath = strings.directory ? path.join(strings.directory, route) : route;
    const filePath = path.join(root, relativePath);
    const current = fs.readFileSync(filePath, 'utf8');
    const desired = isolatePage(current, strings, relativePath, route, localeCode);
    if (desired !== current) {
      pending.push(relativePath);
      plannedWrites.set(filePath, desired);
    }
  }
}

for (const localeCode of targetLanguageCodes) {
  const strings = locales[localeCode];
  if (!strings) throw new Error(`${localeCode}: core soft-isolation copy is missing.`);
  const overridesPath = path.join(root, 'i18n', 'overrides', `${localeCode}.json`);
  const overridesText = fs.readFileSync(overridesPath, 'utf8');
  const overrides = JSON.parse(overridesText);
  const retiredSourcesPresent = retiredBottleCappingOverrideSources.filter((source) => Object.hasOwn(overrides, source));
  const retiredMarkupSourcesPresent = [];
  for (const retiredSource of retiredBottleCappingOverrideSources) delete overrides[retiredSource];
  for (const [, label, description] of locales.en.resources) {
    const legacyUnescapedKey = `<strong style="color:var(--dark-soft);">${label}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${description}</span>`;
    const escapedKey = `<strong style="color:var(--dark-soft);">${htmlEscape(label)}</strong>\n       <span style="color:var(--text-light);font-size:0.92rem;line-height:1.6;">${htmlEscape(description)}</span>`;
    if (legacyUnescapedKey !== escapedKey && Object.hasOwn(overrides, legacyUnescapedKey)) {
      retiredMarkupSourcesPresent.push(legacyUnescapedKey);
      delete overrides[legacyUnescapedKey];
    }
  }
  const expectedOverridePairs = overridePairs(locales.en, strings);
  const unsynchronizedSources = expectedOverridePairs
    .filter(([source, translation]) => overrides[source] !== translation)
    .map(([source]) => source);
  for (const [source, translation] of expectedOverridePairs) overrides[source] = translation;
  const desiredOverrides = serializeJson(overrides, overridesText);
  if (desiredOverrides !== overridesText) {
    pending.push(path.relative(root, overridesPath));
    plannedWrites.set(overridesPath, desiredOverrides);
    pendingDetails.set(path.relative(root, overridesPath), [
      ...unsynchronizedSources.map((source) => `missing: ${source}`),
      ...retiredSourcesPresent.map((source) => `retired: ${source}`),
      ...retiredMarkupSourcesPresent.map((source) => `retired markup: ${source}`),
    ]);
  }

  const seoPath = path.join(root, 'i18n', 'seo', `${localeCode}.json`);
  const seoText = fs.readFileSync(seoPath, 'utf8');
  const seo = JSON.parse(seoText);
  for (const route of routes) {
    if (!seo[route]?.title || !seo[route]?.h1) throw new Error(`${localeCode}/${route}: curated SEO title or H1 is missing.`);
    const topicDescription = SOFT_ISOLATION_TOPIC_CONTENT[localeCode]?.[route]?.metaDescription;
    if (topicDescription) seo[route].description = topicDescription;
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
    for (const file of pending) {
      console.error(`- ${file}`);
      for (const detail of pendingDetails.get(file) ?? []) console.error(`    ${detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Soft-isolation sync check passed: isolation routes are empty; published application and blog pages are not rewritten.');
  }
} else {
  for (const [filePath, content] of plannedWrites) fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Soft-isolation sync complete: ${plannedWrites.size} file(s) updated.`);
}
