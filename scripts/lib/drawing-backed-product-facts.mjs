import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadPublicDownloadAllowlist } from './public-downloads.mjs';

const manifestPath = path.resolve(import.meta.dirname, '..', '..', 'data', 'product-drawing-facts.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const products = manifest.products || {};
const verifiedStatus = manifest.sourcePolicy?.verifiedStatus;
const quarantineStatus = manifest.sourcePolicy?.quarantineStatus;
const identityPendingModels = new Set(manifest.sourcePolicy?.identityPendingModels || []);

const publicDownloadFiles = new Set(
  (await loadPublicDownloadAllowlist(path.resolve(import.meta.dirname, '..', '..'))).map((name) => name.toLowerCase()),
);

if (manifest.schemaVersion !== 1 || verifiedStatus !== 'verified-drawing' || quarantineStatus !== 'identity-pending') {
  throw new Error('Drawing-backed product-fact manifest schema or status policy is unsupported.');
}

export const drawingBackedProductModels = Object.freeze(Object.keys(products).sort());

export function drawingBackedPublicStep(locale, model) {
  const fileName = `${model}.step`;
  return publicDownloadFiles.has(fileName.toLowerCase());
}

const STEP_META_DOWNLOAD_HOOK = Object.freeze({
  en: ' Download STEP AP214 for a fit check.',
  de: ' STEP AP214 laden.',
  fr: ' Télécharger le fichier STEP AP214 pour vérifier l’intégration.',
  ja: ' STEP（AP214）をダウンロード。',
  ru: ' STEP AP214 скачать.',
});

if (drawingBackedProductModels.length !== 16) {
  throw new Error('Drawing-backed product-fact manifest must contain 16 products.');
}

for (const model of drawingBackedProductModels) {
  const product = products[model];
  if (product.websiteModel !== model) throw new Error(`${model}: websiteModel does not match the manifest key.`);
  if (identityPendingModels.has(model)) {
    if (product.status !== quarantineStatus) throw new Error(`${model}: identity-pending status is missing.`);
  } else if (product.status !== verifiedStatus || product.drawing?.titleBlockModel !== model) {
    throw new Error(`${model}: verified drawing identity is not internally consistent.`);
  }
}

const copy = {
  en: {
    productType: 'pneumatic rotary joint',
    pneumaticElectricType: 'pneumatic-electric rotary union',
    electricalLeadsBoundary: '6 electrical leads shown; circuit allocation and ratings per selected specification',
    verifiedDrawingRequired: 'application review required',
    pressure: (value) => `maximum pressure ${value} MPa`,
    speed: (value) => `maximum speed ${value} RPM`,
    temperature: (minimum, maximum) => `temperature range ${minimum} to +${maximum} °C`,
    weight: (value) => `weight ${value} g`,
    aluminumBody: '6061 aluminum alloy body',
    steel45Body: 'Grade 45 carbon steel body',
    seal: 'PTFE seal with O-ring',
    media: (values) => `media: ${values.join(', ')}`,
    portCountPending: 'outlet count is not listed',
    portPending: 'port thread is not listed',
    portDepth: (value) => `, depth ${value} mm`,
    mountingDepth: (value) => `, thread depth ${value} mm`,
    throughHole: 'through holes',
    hole: 'holes',
    antiRotation: 'anti-rotation',
    antiRotationSetScrew: 'anti-rotation set-screw',
    diameterEnvelope: (diameter, length) => `dimensions: maximum diameter Ø${diameter} mm × overall length ${length} mm`,
    widthEnvelope: (width, length) => `dimensions: maximum width ${width} mm × overall length ${length} mm`,
    throughBore: (diameter) => `through bore Ø${diameter} mm`,
    verifiedPorts: 'port annotations',
    portFunctionPending: 'port functions are assigned in the confirmed drawing before production',
    airInletUnclear: 'the air inlet is assigned in the confirmed drawing before production',
  },
  de: {
    productType: 'pneumatische Drehdurchführung',
    pneumaticElectricType: 'pneumatisch-elektrische Drehdurchführung',
    electricalLeadsBoundary: '6 elektrische Leitungen dargestellt; Kreiszuordnung und Nennwerte gemäß gewählter Spezifikation',
    verifiedDrawingRequired: 'Anwendungsprüfung erforderlich',
    pressure: (value) => `maximaler Druck ${value} MPa`,
    speed: (value) => `maximale Drehzahl ${value} U/min`,
    temperature: (minimum, maximum) => `Temperaturbereich ${minimum} bis +${maximum} °C`,
    weight: (value) => `Gewicht ${value} g`,
    aluminumBody: 'Gehäuse aus Aluminiumlegierung 6061',
    steel45Body: 'Gehäuse aus Stahl 45',
    seal: 'PTFE-Dichtung mit O-Ring',
    media: (values) => `${values.length === 1 ? 'Medium' : 'Medien'}: ${values.join(', ')}`,
    portCountPending: 'Ausgangsanzahl ist nicht angegeben',
    portPending: 'Anschlussgewinde ist nicht angegeben',
    portDepth: (value) => `, Tiefe ${value} mm`,
    mountingDepth: (value) => `, Gewindetiefe ${value} mm`,
    throughHole: 'Durchgangsbohrungen',
    hole: 'Bohrungen',
    antiRotation: 'Verdrehsicherung',
    antiRotationSetScrew: 'Verdrehsicherungs-Gewindestift',
    diameterEnvelope: (diameter, length) => `Abmessungen: maximaler Durchmesser Ø${diameter} mm × Gesamtlänge ${length} mm`,
    widthEnvelope: (width, length) => `Abmessungen: maximale Breite ${width} mm × Gesamtlänge ${length} mm`,
    throughBore: (diameter) => `Durchgangsbohrung Ø${diameter} mm`,
    verifiedPorts: 'Anschlussangaben',
    portFunctionPending: 'Anschlussfunktionen werden in der bestätigten Zeichnung vor der Fertigung zugeordnet',
    airInletUnclear: 'der Lufteingang wird in der bestätigten Zeichnung vor der Fertigung zugeordnet',
  },
  fr: {
    productType: 'raccord tournant pneumatique',
    pneumaticElectricType: 'raccord tournant pneumatique-électrique',
    electricalLeadsBoundary: '6 conducteurs électriques représentés ; affectation des circuits et caractéristiques nominales selon la spécification retenue',
    verifiedDrawingRequired: 'validation de l’application requise',
    pressure: (value) => `pression maximale ${value} MPa`,
    speed: (value) => `vitesse maximale ${value} tr/min`,
    temperature: (minimum, maximum) => `plage de température de ${minimum} à +${maximum} °C`,
    weight: (value) => `masse ${value} g`,
    aluminumBody: 'corps en alliage d’aluminium 6061',
    steel45Body: 'corps en acier au carbone nuance 45',
    seal: 'joint d’étanchéité en PTFE avec joint torique',
    media: (values) => `fluides : ${values.join(', ')}`,
    portCountPending: 'le nombre de sorties n’est pas indiqué',
    portPending: 'le filetage des orifices n’est pas indiqué',
    portDepth: (value) => `, profondeur ${value} mm`,
    mountingDepth: (value) => `, profondeur filetée ${value} mm`,
    throughHole: 'trous débouchants',
    hole: 'trous',
    antiRotation: 'anti-rotation',
    antiRotationSetScrew: 'vis de blocage anti-rotation',
    diameterEnvelope: (diameter, length) => `dimensions : diamètre maximal Ø${diameter} mm × longueur hors tout ${length} mm`,
    widthEnvelope: (width, length) => `dimensions : largeur maximale ${width} mm × longueur hors tout ${length} mm`,
    throughBore: (diameter) => `alésage traversant Ø${diameter} mm`,
    verifiedPorts: 'repérage des orifices',
    portFunctionPending: 'les fonctions des orifices sont définies sur le plan validé avant la production',
    airInletUnclear: 'l’entrée d’air est définie sur le plan validé avant la production',
  },
  ja: {
    productType: '空圧ロータリージョイント',
    pneumaticElectricType: '空圧・電気複合ロータリージョイント',
    electricalLeadsBoundary: '電気リード6本。回路割当と定格は選定仕様による',
    verifiedDrawingRequired: '用途確認が必要',
    pressure: (value) => `最高使用圧力 ${value} MPa`,
    speed: (value) => `最高回転数 ${value} min⁻¹`,
    temperature: (minimum, maximum) => `温度範囲 ${minimum}～+${maximum} °C`,
    weight: (value) => `質量 ${value} g`,
    aluminumBody: '6061アルミニウム合金ボディ',
    steel45Body: '45鋼ボディ',
    seal: 'PTFEシールとOリング',
    media: (values) => `使用流体 ${values.join('・')}`,
    portCountPending: '出口数は記載されていません',
    portPending: 'ポートねじは記載されていません',
    portDepth: (value) => `、深さ${value} mm`,
    mountingDepth: (value) => `、ねじ深さ${value} mm`,
    throughHole: '通し穴',
    hole: '穴',
    antiRotation: '回り止め',
    antiRotationSetScrew: '回り止め止めねじ',
    diameterEnvelope: (diameter, length) => `外形寸法 最大径Ø${diameter} mm × 全長${length} mm`,
    widthEnvelope: (width, length) => `外形寸法 最大幅${width} mm × 全長${length} mm`,
    throughBore: (diameter) => `中空径 Ø${diameter} mm`,
    verifiedPorts: 'ポート表記',
    portFunctionPending: 'ポート機能は確定図面で生産前に割り当てます',
    airInletUnclear: '空気入口は確定図面で生産前に割り当てます',
  },
  ru: {
    productType: 'пневматическое ротационное соединение',
    pneumaticElectricType: 'пневмоэлектрическое ротационное соединение',
    electricalLeadsBoundary: 'показано 6 электрических выводов; распределение цепей и номиналы по выбранной спецификации',
    verifiedDrawingRequired: 'требуется проверка применения',
    pressure: (value) => `максимальное давление ${value} МПа`,
    speed: (value) => `максимальная частота вращения ${value} об/мин`,
    temperature: (minimum, maximum) => `температурный диапазон ${minimum}…+${maximum} °C`,
    weight: (value) => `масса ${value} г`,
    aluminumBody: 'корпус из алюминиевого сплава 6061',
    steel45Body: 'корпус из стали 45',
    seal: 'уплотнение из ПТФЭ с уплотнительным кольцом',
    media: (values) => `${values.length === 1 ? 'рабочая среда' : 'рабочие среды'}: ${values.join(', ')}`,
    portCountPending: 'Количество выходов не указано',
    portPending: 'Резьба портов не указана',
    portDepth: (value) => `, глубина ${value} мм`,
    mountingDepth: (value) => `, глубина резьбы ${value} мм`,
    throughHole: 'сквозные отверстия',
    hole: 'отверстия',
    antiRotation: 'фиксация от проворачивания',
    antiRotationSetScrew: 'установочный винт от проворачивания',
    diameterEnvelope: (diameter, length) => `габариты: максимальный диаметр Ø${diameter} мм × общая длина ${length} мм`,
    widthEnvelope: (width, length) => `габариты: максимальная ширина ${width} мм × общая длина ${length} мм`,
    throughBore: (diameter) => `сквозное отверстие Ø${diameter} мм`,
    verifiedPorts: 'обозначения портов',
    portFunctionPending: 'функции портов назначаются в подтверждённом чертеже до производства',
    airInletUnclear: 'вход воздуха назначается в подтверждённом чертеже до производства',
  },
};

const mediaTerms = {
  en: { air: 'air', oil: 'oil', water: 'water' },
  de: { air: 'Luft', oil: 'Öl', water: 'Wasser' },
  fr: { air: 'air', oil: 'huile', water: 'eau' },
  ja: { air: '空気', oil: '油', water: '水' },
  ru: { air: 'воздух', oil: 'масло', water: 'вода' },
};

const portRoleTerms = {
  en: {
    inlet: 'inlet',
    'media-inlet': 'media inlet',
    outlet: 'outlet',
    'media-outlet': 'media outlet',
    'side-group': 'side ports',
    'end-face-group': 'end-face ports',
    'opposite-face': 'opposite-face port',
    'side-a': 'side A ports',
    'side-b': 'side B ports',
    'face-a': 'face A ports',
    'face-b': 'face B ports',
    'air-port-group': 'air ports',
    'air-outlet': 'air outlet',
    'release-port': 'release port',
    'clamp-port': 'clamp port',
    'release-outlet': 'release outlet',
    'clamp-outlet': 'clamp outlet',
  },
  de: {
    inlet: 'Einlass',
    'media-inlet': 'Medieneinlass',
    outlet: 'Auslass',
    'media-outlet': 'Medienauslass',
    'side-group': 'seitliche Anschlüsse',
    'end-face-group': 'stirnseitige Anschlüsse',
    'opposite-face': 'Anschluss Gegenseite',
    'side-a': 'Anschlüsse Seite A',
    'side-b': 'Anschlüsse Seite B',
    'face-a': 'Anschlüsse Fläche A',
    'face-b': 'Anschlüsse Fläche B',
    'air-port-group': 'Luftanschlüsse',
    'air-outlet': 'Luftausgang',
    'release-port': 'Löseanschluss',
    'clamp-port': 'Klemmanschluss',
    'release-outlet': 'Löseausgang',
    'clamp-outlet': 'Klemmausgang',
  },
  fr: {
    inlet: 'entrée',
    'media-inlet': 'entrée du fluide',
    outlet: 'sortie',
    'media-outlet': 'sortie du fluide',
    'side-group': 'orifices latéraux',
    'end-face-group': 'orifices en face',
    'opposite-face': 'orifice sur la face opposée',
    'side-a': 'orifices côté A',
    'side-b': 'orifices côté B',
    'face-a': 'orifices face A',
    'face-b': 'orifices face B',
    'air-port-group': 'orifices d’air',
    'air-outlet': 'sortie d’air',
    'release-port': 'orifice de desserrage',
    'clamp-port': 'orifice de serrage',
    'release-outlet': 'sortie de desserrage',
    'clamp-outlet': 'sortie de serrage',
  },
  ja: {
    inlet: '入口',
    'media-inlet': '流体入口',
    outlet: '出口',
    'media-outlet': '流体出口',
    'side-group': '側面ポート',
    'end-face-group': '端面ポート',
    'opposite-face': '反対面ポート',
    'side-a': 'A側ポート',
    'side-b': 'B側ポート',
    'face-a': 'A面ポート',
    'face-b': 'B面ポート',
    'air-port-group': '空気ポート',
    'air-outlet': '空気出口',
    'release-port': '解除ポート',
    'clamp-port': 'クランプポート',
    'release-outlet': '解除出口',
    'clamp-outlet': 'クランプ出口',
  },
  ru: {
    inlet: 'вход',
    'media-inlet': 'вход рабочей среды',
    outlet: 'выход',
    'media-outlet': 'выход рабочей среды',
    'side-group': 'боковые порты',
    'end-face-group': 'торцевые порты',
    'opposite-face': 'порт на противоположной стороне',
    'side-a': 'порты стороны A',
    'side-b': 'порты стороны B',
    'face-a': 'порты торца A',
    'face-b': 'порты торца B',
    'air-port-group': 'воздушные порты',
    'air-outlet': 'выход воздуха',
    'release-port': 'порт разжима',
    'clamp-port': 'порт зажима',
    'release-outlet': 'выход разжима',
    'clamp-outlet': 'выход зажима',
  },
};

const mountingSideTerms = {
  en: { stator: 'stator mount', rotor: 'rotor mount', 'face-a': 'face A mount', 'face-b': 'face B mount', body: 'body mount' },
  de: { stator: 'Statorbefestigung', rotor: 'Rotorbefestigung', 'face-a': 'Befestigung Fläche A', 'face-b': 'Befestigung Fläche B', body: 'Gehäusebefestigung' },
  fr: { stator: 'fixation du stator', rotor: 'fixation du rotor', 'face-a': 'fixation face A', 'face-b': 'fixation face B', body: 'fixation du corps' },
  ja: { stator: '固定側取付', rotor: '回転側取付', 'face-a': 'A面取付', 'face-b': 'B面取付', body: '本体取付' },
  ru: { stator: 'крепление статора', rotor: 'крепление ротора', 'face-a': 'крепление торца A', 'face-b': 'крепление торца B', body: 'крепление корпуса' },
};

function localeCopy(locale) {
  const localized = copy[locale];
  if (!localized) throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
  return localized;
}

function localizedNumber(locale, value) {
  const normalized = String(value);
  return ['de', 'fr', 'ru'].includes(locale) ? normalized.replace('.', ',') : normalized;
}

function localizedWeightNumber(locale, value) {
  if (locale !== 'fr') return localizedNumber(locale, value);
  const [integer, fraction] = String(value).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

function localizedThread(locale, value) {
  const normalized = String(value).replace(/x/gi, '×');
  return ['de', 'fr', 'ru'].includes(locale) ? normalized.replace(/\.(?=\d)/g, ',') : normalized;
}

function searchMillimeterUnit(locale) {
  return locale === 'ru' ? 'мм' : 'mm';
}

function russianCount(value, one, few, many) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} ${few}`;
  return `${value} ${many}`;
}

function russianInstrumentalCount(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function passageCountForModel(model) {
  const match = /^BP-(\d+)P-/.exec(model);
  if (!match) throw new Error(`${model}: passage count is not encoded in the verified model name.`);
  return Number(match[1]);
}

function uiPassagesMoq(locale, model) {
  const passages = passageCountForModel(model);
  return uiPhrase(locale, {
    en: `${passages} ${passages === 1 ? 'passage' : 'passages'} · 1 piece`,
    de: `${passages} ${passages === 1 ? 'Kanal' : 'Kanäle'} · 1 Stück`,
    fr: `${passages} ${passages === 1 ? 'passage' : 'passages'} · 1 pièce`,
    ja: `${passages}流路 · 1個`,
    ru: `${russianCount(passages, 'канал', 'канала', 'каналов')} · 1 шт.`,
  });
}

function inletOutletCounts(facts) {
  const annotations = facts.ports?.annotations || [];
  const total = (direction, roles) => annotations
    .filter((annotation) => annotation.direction === direction || (!annotation.direction && roles.has(annotation.role)))
    .reduce((sum, annotation) => sum + annotation.count, 0);
  return {
    inlets: total('inlet', new Set(['inlet', 'media-inlet'])),
    outlets: total('outlet', new Set(['outlet', 'media-outlet'])),
  };
}

function passageKeyword(locale, passages, inlets, outlets) {
  if (locale === 'en') {
    const base = `${passages} ${passages === 1 ? 'passage' : 'passages'}`;
    return inlets && outlets
      ? `${base} · ${inlets} ${inlets === 1 ? 'inlet' : 'inlets'} / ${outlets} ${outlets === 1 ? 'outlet' : 'outlets'}`
      : base;
  }
  if (locale === 'de') {
    const base = `${passages} ${passages === 1 ? 'Kanal' : 'Kanäle'}`;
    return inlets && outlets
      ? `${base} · ${inlets} ${inlets === 1 ? 'Eingang' : 'Eingänge'} / ${outlets} ${outlets === 1 ? 'Ausgang' : 'Ausgänge'}`
      : base;
  }
  if (locale === 'fr') {
    const base = `${passages} ${passages === 1 ? 'passage' : 'passages'}`;
    return inlets && outlets
      ? `${base} · ${inlets} ${inlets === 1 ? 'entrée' : 'entrées'} / ${outlets} ${outlets === 1 ? 'sortie' : 'sorties'}`
      : base;
  }
  if (locale === 'ja') return inlets && outlets ? `${passages}流路・入口${inlets} / 出口${outlets}` : `${passages}流路`;
  if (locale === 'ru') {
    const base = russianCount(passages, 'канал', 'канала', 'каналов');
    return inlets && outlets
      ? `${base} · ${russianCount(inlets, 'вход', 'входа', 'входов')} / ${russianCount(outlets, 'выход', 'выхода', 'выходов')}`
      : base;
  }
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

function productTypeKeyword(locale, model) {
  const localized = localeCopy(locale);
  return model === 'BP-3P-S06-0001' ? localized.pneumaticElectricType : localized.productType;
}

function productTypeSearchSynonym(locale) {
  return uiPhrase(locale, {
    en: 'pneumatic rotary union',
    de: 'Pneumatik-Drehdurchführung',
    fr: 'joint tournant pneumatique',
    ja: 'エアロータリージョイント',
    ru: 'пневматическое вращающееся соединение',
  });
}

function productDescriptor(locale, model, passages, inlets = 0, outlets = 0) {
  if (model === 'BP-3P-S06-0001') {
    if (locale === 'en') return `${passages}-passage pneumatic-electric rotary union`;
    if (locale === 'de') return `pneumatisch-elektrische Drehdurchführung mit ${passages} Kanälen`;
    if (locale === 'fr') return `raccord tournant pneumatique-électrique à ${passages} passages`;
    if (locale === 'ja') return `${passages}流路の空圧・電気複合ロータリージョイント`;
    if (locale === 'ru') return `${passages}-канальное пневмоэлектрическое ротационное соединение`;
    throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
  }
  if (locale === 'en') {
    const io = inlets && outlets
      ? ` with ${inlets} ${inlets === 1 ? 'inlet' : 'inlets'} and ${outlets} ${outlets === 1 ? 'outlet' : 'outlets'}`
      : '';
    return `${passages}-passage pneumatic rotary joint${io}`;
  }
  if (locale === 'de') {
    const io = inlets && outlets
      ? `, ${inlets} ${inlets === 1 ? 'Eingang' : 'Eingängen'} und ${outlets} ${outlets === 1 ? 'Ausgang' : 'Ausgängen'}`
      : '';
    return `pneumatische Drehdurchführung mit ${passages} ${passages === 1 ? 'Kanal' : 'Kanälen'}${io}`;
  }
  if (locale === 'fr') {
    const io = inlets && outlets
      ? ` avec ${inlets} ${inlets === 1 ? 'entrée' : 'entrées'} et ${outlets} ${outlets === 1 ? 'sortie' : 'sorties'}`
      : '';
    return `raccord tournant pneumatique à ${passages} ${passages === 1 ? 'passage' : 'passages'}${io}`;
  }
  if (locale === 'ja') {
    const io = inlets && outlets ? `、入口${inlets}・出口${outlets}` : '';
    return `${passages}流路${io}の空圧ロータリージョイント`;
  }
  if (locale === 'ru') {
    const io = inlets && outlets
      ? ` с ${russianInstrumentalCount(inlets, 'входом', 'входами')} и ${russianInstrumentalCount(outlets, 'выходом', 'выходами')}`
      : '';
    return `${passages}-канальное пневматическое ротационное соединение${io}`;
  }
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

function bodyKeyword(locale, bodyMaterial) {
  const localized = localeCopy(locale);
  if (bodyMaterial === 'Aluminum Alloy 6061') return localized.aluminumBody;
  if (bodyMaterial === 'Steel 45#') return localized.steel45Body;
  throw new Error(`Unsupported drawing-backed body material: ${bodyMaterial}`);
}

function sealKeyword(locale, sealMaterials) {
  if (JSON.stringify(sealMaterials) !== JSON.stringify(['PTFE', 'O-ring'])) {
    throw new Error(`Unsupported drawing-backed seal materials: ${JSON.stringify(sealMaterials)}`);
  }
  return localeCopy(locale).seal;
}

function mediaKeyword(locale, media) {
  const terms = mediaTerms[locale];
  const values = media.map((medium) => {
    if (!terms[medium]) throw new Error(`Unsupported drawing-backed medium: ${medium}`);
    return terms[medium];
  });
  return localeCopy(locale).media(values);
}

function portKeywords(locale, model, facts) {
  const localized = localeCopy(locale);
  if (model === 'BP-3P-0006') return [localized.portPending];
  if (!['verified', 'verified-threads-only', 'verified-outlets-only'].includes(facts.ports?.status)) return [];
  const keywords = (facts.ports.annotations || []).map((annotation) => {
    const role = portRoleTerms[locale][annotation.role];
    const interfaceSize = annotation.thread
      ? localizedThread(locale, annotation.thread)
      : annotation.diameterMm !== undefined
        ? `Ø${localizedNumber(locale, annotation.diameterMm)} ${searchMillimeterUnit(locale)}`
        : null;
    if (!role || !annotation.count || !interfaceSize) {
      throw new Error(`${model}: verified port annotation is incomplete or unsupported.`);
    }
    const depth = annotation.depthMm === undefined
      ? ''
      : localized.portDepth(localizedNumber(locale, annotation.depthMm));
    const separator = locale === 'ja' ? '：' : locale === 'fr' ? '\u00a0: ' : ': ';
    return `${role}${separator}${annotation.count} × ${interfaceSize}${depth}`;
  });
  if (facts.ports.status === 'verified-outlets-only') keywords.push(localized.airInletUnclear);
  if (facts.ports.status === 'verified-threads-only') keywords.push(localized.portFunctionPending);
  return keywords;
}

function mountingKeywords(locale, facts) {
  if (facts.mounting?.status !== 'verified') return [];
  const localized = localeCopy(locale);
  return (facts.mounting.features || []).map((feature) => {
    const side = mountingSideTerms[locale][feature.side];
    if (!side || !feature.count) throw new Error('Verified mounting feature is incomplete or unsupported.');
    let interfaceText;
    if (feature.thread) interfaceText = `${feature.count} × ${localizedThread(locale, feature.thread)}`;
    else if (feature.diameterMm !== undefined && ['through-hole', 'hole'].includes(feature.feature)) {
      const holeType = feature.feature === 'through-hole' ? localized.throughHole : localized.hole;
      interfaceText = `${feature.count} × Ø${localizedNumber(locale, feature.diameterMm)} ${searchMillimeterUnit(locale)} ${holeType}`;
    } else throw new Error('Verified mounting interface is incomplete or unsupported.');
    const depth = feature.depthMm === undefined
      ? ''
      : localized.mountingDepth(localizedNumber(locale, feature.depthMm));
    const antiRotation = feature.feature === 'anti-rotation'
      ? ` · ${localized.antiRotation}`
      : feature.feature === 'anti-rotation-set-screw'
        ? ` · ${localized.antiRotationSetScrew}`
        : '';
    const separator = locale === 'ja' ? '：' : locale === 'fr' ? '\u00a0: ' : ': ';
    return `${side}${separator}${interfaceText}${depth}${antiRotation}`;
  });
}

function dimensionKeywords(locale, facts) {
  const localized = localeCopy(locale);
  const keywords = [];
  const envelope = facts.envelope;
  if (envelope && envelope.status !== 'drawing-audit-only') {
    const length = localizedNumber(locale, envelope.overallLengthMm);
    if (envelope.maximumDiameterMm !== undefined) {
      keywords.push(localized.diameterEnvelope(localizedNumber(locale, envelope.maximumDiameterMm), length));
    } else if (envelope.maximumWidthMm !== undefined) {
      keywords.push(localized.widthEnvelope(localizedNumber(locale, envelope.maximumWidthMm), length));
    }
  }
  if (facts.throughBore?.status === 'verified') {
    keywords.push(localized.throughBore(localizedNumber(locale, facts.throughBore.diameterMm)));
  }
  return keywords;
}

const uiPortCategoryModels = new Set(['BP-1P-0003', 'BP-2P-08-0001']);

const uiJsonPropertyNames = Object.freeze({
  en: Object.freeze({
    pressure: 'Maximum pressure', speed: 'Maximum speed', media: 'Suitable media',
    body: 'Body material', seal: 'Seal type', mount: 'Mounting type',
    temperature: 'Temperature range', weight: 'Weight', dimensions: 'Envelope dimensions',
    bore: 'Hollow bore diameter', ports: 'Port configuration', pneumaticPassages: 'Pneumatic passages', electricalCircuits: 'Electrical circuits',
    voltage: 'Voltage rating', electricalContact: 'Electrical contact material',
    insulationResistance: 'Insulation resistance', dielectricStrength: 'Dielectric strength',
  }),
  de: Object.freeze({
    pressure: 'Maximaldruck', speed: 'Maximale Drehzahl', media: 'Geeignete Medien',
    body: 'Gehäusewerkstoff', seal: 'Dichtung', mount: 'Montageart',
    temperature: 'Temperaturbereich', weight: 'Gewicht', dimensions: 'Abmessungen',
    bore: 'Durchgangsbohrung', ports: 'Medienanschlüsse', pneumaticPassages: 'Pneumatische Kanäle', electricalCircuits: 'Elektrische Stromkreise',
    voltage: 'Nennspannung', electricalContact: 'Kontaktwerkstoff',
    insulationResistance: 'Isolationswiderstand', dielectricStrength: 'Spannungsfestigkeit',
  }),
  fr: Object.freeze({
    pressure: 'Pression maximale', speed: 'Vitesse maximale', media: 'Fluides compatibles',
    body: 'Matériau du corps', seal: 'Type de joint', mount: 'Type de fixation',
    temperature: 'Plage de température', weight: 'Masse', dimensions: 'Dimensions hors tout',
    bore: 'Diamètre de l’alésage traversant', ports: 'Configuration des orifices', pneumaticPassages: 'Passages pneumatiques', electricalCircuits: 'Circuits électriques',
    voltage: 'Tension nominale', electricalContact: 'Matériau des contacts électriques',
    insulationResistance: 'Résistance d’isolement', dielectricStrength: 'Rigidité diélectrique',
  }),
  ja: Object.freeze({
    pressure: '最高圧力', speed: '最高回転数', media: '適用流体',
    body: '本体材質', seal: 'シール方式', mount: '取付方式',
    temperature: '温度範囲', weight: '質量', dimensions: '外形寸法',
    bore: '中空穴径', ports: '流体ポート', pneumaticPassages: '空圧流路数', electricalCircuits: '電気回路数',
    voltage: '定格電圧', electricalContact: '電気接点材質',
    insulationResistance: '絶縁抵抗', dielectricStrength: '耐電圧',
  }),
  ru: Object.freeze({
    pressure: 'Максимальное давление', speed: 'Максимальная частота вращения',
    media: 'Подходящая среда', body: 'Материал корпуса', seal: 'Тип уплотнения',
    mount: 'Тип крепления', temperature: 'Температурный диапазон', weight: 'Масса',
    dimensions: 'Габариты', bore: 'Диаметр проходного отверстия', ports: 'Порты рабочей среды', pneumaticPassages: 'Пневматические каналы',
    electricalCircuits: 'Электрические цепи', voltage: 'Номинальное напряжение',
    electricalContact: 'Материал электрических контактов',
    insulationResistance: 'Сопротивление изоляции', dielectricStrength: 'Электрическая прочность',
  }),
});

const uiFieldAliases = Object.freeze({
  ports: ['Port configuration', 'Media ports', 'Medienanschlüsse', 'Configuration des orifices', 'Orifices du fluide', 'orifice configuration', '流体ポート', 'Порты рабочей среды', 'Конфигурация портов'],
  passages: ['Passages', 'Kanal', 'Kanalzahl', 'Nombre de passages', '流路', '流路数', 'Количество каналов', 'Проходы'],
  pneumaticPassages: ['Pneumatic passages', 'Pneumatische Kanäle', 'Passages pneumatiques', '空圧流路数', '空圧流路', 'Пневматические каналы'],
  pressure: ['Maximum pressure', 'Maximum pressure per drawing', 'Max Pressure', 'Maximaler Betriebsdruck', 'Maximaldruck', 'Maximaldruck laut Zeichnung', 'Pression maximale', 'Pression maximale selon le plan', '最高圧力', '最高使用圧力', '図面記載最高圧力', 'Максимальное рабочее давление', 'Максимальное давление', 'Максимальное давление по чертежу'],
  speed: ['Maximum speed', 'Maximum speed per drawing', 'Max Speed', 'Maximale Drehzahl', 'Maximale Drehzahl laut Zeichnung', 'Vitesse maximale', 'Vitesse maximale selon le plan', 'vitesse de rotation maximale', '最高使用回転数', '最高回転数', '図面記載最高回転数', 'Максимальная скорость вращения', 'Максимальная частота вращения', 'Максимальная частота вращения по чертежу'],
  media: ['Compatible media', 'Suitable media', 'Media listed in drawing', 'Betriebsmedien', 'Geeignete Medien', 'Geeignete Betriebsmedien', 'Medien laut Zeichnung', 'Fluides compatibles', 'Fluides indiqués sur le plan', 'Convient fluides', '適用流体', '使用可能流体', '図面記載流体', 'Рабочая среда', 'Подходящая среда', 'Совместимые рабочие среды', 'Среда по чертежу'],
  body: ['Body material', 'Gehäusewerkstoff', 'Matériau du corps', 'Matériel corporel', '本体材質', 'Материал корпуса'],
  seal: ['Seal type', 'Dichtung', 'Dichtungsart', 'Type de joint', 'Type de scellé', 'シール方式', 'Тип уплотнения'],
  mount: ['Mounting type', 'Mount Type', 'Montageart', 'Type de fixation', 'Type de montage', '取付方式', '取付方法', 'Тип крепления', 'Способ монтажа'],
  thread: ['Thread type', 'Thread Type', 'Gewinde', 'Gewindetyp', 'Type de filetage', 'Filetage', 'ねじ規格', 'ねじタイプ', 'Резьба', 'Тип резьба'],
  rotor: ['Rotor connection', 'Rotor Connection', 'Rotoranschluss', 'Raccordement du rotor', '回転側接続', 'ロータ側接続口', 'Подключение ротора', 'Присоединение ротора'],
  stator: ['Stator connection', 'Stator Connection', 'Gehäuseanschluss', 'Statoranschluss', 'Raccordement du stator', '固定側接続', 'ステータ側接続口', 'Подключение статора', 'Присоединение статора'],
  temperature: ['Operating temperature', 'Temperature range', 'Temperature range per drawing', 'Betriebstemperatur', 'Temperaturbereich', 'Temperaturbereich laut Zeichnung', 'Température de service', 'Plage de température', 'Plage de température selon le plan', '使用温度範囲', '温度範囲', '図面記載温度範囲', 'Рабочая температура', 'Температурный диапазон', 'Температурный диапазон по чертежу'],
  weight: ['Approx. Weight', 'Weight', 'Weight per drawing', 'Net weight', 'Net Weight', 'Gewicht', 'Gewicht laut Zeichnung', 'Nettogewicht', 'Ungefähres Gewicht', 'Masse', 'Poids', 'Masse selon le plan', 'Masse nette', 'Masse approximative', '質量', '図面記載質量', '製品質量', '概算質量', 'Масса', 'Масса по чертежу', 'Масса нетто', 'Приблизительная масса'],
  dimensions: ['Dimensions', 'Envelope dimensions', 'Envelope dimensions per drawing', 'Abmessungen', 'Abmessungen laut Zeichnung', 'Dimensions hors tout', 'Dimensions hors tout selon le plan', "Dimensions de l'enveloppe", '外形寸法', '図面記載外形寸法', 'Габариты', 'Габариты по чертежу', 'Габаритные размеры'],
  bore: ['Bore diameter', 'Bore Diameter', 'Hollow bore diameter', 'Bohrungsdurchmesser', 'Durchgangsbohrung', 'Durchmesser der Durchgangsbohrung', 'Diamètre de l’alésage traversant', 'Alésage traversant', 'Diamètre de perçage creux', '中空穴径', '中空径の直径', 'Диаметр прохода', 'Диаметр проходного отверстия', 'Диаметр сквозного отверстия', 'Боровой диаметр'],
  outerDiameter: ['Outer diameter', 'Außendurchmesser', 'Diamètre extérieur', '外の直径', 'Внешний диаметр'],
  electricalCircuits: ['Electrical circuits', 'Elektrische Stromkreise', 'Circuits électriques', '電気回路数', '電気回路', 'Электрические цепи'],
  voltage: ['Voltage rating', 'Nennspannung', 'Tension nominale', '定格電圧', 'Номинальное напряжение'],
  electricalContact: ['Electrical contact material', 'Electrical Contact', 'Kontaktwerkstoff', 'Elektrischer Kontakt', 'Matériau des contacts électriques', 'Contact électrique', '電気接点材質', '電気接点', 'Материал электрических контактов', 'Электрический контакт'],
  signalType: ['Signal type', 'Signalart', 'Type de signal', '信号種別', 'Тип сигнала'],
  insulationResistance: ['Insulation resistance', 'Isolationswiderstand', 'Résistance d’isolement', '絶縁抵抗', 'Сопротивление изоляции'],
  dielectricStrength: ['Dielectric strength', 'Spannungsfestigkeit', 'Rigidité diélectrique', '耐電圧', 'Электрическая прочность'],
  warranty: ['Warranty period', 'Garantiezeitraum', 'Durée de garantie', 'Période de garantie', '保証期間', 'Гарантийный срок'],
});

const uiCanonicalByLabel = new Map();
for (const [field, aliases] of Object.entries(uiFieldAliases)) {
  for (const alias of aliases) {
    const normalized = String(alias).replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (uiCanonicalByLabel.has(normalized) && uiCanonicalByLabel.get(normalized) !== field) {
      throw new Error(`Duplicate drawing-backed UI field alias: ${alias}`);
    }
    uiCanonicalByLabel.set(normalized, field);
  }
}

export function drawingBackedCanonicalField(label) {
  if (typeof label !== 'string') return null;
  return uiCanonicalByLabel.get(label.replace(/\s+/g, ' ').trim().toLocaleLowerCase()) || null;
}

function uiPhrase(locale, values) {
  if (!Object.hasOwn(values, locale)) throw new Error(`Missing drawing-backed UI phrase for ${locale}.`);
  return values[locale];
}

function uiFormatPressure(locale, pressure) {
  const unit = locale === 'ru' ? 'МПа' : pressure.unit;
  const mpa = `${localizedNumber(locale, pressure.value)} ${unit}`;
  const bar = localizedNumber(locale, pressure.value * 10);
  const psi = localizedNumber(locale, Math.round(pressure.value * 145));
  if (locale === 'en') return `${mpa} (${bar} bar ≈ ${psi} psi)`;
  if (locale === 'de') return `${mpa} (${bar} bar / ca. ${psi} psi)`;
  if (locale === 'fr') return `${mpa} (${bar} bar ≈ ${psi} psi)`;
  if (locale === 'ja') return `${mpa}（${bar} bar ≈ ${psi} psi）`;
  if (locale === 'ru') return `${mpa} (${bar} бар ≈ ${psi} psi)`;
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

function uiFormatSpeed(locale, speed) {
  const units = { en: 'RPM', de: 'min⁻¹', fr: 'tr/min', ja: 'min⁻¹', ru: 'об/мин' };
  const unit = units[locale];
  if (!unit) throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
  return `${localizedNumber(locale, speed.value)} ${unit}`;
}

function uiFormatBody(locale, material) {
  return uiPhrase(locale, material === 'Steel 45#' ? {
    en: 'Grade 45 carbon steel', de: 'Stahl 45#', fr: 'Acier au carbone nuance 45', ja: '45#鋼', ru: 'Сталь 45#',
  } : {
    en: '6061 aluminum alloy', de: 'Aluminiumlegierung 6061', fr: 'Alliage d’aluminium 6061', ja: '6061アルミニウム合金', ru: 'Алюминиевый сплав 6061',
  });
}

function uiFormatSeal(locale, materials) {
  if (materials.length !== 2 || materials[0] !== 'PTFE' || materials[1] !== 'O-ring') {
    throw new Error(`Unexpected drawing seal contract: ${materials.join(', ')}`);
  }
  return uiPhrase(locale, {
    en: 'PTFE + O-ring', de: 'PTFE + O-Ring', fr: 'PTFE + joint torique', ja: 'PTFE＋Oリング', ru: 'ПТФЭ + O-кольцо',
  });
}

function uiFormatMedia(locale, media) {
  const supported = media.join(',');
  if (!['air', 'air,oil,water'].includes(supported)) throw new Error(`Unexpected drawing media contract: ${supported}`);
  if (supported === 'air') {
    return uiPhrase(locale, {
      en: 'Air', de: 'Luft',
      fr: 'air', ja: '空気', ru: 'воздух',
    });
  }
  return uiPhrase(locale, {
    en: 'Air, oil, and water', de: 'Luft, Öl und Wasser',
    fr: 'air, huile et eau', ja: '空気・油・水', ru: 'воздух, масло и вода',
  });
}

function uiSignedNumber(locale, value, showPositive) {
  const absolute = localizedNumber(locale, Math.abs(value));
  if (value < 0) return `−${absolute}`;
  if (showPositive && value > 0) return `+${absolute}`;
  return absolute;
}

function uiFormatTemperature(locale, range) {
  const minimum = uiSignedNumber(locale, range.minimum, false);
  const maximum = uiSignedNumber(locale, range.maximum, true);
  return uiPhrase(locale, {
    en: `${minimum} to ${maximum} °C`, de: `${minimum} bis ${maximum} °C`,
    fr: `${minimum} à ${maximum} °C`, ja: `${minimum}～${maximum} °C`, ru: `от ${minimum} до ${maximum} °C`,
  });
}

function trimDecimal(value, digits) {
  return value.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '');
}

function separatedInteger(value, separator) {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function uiFormatWeight(locale, weight) {
  if (weight.unit !== 'g') throw new Error(`Unexpected weight unit: ${weight.unit}`);
  const grams = Number(weight.value);
  const kilograms = trimDecimal(grams / 1000, 3);
  if (locale === 'en') return `${kilograms} kg (${separatedInteger(grams, ',')} g)`;
  if (locale === 'de') return `${kilograms.replace('.', ',')} kg (${separatedInteger(grams, '.')} g)`;
  if (locale === 'fr') return `${kilograms.replace('.', ',')} kg (${separatedInteger(grams, ' ')} g)`;
  if (locale === 'ja') return `${kilograms} kg（${separatedInteger(grams, ',')} g）`;
  if (locale === 'ru') return `${kilograms.replace('.', ',')} кг (${separatedInteger(grams, ' ')} г)`;
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

function uiPendingOutletCount(locale) {
  return localeCopy(locale).portCountPending;
}

const FRENCH_COUNTED_PORT_ROLES = Object.freeze({
  'media-inlet': Object.freeze(['entrée du fluide', 'entrées du fluide']),
  inlet: Object.freeze(['entrée', 'entrées']),
  'media-outlet': Object.freeze(['sortie du fluide', 'sorties du fluide']),
  outlet: Object.freeze(['sortie', 'sorties']),
  'air-outlet': Object.freeze(['sortie d’air', 'sorties d’air']),
  'release-port': Object.freeze(['entrée de desserrage', 'entrées de desserrage']),
  'clamp-port': Object.freeze(['entrée de serrage', 'entrées de serrage']),
  'release-outlet': Object.freeze(['sortie de desserrage', 'sorties de desserrage']),
  'clamp-outlet': Object.freeze(['sortie de serrage', 'sorties de serrage']),
});

function uiFormatFrenchPortAnnotation(annotation, interfaceSize, depth, locationRole) {
  const localizedSize = interfaceSize.replace(/^Ø(?=\d)/u, 'Ø ');
  const countedRole = FRENCH_COUNTED_PORT_ROLES[annotation.role];
  if (countedRole) {
    return `${annotation.count} ${countedRole[annotation.count === 1 ? 0 : 1]} ${localizedSize}${depth}`;
  }
  const portNoun = annotation.count === 1 ? 'orifice' : 'orifices';
  return `${annotation.count} ${portNoun} ${localizedSize}${depth}, ${locationRole}`;
}

function uiFormatPorts(locale, model, ports) {
  if (ports.status === 'annotation-conflict') return uiPendingOutletCount(locale);
  if (ports.status === 'anomaly-unresolved') {
    return uiPhrase(locale, {
      en: 'Port thread is confirmed from the current model-specific drawing before fitting selection',
      de: 'Das Anschlussgewinde wird vor der Auswahl von Verschraubungen anhand der aktuellen modellspezifischen Zeichnung bestätigt',
      fr: 'Le filetage des orifices est confirmé sur le plan à jour propre au modèle avant le choix des raccords',
      ja: 'ポートねじは継手選定前に最新の型式専用図面で確認します',
      ru: 'Резьба портов подтверждается по актуальному чертежу конкретной модели до выбора фитингов',
    });
  }
  if (!Array.isArray(ports.annotations) || !ports.annotations.length) {
    throw new Error(`${model}: verified port contract has no annotations.`);
  }
  const roles = {
    en: { 'media-inlet': 'media inlet', inlet: 'inlet', 'media-outlet': 'media outlet', outlet: 'outlet', 'side-a': 'side A', 'side-b': 'side B', 'face-a': 'face A', 'face-b': 'face B', 'side-group': 'side port group', 'end-face-group': 'end-face port group', 'opposite-face': 'opposite-face port', 'air-port-group': 'air-port group', 'air-outlet': 'air outlet', 'release-port': 'release inlet', 'clamp-port': 'clamp inlet', 'release-outlet': 'release outlet', 'clamp-outlet': 'clamp outlet' },
    de: { 'media-inlet': 'Medieneingang', inlet: 'Eingang', 'media-outlet': 'Medienausgang', outlet: 'Ausgang', 'side-a': 'Seite A', 'side-b': 'Seite B', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B', 'side-group': 'seitliche Anschlussgruppe', 'end-face-group': 'stirnseitige Anschlussgruppe', 'opposite-face': 'Anschluss auf der Gegenseite', 'air-port-group': 'Luftanschlussgruppe', 'air-outlet': 'Luftausgang', 'release-port': 'Löseeingang', 'clamp-port': 'Klemmeingang', 'release-outlet': 'Löseausgang', 'clamp-outlet': 'Klemmausgang' },
    fr: { 'media-inlet': 'entrée du fluide', inlet: 'entrée', 'media-outlet': 'sortie du fluide', outlet: 'sortie', 'side-a': 'côté A', 'side-b': 'côté B', 'face-a': 'face A', 'face-b': 'face B', 'side-group': 'groupe d’orifices latéraux', 'end-face-group': 'groupe d’orifices en face', 'opposite-face': 'orifice sur la face opposée', 'air-port-group': 'groupe d’orifices d’air', 'air-outlet': 'sortie d’air', 'release-port': 'entrée de desserrage', 'clamp-port': 'entrée de serrage', 'release-outlet': 'sortie de desserrage', 'clamp-outlet': 'sortie de serrage' },
    ja: { 'media-inlet': '流体入口', inlet: '入口', 'media-outlet': '流体出口', outlet: '出口', 'side-a': 'A側', 'side-b': 'B側', 'face-a': 'A面', 'face-b': 'B面', 'side-group': '側面ポート群', 'end-face-group': '端面ポート群', 'opposite-face': '反対側ポート', 'air-port-group': '空気ポート群', 'air-outlet': '空気出口', 'release-port': '解除入口', 'clamp-port': 'クランプ入口', 'release-outlet': '解除出口', 'clamp-outlet': 'クランプ出口' },
    ru: { 'media-inlet': 'вход среды', inlet: 'вход', 'media-outlet': 'выход среды', outlet: 'выход', 'side-a': 'сторона A', 'side-b': 'сторона B', 'face-a': 'торец A', 'face-b': 'торец B', 'side-group': 'группа боковых портов', 'end-face-group': 'группа торцевых портов', 'opposite-face': 'порт на противоположном торце', 'air-port-group': 'группа воздушных портов', 'air-outlet': 'выход воздуха', 'release-port': 'вход разжима', 'clamp-port': 'вход зажима', 'release-outlet': 'выход разжима', 'clamp-outlet': 'выход зажима' },
  }[locale];
  const parts = ports.annotations.map((annotation) => {
    const role = roles[annotation.role];
    if (!role) throw new Error(`${model}: unsupported port role ${annotation.role}.`);
    const interfaceSize = annotation.thread
      ? localizedThread(locale, annotation.thread)
      : `Ø${localizedNumber(locale, annotation.diameterMm)} ${searchMillimeterUnit(locale)}`;
    const depth = annotation.depthMm === undefined ? '' : uiPhrase(locale, {
      en: `, depth ${localizedNumber(locale, annotation.depthMm)} mm`,
      de: `, Tiefe ${localizedNumber(locale, annotation.depthMm)} mm`,
      fr: `, profondeur ${localizedNumber(locale, annotation.depthMm)} mm`,
      ja: `、深さ${localizedNumber(locale, annotation.depthMm)} mm`,
      ru: `, глубина ${localizedNumber(locale, annotation.depthMm)} мм`,
    });
    if (locale === 'fr') {
      return uiFormatFrenchPortAnnotation(annotation, interfaceSize, depth, role);
    }
    return `${annotation.count} × ${interfaceSize}${depth} ${role}`;
  });
  let result = parts.join(' · ');
  if (ports.status === 'verified-threads-only') {
    result += uiPhrase(locale, {
      en: '; port functions are assigned in the confirmed drawing before production', de: '; Anschlussfunktionen werden in der bestätigten Zeichnung vor der Fertigung zugeordnet',
      fr: ' ; les fonctions des orifices sont définies sur le plan validé avant la production', ja: '（ポート機能は確定図面で生産前に割り当てます）', ru: '; функции портов назначаются в подтверждённом чертеже до производства',
    });
  }
  if (ports.status === 'verified-outlets-only') {
    result += uiPhrase(locale, {
      en: '; the air inlet is assigned in the confirmed drawing before production', de: '; der Lufteingang wird in der bestätigten Zeichnung vor der Fertigung zugeordnet',
      fr: ' ; l’entrée d’air est définie sur le plan validé avant la production', ja: '（空気入口は確定図面で生産前に割り当てます）', ru: '; вход воздуха назначается в подтверждённом чертеже до производства',
    });
  }
  return result;
}

function uiFormatPortsKey(locale, model, ports) {
  if (ports.status === 'annotation-conflict' || ports.status === 'anomaly-unresolved') {
    return uiFormatPorts(locale, model, ports);
  }
  const compactRoles = {
    en: { 'media-inlet': 'media in', inlet: 'in', 'media-outlet': 'media out', outlet: 'out', 'side-a': 'side A', 'side-b': 'side B', 'face-a': 'face A', 'face-b': 'face B', 'side-group': 'side', 'end-face-group': 'end face', 'opposite-face': 'opposite face', 'air-port-group': 'air', 'air-outlet': 'air out', 'release-port': 'release in', 'clamp-port': 'clamp in', 'release-outlet': 'release out', 'clamp-outlet': 'clamp out' },
    de: { 'media-inlet': 'Medieneingang', inlet: 'ein', 'media-outlet': 'Medienausgang', outlet: 'aus', 'side-a': 'Seite A', 'side-b': 'Seite B', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B', 'side-group': 'seitlich', 'end-face-group': 'stirnseitig', 'opposite-face': 'Gegenseite', 'air-port-group': 'Luft', 'air-outlet': 'Luft aus', 'release-port': 'Lösen ein', 'clamp-port': 'Klemmen ein', 'release-outlet': 'Lösen aus', 'clamp-outlet': 'Klemmen aus' },
    fr: { 'media-inlet': 'entrée fluide', inlet: 'entrée', 'media-outlet': 'sortie fluide', outlet: 'sortie', 'side-a': 'côté A', 'side-b': 'côté B', 'face-a': 'face A', 'face-b': 'face B', 'side-group': 'latéral', 'end-face-group': 'en face', 'opposite-face': 'face opposée', 'air-port-group': 'air', 'air-outlet': 'sortie d’air', 'release-port': 'entrée desserrage', 'clamp-port': 'entrée serrage', 'release-outlet': 'sortie desserrage', 'clamp-outlet': 'sortie serrage' },
    ja: { 'media-inlet': '流体入口', inlet: '入口', 'media-outlet': '流体出口', outlet: '出口', 'side-a': 'A側', 'side-b': 'B側', 'face-a': 'A面', 'face-b': 'B面', 'side-group': '側面', 'end-face-group': '端面', 'opposite-face': '反対面', 'air-port-group': '空気', 'air-outlet': '空気出口', 'release-port': '解除入口', 'clamp-port': 'クランプ入口', 'release-outlet': '解除出口', 'clamp-outlet': 'クランプ出口' },
    ru: { 'media-inlet': 'вход среды', inlet: 'вход', 'media-outlet': 'выход среды', outlet: 'выход', 'side-a': 'сторона A', 'side-b': 'сторона B', 'face-a': 'торец A', 'face-b': 'торец B', 'side-group': 'сбоку', 'end-face-group': 'на торце', 'opposite-face': 'противоположный торец', 'air-port-group': 'воздух', 'air-outlet': 'выход воздуха', 'release-port': 'разжим вход', 'clamp-port': 'зажим вход', 'release-outlet': 'разжим выход', 'clamp-outlet': 'зажим выход' },
  }[locale];
  const parts = ports.annotations.map((annotation) => {
    const size = annotation.thread
      ? localizedThread(locale, annotation.thread)
      : `Ø${localizedNumber(locale, annotation.diameterMm)} ${searchMillimeterUnit(locale)}`;
    const depth = annotation.depthMm === undefined ? '' : uiPhrase(locale, {
      en: `×${localizedNumber(locale, annotation.depthMm)} mm deep`,
      de: `, ${localizedNumber(locale, annotation.depthMm)} mm tief`,
      fr: `, profondeur ${localizedNumber(locale, annotation.depthMm)} mm`,
      ja: `、深さ${localizedNumber(locale, annotation.depthMm)} mm`,
      ru: `, глуб. ${localizedNumber(locale, annotation.depthMm)} мм`,
    });
    if (locale === 'fr') {
      return uiFormatFrenchPortAnnotation(annotation, size, depth, compactRoles[annotation.role]);
    }
    return `${annotation.count}×${size}${depth} ${compactRoles[annotation.role]}`;
  });
  let result = parts.join(' · ');
  if (ports.status === 'verified-threads-only') {
    result += uiPhrase(locale, {
      en: '; port functions are assigned from the customer circuit layout before production', de: '; Anschlussfunktionen werden anhand des Kundenkreisplans vor der Fertigung zugeordnet',
      fr: ' ; les fonctions des orifices sont définies avant la production selon le schéma du circuit client', ja: '（ポート機能はお客様の回路構成に基づき生産前に割り当てます）', ru: '; функции портов назначаются по схеме заказчика до производства',
    });
  }
  return result;
}

function uiMountingSide(locale, side) {
  const labels = {
    en: { stator: 'stator', rotor: 'rotor', 'face-a': 'face A', 'face-b': 'face B', body: 'body' },
    de: { stator: 'Stator', rotor: 'Rotor', 'face-a': 'Stirnseite A', 'face-b': 'Stirnseite B', body: 'Gehäuse' },
    fr: { stator: 'côté stator', rotor: 'côté rotor', 'face-a': 'face A', 'face-b': 'face B', body: 'corps' },
    ja: { stator: 'ステータ側', rotor: 'ロータ側', 'face-a': 'A面', 'face-b': 'B面', body: '本体' },
    ru: { stator: 'статор', rotor: 'ротор', 'face-a': 'торец A', 'face-b': 'торец B', body: 'корпус' },
  }[locale];
  if (!labels[side]) throw new Error(`Unsupported mounting side: ${side}`);
  return labels[side];
}

function uiMountingFeatureType(locale, feature) {
  const labels = {
    'through-hole': { en: ' through-hole', de: ' Durchgangsbohrung', fr: ' trou débouchant', ja: ' 貫通穴', ru: ' сквозное отверстие' },
    hole: { en: ' hole', de: ' Bohrung', fr: ' trou', ja: ' 穴', ru: ' отверстие' },
    'anti-rotation': { en: ' anti-rotation', de: ' Verdrehsicherung', fr: ' anti-rotation', ja: ' 回り止め', ru: ' против проворачивания' },
    'anti-rotation-set-screw': { en: ' anti-rotation set-screw', de: ' Gewindestift zur Verdrehsicherung', fr: ' vis de blocage anti-rotation', ja: ' 回り止め止めねじ', ru: ' установочный винт против проворачивания' },
  }[feature];
  if (!labels) throw new Error(`Unsupported mounting feature type: ${feature}`);
  return labels[locale];
}

function uiFormatFrenchMountingFeature(feature, side, size, depth) {
  const localizedSize = size.replace(/^Ø(?=\d)/u, 'Ø ');
  const nounByFeature = {
    'through-hole': feature.count === 1 ? 'trou débouchant' : 'trous débouchants',
    hole: feature.count === 1 ? 'trou' : 'trous',
    'anti-rotation': feature.count === 1 ? 'taraudage' : 'taraudages',
    'anti-rotation-set-screw': feature.count === 1 ? 'taraudage' : 'taraudages',
  };
  const noun = nounByFeature[feature.feature]
    || (feature.thread ? (feature.count === 1 ? 'taraudage' : 'taraudages') : (feature.count === 1 ? 'trou' : 'trous'));
  const purpose = feature.feature === 'anti-rotation'
    ? ', pour l’antirotation'
    : (feature.feature === 'anti-rotation-set-screw' ? ', pour la vis de blocage antirotation' : '');
  return `${side} : ${feature.count} ${noun} ${localizedSize}${depth}${purpose}`;
}

function uiFormatMountingFeature(locale, feature) {
  const side = uiMountingSide(locale, feature.side);
  const size = feature.thread
    ? localizedThread(locale, feature.thread)
    : (feature.diameterMm !== undefined
      ? `Ø${localizedNumber(locale, feature.diameterMm)} ${searchMillimeterUnit(locale)}`
      : null);
  if (!size) throw new Error(`Mounting feature on ${feature.side} has no thread or diameter.`);
  const depth = feature.depthMm === undefined ? '' : uiPhrase(locale, {
    en: `, depth ${localizedNumber(locale, feature.depthMm)} mm`,
    de: `, Tiefe ${localizedNumber(locale, feature.depthMm)} mm`,
    fr: `, profondeur ${localizedNumber(locale, feature.depthMm)} mm`,
    ja: `、深さ${localizedNumber(locale, feature.depthMm)} mm`,
    ru: `, глубина ${localizedNumber(locale, feature.depthMm)} мм`,
  });
  if (locale === 'fr') {
    return uiFormatFrenchMountingFeature(feature, side, size, depth);
  }
  const featureType = feature.feature ? uiMountingFeatureType(locale, feature.feature) : '';
  return `${side}${locale === 'fr' ? ' : ' : ': '}${feature.count} × ${size}${depth}${featureType}`;
}

function uiFormatMounting(locale, model, mounting) {
  if (mounting.status === 'not-separately-specified') {
    return uiPhrase(locale, {
      en: 'No separate mounting feature specified; media ports are not mounting holes',
      de: 'Keine separate Montageangabe; Medienanschlüsse sind keine Montagebohrungen',
      fr: 'Aucun élément de fixation distinct n’est spécifié ; les orifices du fluide ne sont pas des trous de fixation',
      ja: '独立した取付部の記載なし（流体ポートは取付穴ではありません）',
      ru: 'Отдельный монтажный элемент не указан; порты среды не являются монтажными отверстиями',
    });
  }
  if (mounting.status !== 'verified' || !Array.isArray(mounting.features) || !mounting.features.length) {
    throw new Error(`${model}: mounting facts are not publishable.`);
  }
  return mounting.features.map((feature) => uiFormatMountingFeature(locale, feature)).join(' · ');
}

function uiFormatMountingKey(locale, model, mounting) {
  if (mounting.status === 'not-separately-specified') {
    return uiPhrase(locale, {
      en: 'No separate mount specified', de: 'Keine separate Montageangabe',
      fr: 'Aucune fixation distincte spécifiée', ja: '独立した取付部の記載なし', ru: 'Отдельное крепление не указано',
    });
  }
  if (mounting.status !== 'verified') throw new Error(`${model}: mounting key is not publishable.`);
  return mounting.features.map((feature) => {
    const side = uiMountingSide(locale, feature.side);
    const size = feature.thread
      ? localizedThread(locale, feature.thread)
      : `Ø${localizedNumber(locale, feature.diameterMm)} ${searchMillimeterUnit(locale)}`;
    const depth = feature.depthMm === undefined ? '' : uiPhrase(locale, {
      en: `, ${localizedNumber(locale, feature.depthMm)} mm deep`,
      de: `, ${localizedNumber(locale, feature.depthMm)} mm tief`,
      fr: `, profondeur ${localizedNumber(locale, feature.depthMm)} mm`,
      ja: `、深さ${localizedNumber(locale, feature.depthMm)} mm`,
      ru: `, глуб. ${localizedNumber(locale, feature.depthMm)} мм`,
    });
    if (locale === 'fr') {
      return uiFormatFrenchMountingFeature(feature, side, size, depth);
    }
    return `${side} ${feature.count}×${size}${depth}`;
  }).join(' · ');
}

function uiFormatMountingSide(locale, model, mounting, side) {
  if (mounting.status === 'not-separately-specified') return uiFormatMounting(locale, model, mounting);
  const exact = mounting.features.filter((feature) => feature.side === side);
  if (exact.length) return exact.map((feature) => uiFormatMountingFeature(locale, feature)).join(' · ');
  return uiPhrase(locale, {
    en: 'See the approved drawing; the rotor/stator assignment is confirmed in the approved drawing before production',
    de: 'Siehe freigegebene Zeichnung; die Zuordnung der Stirnseiten zu Rotor und Stator wird in der freigegebenen Zeichnung vor der Fertigung bestätigt',
    fr: 'Voir le plan approuvé ; l’affectation rotor/stator est confirmée sur ce plan avant la production',
    ja: '承認図面を参照してください。ロータ／ステータの対応は承認図面で生産前に確定します',
    ru: 'См. согласованный чертёж: соответствие торцов ротору и статору подтверждается в согласованном чертеже до производства',
  });
}

function uiFormatEnvelope(locale, envelope) {
  if (envelope.status === 'drawing-audit-only') throw new Error('Audit-only envelope must not be formatted for publication.');
  const length = localizedNumber(locale, envelope.overallLengthMm);
  if (envelope.shape === 'cylindrical') {
    const diameter = localizedNumber(locale, envelope.maximumDiameterMm);
    return uiPhrase(locale, {
      en: `Maximum Ø${diameter} × ${length} mm overall`, de: `Max. Ø${diameter} × ${length} mm Gesamtlänge`,
      fr: `Ø${diameter} maximal × longueur hors tout ${length} mm`, ja: `最大Ø${diameter} × 全長${length} mm`, ru: `Макс. Ø${diameter} × общая длина ${length} мм`,
    });
  }
  if (envelope.shape === 'hex-body') {
    const width = localizedNumber(locale, envelope.maximumWidthMm);
    return uiPhrase(locale, {
      en: `Maximum width ${width} × ${length} mm overall`, de: `Max. Breite ${width} × ${length} mm Gesamtlänge`,
      fr: `Largeur maximale ${width} × longueur hors tout ${length} mm`, ja: `最大幅${width} × 全長${length} mm`, ru: `Макс. ширина ${width} × общая длина ${length} мм`,
    });
  }
  throw new Error(`Unsupported envelope shape: ${envelope.shape}`);
}

function uiFormatEnvelopeDiameter(locale, envelope) {
  if (envelope.shape !== 'cylindrical' || envelope.status === 'drawing-audit-only') return uiFormatEnvelope(locale, envelope);
  const diameter = localizedNumber(locale, envelope.maximumDiameterMm);
  return uiPhrase(locale, {
    en: `Maximum Ø${diameter} mm`, de: `Max. Ø${diameter} mm`, fr: `Ø${diameter} mm maximal`, ja: `最大Ø${diameter} mm`, ru: `Макс. Ø${diameter} мм`,
  });
}

function uiFormatBore(locale, bore) {
  const diameter = localizedNumber(locale, bore.diameterMm);
  return uiPhrase(locale, {
    en: `Ø${diameter} mm through bore`, de: `Durchgangsbohrung Ø${diameter} mm`,
    fr: `Alésage traversant Ø${diameter} mm`, ja: `貫通穴Ø${diameter} mm`, ru: `Сквозное отверстие Ø${diameter} мм`,
  });
}

function uiDetailedLimit(locale, value) {
  return value;
}

function uiPerformance(locale, pressure, speed) {
  return `${pressure} · ${speed}`;
}

function lowercaseInitial(value) {
  return value ? `${value[0].toLocaleLowerCase()}${value.slice(1)}` : value;
}

function appendUiClause(locale, sentence, clause) {
  const terminal = locale === 'ja' ? '。' : '.';
  const trimmed = sentence.trimEnd();
  const withoutTerminal = trimmed.endsWith(terminal) ? trimmed.slice(0, -terminal.length) : trimmed;
  if (locale === 'ja') return `${withoutTerminal}。${clause}${terminal}`;
  return `${withoutTerminal}; ${clause}${terminal}`;
}

function uiVerifiedPriceNote(locale, model, pressure, speed, media) {
  return uiPhrase(locale, {
    en: `${model}: ${pressure} · ${speed}; suitable media: ${lowercaseInitial(media)}. MOQ 1 pc.`,
    de: `${model}: ${pressure} · ${speed}; geeignete Medien: ${media}.`,
    fr: `${model} : ${pressure} · ${speed} ; fluides compatibles : ${lowercaseInitial(media)}. Quantité minimale : 1 pièce.`,
    ja: `${model}：${pressure}・${speed}、適用流体：${media}。`,
    ru: `${model}: ${pressure} · ${speed}; подходящая среда: ${lowercaseInitial(media)}.`,
  });
}

function uiIdentityPendingContract(locale, model) {
  const pending = uiPhrase(locale, {
    en: 'Application review required before selection',
    de: 'Anwendungsprüfung vor Auswahl erforderlich',
    fr: 'Validation de l’application requise avant la sélection',
    ja: '選定前に用途確認が必要',
    ru: 'Перед выбором требуется проверка применения',
  });
  const keyValues = {
    performance: uiPhrase(locale, {
      en: 'Send required working pressure and RPM',
      de: 'Betriebsdruck und Drehzahl angeben',
      fr: 'Indiquer la pression de service et la vitesse requises',
      ja: '使用圧力と回転数をお知らせください',
      ru: 'Укажите рабочее давление и частоту вращения',
    }),
    body: uiPhrase(locale, {
      en: 'State corrosion and environment requirements',
      de: 'Korrosions- und Umgebungsanforderungen angeben',
      fr: 'Indiquer les exigences de résistance à la corrosion et d’environnement',
      ja: '耐食性と使用環境の要件をお知らせください',
      ru: 'Укажите требования к коррозионной стойкости и условиям эксплуатации',
    }),
    seal: uiPhrase(locale, {
      en: 'Send operating temperature and duty cycle',
      de: 'Betriebstemperatur und Betriebszyklus angeben',
      fr: 'Indiquer la température de service et le cycle de fonctionnement',
      ja: '使用温度と運転サイクルをお知らせください',
      ru: 'Укажите рабочую температуру и режим работы',
    }),
    media: uiPhrase(locale, {
      en: 'Specify the operating medium',
      de: 'Betriebsmedium angeben',
      fr: 'Préciser le fluide de service',
      ja: '使用流体をお知らせください',
      ru: 'Укажите рабочую среду',
    }),
    mount: uiPhrase(locale, {
      en: 'Send interface dimensions or a machine drawing',
      de: 'Einbaumaße oder Maschinenzeichnung senden',
      fr: 'Envoyer les dimensions d’interface ou un plan de la machine',
      ja: '取付寸法または機械図面をお送りください',
      ru: 'Пришлите присоединительные размеры или чертёж машины',
    }),
  };
  const priceNote = uiPhrase(locale, {
    en: `${model} requires application review before selection. Send the medium, pressure, speed, mounting, and quantity, and request the current model-specific file before ordering.`,
    de: `${model} erfordert vor der Auswahl eine Anwendungsprüfung. Medium, Druck, Drehzahl, Montage und Menge senden und vor der Bestellung die aktuelle modellspezifische Datei anfordern.`,
    fr: `${model} nécessite une validation de l’application avant la sélection. Indiquez le fluide, la pression, la vitesse, la fixation et la quantité, puis demandez le fichier à jour propre au modèle avant de commander.`,
    ja: `${model}は選定前に用途確認が必要です。流体、圧力、回転数、取付け、数量をお知らせのうえ、発注前に現在の型式専用ファイルをご依頼ください。`,
    ru: `${model} требует проверки применения перед выбором. Сообщите среду, давление, скорость, монтаж и количество и запросите актуальный файл этой модели до заказа.`,
  });
  return {
    status: quarantineStatus,
    priceNote,
    structuredDescription: priceNote,
    mediaPortsPropertyName: uiPhrase(locale, { en: 'Media ports', de: 'Medienanschlüsse', fr: 'Orifices du fluide', ja: '流体ポート', ru: 'Порты рабочей среды' }),
    specificationLabels: {
      ports: uiPhrase(locale, { en: 'Port configuration', de: 'Medienanschlüsse', fr: 'Configuration des orifices', ja: '流体ポート', ru: 'Порты рабочей среды' }),
      bore: uiPhrase(locale, { en: 'Hollow bore diameter', de: 'Durchgangsbohrung', fr: 'Diamètre de l’alésage traversant', ja: '中空穴径', ru: 'Диаметр проходного отверстия' }),
    },
    fields: Object.fromEntries([
      'passages', 'pneumaticPassages', 'pressure', 'speed', 'media', 'body', 'seal', 'mount', 'thread', 'ports', 'rotor', 'stator',
      'temperature', 'weight', 'dimensions', 'bore', 'outerDiameter', 'electricalCircuits', 'voltage',
      'electricalContact', 'signalType', 'insulationResistance', 'dielectricStrength',
    ].map((field) => [field, pending])),
    keyValues: { ...keyValues, passages: uiPassagesMoq(locale, model), ports: pending },
    keyCategoryOverrides: {},
    keyCategoryLabels: { ports: uiPhrase(locale, { en: 'Ports', de: 'Anschlüsse', fr: 'Orifices', ja: 'ポート', ru: 'Порты' }) },
    productName: metadataHeading(locale, model, products[model]),
    hybridInterfacePropertyName: null,
    requiredJsonFields: [],
    jsonPropertyNames: uiJsonPropertyNames[locale],
    addMediaPortsProperty: false,
  };
}

export function drawingBackedUiContract(locale, model) {
  const product = products[model];
  if (!product) return null;
  localeCopy(locale);
  if (product.status === quarantineStatus) return uiIdentityPendingContract(locale, model);

  const facts = product.drawingFacts;
  const pressure = uiFormatPressure(locale, facts.maximumPressure);
  const speed = uiFormatSpeed(locale, facts.maximumSpeed);
  const body = uiFormatBody(locale, facts.bodyMaterial);
  const seal = uiFormatSeal(locale, facts.sealMaterials);
  const media = uiFormatMedia(locale, facts.media);
  const keyMedia = model === 'BP-2P-50-0001' && locale === 'fr'
    ? 'Fluide standard : air'
    : media;
  const ports = uiFormatPorts(locale, model, facts.ports);
  const mount = uiFormatMounting(locale, model, facts.mounting);
  const bore = facts.throughBore?.status === 'verified' ? uiFormatBore(locale, facts.throughBore) : null;
  const electrical = uiPhrase(locale, {
    en: 'Not listed; defined by the selected specification',
    de: 'Nicht angegeben; gemäß gewählter Spezifikation',
    fr: 'Non indiqué ; défini par la spécification retenue',
    ja: '記載なし。選定仕様による',
    ru: 'Не указано; по выбранной спецификации',
  });
  const channels = uiPhrase(locale, {
    en: '3 pneumatic passages · 6 electrical leads · 1 piece; circuit allocation and ratings per selected specification',
    de: '3 Pneumatikkanäle · 6 elektrische Leitungen · 1 Stück; Kreiszuordnung und Nennwerte gemäß gewählter Spezifikation',
    fr: '3 passages pneumatiques · 6 conducteurs électriques · 1 pièce ; affectation des circuits et caractéristiques nominales selon la spécification retenue',
    ja: '空圧3流路・電気リード6本・1個。回路割当と定格は選定仕様による',
    ru: '3 пневматических канала · 6 электрических выводов · 1 шт.; распределение цепей и номиналы по выбранной спецификации',
  });
  const s06PneumaticPassages = uiPhrase(locale, {
    en: '3 pneumatic passages; the inlet is assigned in the confirmed drawing before production',
    de: '3 Pneumatikkanäle; der Lufteingang wird in der bestätigten Zeichnung vor der Fertigung zugeordnet',
    fr: '3 passages pneumatiques ; l’entrée d’air est définie sur le plan validé avant la production',
    ja: '空圧3流路。空気入口は確定図面で生産前に割り当てます',
    ru: '3 пневматических канала; вход воздуха назначается в подтверждённом чертеже до производства',
  });
  let priceNote = uiVerifiedPriceNote(locale, model, pressure, speed, media);
  if (model === 'BP-3P-S06-0001') {
    priceNote += `${locale === 'ja' ? '' : ' '}${uiPhrase(locale, {
      en: 'Confirm circuit allocation and electrical ratings for the selected configuration.',
      de: 'Kreiszuordnung und elektrische Nennwerte für die gewählte Ausführung bestätigen.',
      fr: 'Confirmez l’affectation des circuits et les caractéristiques électriques nominales de la configuration retenue.',
      ja: '選定仕様の回路割当と電気定格を確認してください。',
      ru: 'Подтвердите распределение цепей и электрические номиналы для выбранного исполнения.',
    })}`;
  }
  if (model === 'BP-3P-0006') {
    priceNote = appendUiClause(locale, priceNote, uiPhrase(locale, {
      en: 'port thread is confirmed from the current model-specific drawing before fitting selection',
      de: 'das Anschlussgewinde wird vor der Auswahl von Verschraubungen anhand der aktuellen modellspezifischen Zeichnung bestätigt',
      fr: 'le filetage des orifices est confirmé sur le plan à jour propre au modèle avant le choix des raccords',
      ja: 'ポートねじは継手選定前に最新の型式専用図面で確認します',
      ru: 'резьба портов подтверждается по актуальному чертежу конкретной модели до выбора фитингов',
    }));
  }
  const fields = {
    pressure: uiDetailedLimit(locale, pressure),
    speed: uiDetailedLimit(locale, speed),
    media,
    body,
    seal,
    mount,
    thread: ports,
    ports,
    rotor: uiFormatMountingSide(locale, model, facts.mounting, 'rotor'),
    stator: uiFormatMountingSide(locale, model, facts.mounting, 'stator'),
    temperature: uiFormatTemperature(locale, facts.temperatureRange),
    weight: uiFormatWeight(locale, facts.weight),
    dimensions: uiFormatEnvelope(locale, facts.envelope),
    outerDiameter: uiFormatEnvelopeDiameter(locale, facts.envelope),
    ...(bore ? { bore } : {}),
    electricalCircuits: electrical,
    voltage: electrical,
    electricalContact: electrical,
    signalType: electrical,
    insulationResistance: electrical,
    dielectricStrength: electrical,
    ...(model === 'BP-3P-S06-0001' ? { pneumaticPassages: s06PneumaticPassages } : {}),
  };
  const requiredJsonFields = ['pressure', 'speed', 'media', 'body', 'seal', 'mount', 'ports', 'temperature', 'weight', 'dimensions'];
  if (bore) requiredJsonFields.push('bore');
  const structuredDescription = model === 'BP-2P-16-0001'
    ? `${priceNote} ${uiPhrase(locale, {
      en: 'A customer-authorized production application uses BP-2P-16-0001 to route compressed air through two independent passages for clamping and releasing a pneumatic three-jaw bottle-cap gripper.',
      de: 'Eine vom Kunden zur Veröffentlichung freigegebene Produktionsanwendung nutzt BP-2P-16-0001, um Druckluft durch zwei unabhängige Kanäle zum Spannen und Lösen eines pneumatischen Drei-Finger-Greifers für Flaschenverschlüsse zu führen.',
      fr: 'Une application de production dont la publication a été autorisée par le client utilise le BP-2P-16-0001 pour acheminer l’air comprimé par deux passages indépendants afin de serrer et desserrer un préhenseur pneumatique à trois mors pour bouchons de bouteilles.',
      ja: 'お客様から公開許可を得た量産用途では、BP-2P-16-0001が2つの独立流路を介して、ボトルキャップ用3爪エアチャックの把持・開放用圧縮空気を供給します。',
      ru: 'В производственном применении, разрешённом заказчиком к публикации, BP-2P-16-0001 подаёт сжатый воздух по двум независимым каналам для зажима и разжима трёхкулачкового пневматического захвата крышки бутылки.',
    })}`
    : priceNote;
  return {
    status: verifiedStatus,
    priceNote,
    structuredDescription,
    mediaPortsPropertyName: uiPhrase(locale, { en: 'Media ports', de: 'Medienanschlüsse', fr: 'Orifices du fluide', ja: '流体ポート', ru: 'Порты рабочей среды' }),
    specificationLabels: {
      ports: uiPhrase(locale, { en: 'Port configuration', de: 'Medienanschlüsse', fr: 'Configuration des orifices', ja: '流体ポート', ru: 'Порты рабочей среды' }),
      bore: uiPhrase(locale, { en: 'Hollow bore diameter', de: 'Durchgangsbohrung', fr: 'Diamètre de l’alésage traversant', ja: '中空穴径', ru: 'Диаметр проходного отверстия' }),
    },
    fields,
    keyValues: {
      performance: uiPerformance(locale, pressure, speed), body, seal, passages: uiPassagesMoq(locale, model), media: keyMedia,
      mount: uiFormatMountingKey(locale, model, facts.mounting),
      ports: uiFormatPortsKey(locale, model, facts.ports),
      ...(model === 'BP-3P-S06-0001' ? { channels } : {}),
    },
    keyCategoryOverrides: uiPortCategoryModels.has(model) ? { mount: 'ports' } : {},
    keyCategoryLabels: { ports: uiPhrase(locale, { en: 'Ports', de: 'Anschlüsse', fr: 'Orifices', ja: 'ポート', ru: 'Порты' }) },
    productName: metadataHeading(locale, model, product),
    hybridInterfacePropertyName: model === 'BP-3P-S06-0001'
      ? uiPhrase(locale, {
        en: 'Pneumatic / electrical interface', de: 'Pneumatische / elektrische Schnittstelle',
        fr: 'Interface pneumatique / électrique', ja: '空圧／電気インターフェース', ru: 'Пневматический / электрический интерфейс',
      })
      : null,
    requiredJsonFields,
    jsonPropertyNames: uiJsonPropertyNames[locale],
    addMediaPortsProperty: false,
  };
}

function verifiedParts(locale, model, product) {
  const localized = localeCopy(locale);
  const facts = product.drawingFacts;
  const passages = passageCountForModel(model);
  const { inlets, outlets } = inletOutletCounts(facts);
  const requiredFacts = [facts.maximumPressure, facts.maximumSpeed, facts.weight];
  if (requiredFacts.some((fact) => fact?.value === undefined)) {
    throw new Error(`${model}: a required drawing-backed numeric fact is missing.`);
  }
  const core = [
    localized.pressure(localizedNumber(locale, facts.maximumPressure.value)),
    localized.speed(localizedNumber(locale, facts.maximumSpeed.value)),
    localized.temperature(
      localizedNumber(locale, facts.temperatureRange.minimum),
      localizedNumber(locale, facts.temperatureRange.maximum),
    ),
    localized.weight(localizedWeightNumber(locale, facts.weight.value)),
    bodyKeyword(locale, facts.bodyMaterial),
    sealKeyword(locale, facts.sealMaterials),
    mediaKeyword(locale, facts.media),
  ];
  return {
    passages,
    inlets,
    outlets,
    passage: passageKeyword(locale, passages, inlets, outlets),
    descriptor: productDescriptor(locale, model, passages, inlets, outlets),
    core,
    ports: portKeywords(locale, model, facts),
    mounting: mountingKeywords(locale, facts),
    dimensions: dimensionKeywords(locale, facts),
  };
}

function uniqueKeywords(values) {
  const keywords = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (keywords.some((value) => /\p{Extended_Pictographic}|[$€¥]|\b(?:price|compare|comparison|Preis|Vergleich|prix|comparer|comparaison|цена|сравнен)|価格|比較/iu.test(value))) {
    throw new Error('Drawing-backed product keywords contain a prohibited commercial or comparison term.');
  }
  return keywords;
}

export function drawingBackedProductKeywords(locale, model) {
  const product = products[model];
  if (!product) return null;
  const localized = localeCopy(locale);
  if (product.status === quarantineStatus) {
    return [model, localized.productType, localized.verifiedDrawingRequired];
  }
  const parts = verifiedParts(locale, model, product);
  const electricalBoundary = model === 'BP-3P-S06-0001' ? [localized.electricalLeadsBoundary] : [];
  const leadingPorts = model === 'BP-3P-S06-0001' ? parts.ports.slice(0, 1) : [];
  const remainingPorts = model === 'BP-3P-S06-0001' ? parts.ports.slice(1) : parts.ports;
  return uniqueKeywords([
    model,
    productTypeKeyword(locale, model),
    parts.passage,
    ...electricalBoundary,
    ...leadingPorts,
    ...parts.core.slice(0, 2),
    ...remainingPorts,
    ...parts.mounting,
    ...parts.dimensions,
    ...parts.core.slice(2),
    productTypeSearchSynonym(locale),
  ]);
}

export function drawingBackedProductSummary(locale, model) {
  const product = products[model];
  if (!product) return null;
  const localized = localeCopy(locale);
  if (product.status === quarantineStatus) {
    if (locale === 'en') return `${model} is a ${localized.productType}; application review is required before selection.`;
    if (locale === 'de') return `${model} ist eine ${localized.productType}; vor der Auswahl ist eine Anwendungsprüfung erforderlich.`;
    if (locale === 'fr') return `${model} est un ${localized.productType} ; une validation de l’application est requise avant la sélection.`;
    if (locale === 'ja') return `${model}は${localized.productType}です。選定前に用途確認が必要です。`;
    if (locale === 'ru') return `${model} — ${localized.productType}; перед выбором требуется проверка применения.`;
    throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
  }
  const parts = verifiedParts(locale, model, product);
  const semicolonSeparator = locale === 'fr' ? '\u00a0; ' : '; ';
  const colonSeparator = locale === 'fr' ? '\u00a0: ' : ': ';
  const portText = parts.ports.length ? parts.ports.join(locale === 'ja' ? '・' : semicolonSeparator) : '';
  const pendingPortBoundary = model === 'BP-3P-0006';
  const portClause = !portText
    ? ''
    : pendingPortBoundary
        ? `${semicolonSeparator}${portText}`
      : `${semicolonSeparator}${localized.verifiedPorts}${colonSeparator}${portText}`;
  const electricalBoundary = model === 'BP-3P-S06-0001' ? `${semicolonSeparator}${localized.electricalLeadsBoundary}` : '';
  if (locale === 'en') {
    const article = /^8(?:-|\s)/.test(parts.descriptor) ? 'an' : 'a';
    return `${model} is ${article} ${parts.descriptor}. Published values: ${parts.core.join(', ')}${portClause}${electricalBoundary}.`;
  }
  if (locale === 'de') {
    return `${model} ist eine ${parts.descriptor}. Veröffentlichte Werte: ${parts.core.join(', ')}${portClause}${electricalBoundary}.`;
  }
  if (locale === 'fr') {
    return `${model} est un ${parts.descriptor}. Valeurs publiées : ${parts.core.join(', ')}${portClause}${electricalBoundary}.`;
  }
  if (locale === 'ja') {
    const japanesePortClause = !portText
      ? ''
      : pendingPortBoundary
        ? `。${portText}`
        : `。${localized.verifiedPorts}：${portText}`;
    const japaneseElectricalBoundary = model === 'BP-3P-S06-0001' ? `。${localized.electricalLeadsBoundary}` : '';
    return `${model}は${parts.descriptor}です。公開値：${parts.core.join('、')}${japanesePortClause}${japaneseElectricalBoundary}。`;
  }
  if (locale === 'ru') return `${model} — ${parts.descriptor}. Опубликованные значения: ${parts.core.join(', ')}${portClause}${electricalBoundary}.`;
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

export function drawingBackedProductLinkLabel(locale, model) {
  const product = products[model];
  if (!product) return null;
  const localized = localeCopy(locale);
  if (product.status === quarantineStatus) {
    return `${model} — ${localized.productType} — ${localized.verifiedDrawingRequired}`;
  }
  return `${model} — ${productDescriptor(locale, model, passageCountForModel(model))}`;
}

function metadataHeading(locale, model, product) {
  if (product.status === quarantineStatus) {
    return uiPhrase(locale, {
      en: `${model} Pneumatic Rotary Union`,
      de: `${model} Pneumatik-Drehdurchführung`,
      fr: `${model} raccord tournant pneumatique`,
      ja: `${model} 空圧ロータリージョイント`,
      ru: `${model} пневматическое вращающееся соединение`,
    });
  }
  const passages = passageCountForModel(model);
  if (model === 'BP-3P-S06-0001') {
    return uiPhrase(locale, {
      en: `${model} ${passages}-Passage Pneumatic-Electrical Rotary Union`,
      de: `${model} ${passages}-Kanal-Pneumatik-Elektro-Drehdurchführung`,
      fr: `${model} raccord tournant pneumatique-électrique à ${passages} passages`,
      ja: `${model} ${passages}流路 空圧・電気複合ロータリージョイント`,
      ru: `${model} ${passages}-канальное пневмоэлектрическое вращающееся соединение`,
    });
  }
  if (model === 'BP-2P-95-0005') {
    return uiPhrase(locale, {
      en: `${model} 2-Passage 2-in / 4-out Pneumatic Rotary Union`,
      de: `${model} 2-Kanal-Drehdurchführung 2/4 Ausgänge`,
      fr: `${model} raccord tournant pneumatique à 2 passages, 2 entrées / 4 sorties`,
      ja: `${model} 2流路 2入力4出力 空圧ロータリージョイント`,
      ru: `${model} 2-канальное вращающееся соединение 2/4 выхода`,
    });
  }
  return uiPhrase(locale, {
    en: `${model} ${passages}-Passage Pneumatic Rotary Union`,
    de: `${model} pneumatische ${passages}-Kanal-Drehdurchführung`,
    fr: `${model} raccord tournant pneumatique à ${passages} ${passages === 1 ? 'passage' : 'passages'}`,
    ja: `${model} ${passages}流路 空圧ロータリージョイント`,
    ru: `${model} ${passages}-канальное пневматическое вращающееся соединение`,
  });
}

function metadataMedia(locale, media) {
  const values = media.map((medium) => mediaTerms[locale][medium]);
  if (values.some((value) => !value)) throw new Error(`${locale}: unsupported metadata medium.`);
  if (locale === 'en') return values.length === 1 ? values[0] : `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
  if (locale === 'de') return values.length === 1 ? values[0] : `${values.slice(0, -1).join(', ')} und ${values.at(-1)}`;
  if (locale === 'fr') return values.length === 1 ? values[0] : `${values.slice(0, -1).join(', ')} et ${values.at(-1)}`;
  if (locale === 'ja') return values.join('・');
  if (locale === 'ru') return values.join(', ');
  throw new Error(`Unsupported drawing-backed product locale: ${locale}`);
}

function verifiedMetadataDescription(locale, model, product, heading) {
  const facts = product.drawingFacts;
  const pressure = uiFormatPressure(locale, facts.maximumPressure);
  const speed = localizedNumber(locale, facts.maximumSpeed.value);
  const media = metadataMedia(locale, facts.media);
  const germanMediaLabel = facts.media.length === 1 ? 'Medium' : 'Medien';
  const russianMediaLabel = facts.media.length === 1 ? 'среда' : 'среды';

  let baseDescription;
  if (model === 'BP-3P-0006') {
    baseDescription = uiPhrase(locale, {
      en: `${heading}. ${pressure}, ${speed} RPM; suitable medium: ${media}. Confirm the port thread before fittings.`,
      de: `${heading}. ${pressure}, ${speed} min⁻¹; Medium: ${media}. Anschlussgewinde vor Fittingwahl bestätigen.`,
      fr: `${heading}. ${pressure}, ${speed} tr/min ; fluide compatible : ${media}. Confirmer le filetage des orifices avant de choisir les raccords.`,
      ja: `${heading}。${pressure}、${speed} min⁻¹。適用流体：${media}。ポートねじは選定前に確認。`,
      ru: `${heading}. ${pressure}, ${speed} об/мин; среда: ${media}. Резьбу портов подтвердить до фитингов.`,
    });
  } else if (model === 'BP-3P-S06-0001') {
    baseDescription = uiPhrase(locale, {
      en: `${model} pneumatic-electric rotary union. ${pressure}, ${speed} RPM; medium: ${media}; six electrical leads, ratings per specification.`,
      de: `${heading}. ${pressure}, ${speed} min⁻¹; Medium ${media}; sechs elektrische Leitungen, Nennwerte gemäß Spezifikation.`,
      fr: `${heading}. ${pressure}, ${speed} tr/min ; fluide : ${media} ; six conducteurs électriques, caractéristiques nominales selon la spécification.`,
      ja: `${heading}。${pressure}、${speed} min⁻¹。流体は${media}、電気リード6本。定格は仕様書。`,
      ru: `${heading}. ${pressure}, ${speed} об/мин; среда ${media}; шесть электровыводов, номиналы по спецификации.`,
    });
  } else if (model === 'BP-2P-95-0005') {
    baseDescription = uiPhrase(locale, {
      en: `${heading}. 2-in/4-out clamp and release. ${pressure} · ${speed} RPM; media: ${media}.`,
      de: `${heading}. 2 Ein-/4 Ausgänge für Spannen/Lösen. ${pressure} · ${speed} min⁻¹; Medien: ${media}.`,
      fr: `${heading}. 2 entrées / 4 sorties pour serrage et desserrage. ${pressure} · ${speed} tr/min ; fluides : ${media}.`,
      ja: `${heading}。クランプ／リリース用2入力4出力。${pressure}・${speed} min⁻¹、流体：${media}。`,
      ru: `${heading}. 2 входа / 4 выхода, зажим/разжим. ${pressure} · ${speed} об/мин; среда: ${media}.`,
    });
  } else {
    baseDescription = uiPhrase(locale, {
      en: `${heading}. ${pressure} · ${speed} RPM; suitable media: ${media}.`,
      de: `${heading}. ${pressure} · ${speed} min⁻¹; geeignete Medien: ${media}.`,
      fr: `${heading}. ${pressure} · ${speed} tr/min ; fluides compatibles : ${media}.`,
      ja: `${heading}。${pressure}・${speed} min⁻¹、適用流体：${media}。`,
      ru: `${heading}. ${pressure} · ${speed} об/мин; подходящая среда: ${media}.`,
    });
  }
  if (drawingBackedPublicStep(locale, model)) {
    const hook = STEP_META_DOWNLOAD_HOOK[locale];
    const maxLength = metadataLengthRanges[locale]?.descriptionMax;
    if (maxLength && baseDescription.length + hook.length <= maxLength) {
      return `${baseDescription}${hook}`;
    }
  }
  return baseDescription;
}

function pendingIdentityMetadataDescription(locale, model, heading) {
  return uiPhrase(locale, {
    en: `${heading}. Application review is required before selection or ordering; send the medium, pressure, speed, mounting, and quantity.`,
    de: `${heading}. Vor Auswahl oder Bestellung ist eine Anwendungsprüfung erforderlich; Medium, Druck, Drehzahl, Montage und Menge senden.`,
    fr: `${heading}. Une validation de l’application est requise avant la sélection ou la commande ; indiquez le fluide, la pression, la vitesse, la fixation et la quantité.`,
    ja: `${heading}。選定・発注前に用途確認が必要です。流体、圧力、回転数、取付け、数量をお知らせください。`,
    ru: `${heading}. Перед выбором или заказом требуется проверка применения; укажите среду, давление, скорость, монтаж и количество.`,
  });
}

export function drawingBackedProductMetadata(locale, model) {
  const product = products[model];
  if (!product) return null;
  localeCopy(locale);
  const h1 = metadataHeading(locale, model, product);
  const description = product.status === quarantineStatus
    ? pendingIdentityMetadataDescription(locale, model, h1)
    : verifiedMetadataDescription(locale, model, product, h1);
  const title = `${h1} | Begapunk`;
  return Object.freeze({
    title,
    description,
    h1,
    breadcrumb: h1,
    imageAlt: h1,
    linkLabel: h1,
    openGraphTitle: title,
    openGraphDescription: description,
    openGraphImageAlt: h1,
    twitterTitle: title,
    twitterDescription: description,
    twitterImageAlt: h1,
  });
}

export function assertDrawingBackedProductRecordCoverage(records, context = 'search index') {
  const counts = new Map(drawingBackedProductModels.map((model) => [model, 0]));
  for (const record of records) {
    if (!counts.has(record.id)) continue;
    counts.set(record.id, counts.get(record.id) + 1);
    if (record.url !== `${record.id}.html`) {
      throw new Error(`${context}: ${record.id} must use its model-specific product URL.`);
    }
  }
  const missing = [...counts].filter(([, count]) => count === 0).map(([model]) => model);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([model]) => model);
  if (missing.length || duplicates.length) {
    throw new Error(`${context}: drawing-backed product coverage mismatch; missing=${missing.join(',') || 'none'}; duplicates=${duplicates.join(',') || 'none'}.`);
  }
}

const metadataLengthRanges = {
  en: { titleMax: 70, descriptionMin: 75, descriptionMax: 190 },
  de: { titleMax: 80, descriptionMin: 85, descriptionMax: 200 },
  fr: { titleMax: 100, descriptionMin: 90, descriptionMax: 240 },
  ja: { titleMax: 50, descriptionMin: 45, descriptionMax: 120 },
  ru: { titleMax: 85, descriptionMin: 100, descriptionMax: 205 },
};

for (const locale of Object.keys(copy)) {
  for (const model of drawingBackedProductModels) {
    const keywords = drawingBackedProductKeywords(locale, model);
    const summary = drawingBackedProductSummary(locale, model);
    const linkLabel = drawingBackedProductLinkLabel(locale, model);
    const metadata = drawingBackedProductMetadata(locale, model);
    const uiContract = drawingBackedUiContract(locale, model);
    if (!keywords?.length || !summary || !linkLabel || !uiContract?.priceNote
      || !uiContract.structuredDescription || !uiContract.fields || !uiContract.keyValues) {
      throw new Error(`${locale}/${model}: drawing-backed text or UI generation is incomplete.`);
    }
    if (uiContract.keyValues.passages !== uiPassagesMoq(locale, model)
      || /\bindependent\b/iu.test(uiContract.keyValues.passages)) {
      throw new Error(`${locale}/${model}: first-view passages/MOQ value is missing or overstates passage topology.`);
    }
    if (!metadata || metadata.title !== `${metadata.h1} | Begapunk`
      || metadata.breadcrumb !== metadata.h1 || metadata.imageAlt !== metadata.h1
      || metadata.linkLabel !== metadata.h1 || metadata.openGraphDescription !== metadata.description
      || metadata.twitterDescription !== metadata.description || metadata.openGraphImageAlt !== metadata.imageAlt
      || metadata.twitterImageAlt !== metadata.imageAlt) {
      throw new Error(`${locale}/${model}: drawing-backed metadata contract is incomplete or internally inconsistent.`);
    }
    const metadataLengths = metadataLengthRanges[locale];
    if (metadata.title.length > metadataLengths.titleMax
      || metadata.description.length < metadataLengths.descriptionMin
      || metadata.description.length > metadataLengths.descriptionMax) {
      throw new Error(`${locale}/${model}: drawing-backed metadata length ${metadata.description.length} is outside ${metadataLengths.descriptionMin}-${metadataLengths.descriptionMax}.`);
    }
    if (identityPendingModels.has(model) && keywords.length !== 3) {
      throw new Error(`${locale}/${model}: identity-pending keywords must contain exactly model, product type, and drawing boundary.`);
    }
    if (identityPendingModels.has(model)) {
      const boundary = uiPhrase(locale, {
        en: 'Application review', de: 'Anwendungsprüfung',
        fr: 'validation de l’application', ja: '用途確認', ru: 'проверка применения',
      });
      if (!metadata.description.includes(boundary)) {
        throw new Error(`${locale}/${model}: identity-pending metadata omits the drawing-verification boundary.`);
      }
      if (uiContract.requiredJsonFields.length !== 0 || uiContract.hybridInterfacePropertyName !== null) {
        throw new Error(`${locale}/${model}: identity-pending Product JSON-LD must not publish pseudo technical properties.`);
      }
    }
    if (!identityPendingModels.has(model) && !keywords.includes(productTypeSearchSynonym(locale))) {
      throw new Error(`${locale}/${model}: verified keywords lack the localized rotary-union search synonym.`);
    }
    if (model === 'BP-3P-0006' && [keywords.join(' '), summary, linkLabel, JSON.stringify(metadata)].some((value) => /G4\/1|G1\/4/.test(value))) {
      throw new Error(`${locale}/${model}: unresolved or normalized port text must not be published.`);
    }
    if (model === 'BP-1P-0006') {
      const surfaces = [keywords.join(' '), summary, linkLabel, JSON.stringify(uiContract), JSON.stringify(metadata)];
      if (!uiContract.fields.ports.includes('8')
        || !surfaces.some((value) => /8\s*(?:×|-)?\s*G1\/8|8[ -]?(?:outlet|Ausg(?:ang|änge)|sortie|出口|выход)/iu.test(value))) {
        throw new Error(`${locale}/${model}: owner-confirmed eight-outlet drawing fact is missing from generated surfaces.`);
      }
    }
    if (model === 'BP-1P-0003') {
      const expectedThread = localizedThread(locale, 'M10x1.5');
      const uiSurfaces = [uiContract.fields.ports, uiContract.keyValues.ports];
      if (uiSurfaces.some((value) => !value.includes(expectedThread) || value.includes('M10x1.5'))) {
        throw new Error(`${locale}/${model}: UI or structured-data thread notation is not localized.`);
      }
    }
    if (model === 'BP-3P-S06-0001') {
      const s06Ports = verifiedParts(locale, model, products[model]).ports;
      const moqMarker = { en: '1 piece', de: '1 Stück', fr: '1 pièce', ja: '1個', ru: '1 шт.' }[locale];
      const metadataBoundaries = {
        en: ['six electrical leads', 'ratings per specification'],
        de: ['sechs elektrische Leitungen', 'gemäß Spezifikation'],
        fr: ['six conducteurs électriques', 'selon la spécification'],
        ja: ['電気リード6本', '仕様書'],
        ru: ['шесть электровыводов', 'по спецификации'],
      }[locale];
      if (!summary.includes(localeCopy(locale).electricalLeadsBoundary)
        || linkLabel.includes(localeCopy(locale).electricalLeadsBoundary)
        || uiContract.keyValues.channels.includes('6 circuits')
        || !uiContract.keyValues.channels.includes(moqMarker)
        || metadataBoundaries.some((boundary) => !metadata.description.includes(boundary))
        || !s06Ports.some((value) => keywords.slice(0, 6).includes(value))) {
        throw new Error(`${locale}/${model}: hybrid electrical evidence boundary is inconsistent.`);
      }
    } else if (Object.hasOwn(uiContract.keyValues, 'channels')) {
      throw new Error(`${locale}/${model}: hybrid channel text leaked into a non-hybrid product contract.`);
    }
    if (products[model].status === verifiedStatus) {
      const parts = verifiedParts(locale, model, products[model]);
      const firstNonInterface = Math.min(
        ...parts.core.slice(2).map((value) => keywords.indexOf(value)).filter((index) => index >= 0),
      );
      for (const value of [...parts.ports, ...parts.mounting, ...parts.dimensions]) {
        if (keywords.indexOf(value) >= firstNonInterface) {
          throw new Error(`${locale}/${model}: drawing interface keywords must precede weight/body/search-detail terms.`);
        }
      }
    }
  }
}
