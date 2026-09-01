#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import {
  drawingBackedCanonicalField,
  drawingBackedProductKeywords,
  drawingBackedProductLinkLabel,
  drawingBackedProductMetadata,
  drawingBackedProductSummary,
  drawingBackedUiContract
} from "./lib/drawing-backed-product-facts.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const manifestPath = path.join(repositoryRoot, "data", "product-drawing-facts.json");
const downloadsRoot = path.join(repositoryRoot, "downloads");

const locales = [
  { code: "en", directory: "", searchIndex: "search-index.json" },
  { code: "de", directory: "de", searchIndex: path.join("de", "search-index.json") },
  { code: "ja", directory: "ja", searchIndex: path.join("ja", "search-index.json") },
  { code: "ru", directory: "ru", searchIndex: path.join("ru", "search-index.json") }
];

const bp1p0006PublicSurfaceContract = {
  en: {
    cardTitle: "BP-1P-0006 · 1-Inlet/8-Outlet (G1/8)",
    cardSpec: "1-In 8-Out",
    imageAlt: "BP-1P-0006 1-in-8-out 4mm orifice G1/8 threaded rotary joint AL6061",
    comparison: "1-in-8-out, 4 mm orifice",
    retiredPattern: /(?:1-in-6-out|1-Inlet\/6-Outlet|1-In 6-Out)/i
  },
  de: {
    cardTitle: "BP-1P-0006 · 1-zu-8 (G1/8)",
    cardSpec: "1 Eingang / 8 Ausgänge",
    imageAlt: "BP-1P-0006 Drehdurchführung mit 1 Eingang, 8 Ausgängen, 4-mm-Durchlass und G1/8-Gewinde aus Aluminium 6061",
    comparison: "1 Einlass / 8 Auslässe, 4 mm Durchlass",
    retiredPattern: /(?:1-zu-6|1 (?:Eingang|Einlass)\s*\/\s*6 Ausg)/iu
  },
  ja: {
    cardTitle: "BP-1P-0006・1入力8出力(G1/8)",
    cardSpec: "1入力・8出力",
    imageAlt: "BP-1P-0006 1入力8出力・オリフィス径4 mm・G1/8ねじ・AL6061製ロータリージョイント",
    comparison: "1入口／8出口・オリフィス径4 mm",
    retiredPattern: /1(?:入力|入口)[・／]?6(?:出力|出口)/u
  },
  ru: {
    cardTitle: "BP-1P-0006 · 1 вход / 8 выходов (G1/8)",
    cardSpec: "1 вход / 8 выходов",
    imageAlt: "BP-1P-0006 вращающееся соединение из алюминия 6061 с 1 входом, 8 выходами, проходом 4 мм и резьбой G1/8",
    comparison: "1 вход / 8 выходов, отверстие 4 мм",
    retiredPattern: /1 вход\s*\/\s*6 выход/iu
  }
};

const labelPatterns = {
  pressure: /pressure|druck|圧力|давлен/iu,
  speed: /speed|drehzahl|回転(?:数|速度)|скорост|частот.*вращ/iu,
  material: /body\s*material|housing\s*material|gehäuse(?:werkstoff|material)|werkstoff.*gehäuse|本体材質|ボディ材質|材料.*本体|материал.*корпус|корпус.*материал/iu,
  seal: /seal|dicht|シール|уплот/iu,
  media: /compatible\s*media|suitable\s*media|operating\s*media|medium|media|betriebsmedien|betriebsmedium|geeignete\s*medien|使用可能流体|対応流体|使用流体|媒体|рабочая\s*сред|совместим.*сред/iu,
  temperature: /temperature|temperatur|温度|температур/iu,
  weight: /weight|gewicht|質量|重量|вес|масса/iu,
  dimensions: /dimension|envelope|overall\s*size|abmess|bauma(?:ß|ss)|寸法|外形|габарит|размер/iu,
  bore: /through[\s-]*bore|\bbore\b|durchgang|bohrung|中空|貫通|穴径|сквозн|проходн.*отверст/iu,
  mounting: /mount|mounting|montage|befestig|取付|取り付け|マウント|креплен|монтаж/iu,
  ports: /process\s*port|media\s*(?:inlet|outlet)|port\s*(?:configuration|thread|size)|\bports?\b|medienanschl(?:uss|üsse?)|anschl(?:uss|üsse?)gewinde|ポート|流体接続|接続ねじ|通気口|吸気口|排気口|порт|присоедин.*резьб/iu
};

const pendingDrawingPatterns = {
  en: /application review|required.*model-specific file|current model-specific file/iu,
  de: /Anwendungsprüfung|aktuelle modellspezifische Datei|modellspezifische Datei/iu,
  ja: /用途確認|型式専用ファイル/iu,
  ru: /проверка применения|актуальн.*файл.*модел|файл.*конкретн.*модел/iu
};

const pendingPortPattern = /pending|unresolved|clarif|confirm(?:ation|ed)? required|confirmed from the current model-specific drawing|to be confirmed|not listed|application review|aussteh|offen|nicht angegeben|ungeklärt|klär|bestätig|Anwendungsprüfung|確認します|待確認|確認待ち|要確認|確認中|未確定|記載されていません|用途確認|уточн|не указан|не определен|не подтвержд|требует подтвержд|ожидает подтвержд|должн\p{L}*\s+быть\s+подтвержд|подтвержда|подтверд|провер/iu;
const pendingOutletCountPatterns = {
  en: /outlet count.*(?:pending|confirm|not listed|current.*drawing)/iu,
  de: /ausgangs(?:an)?zahl.*(?:aussteh|offen|nicht angegeben|klär|bestätig|zeichnung)/iu,
  ja: /出口数.*(?:確認待ち|要確認|確認中|未確定|記載されていません|型式専用図面)/iu,
  ru: /количеств.*выход.*(?:уточн|подтвержд|провер|не указан|черт[её]ж)/iu
};
const warrantyLabels = {
  en: "Warranty period",
  de: "Garantiezeitraum",
  ja: "保証期間",
  ru: "Гарантийный срок"
};
const unsupportedSealPattern = /\bfkm\b|\bviton\b|\bnbr\b|\bepdm\b|\bpeek\b|graphite|graphit|グラファイト|графит/iu;

const failures = [];
const checked = {
  pdfs: 0,
  pages: 0,
  searchIndexes: 0,
  searchProductRecords: 0,
  llmsFiles: 0,
  llmsConflictRecords: 0
};

function addFailure(code, context, message) {
  failures.push({ code, context, message });
}

function readUtf8(filePath, context) {
  if (!existsSync(filePath)) {
    addFailure("missing-file", context, `Missing file: ${path.relative(repositoryRoot, filePath)}`);
    return null;
  }

  try {
    return readFileSync(filePath, "utf8");
  } catch (error) {
    addFailure("read-error", context, error.message);
    return null;
  }
}

function decodeKnownEntities(value) {
  return String(value ?? "")
    .replace(/&Oslash;|&#216;|&#xD8;/giu, "Ø")
    .replace(/&oslash;|&#248;|&#xF8;/giu, "ø")
    .replace(/&times;/giu, "×")
    .replace(/&deg;/giu, "°")
    .replace(/&middot;/giu, "·")
    .replace(/&amp;/giu, "&");
}

function normalizeText(value) {
  return decodeKnownEntities(value)
    .normalize("NFKC")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

function compactTechnicalText(value) {
  return normalizeText(value)
    .replace(/(?<=\d),(?=\d)/gu, ".")
    .replace(/[×*·]/gu, "x")
    .replace(/\s+/gu, "");
}

function parseSimpleNumber(value) {
  const normalized = String(value).replace(/\s+/gu, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractNumbers(value) {
  const matches = normalizeText(value).match(/[-+]?\d+(?:[.,]\d+)?/gu) ?? [];
  return matches
    .map(parseSimpleNumber)
    .filter((number) => number !== null);
}

function hasNumber(value, expected, tolerance = 0.005) {
  return extractNumbers(value).some((number) => Math.abs(number - expected) <= tolerance);
}

function extractUnitValues(value, unitPattern) {
  const normalized = normalizeText(value);
  const expression = new RegExp(`([-+]?\\d+(?:[.,]\\d+)?)\\s*(?:${unitPattern})`, "giu");
  return [...normalized.matchAll(expression)]
    .map((match) => parseSimpleNumber(match[1]))
    .filter((number) => number !== null);
}

function assertUnitValue(value, expected, unitPattern) {
  const values = extractUnitValues(value, unitPattern);
  return values.length > 0 && values.every((number) => Math.abs(number - expected) <= 0.005);
}

function matchesPressure(value, fact) {
  return assertUnitValue(value, fact.value, "mpa|мпа");
}

function matchesSpeed(value, fact) {
  return assertUnitValue(
    value,
    fact.value,
    "rpm|r\\s*\\/\\s*min|min\\s*(?:\\^?\\s*[-−]?\\s*1|⁻¹)|об\\.?\\s*\\/\\s*мин"
  );
}

function matchesTemperature(value, fact) {
  const normalized = normalizeText(value);
  const hasTemperatureUnit = /[-+]?\d+(?:[.,]\d+)?\s*°?\s*c\b|\bdegc\b|градус/iu.test(normalized);
  return hasTemperatureUnit
    && hasNumber(normalized, fact.minimum)
    && hasNumber(normalized, fact.maximum);
}

function extractWeightsInGrams(value) {
  const normalized = normalizeText(value);
  const expression = /(\d[\d\s.,]*)\s*(kg|kilograms?|kilogramme?|キログラム|кг|g|grams?|gramme?|グラム|г)(?=$|[^a-zа-я])/giu;
  const values = [];

  for (const match of normalized.matchAll(expression)) {
    const raw = match[1].replace(/\s+/gu, "");
    const unit = normalizeText(match[2]);
    const candidates = new Set();
    const decimal = Number.parseFloat(raw.replace(",", "."));
    const grouped = Number.parseFloat(raw.replace(/[,.]/gu, ""));

    if (Number.isFinite(decimal)) {
      candidates.add(decimal);
    }
    if (Number.isFinite(grouped)) {
      candidates.add(grouped);
    }

    const isKilograms = /kg|kilogram|キログラム|кг/iu.test(unit);
    for (const candidate of candidates) {
      values.push(isKilograms ? candidate * 1000 : candidate);
    }
  }

  return values;
}

function matchesWeight(value, fact) {
  return extractWeightsInGrams(value)
    .some((grams) => Math.abs(grams - fact.value) <= 0.5);
}

function matchesMaterial(value, expected) {
  const normalized = normalizeText(value);
  if (/steel\s*45|45#/iu.test(expected)) {
    const hasSteel45 = /45#|grade\s*45|45\s*(?:carbon\s*)?steel|steel\s*45|45号|сталь\s*45/iu.test(normalized);
    const hasContradictoryMaterial = /6061|aluminium|aluminum|aluminiumlegierung|アルミ|алюмин|ceramic|keramik|セラミ|керами/iu.test(normalized);
    return hasSteel45 && !hasContradictoryMaterial;
  }

  const hasAluminum6061 = /6061/iu.test(normalized)
    && /al(?:uminium|uminum)?|aluminiumlegierung|aluminum\s*alloy|アルミ|алюмин/iu.test(normalized);
  const hasContradictoryMaterial = /steel|stahl|鋼|сталь|ceramic|keramik|セラミ|керами|stainless|edelstahl|ステンレス|нержав/iu.test(normalized);
  return hasAluminum6061 && !hasContradictoryMaterial;
}

function matchesSeal(value) {
  const normalized = normalizeText(value);
  const hasPtfe = /\bptfe\b|птфэ/iu.test(normalized);
  const hasORing = /(?:^|[^a-zа-я])(?:o|о)[\s-]?(?:ring|リング|кольц)/iu.test(normalized);
  return hasPtfe && hasORing && !unsupportedSealPattern.test(normalized);
}

function detectedMedia(value) {
  const normalized = normalizeText(value);
  const media = new Set();

  if (/(?:^|[^a-z])air(?:$|[^a-z])|luft|空気|エア|воздух/iu.test(normalized)) {
    media.add("air");
  }
  if (/(?:^|[^a-z])water(?:$|[^a-z])|wasser|水|вода|воды|водн/iu.test(normalized)) {
    media.add("water");
  }
  if (/(?:^|[^a-z])oil(?:$|[^a-z])|hydraulic|öl|オイル|作動油|油|масл|гидравл/iu.test(normalized)) {
    media.add("oil");
  }
  if (/coolant|kühlmittel|クーラント|冷却液|сож|охлаждающ/iu.test(normalized)) {
    media.add("coolant");
  }

  return media;
}

function matchesMedia(value, expectedMedia) {
  const actual = detectedMedia(value);
  const expected = new Set(expectedMedia);
  return actual.size === expected.size
    && [...expected].every((medium) => actual.has(medium));
}

function matchesEnvelope(value, envelope) {
  const normalized = normalizeText(value);
  const hasUnit = /\bmm\b|毫米|ミリ|мм/iu.test(normalized);
  const width = envelope.maximumDiameterMm ?? envelope.maximumWidthMm;
  return hasUnit
    && hasNumber(normalized, width)
    && hasNumber(normalized, envelope.overallLengthMm);
}

function matchesBore(value, throughBore) {
  return /\bmm\b|毫米|ミリ|мм/iu.test(normalizeText(value))
    && hasNumber(value, throughBore.diameterMm);
}

function containsThread(value, expectedThread) {
  return compactTechnicalText(value).includes(compactTechnicalText(expectedThread));
}

function containsDiameter(value, diameterMm) {
  const normalized = compactTechnicalText(value);
  const number = String(diameterMm).replace(".", "[.,]");
  const expression = new RegExp(`(?:ø|dia(?:meter)?|φ|径)${number}(?!\\d)`, "iu");
  return expression.test(normalized);
}

function containsCount(value, count) {
  if (count === 1) {
    return true;
  }
  const normalized = normalizeText(value);
  const expression = new RegExp(`(?:^|[^0-9])${count}(?![0-9])`, "u");
  return expression.test(normalized);
}

function containsDepth(value, depthMm) {
  const normalized = normalizeText(value);
  return hasNumber(normalized, depthMm);
}

function uniqueFeatureSignatures(features) {
  const seen = new Set();
  return features.filter((feature) => {
    const signature = JSON.stringify([
      feature.count,
      feature.thread ?? null,
      feature.diameterMm ?? null,
      feature.depthMm ?? null,
      feature.feature ?? null
    ]);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
    return true;
  });
}

function matchesFeatures(value, features) {
  return uniqueFeatureSignatures(features).every((feature) => {
    const hasTechnicalSize = feature.thread
      ? containsThread(value, feature.thread)
      : containsDiameter(value, feature.diameterMm);
    const hasExpectedCount = containsCount(value, feature.count);
    const hasExpectedDepth = feature.depthMm === undefined
      || containsDepth(value, feature.depthMm);
    return hasTechnicalSize && hasExpectedCount && hasExpectedDepth;
  });
}

function unexpectedMetricThreads(value, allowedThreads) {
  const normalized = compactTechnicalText(value);
  const found = normalized.match(/m\d+(?:x\d+[.,]\d+)?/giu) ?? [];
  const allowed = new Set(allowedThreads.map(compactTechnicalText));
  return found.filter((thread) => !allowed.has(compactTechnicalText(thread)));
}

function unexpectedGThreads(value, allowedThreads) {
  const normalized = compactTechnicalText(value);
  const found = normalized.match(/g\d+\/\d+/giu) ?? [];
  const allowed = new Set(allowedThreads.map(compactTechnicalText));
  return found.filter((thread) => !allowed.has(compactTechnicalText(thread)));
}

function matchesMounting(value, mounting) {
  if (!matchesFeatures(value, mounting.features)) {
    return false;
  }
  const allowedMetricThreads = mounting.features
    .map((feature) => feature.thread)
    .filter(Boolean);
  return unexpectedMetricThreads(value, allowedMetricThreads).length === 0;
}

function matchesPorts(value, ports) {
  if (!matchesFeatures(value, ports.annotations)) {
    return false;
  }
  const allowedGThreads = ports.annotations
    .map((annotation) => annotation.thread)
    .filter((thread) => thread?.toUpperCase().startsWith("G"));
  const allowedMetricThreads = ports.annotations
    .map((annotation) => annotation.thread)
    .filter((thread) => thread?.toUpperCase().startsWith("M"));
  return unexpectedGThreads(value, allowedGThreads).length === 0
    && unexpectedMetricThreads(value, allowedMetricThreads).length === 0;
}

function matchingPairText(pairs, field) {
  return pairs
    .filter(({ label }) => drawingBackedCanonicalField(label) === field || labelPatterns[field].test(label))
    .map(({ value }) => value)
    .join(" | ");
}

function collectSpecPairs($) {
  return $("#panel-specs table tr").map((_, row) => ({
    label: $(row).find("th").first().text().trim(),
    value: $(row).find("td").first().text().trim()
  })).get().filter(({ label, value }) => label && value);
}

function collectProductNodes(value, output = []) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectProductNodes(entry, output);
    }
    return output;
  }
  if (!value || typeof value !== "object") {
    return output;
  }

  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes("Product")) {
    output.push(value);
  }
  if (value["@graph"]) {
    collectProductNodes(value["@graph"], output);
  }
  return output;
}

function parseProductJsonLd($, model, context) {
  const products = [];
  $("script[type='application/ld+json']").each((index, element) => {
    const raw = $(element).html();
    try {
      collectProductNodes(JSON.parse(raw), products);
    } catch (error) {
      addFailure("invalid-jsonld", context, `JSON-LD script ${index + 1}: ${error.message}`);
    }
  });

  const matchingProducts = products.filter((product) => product.sku === model || product.mpn === model);
  if (matchingProducts.length !== 1) {
    addFailure(
      "product-jsonld-count",
      context,
      `Expected exactly one Product JSON-LD node for ${model}; found ${matchingProducts.length}.`
    );
    return null;
  }
  return matchingProducts[0];
}

function collectJsonLdPairs(product) {
  if (!Array.isArray(product?.additionalProperty)) {
    return [];
  }
  return product.additionalProperty
    .filter((property) => property && typeof property === "object")
    .map((property) => ({
      label: String(property.name ?? ""),
      value: String(property.value ?? "")
    }))
    .filter(({ label, value }) => label && value);
}

function checkRequiredPair(context, surface, pairs, field, checker, expectedDescription) {
  const value = matchingPairText(pairs, field);
  if (!value) {
    addFailure("missing-fact", context, `${surface} is missing ${field}.`);
    return;
  }
  if (!checker(value)) {
    addFailure(
      "fact-mismatch",
      context,
      `${surface} ${field} does not match drawing fact ${expectedDescription}; found "${value}".`
    );
  }
}

function checkCoreFactPairs(context, surface, pairs, record) {
  const facts = record.drawingFacts;
  checkRequiredPair(context, surface, pairs, "pressure", (value) => matchesPressure(value, facts.maximumPressure), `${facts.maximumPressure.value} MPa`);
  checkRequiredPair(context, surface, pairs, "speed", (value) => matchesSpeed(value, facts.maximumSpeed), `${facts.maximumSpeed.value} RPM`);
  checkRequiredPair(context, surface, pairs, "material", (value) => matchesMaterial(value, facts.bodyMaterial), facts.bodyMaterial);
  checkRequiredPair(context, surface, pairs, "seal", matchesSeal, "PTFE + O-ring with no unsupported compound");
  checkRequiredPair(context, surface, pairs, "media", (value) => matchesMedia(value, facts.media), facts.media.join(" / "));
  checkRequiredPair(
    context,
    surface,
    pairs,
    "temperature",
    (value) => matchesTemperature(value, facts.temperatureRange),
    `${facts.temperatureRange.minimum} to ${facts.temperatureRange.maximum} degC`
  );
  checkRequiredPair(context, surface, pairs, "weight", (value) => matchesWeight(value, facts.weight), `${facts.weight.value} g`);
  checkRequiredPair(
    context,
    surface,
    pairs,
    "dimensions",
    (value) => matchesEnvelope(value, facts.envelope),
    "drawing envelope"
  );

  if (facts.throughBore?.status === "verified") {
    checkRequiredPair(
      context,
      surface,
      pairs,
      "bore",
      (value) => matchesBore(value, facts.throughBore),
      `${facts.throughBore.diameterMm} mm through-bore`
    );
  }

  if (facts.mounting.status === "verified") {
    checkRequiredPair(
      context,
      surface,
      pairs,
      "mounting",
      (value) => matchesMounting(value, facts.mounting),
      "drawing mounting groups"
    );
  }

  if (facts.ports.status === "annotation-conflict") {
    const portValue = matchingPairText(pairs, "ports");
    if (!portValue) {
      addFailure("missing-port-pending", context, `${surface} is missing an outlet-count pending field.`);
    } else if (!pendingPortPattern.test(portValue)) {
      addFailure(
        "port-count-not-pending",
        context,
        `${surface} must state that outlet count requires engineering confirmation; found "${portValue}".`
      );
    }
  } else if (facts.ports.status === "anomaly-unresolved") {
    const portValue = matchingPairText(pairs, "ports");
    if (!portValue) {
      addFailure("missing-port-pending", context, `${surface} is missing a port-size pending field.`);
    } else if (!pendingPortPattern.test(portValue) || /g\s*1\s*\/\s*4/iu.test(portValue)) {
      addFailure(
        "port-anomaly-not-pending",
        context,
        `${surface} must keep BP-3P-0006 port size pending and must not normalize G4/1 to G1/4; found "${portValue}".`
      );
    }
  } else if (facts.ports.status.startsWith("verified")) {
    checkRequiredPair(
      context,
      surface,
      pairs,
      "ports",
      (value) => matchesPorts(value, facts.ports),
      "unambiguous drawing port annotations"
    );
  }
}

function checkProhibitedClaims(context, surface, value, record) {
  const normalized = normalizeText(value);
  for (const claim of record.prohibitedWebClaims) {
    for (const term of claim.match) {
      if (normalized.includes(normalizeText(term))) {
        addFailure(
          "prohibited-claim",
          context,
          `${surface} contains prohibited claim ${claim.id}: "${term}".`
        );
        break;
      }
    }
  }
}

function checkFirstView(context, $, record, locale, model) {
  const keySpecs = new Map();
  $(".pd-key-spec").each((_, element) => {
    const key = $(element).attr("data-spec-key");
    if (key) {
      keySpecs.set(key, $(element).find("dd").text().trim());
    }
  });

  if ($(".pd-key-specs").length !== 1) {
    addFailure("first-view-structure", context, `Expected one .pd-key-specs block; found ${$(".pd-key-specs").length}.`);
  }
  if ($(".pd-price-note").length !== 0) {
    addFailure("first-view-structure", context, "Retired .pd-price-note remains in the first view.");
  }

  const performance = keySpecs.get("performance");
  if (!performance) {
    if (!new Set(['BP-3P-0004', 'BP-2P-08-0001', 'BP-2P-95-0005', 'BP-3P-0007']).has(model)) {
      addFailure("missing-first-view-fact", context, "First view is missing performance.");
    }
  } else {
    if (!matchesPressure(performance, record.drawingFacts.maximumPressure)) {
      addFailure("first-view-mismatch", context, `Performance must include ${record.drawingFacts.maximumPressure.value} MPa; found "${performance}".`);
    }
    if (!matchesSpeed(performance, record.drawingFacts.maximumSpeed)) {
      addFailure("first-view-mismatch", context, `Performance must include ${record.drawingFacts.maximumSpeed.value} RPM; found "${performance}".`);
    }
  }

  const body = keySpecs.get("body");
  if (body && !matchesMaterial(body, record.drawingFacts.bodyMaterial)) {
    addFailure("first-view-mismatch", context, `Body must be ${record.drawingFacts.bodyMaterial}; found "${body}".`);
  }

  const seal = keySpecs.get("seal");
  const localized = drawingBackedUiContract(locale, model);
  if (model === "BP-3P-S06-0001") {
    if (!seal || !matchesSeal(seal)) {
      addFailure("first-view-mismatch", context, `Hybrid-model seal must state PTFE + O-ring with no unsupported compound; found "${seal ?? "missing"}".`);
    }
    const channels = keySpecs.get("channels");
    if (!channels || channels !== localized?.keyValues?.channels) {
      addFailure("first-view-mismatch", context, `Hybrid channels/MOQ must match the localized contract; found "${channels ?? "missing"}".`);
    }
  } else {
    const passages = keySpecs.get("passages");
    if (!passages || passages !== localized?.keyValues?.passages || /\bindependent\b/iu.test(passages)) {
      addFailure("first-view-mismatch", context, `Passages/MOQ must match the topology-safe localized contract; found "${passages ?? "missing"}".`);
    }
    if (seal) {
      addFailure("first-view-structure", context, "Ordinary-model seal must remain in the specification table, not the first-view cards.");
    }
  }

  const media = keySpecs.get("media");
  if (media && !matchesMedia(media, record.drawingFacts.media)) {
    addFailure("first-view-mismatch", context, `Media must be exactly ${record.drawingFacts.media.join(" / ")}; found "${media}".`);
  }

  const mounting = keySpecs.get("mount");
  if (mounting && record.drawingFacts.mounting.status === "verified" && !matchesMounting(mounting, record.drawingFacts.mounting)) {
    addFailure("first-view-mismatch", context, `Mounting does not include all verified drawing groups; found "${mounting}".`);
  }

  const ports = keySpecs.get("ports");
  if (record.drawingFacts.ports.status === "annotation-conflict") {
    if (!ports || !pendingPortPattern.test(ports)) {
      addFailure("first-view-port-pending", context, `First-view outlet count must remain pending engineering confirmation; found "${ports ?? "missing"}".`);
    }
  } else if (record.drawingFacts.ports.status === "anomaly-unresolved") {
    if (!ports || !pendingPortPattern.test(ports) || /g\s*1\s*\/\s*4/iu.test(ports)) {
      addFailure("first-view-port-pending", context, `BP-3P-0006 first-view port field must remain pending; found "${ports ?? "missing"}".`);
    }
  } else if (ports && record.drawingFacts.ports.status.startsWith("verified") && !matchesPorts(ports, record.drawingFacts.ports)) {
    addFailure("first-view-mismatch", context, `Ports do not match the unambiguous drawing annotations; found "${ports}".`);
  }

  checkProhibitedClaims(context, "first view", [...keySpecs.values()].join(" | "), record);
}

function checkIdentityPendingPage(context, $, record, locale, product) {
  const drawingFilename = record.drawing.filename.toLocaleLowerCase();
  const directLinks = $("a[href]").filter((_, element) => {
    const href = String($(element).attr("href") ?? "").toLocaleLowerCase();
    return href.includes(drawingFilename);
  });
  if (directLinks.length > 0) {
    addFailure("identity-pending-direct-download", context, `Identity-pending drawing is directly linked ${directLinks.length} time(s).`);
  }

  const isVerifiedDrawingRoute = (_, element) => {
    const href = decodeKnownEntities($(element).attr("href") ?? "");
    return href.includes("request=verified-drawing") && href.includes(`model=${record.websiteModel}`);
  };
  const allRequestLinks = $("a[href]").filter(isVerifiedDrawingRoute);
  const utilityRequestLinks = $(".pd-utility-links a[href]").filter(isVerifiedDrawingRoute);
  const downloadRequestLinks = $("#panel-downloads a[href]").filter(isVerifiedDrawingRoute);

  if (allRequestLinks.length < 2 || utilityRequestLinks.length < 1 || downloadRequestLinks.length < 1) {
    addFailure(
      "identity-pending-route",
      context,
      "Identity-pending page must keep model-specific request=verified-drawing links in both the utility actions and downloads panel."
    );
  }

  const downloadPanelText = $("#panel-downloads").text();
  if (!pendingDrawingPatterns[locale].test(downloadPanelText)) {
    addFailure(
      "identity-pending-disclaimer",
      context,
      "Downloads panel must direct the customer to request the current model-specific file before selection or ordering."
    );
  }

  const properties = product?.additionalProperty;
  if (!Array.isArray(properties)) {
    addFailure("identity-pending-jsonld", context, "Identity-pending Product JSON-LD must contain an additionalProperty array.");
  } else {
    const allowed = new Set(["SKU", warrantyLabels[locale]]);
    const unsupported = properties.filter((property) => !allowed.has(property?.name));
    if (properties.length !== 2 || unsupported.length) {
      addFailure(
        "identity-pending-jsonld",
        context,
        `Identity-pending Product JSON-LD must contain only SKU and warranty properties; found ${properties.map((property) => property?.name ?? "missing").join(" | ")}.`
      );
    }
  }
}

function requireSearchKeyword(context, keywords, field, checker, expectedDescription) {
  const matching = keywords.find((keyword) => checker(keyword));
  if (!matching) {
    addFailure(
      "search-fact-missing",
      context,
      `Search keywords are missing ${field}: ${expectedDescription}.`
    );
  }
}

function checkSearchRecord(context, searchRecord, record, locale) {
  const model = record.websiteModel;
  const expectedKeywords = drawingBackedProductKeywords(locale, model);
  const expectedMetadata = drawingBackedProductMetadata(locale, model);
  if (!Array.isArray(searchRecord.keywords)) {
    addFailure("search-keywords-shape", context, "Product search record keywords must be an array.");
  } else if (JSON.stringify(searchRecord.keywords) !== JSON.stringify(expectedKeywords)) {
    addFailure("search-keywords-contract", context, "Search keywords do not match the localized drawing-backed contract.");
  }
  for (const [field, expected] of Object.entries({
    url: `${model}.html`,
    title: expectedMetadata.title,
    description: expectedMetadata.description,
    h1: expectedMetadata.h1
  })) {
    if (searchRecord[field] !== expected) {
      addFailure("search-metadata-contract", context, `Search ${field} does not match the localized drawing-backed contract.`);
    }
  }

  const allKeywords = Array.isArray(searchRecord.keywords) ? searchRecord.keywords.join(" | ") : "";
  if (record.drawingFacts.ports.status === "annotation-conflict" && !pendingPortPattern.test(allKeywords)) {
    addFailure("search-port-pending", context, "Search keywords must state that outlet count requires engineering confirmation.");
  }
  if (record.drawingFacts.ports.status === "anomaly-unresolved"
    && (!pendingPortPattern.test(allKeywords) || /g\s*1\s*\/\s*4/iu.test(allKeywords))) {
    addFailure("search-port-pending", context, "Search keywords must keep BP-3P-0006 port size pending and must not assert G1/4.");
  }
  checkProhibitedClaims(
    context,
    "search description/keywords",
    [searchRecord.description ?? "", ...(searchRecord.keywords ?? [])].join(" | "),
    record
  );
}

function checkLlmsRecord(context, llmsText, locale, record) {
  const model = record.websiteModel;
  const localePath = locale === "en" ? "" : `${locale}/`;
  const publicUrl = `https://www.begapunk.com/${localePath}${model}.html`;
  const matchingLines = llmsText
    .split(/\r?\n/gu)
    .filter((line) => line.includes(`](${publicUrl})`));
  if (matchingLines.length !== 1) {
    addFailure(
      "llms-record-count",
      context,
      `Expected exactly one ${model} record for ${publicUrl}; found ${matchingLines.length}.`
    );
    return;
  }

  checked.llmsConflictRecords += 1;
  const line = matchingLines[0];
  const expected = `- [${drawingBackedProductLinkLabel(locale, model)}](${publicUrl}): ${drawingBackedProductSummary(locale, model)}`;
  if (line !== expected) {
    addFailure("llms-contract", context, "AI summary does not match the localized drawing-backed contract.");
  }
  if (record.drawingFacts.ports.status === "annotation-conflict"
    && !pendingOutletCountPatterns[locale].test(line)) {
    addFailure("llms-port-pending", context, "AI summary must keep the outlet count pending engineering confirmation.");
  }
  checkProhibitedClaims(context, "AI summary", line, record);
}

function checkBp1p0006PublicSurfaces(locale, searchText) {
  const expected = bp1p0006PublicSurfaceContract[locale.code];
  const catalogContext = `${locale.code}:products-p2:BP-1P-0006`;
  const catalogPath = path.join(repositoryRoot, locale.directory, "products-p2.html");
  const catalogText = readUtf8(catalogPath, catalogContext);
  if (catalogText !== null) {
    const $ = cheerio.load(catalogText);
    const card = $('.product-card-large[data-href="BP-1P-0006.html"]');
    if (card.length !== 1) {
      addFailure("bp1-public-card", catalogContext, `Expected one catalog card; found ${card.length}.`);
    } else {
      const title = card.find("h3").first().text().replace(/\s+/g, " ").trim();
      const specs = card.find(".product-specs span").map((_, element) => $(element).text().replace(/\s+/g, " ").trim()).get();
      const imageAlt = card.find("img").first().attr("alt") ?? "";
      if (title !== expected.cardTitle || !specs.includes(expected.cardSpec) || imageAlt !== expected.imageAlt) {
        addFailure("bp1-public-card", catalogContext, "Catalog title, outlet count, or image alternative text is not synchronized with the verified 1-inlet/8-outlet drawing fact.");
      }
      if (expected.retiredPattern.test(card.text()) || expected.retiredPattern.test(imageAlt)) {
        addFailure("bp1-retired-count", catalogContext, "Retired six-outlet wording remains in the catalog card.");
      }
    }
  }

  const comparisonContext = `${locale.code}:product-comparison:BP-1P-0006`;
  const comparisonPath = path.join(repositoryRoot, locale.directory, "product-comparison.html");
  const comparisonText = readUtf8(comparisonPath, comparisonContext);
  if (comparisonText !== null) {
    const $ = cheerio.load(comparisonText);
    const rows = $("tr").filter((_, element) => $(element).text().includes("BP-1P-0006"));
    if (rows.length !== 1) {
      addFailure("bp1-public-comparison", comparisonContext, `Expected one comparison row; found ${rows.length}.`);
    } else {
      const summary = rows.first().find("td").eq(1).text().replace(/\s+/g, " ").trim();
      if (summary !== expected.comparison) {
        addFailure("bp1-public-comparison", comparisonContext, "Comparison summary is not synchronized with the verified 1-inlet/8-outlet drawing fact.");
      }
      if (expected.retiredPattern.test(rows.first().text())) {
        addFailure("bp1-retired-count", comparisonContext, "Retired six-outlet wording remains in the comparison row.");
      }
    }
  }

  if (expected.retiredPattern.test(searchText)) {
    addFailure("bp1-retired-count", `${locale.code}:search-index`, "Retired six-outlet wording remains in a searchable page record.");
  }
}

function assertManifestContract(manifest) {
  const productEntries = Object.entries(manifest.products ?? {});
  if (manifest.schemaVersion !== 1) {
    addFailure("manifest-schema", "manifest", `Expected schemaVersion 1; found ${manifest.schemaVersion}.`);
  }
  if (productEntries.length !== 16) {
    addFailure("manifest-model-count", "manifest", `Expected 16 models; found ${productEntries.length}.`);
  }

  const expectedPending = new Set();
  const actualPending = new Set(
    productEntries
      .filter(([, record]) => record.status === "identity-pending")
      .map(([model]) => model)
  );
  if (
    expectedPending.size !== actualPending.size
    || [...expectedPending].some((model) => !actualPending.has(model))
  ) {
    addFailure("manifest-quarantine", "manifest", "Identity-pending model set does not match the approved manifest contract.");
  }

  for (const [model, record] of productEntries) {
    const context = `manifest:${model}`;
    if (record.websiteModel !== model) {
      addFailure("manifest-model", context, `websiteModel must equal ${model}.`);
    }
    if (!["verified-drawing", "identity-pending"].includes(record.status)) {
      addFailure("manifest-status", context, `Unexpected status ${record.status}.`);
    }

    const drawing = record.drawing ?? {};
    for (const requiredField of ["path", "filename", "sha256", "titleBlockModel", "documentControlNumber", "date", "pageCount"]) {
      if (drawing[requiredField] === undefined || drawing[requiredField] === "") {
        addFailure("manifest-drawing-field", context, `Missing drawing.${requiredField}.`);
      }
    }
    if (!/^[a-f0-9]{64}$/u.test(drawing.sha256 ?? "")) {
      addFailure("manifest-sha", context, "drawing.sha256 must be a lowercase 64-character SHA256.");
    }
    if (record.status === "verified-drawing" && drawing.titleBlockModel !== model) {
      addFailure("manifest-identity", context, "A verified drawing title-block model must equal the website model.");
    }
    if (record.status === "identity-pending" && drawing.titleBlockModel === model) {
      addFailure("manifest-identity", context, "An identity-pending record must preserve its title-block mismatch.");
    }

    const facts = record.drawingFacts ?? {};
    const seals = new Set((facts.sealMaterials ?? []).map(normalizeText));
    if (seals.size !== 2 || !seals.has("ptfe") || !seals.has("o-ring")) {
      addFailure("manifest-seal", context, "sealMaterials must be exactly PTFE and O-ring.");
    }
    const expectedMedia = model === "BP-1P-0003"
      ? ["air", "oil", "water"]
      : ["air"];
    if (JSON.stringify(facts.media) !== JSON.stringify(expectedMedia)) {
      addFailure("manifest-media", context, `media must be ${expectedMedia.join(", ")}.`);
    }
    if (!facts.maximumPressure || !facts.maximumSpeed || !facts.bodyMaterial || !facts.temperatureRange || !facts.weight) {
      addFailure("manifest-core-facts", context, "Missing pressure, speed, material, temperature, or weight.");
    }
    if (!facts.envelope || !Number.isFinite(facts.envelope.overallLengthMm)) {
      addFailure("manifest-envelope", context, "Every model must record an explicit envelope.");
    }
    if (!facts.mounting || !Array.isArray(facts.mounting.features)) {
      addFailure("manifest-mounting", context, "Every model must record mounting status and features.");
    }
    if (!facts.ports || !Array.isArray(facts.ports.annotations)) {
      addFailure("manifest-ports", context, "Every model must record port status and annotations.");
    }
    if (!Array.isArray(record.nonInferable) || record.nonInferable.length === 0) {
      addFailure("manifest-non-inferable", context, "Every model must list nonInferable items.");
    }
    if (!Array.isArray(record.prohibitedWebClaims)) {
      addFailure("manifest-prohibited", context, "prohibitedWebClaims must be an array.");
    }

    const drawingPath = path.resolve(repositoryRoot, drawing.path ?? "");
    const relativeToDownloads = path.relative(downloadsRoot, drawingPath);
    if (
      relativeToDownloads.startsWith("..")
      || path.isAbsolute(relativeToDownloads)
      || drawingPath.toLocaleLowerCase().includes(`${path.sep}catalog-project${path.sep}`)
    ) {
      addFailure("manifest-pdf-scope", context, "Drawing path must stay inside downloads/ and outside catalog-project/.");
    } else if (!existsSync(drawingPath)) {
      addFailure("missing-pdf", context, `Missing drawing PDF ${drawing.path}.`);
    } else {
      const actualHash = createHash("sha256").update(readFileSync(drawingPath)).digest("hex");
      checked.pdfs += 1;
      if (actualHash !== drawing.sha256) {
        addFailure("pdf-hash", context, `SHA256 mismatch for ${drawing.filename}; expected ${drawing.sha256}, found ${actualHash}.`);
      }
    }
  }

  const bp1p0006 = manifest.products?.["BP-1P-0006"]?.drawingFacts;
  if (
    bp1p0006?.ports?.status !== "verified"
    || !bp1p0006.ports.annotations?.some((port) => port.count === 1 && port.thread === "G1/8" && port.role === "inlet")
    || !bp1p0006.ports.annotations?.some((port) => port.count === 8 && port.thread === "G1/8" && port.role === "outlet" && port.raw === "8-G1/8 OUT")
  ) {
    addFailure(
      "critical-contract",
      "manifest:BP-1P-0006",
      "Port contract must preserve the owner-confirmed one-inlet/eight-outlet G1/8 drawing facts."
    );
  }

  const bp2p08 = manifest.products?.["BP-2P-08-0001"]?.drawingFacts;
  const bp2p08Mounts = bp2p08?.mounting?.features ?? [];
  if (
    bp2p08Mounts.length !== 2
    || bp2p08Mounts.some((feature) => feature.count !== 4 || feature.thread !== "M4" || feature.depthMm !== 10)
  ) {
    addFailure("critical-contract", "manifest:BP-2P-08-0001", "Both mounting groups must be 4 x M4, depth 10 mm.");
  }

  const bp2p0002 = manifest.products?.["BP-2P-0002"]?.drawingFacts?.mounting?.features ?? [];
  if (
    !bp2p0002.some((feature) => feature.count === 4 && feature.thread === "M5" && feature.depthMm === 12)
    || !bp2p0002.some((feature) => feature.count === 4 && feature.diameterMm === 6 && feature.feature === "through-hole")
  ) {
    addFailure("critical-contract", "manifest:BP-2P-0002", "Mounting must preserve face-a 4 x M5 depth 12 and face-b 4 x diameter-6 through holes.");
  }

  const bp2p50 = manifest.products?.["BP-2P-50-0001"]?.drawingFacts?.mounting?.features ?? [];
  if (
    !bp2p50.some((feature) => feature.side === "stator" && feature.count === 4 && feature.thread === "M5" && feature.depthMm === 10)
    || !bp2p50.some((feature) => feature.side === "rotor" && feature.count === 6 && feature.thread === "M5" && feature.depthMm === 8)
  ) {
    addFailure("critical-contract", "manifest:BP-2P-50-0001", "Mounting must preserve stator 4 x M5 x 10 and rotor 6 x M5 x 8.");
  }

  const bp3p0006 = manifest.products?.["BP-3P-0006"]?.drawingFacts?.ports;
  if (
    bp3p0006?.status !== "anomaly-unresolved"
    || bp3p0006.annotations?.length !== 2
    || bp3p0006.annotations.some((port) => port.thread !== "G4/1")
  ) {
    addFailure("critical-contract", "manifest:BP-3P-0006", "Port annotations must remain raw G4/1 with anomaly-unresolved status.");
  }

  const s06 = manifest.products?.["BP-3P-S06-0001"]?.drawingFacts;
  if (
    s06?.ports?.status !== "verified-outlets-only"
    || s06.ports.annotations?.length !== 1
    || s06.ports.annotations[0].count !== 3
    || s06.ports.annotations[0].diameterMm !== 4
    || s06.ports.annotations[0].thread
  ) {
    addFailure("critical-contract", "manifest:BP-3P-S06-0001", "Only the unambiguous 3 x diameter-4 air outlets may be recorded.");
  }
}

const manifestText = readUtf8(manifestPath, "manifest");
let manifest = null;
if (manifestText !== null) {
  try {
    manifest = JSON.parse(manifestText);
  } catch (error) {
    addFailure("manifest-json", "manifest", error.message);
  }
}

if (manifest) {
  assertManifestContract(manifest);
  const productEntries = Object.entries(manifest.products ?? {});

  for (const locale of locales) {
    for (const [model, record] of productEntries) {
      const context = `${locale.code}:${model}`;
      const pagePath = path.join(repositoryRoot, locale.directory, `${model}.html`);
      const html = readUtf8(pagePath, context);
      if (html === null) {
        continue;
      }
      checked.pages += 1;
      const $ = cheerio.load(html);
      const product = parseProductJsonLd($, model, context);

      if (record.status === "identity-pending") {
        checkIdentityPendingPage(context, $, record, locale.code, product);
        continue;
      }

      checkFirstView(context, $, record, locale.code, model);
      const specPairs = collectSpecPairs($);
      if (specPairs.length === 0) {
        addFailure("spec-structure", context, "No specification table rows found in #panel-specs.");
      } else {
        checkCoreFactPairs(context, "specification table", specPairs, record);
        checkProhibitedClaims(context, "specification table", $("#panel-specs").text(), record);
      }

      if (product) {
        const jsonLdPairs = collectJsonLdPairs(product);
        checkCoreFactPairs(context, "Product JSON-LD", jsonLdPairs, record);
        checkProhibitedClaims(context, "Product JSON-LD", JSON.stringify(product), record);
      }
    }

    const searchContext = `${locale.code}:search-index`;
    const searchPath = path.join(repositoryRoot, locale.searchIndex);
    const searchText = readUtf8(searchPath, searchContext);
    if (searchText === null) {
      continue;
    }

    let searchIndex;
    try {
      searchIndex = JSON.parse(searchText);
    } catch (error) {
      addFailure("search-json", searchContext, error.message);
      continue;
    }
    checked.searchIndexes += 1;
    if (!Array.isArray(searchIndex)) {
      addFailure("search-shape", searchContext, "Search index must be an array.");
      continue;
    }

    checkBp1p0006PublicSurfaces(locale, searchText);

    for (const [model, record] of productEntries) {
      const context = `${locale.code}:search:${model}`;
      const matches = searchIndex.filter((entry) => entry?.id === model);
      if (matches.length !== 1) {
        addFailure("search-record-count", context, `Expected exactly one record; found ${matches.length}.`);
        continue;
      }
      checked.searchProductRecords += 1;
      checkSearchRecord(context, matches[0], record, locale.code);
    }

    const llmsPath = path.join(repositoryRoot, locale.directory, "llms.txt");
    const llmsText = readUtf8(llmsPath, `${locale.code}:llms`);
    if (llmsText !== null) {
      checked.llmsFiles += 1;
      for (const [model, record] of productEntries) {
        checkLlmsRecord(`${locale.code}:llms:${model}`, llmsText, locale.code, record);
      }
    }
  }
}

const summary = `checked ${checked.pdfs}/16 PDF hashes, ${checked.pages}/64 localized product pages, ${checked.searchIndexes}/4 search indexes, ${checked.searchProductRecords}/64 product search records, and ${checked.llmsConflictRecords}/64 records in ${checked.llmsFiles}/4 llms.txt files`;
if (failures.length > 0) {
  console.error(`Drawing-backed product facts: FAIL (${failures.length} issue(s); ${summary}).`);
  const issueCounts = [...failures.reduce((counts, failure) => {
    counts.set(failure.code, (counts.get(failure.code) ?? 0) + 1);
    return counts;
  }, new Map()).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => `${code}=${count}`)
    .join(", ");
  console.error(`Issue counts: ${issueCounts}`);
  const reportLimit = 250;
  for (const failure of failures.slice(0, reportLimit)) {
    console.error(`- [${failure.code}] ${failure.context}: ${failure.message}`);
  }
  if (failures.length > reportLimit) {
    console.error(`- ... ${failures.length - reportLimit} additional issue(s) omitted.`);
  }
  process.exitCode = 1;
} else {
  console.log(`Drawing-backed product facts: PASS (${summary}).`);
}
