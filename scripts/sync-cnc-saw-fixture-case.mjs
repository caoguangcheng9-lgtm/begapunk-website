import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const checkOnly = process.argv.includes('--check');
const config = JSON.parse(await fs.readFile(path.join(root, 'i18n', 'config.json'), 'utf8'));
const languageCodes = [config.sourceLanguage.code, ...config.activeLanguageCodes];
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
const frenchSmartChuckSummaryPage = 'fr/case-studies.html';
const frenchSmartChuckSummaryReplacements = Object.freeze([
  Object.freeze({
    current: 'serrage, desserrage et soufflage',
    legacy: Object.freeze([
      'serrage, débranchement et soufflage',
      'serrage, déclampage et soufflage',
      'serrage, desserrage et purge d\'air',
    ]),
  }),
  Object.freeze({
    current: 'Serrage, desserrage et soufflage dans cette configuration client',
    legacy: Object.freeze([
      'Clampage, déclampage et soufflage dans ce design client',
      'Serrage, déclampage et soufflage dans cette configuration client',
      'Serrage, desserrage et soufflage dans ce design client',
    ]),
  }),
  Object.freeze({
    current: 'La détection assurée par des capteurs externes et le système de commande reste indépendante du raccord tournant.',
    legacy: Object.freeze([
      'La détection reste la responsabilité des capteurs externes et du système de contrôle.',
      'La détection reste assurée par les capteurs externes et le système de commande.',
      'La détection est assurée par des capteurs externes et le système de commande.',
    ]),
  }),
]);

const copy = {
  en: {
    prefix: '',
    language: 'en',
    label: 'Customer Production Application',
    heading: 'BP-2P-130-0001 in a Custom CNC Circular-Saw Fixture',
    intro: 'This customer-authorized video frame shows BP-2P-130-0001 installed at the rear of a custom CNC machining fixture on a circular-blade saw machine. The customer uses two independent compressed-air passages for fixture clamp and release.',
    detailsHeading: 'Application details',
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
    boundaryTitle: 'For a similar fixture',
    boundary: 'A fixture model, photo, or drawing is enough to start. BP-2P-130-0001 is used here with two independent passages for clamp and release. If available, include the pressure, speed, and mounting interface so we can check a suitable configuration.',
    introVisualAlt: 'BP-2P-130-0001 air rotary union for a CNC pneumatic clamping fixture',
    introVisualLabel: 'Installed product',
    introVisualText: "BP-2P-130-0001 used in a customer's low-speed circular-saw fixture.",
    introSupplyLegacy: 'When a CNC fixture rotates, the air line cannot be allowed to twist or pull on the actuator. A pneumatic rotary joint provides a sealed rotating path between the stationary supply and the moving fixture.',
    introSupply: 'When a CNC fixture rotates, its compressed-air lines must not twist or pull on the actuator. A pneumatic rotary union provides sealed rotating passages for compressed air between the stationary air-supply side and the rotating fixture.',
    faqQuestion: 'Can a rotary union hold clamping pressure during machining?',
    blowOff: 'Blow-off',
    productButton: 'View BP-2P-130-0001',
    contactButton: 'Discuss a Similar Fixture',
    productEntryHeading: 'Customer Application: Custom CNC Circular-Saw Fixture',
    productEntry: 'BP-2P-130-0001 is installed at the rear of a customer production fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. The equipment operates at low speed. For a similar fixture, check the required speed, pressure, port assignment, and interface against the fixture requirements and current BP-2P-130-0001 drawing.',
    productEntryLink: 'View customer application →',
    creativeName: 'BP-2P-130-0001 in a custom CNC circular-saw fixture',
    creativeDescription: 'BP-2P-130-0001 is installed at the rear of a custom CNC machining fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. For similar equipment, check the required port arrangement, pressure, rotational speed, duty cycle, and mounting interface against the fixture requirements and current BP-2P-130-0001 drawing.',
    llms: 'Selection guidance plus a customer-authorized BP-2P-130-0001 production application on a custom low-speed circular-saw fixture, using two independent compressed-air passages for clamp and release.',
  },
  de: {
    prefix: 'de/',
    language: 'de',
    label: 'Kundenanwendung in der Produktion',
    heading: 'BP-2P-130-0001 in einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine',
    intro: 'Dieses vom Kunden zur Veröffentlichung freigegebene Videostandbild zeigt BP-2P-130-0001 an der Rückseite einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine. Der Kunde nutzt zwei getrennte Druckluftkanäle zum Spannen und Lösen der Vorrichtung.',
    detailsHeading: 'Details zur Anwendung',
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
    boundaryTitle: 'Für eine ähnliche Vorrichtung',
    boundary: 'Für den Einstieg genügt ein Vorrichtungsmodell, ein Foto oder eine Zeichnung. Hier wird BP-2P-130-0001 mit zwei getrennten Kanälen zum Spannen und Lösen eingesetzt. Falls vorhanden, senden Sie außerdem Druck, Drehzahl und Einbauschnittstelle; wir prüfen eine passende Ausführung.',
    introVisualAlt: 'Drehdurchführung BP-2P-130-0001 für eine pneumatische CNC-Spannvorrichtung',
    introVisualLabel: 'Eingebautes Produkt',
    introVisualText: 'BP-2P-130-0001 in einer langsam laufenden Kreissägenvorrichtung eines Kunden.',
    introSupplyLegacy: 'Beim Drehen einer CNC-Spannvorrichtung darf die Luftleitung weder verdreht werden noch am Aktuator ziehen. Eine pneumatische Drehdurchführung stellt einen abgedichteten rotierenden Übergang zwischen der stationären Versorgung und der bewegten Vorrichtung her.',
    introSupply: 'Wenn sich eine CNC-Spannvorrichtung dreht, dürfen sich die Druckluftleitungen weder verdrehen noch am Aktuator ziehen. Eine pneumatische Drehdurchführung stellt abgedichtete rotierende Druckluftkanäle zwischen der stationären Druckluftversorgung und der rotierenden Vorrichtung bereit.',
    faqQuestion: 'Kann eine Drehdurchführung den Spanndruck während der Bearbeitung halten?',
    blowOff: 'Abblasen',
    productButton: 'BP-2P-130-0001 ansehen',
    contactButton: 'Ähnliche Vorrichtung besprechen',
    productEntryHeading: 'Kundenanwendung: kundenspezifische CNC-Spannvorrichtung einer Kreissägemaschine',
    productEntry: 'BP-2P-130-0001 ist an der Rückseite einer Kunden-Produktionsvorrichtung an einer Kreissägemaschine eingebaut. Zwei getrennte Druckluftkanäle übernehmen das Spannen und Lösen der Vorrichtung. Die Anlage läuft mit niedriger Drehzahl. Für eine ähnliche Vorrichtung Drehzahl, Druck, Portzuordnung und Schnittstelle mit den Vorrichtungsanforderungen und der aktuellen Zeichnung für BP-2P-130-0001 abgleichen.',
    productEntryLink: 'Kundenanwendung ansehen →',
    creativeName: 'BP-2P-130-0001 in einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine',
    creativeDescription: 'BP-2P-130-0001 ist an der Rückseite einer kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine eingebaut. Zwei getrennte Druckluftkanäle übernehmen das Spannen und Lösen. Für vergleichbare Anwendungen Anschlussbelegung, Druck, Drehzahl, Betriebszyklus und Einbauschnittstelle mit den Vorrichtungsanforderungen und der aktuellen Zeichnung für BP-2P-130-0001 abgleichen.',
    llms: 'Auswahlhilfe mit einer vom Kunden freigegebenen Produktionsanwendung der BP-2P-130-0001 an einer langsam laufenden kundenspezifischen CNC-Spannvorrichtung einer Kreissägemaschine; zwei getrennte Druckluftkanäle dienen zum Spannen und Lösen.',
  },
  fr: {
    prefix: 'fr/',
    language: 'fr',
    label: 'Application en production chez un client',
    heading: 'BP-2P-130-0001 dans un montage de serrage sur mesure pour scie circulaire CNC',
    intro: 'Cette image extraite d\'une vidéo dont le client a autorisé la publication montre le BP-2P-130-0001 installé à l\'arrière d\'un montage d\'usinage CNC sur mesure pour scie circulaire. Le client utilise deux circuits d\'air comprimé indépendants pour serrer et desserrer le montage.',
    detailsHeading: 'Détails de l\'application',
    facts: [
      ['Équipement', 'Montage d\'usinage CNC sur mesure du client installé sur une scie circulaire'],
      ['Raccord tournant installé', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['Fonction pneumatique', 'Deux circuits d\'air comprimé indépendants pour serrer et desserrer le montage'],
      ['Contexte de fonctionnement', 'Équipement de production client à faible vitesse ; la vidéo ne permet pas d\'établir la vitesse de rotation exacte'],
      ['Angle de prise de vue', 'Arrière du montage ; les mors avant se trouvent hors champ'],
      ['Confidentialité', 'L\'identité du client et la marque de la machine ne sont pas divulguées'],
    ],
    alt: 'Vue arrière d\'un montage sur mesure pour scie circulaire CNC avec un BP-2P-130-0001 installé',
    imageAria: 'Ouvrir la page produit du BP-2P-130-0001 depuis la photographie autorisée du montage CNC',
    caption: 'Image d\'une vidéo de production autorisée par le client montrant l\'arrière du montage sur mesure ; le client et la marque de la machine ne sont pas divulgués.',
    boundaryTitle: 'Pour un montage comparable',
    boundary: 'Une référence de montage, une photo ou un plan suffit pour commencer. Ici, le BP-2P-130-0001 utilise deux circuits indépendants pour le serrage et le desserrage. Si vous les connaissez, indiquez aussi la pression, la vitesse et l\'interface de montage afin que nous puissions vérifier une configuration adaptée.',
    introVisualAlt: 'Raccord tournant pneumatique BP-2P-130-0001 pour montage de serrage CNC',
    introVisualLabel: 'Produit installé',
    introVisualText: 'BP-2P-130-0001 utilisé dans le montage à faible vitesse d\'une scie circulaire chez un client.',
    introSupplyLegacy: 'Lorsqu\'un montage CNC tourne, le flexible d\'air ne doit ni se vriller ni tirer sur l\'actionneur. Un raccord tournant pneumatique assure un passage rotatif étanche entre l\'alimentation fixe et le montage mobile.',
    introSupply: 'Lorsqu\'un montage CNC tourne, ses conduites d\'air comprimé ne doivent ni se vriller ni tirer sur l\'actionneur. Un raccord tournant pneumatique assure des circuits rotatifs étanches pour l\'air comprimé entre l\'alimentation fixe et le montage tournant.',
    faqQuestion: 'Un raccord tournant peut-il maintenir la pression de serrage pendant l\'usinage ?',
    blowOff: 'Soufflage',
    productButton: 'Voir le BP-2P-130-0001',
    contactButton: 'Discuter d\'un montage comparable',
    productEntryHeading: 'Application client : montage sur mesure pour scie circulaire CNC',
    productEntry: 'Le BP-2P-130-0001 est installé à l’arrière d’un montage de production client sur une scie à lame circulaire. Deux passages indépendants d’air comprimé assurent le serrage et le desserrage du montage. L’équipement fonctionne à faible vitesse. Pour un montage similaire, vérifiez la vitesse et la pression requises, l’affectation des orifices et l’interface par rapport aux exigences du montage et au plan BP-2P-130-0001 en vigueur.',
    productEntryLink: 'Voir l\'application client →',
    creativeName: 'BP-2P-130-0001 dans un montage de serrage sur mesure pour scie circulaire CNC',
    creativeDescription: 'Le BP-2P-130-0001 est installé à l\'arrière d\'un montage de serrage sur mesure pour scie circulaire CNC. Deux circuits d\'air comprimé indépendants assurent le serrage et le desserrage. Pour une application comparable, confrontez l\'affectation des orifices, la pression, la vitesse de rotation, le cycle de fonctionnement et l\'interface de montage requis aux exigences du montage et au plan actuel du BP-2P-130-0001.',
    llms: 'Guide de sélection comprenant une application de production autorisée par le client : un BP-2P-130-0001 monté sur un dispositif de serrage sur mesure à faible vitesse pour scie circulaire CNC, avec deux circuits d\'air comprimé indépendants pour le serrage et le desserrage.',
  },
  ja: {
    prefix: 'ja/',
    language: 'ja',
    label: 'お客様の生産設備での使用例',
    heading: 'CNC丸鋸盤の特注クランプ治具に組み込まれたBP-2P-130-0001',
    intro: 'お客様から公開許可を得た動画の一場面です。CNC丸鋸盤の特注クランプ治具後端にBP-2P-130-0001が組み込まれ、独立した2つの圧縮空気流路で治具のクランプ／アンクランプを行います。',
    detailsHeading: '用途の詳細',
    facts: [
      ['設備', 'お客様のCNC丸鋸盤に搭載された特注クランプ治具'],
      ['搭載ロータリジョイント', '<a class="cnc-saw-model-link" href="BP-2P-130-0001.html">BP-2P-130-0001</a>'],
      ['空圧機能', '独立した2つの圧縮空気流路による治具のクランプ／アンクランプ'],
      ['使用状況', '低速で運転するお客様の実生産設備。正確な回転数は、お客様の設備条件と選定図面に基づいて確認します'],
      ['撮影範囲', '治具後端。前側の爪部は画面外です'],
      ['公開範囲', 'お客様名および装置メーカー名は非公開'],
    ],
    alt: 'BP-2P-130-0001を組み込んだCNC丸鋸盤用特注クランプ治具の後端',
    imageAria: '公開許可を得たCNC治具の写真からBP-2P-130-0001製品ページを開く',
    caption: 'お客様から公開許可を得た生産設備動画の一場面。特注治具の後端を示し、お客様名および機械メーカー名は非公開です。',
    boundaryTitle: '同様の治具をご検討の場合',
    boundary: '治具の型式、写真、図面のいずれかがあれば確認を始められます。この設備ではBP-2P-130-0001の独立2流路をクランプ／アンクランプに使用しています。分かる範囲で圧力、回転数、取合いもお知らせいただければ、適切な仕様をご提案します。',
    introVisualAlt: 'CNC空圧クランプ治具向けBP-2P-130-0001ロータリジョイント',
    introVisualLabel: '搭載製品',
    introVisualText: 'お客様の低速丸鋸盤用治具に搭載されたBP-2P-130-0001です。',
    introSupplyLegacy: 'CNC治具が回転するとき、エア配管がねじれたりアクチュエータを引っ張ったりしない構造が必要です。空圧ロータリージョイントは、固定側の供給源と回転する治具の間に密閉された回転流路を設けます。',
    introSupply: 'CNC治具の回転時には、圧縮空気配管がねじれたり、アクチュエータを引っ張ったりしない構造が必要です。空圧用ロータリジョイントは、固定側の圧縮空気供給部と回転治具の間に、密閉された回転流路を設けます。',
    faqQuestion: '加工中もクランプ圧を保持できますか？',
    blowOff: 'エアブロー',
    productButton: 'BP-2P-130-0001を見る',
    contactButton: '同様の治具について相談',
    productEntryHeading: 'お客様用途：CNC丸鋸盤用特注クランプ治具',
    productEntry: 'BP-2P-130-0001は、お客様の丸鋸盤用生産治具の後端に組み込まれています。独立した2つの圧縮空気流路で治具のクランプ／アンクランプを行います。設備は低速運転です。同様の治具では、必要な回転数、圧力、ポート割当、取合いを治具要件と最新のBP-2P-130-0001図面に照らして確認してください。',
    productEntryLink: 'お客様の用途事例を見る →',
    creativeName: 'CNC丸鋸盤用特注クランプ治具に組み込まれたBP-2P-130-0001',
    creativeDescription: 'BP-2P-130-0001は、CNC丸鋸盤用特注クランプ治具の後端に組み込まれています。独立した2つの圧縮空気流路でクランプ／アンクランプを行います。同様の設備では、必要なポート配置、圧力、回転数、運転サイクル、取合いを治具要件と最新のBP-2P-130-0001図面に照らして確認してください。',
    llms: 'お客様から公開許可を得た実生産事例を含む選定ガイドです。低速のCNC丸鋸盤用特注クランプ治具にBP-2P-130-0001を組み込み、独立した2つの圧縮空気流路でクランプ／アンクランプを行います。',
  },
  ru: {
    prefix: 'ru/',
    language: 'ru',
    label: 'Применение на оборудовании заказчика',
    heading: 'BP-2P-130-0001 в нестандартном зажимном приспособлении круглопильного станка с ЧПУ',
    intro: 'Кадр из видео, разрешённого заказчиком к публикации, показывает BP-2P-130-0001 в задней части нестандартного зажимного приспособления круглопильного станка с ЧПУ. Два независимых канала сжатого воздуха используются для зажима и разжима приспособления.',
    detailsHeading: 'Данные по применению',
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
    boundaryTitle: 'Для аналогичного приспособления',
    boundary: 'Для начала достаточно модели приспособления, фотографии или чертежа. Здесь BP-2P-130-0001 используется с двумя независимыми каналами для зажима и разжима. Если известны давление, частота вращения и монтажный интерфейс, добавьте их — мы проверим подходящее исполнение.',
    introVisualAlt: 'Ротационное соединение BP-2P-130-0001 для пневматического зажимного приспособления с ЧПУ',
    introVisualLabel: 'Установленное изделие',
    introVisualText: 'BP-2P-130-0001 в низкооборотном приспособлении круглопильного станка заказчика.',
    introSupplyLegacy: 'При вращении приспособления ЧПУ воздушная линия не должна перекручиваться или тянуть привод. Пневматическое вращающееся соединение создаёт герметичный вращающийся переход между неподвижной подачей и подвижным приспособлением.',
    introSupply: 'При вращении приспособления ЧПУ линии сжатого воздуха не должны перекручиваться или тянуть привод. Пневматическое ротационное соединение образует герметичные вращающиеся каналы для подачи сжатого воздуха между неподвижной питающей магистралью и вращающимся приспособлением.',
    faqQuestion: 'Может ли ротационное соединение удерживать давление зажима во время обработки?',
    blowOff: 'Обдув',
    productButton: 'Открыть BP-2P-130-0001',
    contactButton: 'Обсудить аналогичное приспособление',
    productEntryHeading: 'Применение у заказчика: нестандартное зажимное приспособление круглопильного станка с ЧПУ',
    productEntry: 'Модель BP-2P-130-0001 установлена в задней части производственного приспособления заказчика на круглопильном станке. Два независимых канала сжатого воздуха используются для зажима и разжима приспособления. Оборудование низкооборотное. Для аналогичного приспособления сопоставьте требуемую частоту вращения, давление, назначение портов и интерфейс с требованиями оснастки и актуальным чертежом BP-2P-130-0001.',
    productEntryLink: 'Посмотреть применение у заказчика →',
    creativeName: 'BP-2P-130-0001 в нестандартном зажимном приспособлении круглопильного станка с ЧПУ',
    creativeDescription: 'BP-2P-130-0001 установлена в задней части нестандартного зажимного приспособления круглопильного станка с ЧПУ. Два независимых канала сжатого воздуха используются для зажима и разжима. Для аналогичного оборудования сопоставьте требуемое назначение портов, давление, частоту вращения, режим работы и монтажное сопряжение с требованиями оснастки и актуальным чертежом BP-2P-130-0001.',
    llms: 'Руководство по подбору с разрешённым заказчиком производственным примером BP-2P-130-0001 в низкооборотном нестандартном зажимном приспособлении круглопильного станка с ЧПУ; два независимых канала сжатого воздуха используются для зажима и разжима.',
  },
};

const productEvidenceFragments = Object.freeze({
  en: [
    'BP-2P-130-0001',
    'Two independent compressed-air passages',
    'fixture clamp and release',
    'operates at low speed',
    'check the required speed, pressure, port assignment, and interface against the fixture requirements and current BP-2P-130-0001 drawing',
  ],
  de: [
    'BP-2P-130-0001',
    'Zwei getrennte Druckluftkanäle',
    'Spannen und Lösen der Vorrichtung',
    'läuft mit niedriger Drehzahl',
    'Drehzahl, Druck, Portzuordnung und Schnittstelle mit den Vorrichtungsanforderungen und der aktuellen Zeichnung für BP-2P-130-0001 abgleichen',
  ],
  fr: [
    'BP-2P-130-0001',
    'Deux passages indépendants d’air comprimé',
    'serrage et le desserrage du montage',
    'fonctionne à faible vitesse',
    'vitesse et la pression requises, l’affectation des orifices et l’interface par rapport aux exigences du montage et au plan BP-2P-130-0001 en vigueur',
  ],
  ja: [
    'BP-2P-130-0001',
    '独立した2つの圧縮空気流路',
    '治具のクランプ／アンクランプ',
    '設備は低速運転',
    '必要な回転数、圧力、ポート割当、取合いを治具要件と最新のBP-2P-130-0001図面に照らして確認',
  ],
  ru: [
    'BP-2P-130-0001',
    'Два независимых канала сжатого воздуха',
    'зажима и разжима приспособления',
    'Оборудование низкооборотное',
    'требуемую частоту вращения, давление, назначение портов и интерфейс с требованиями оснастки и актуальным чертежом BP-2P-130-0001',
  ],
});

const changes = [];

function withNewlineStyle(text, fragment) {
  return text.includes('\r\n') ? fragment.replace(/\n/g, '\r\n') : fragment;
}

function applicationUrl(languageCode) {
  return `${siteUrl}/${languageCode === 'en' ? '' : `${languageCode}/`}${applicationPage}`;
}

function productUrl(languageCode = 'en') {
  return `${siteUrl}/${languageCode === 'en' ? '' : `${languageCode}/`}${productPage}`;
}

function creativeWork(languageCode) {
  const locale = copy[languageCode];
  if (!locale) throw new Error(`Missing CNC saw-fixture copy for configured language: ${languageCode}`);
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
${markerEnd}`.replaceAll('\u00a0', '&nbsp;');
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

async function missingGeneratedArtifacts(languageCode) {
  if (languageCode === config.sourceLanguage.code) return [];
  const locale = copy[languageCode];
  const candidates = [
    `${locale.prefix}${applicationPage}`,
    `${locale.prefix}${productPage}`,
    `${locale.prefix}llms.txt`,
  ];
  const missing = [];
  for (const relativePath of candidates) {
    try {
      await fs.access(path.join(root, relativePath));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing.push(relativePath);
    }
  }
  return missing;
}

async function syncFrenchSmartChuckSummary() {
  if (!languageCodes.includes('fr')) return;
  const absolute = path.join(root, frenchSmartChuckSummaryPage);
  const current = await fs.readFile(absolute, 'utf8');
  let next = current;
  for (const replacement of frenchSmartChuckSummaryReplacements) {
    for (const legacy of replacement.legacy) next = next.replaceAll(legacy, replacement.current);
    if (!next.includes(replacement.current)) {
      throw new Error(
        `${frenchSmartChuckSummaryPage}: smart-chuck wording is missing the governed French text: ${replacement.current}`,
      );
    }
  }
  const forbidden = ['débranchement', 'Clampage', 'déclampage', 'système de contrôle'];
  const remaining = forbidden.filter((term) => next.includes(term));
  if (remaining.length) {
    throw new Error(`${frenchSmartChuckSummaryPage}: retired smart-chuck terminology remains: ${remaining.join(', ')}`);
  }
  await planWrite(frenchSmartChuckSummaryPage, next);
}

async function syncApplicationPage(languageCode) {
  const locale = copy[languageCode];
  const relativePath = `${locale.prefix}${applicationPage}`;
  const absolute = path.join(root, relativePath);
  const original = await fs.readFile(absolute, 'utf8');
  let html = stripManagedBlock(original, markerStart, markerEnd);
  html = html.replace(/\s*<link rel="stylesheet" href="(?:\.\.\/)?css\/application-cnc-clamping-case\.css[^>]*>/g, '');
  const cssHref = `${locale.prefix ? '../' : ''}css/application-cnc-clamping-case.css?v=20260814-customer-case2`;
  html = html.replace(/\s*<\/head>/, withNewlineStyle(html, `\n<link rel="stylesheet" href="${cssHref}">\n</head>`));
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

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

function readJsonLdGraph(html, relativePath) {
  const graph = [];
  const blocks = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    let payload;
    try {
      payload = JSON.parse(block[1]);
    } catch (error) {
      throw new Error(`${relativePath}: invalid JSON-LD (${error.message}).`);
    }
    if (Array.isArray(payload?.['@graph'])) graph.push(...payload['@graph']);
    else if (payload && typeof payload === 'object') graph.push(payload);
  }
  return graph;
}

async function verifyProductPage(languageCode) {
  const locale = copy[languageCode];
  const relativePath = `${locale.prefix}${productPage}`;
  const absolute = path.join(root, relativePath);
  const html = await fs.readFile(absolute, 'utf8');
  const expectedAttribute = 'data-verified-application="cnc-circular-saw-fixture"';
  const unexpectedAttribute = 'data-confirmed-application-fit="cnc-circular-saw-fixture"';

  if (countOccurrences(html, productMarkerStart) !== 1 || countOccurrences(html, productMarkerEnd) !== 1) {
    throw new Error(`${relativePath}: expected one CNC product-evidence marker pair.`);
  }
  if (countOccurrences(html, expectedAttribute) !== 1 || html.includes(unexpectedAttribute)) {
    throw new Error(`${relativePath}: verified CNC application evidence marker is missing, duplicated or downgraded.`);
  }

  const managedStart = html.indexOf(productMarkerStart);
  const managedEnd = html.indexOf(productMarkerEnd, managedStart + productMarkerStart.length);
  const managedBlock = html.slice(managedStart, managedEnd + productMarkerEnd.length);
  if (!managedBlock.includes(expectedAttribute)) {
    throw new Error(`${relativePath}: verified CNC application evidence is outside its preserved marker pair.`);
  }
  const expectedHref = `${applicationPage}#${moduleAnchor}`;
  if (!managedBlock.includes(`href="${expectedHref}"`)) {
    throw new Error(`${relativePath}: verified CNC application evidence link must target ${expectedHref}.`);
  }
  for (const fragment of productEvidenceFragments[languageCode]) {
    if (!managedBlock.includes(fragment)) {
      throw new Error(`${relativePath}: verified CNC application evidence lost required fact boundary: ${fragment}`);
    }
  }

  const creativeWorks = readJsonLdGraph(html, relativePath).filter((node) => (
    node?.['@type'] === 'CreativeWork'
    && String(node?.['@id'] || '').endsWith(`#${evidenceAnchor}`)
  ));
  if (creativeWorks.length !== 1) {
    throw new Error(`${relativePath}: expected exactly one CNC application CreativeWork evidence node.`);
  }
  const evidence = creativeWorks[0];
  const expectedEvidenceUrl = `${applicationUrl(languageCode)}#${moduleAnchor}`;
  if (
    evidence.url !== expectedEvidenceUrl
    || evidence.about?.['@id'] !== `${productUrl()}#product`
    || evidence.inLanguage !== languageCode
    || evidence.name !== locale.creativeName
    || evidence.description !== locale.creativeDescription
  ) {
    throw new Error(`${relativePath}: CNC application CreativeWork evidence identity, link or localized fact boundary drifted.`);
  }
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
  const staleSources = [
    'Typical requirement',
    'Flange-mount or through-bore air rotary union for CNC fixture integration.',
    'Verified Customer Application: Custom CNC Circular-Saw Fixture',
    'BP-2P-130-0001 is installed at the rear of a customer production fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. The equipment operates at low speed; exact speed, pressure, port assignment and interface must be confirmed from the fixture drawing and approved product data.',
    'View authorized application evidence →',
    'BP-2P-130-0001 is installed at the rear of a customer production fixture on a circular-blade saw machine. Two independent compressed-air passages perform fixture clamp and release. The equipment operates at low speed; exact speed, pressure, port assignment and interface must be confirmed from the fixture drawing and approved product data. <a href="application-cnc-pneumatic-clamping.html#verified-bp-2p-130-cnc-saw-fixture">View authorized application evidence →</a>',
  ];
  if (checkOnly) {
    for (const [sourceText, targetText] of pairs) {
      if (data[sourceText] !== targetText) console.error(`[cnc override drift] ${languageCode}: ${sourceText}`);
    }
    for (const staleSource of staleSources) {
      if (Object.hasOwn(data, staleSource)) console.error(`[cnc retired override] ${languageCode}: ${staleSource}`);
    }
  }
  for (const staleSource of staleSources) delete data[staleSource];
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

const synchronizedLanguageCodes = [];
for (const languageCode of languageCodes) {
  await syncOverrides(languageCode);
  const missingArtifacts = await missingGeneratedArtifacts(languageCode);
  if (missingArtifacts.length) {
    if (checkOnly) {
      throw new Error(
        `${languageCode}: generated CNC case artifacts are missing: ${missingArtifacts.join(', ')}. Run the localized build and integrate it before verification.`,
      );
    }
    console.warn(`${languageCode}: deferred generated CNC case artifacts until localized build integration (${missingArtifacts.join(', ')}).`);
    continue;
  }
  await syncApplicationPage(languageCode);
  // The drawing-backed content synchronizer owns the product-page deep block.
  // This case synchronizer verifies the preserved evidence contract instead of
  // replacing that block with a stale whole-block snapshot.
  await verifyProductPage(languageCode);
  await syncLlms(languageCode);
  synchronizedLanguageCodes.push(languageCode);
}

await syncFrenchSmartChuckSummary();

await syncSitemap('sitemap.xml', [applicationUrl('en'), productUrl()]);
// sitemap-i18n.xml lastmod values are content-hash governed by
// scripts/sync-sitemap-i18n.mjs. A content synchronizer must not overwrite
// that state with a feature-specific fixed date.

if (checkOnly && changes.length) {
  console.error(`CNC saw-fixture case is not synchronized (${changes.length} file(s)): ${changes.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`${checkOnly ? 'Verified' : 'Synchronized'} CNC saw-fixture case; ${changes.length} file(s) ${checkOnly ? 'would change' : 'changed'}.`);
}
