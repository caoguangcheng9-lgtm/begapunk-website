import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import * as cheerio from "cheerio";

const ROOT = process.cwd();
const EXTERNAL_CATALOG_ROOT = process.env.PRODUCT_TRUTH_CATALOG_ROOT
  ? path.resolve(process.env.PRODUCT_TRUTH_CATALOG_ROOT)
  : null;
const AUDIT_DATE = process.env.PRODUCT_TRUTH_AUDIT_DATE || "2026-07-31";
const BASELINE_COMMIT = "d95d4db1ce908f941e76bff3f78bc052455d0b0b";
const INVENTORY_PATH = "audit/product-truth-source-inventory.json";
const CONFLICT_PATH = "audit/product-truth-conflicts.json";
const REPORT_PATH = "audit/product-truth-baseline-20260731.md";

const PRODUCT_FILE_RE = /^(?:(de|ja|ru)\/)?(BP-[A-Z0-9]+(?:-[A-Z0-9]+)+)\.html$/i;
const MODEL_RE = /\bBP-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/gi;
const knownModels = new Set();
const ENGINEERING_EXTENSIONS = new Set([
  ".pdf",
  ".dxf",
  ".dwg",
  ".step",
  ".stp",
  ".iges",
  ".igs",
  ".xls",
  ".xlsx",
]);

const inventory = new Map();
const observations = [];
const searchOrAiModels = new Set();
const requiredPaths = [
  "BP-2P-50-0001.html",
  "search-index.json",
  "llms.txt",
  "catalog-project/data/catalog-data.csv",
  "catalog-project/data/source-evidence.json",
];

function posix(relativePath) {
  return relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function absolute(relativePath) {
  const normalized = posix(relativePath);
  if (EXTERNAL_CATALOG_ROOT && normalized.startsWith("catalog-project/")) {
    return path.join(
      EXTERNAL_CATALOG_ROOT,
      normalized.slice("catalog-project/".length),
    );
  }
  return path.join(ROOT, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function sha256(relativePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(absolute(relativePath)));
  return hash.digest("hex");
}

function readText(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function listFiles(relativeDirectory) {
  if (!exists(relativeDirectory)) return [];
  const found = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(absolute(current), { withFileTypes: true })) {
      const child = posix(path.join(current, entry.name));
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile()) {
        found.push(child);
      }
    }
  };
  visit(relativeDirectory);
  return found.sort((a, b) => a.localeCompare(b));
}

const trackedFiles = new Set(
  execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .map(posix),
);

function isTracked(relativePath) {
  if (EXTERNAL_CATALOG_ROOT && posix(relativePath).startsWith("catalog-project/")) {
    return false;
  }
  return trackedFiles.has(posix(relativePath));
}

function normalizeModel(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-VIEW$/, "");
}

function extractModels(value) {
  return [
    ...new Set(
      (String(value || "").match(MODEL_RE) || [])
        .map(normalizeModel)
        .filter((model) => knownModels.has(model)),
    ),
  ].sort();
}

function inferLanguage(relativePath) {
  if (relativePath.startsWith("de/")) return "de";
  if (relativePath.startsWith("ja/")) return "ja";
  if (relativePath.startsWith("ru/")) return "ru";
  return "en";
}

function evidenceLevelFor(sourceType) {
  if (sourceType.includes("engineering")) return "engineering-primary";
  if (sourceType.includes("controlled-catalog")) return "controlled-catalog";
  if (sourceType.includes("local-untracked")) return "local-untracked-source";
  if (sourceType.includes("translated")) return "translated-content";
  if (sourceType.includes("search") || sourceType.includes("ai-index")) {
    return "search-or-ai-index";
  }
  if (sourceType.includes("website")) return "website-generated";
  return "unknown";
}

function verificationFor(sourceType) {
  if (sourceType.includes("engineering") || sourceType.includes("local-untracked")) {
    return "manual-review-required";
  }
  if (sourceType.includes("conflict")) return "conflict";
  return "unverified";
}

function publicClaimLevelFor(sourceType) {
  if (
    sourceType.includes("website") ||
    sourceType.includes("translated") ||
    sourceType.includes("search") ||
    sourceType.includes("ai-index")
  ) {
    return "public-with-qualification";
  }
  return "internal-only";
}

function addInventory(
  relativePath,
  {
    sourceType,
    automaticallyParseable,
    manualEngineeringVerificationRequired,
    models = [],
    fieldTypes = [],
    notes = "",
  },
) {
  const sourcePath = posix(relativePath);
  if (!exists(sourcePath)) return;

  const current = inventory.get(sourcePath) || {
    source_path: sourcePath,
    source_type: sourceType,
    git_tracked: isTracked(sourcePath),
    source_hash: sha256(sourcePath),
    automatically_parseable: automaticallyParseable,
    manual_engineering_verification_required: manualEngineeringVerificationRequired,
    model_count: 0,
    models: [],
    field_types: [],
    notes,
  };

  current.models = [...new Set([...current.models, ...models.map(normalizeModel).filter(Boolean)])].sort();
  current.model_count = current.models.length;
  current.field_types = [...new Set([...current.field_types, ...fieldTypes])].sort();
  current.automatically_parseable =
    current.automatically_parseable || automaticallyParseable;
  current.manual_engineering_verification_required =
    current.manual_engineering_verification_required ||
    manualEngineeringVerificationRequired;
  current.notes = current.notes || notes;
  inventory.set(sourcePath, current);
}

const LABEL_RULES = [
  {
    field: "model",
    patterns: [
      /^model number$/i,
      /^sku$/i,
      /^modellnummer$/i,
      /^artikelnummer$/i,
      /^型式$/,
      /^обозначение модели$/i,
      /^артикул$/i,
    ],
  },
  {
    field: "passages",
    patterns: [
      /number of passages/i,
      /^passages$/i,
      /kanalzahl/i,
      /^流路数$/,
      /количество каналов/i,
    ],
  },
  {
    field: "mounting_type",
    patterns: [
      /mount type/i,
      /mounting type/i,
      /montageart/i,
      /^取付(方法|方式)$/,
      /(способ монтажа|тип крепления)/i,
    ],
  },
  {
    field: "maximum_pressure",
    patterns: [
      /max(imum)?( operating)? pressure/i,
      /maximaler betriebsdruck/i,
      /最高使用圧力/,
      /максимальное рабочее давление/i,
    ],
  },
  {
    field: "maximum_speed",
    patterns: [
      /max(imum)? speed/i,
      /maximale drehzahl/i,
      /最高(使用)?回転数/,
      /максимальн.*скорост.*вращения/i,
    ],
  },
  {
    field: "body_material",
    patterns: [
      /body material/i,
      /gehäusewerkstoff/i,
      /本体材質/,
      /материал корпуса/i,
    ],
  },
  {
    field: "seal_material",
    patterns: [
      /seal (type|material)/i,
      /^dichtung$/i,
      /dichtungsart/i,
      /シール方式/,
      /тип уплотнения/i,
    ],
  },
  {
    field: "protection_rating",
    patterns: [
      /(dust protection|protection rating)/i,
      /(staubschutz|schutzart)/i,
      /(防じん対策|保護等級)/,
      /(защита от пыли|степень защиты)/i,
    ],
  },
  {
    field: "compatible_media",
    patterns: [
      /compatible media/i,
      /(geeignete betriebsmedien|betriebsmedien)/i,
      /使用可能流体/,
      /(совместимые рабочие среды|рабочая среда)/i,
    ],
  },
  {
    field: "operating_temperature",
    patterns: [
      /operating temperature/i,
      /betriebstemperatur/i,
      /使用温度範囲/,
      /рабочая температура/i,
    ],
  },
  {
    field: "weight",
    patterns: [
      /(net weight|approx\.? weight|weight)/i,
      /(nettogewicht|gewicht)/i,
      /(製品質量|質量)/,
      /(масса нетто|масса)/i,
    ],
  },
  {
    field: "friction_torque",
    patterns: [
      /friction torque/i,
      /reibmoment/i,
      /摩擦トルク/,
      /момент трения/i,
    ],
  },
  {
    field: "warranty",
    patterns: [/warranty/i, /garantie/i, /保証期間/, /гарантия/i],
  },
  {
    field: "channel_configuration",
    patterns: [/channel configuration/i],
  },
  {
    field: "port_thread",
    patterns: [/(port thread|thread specification)/i],
  },
];

function canonicalField(label) {
  const cleaned = String(label || "").replace(/\s+/g, " ").trim();
  const normalizedAlias = cleaned.toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    max_speed: "maximum_speed",
    maximum_speed_rpm: "maximum_speed",
    max_pressure: "maximum_pressure",
    maximum_pressure_mpa: "maximum_pressure",
    net_weight: "weight",
    weight_kg: "weight",
    component_materials: "body_material",
    material_and_surface_treatment: "body_material",
    maximum_temperature: "operating_temperature",
  };
  if (aliases[normalizedAlias]) return aliases[normalizedAlias];
  for (const rule of LABEL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(cleaned))) return rule.field;
  }
  return null;
}

function normalizedNumber(value, unitKind) {
  let text = String(value).trim().replace(/\s+/g, "");
  if ((unitKind === "g" || unitKind === "rpm") && /^\d{1,3}(,\d{3})+$/.test(text)) {
    text = text.replaceAll(",", "");
  } else if (text.includes(",") && text.includes(".")) {
    text = text.replaceAll(",", "");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function compactNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeValue(field, rawValue) {
  const raw = String(rawValue || "").replace(/\s+/g, " ").trim();
  const comparableRaw = raw
    .normalize("NFKC")
    .replace(/[–—−~～]/g, "-")
    .replace(/\s+/g, " ");
  if (!raw) return { normalized_value: "", unit: null };

  if (field === "model") {
    return { normalized_value: normalizeModel(raw), unit: null };
  }

  if (field === "weight") {
    const kgMatch = comparableRaw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|кг)\b/i);
    if (kgMatch) {
      const value = normalizedNumber(kgMatch[1], "kg");
      if (value !== null) return { normalized_value: compactNumber(value), unit: "kg" };
    }
    const gMatch = comparableRaw.match(/([0-9][0-9\s.,]*)\s*(?:g|г)\b/i);
    if (gMatch) {
      const value = normalizedNumber(gMatch[1], "g");
      if (value !== null) {
        return { normalized_value: compactNumber(value / 1000), unit: "kg" };
      }
    }
  }

  if (field === "maximum_pressure") {
    const match = comparableRaw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:MPa|МПа)/i);
    if (match) {
      const value = normalizedNumber(match[1], "mpa");
      if (value !== null) return { normalized_value: compactNumber(value), unit: "MPa" };
    }
  }

  if (field === "maximum_speed") {
    const match = comparableRaw.match(
      /([0-9]+(?:[.,][0-9]+)?)\s*(?:RPM|min(?:\^?-?1|⁻¹)|об\/мин)/i,
    );
    if (match) {
      const value = normalizedNumber(match[1], "rpm");
      if (value !== null) return { normalized_value: compactNumber(value), unit: "RPM" };
    }
  }

  if (field === "operating_temperature") {
    const values = [
      ...comparableRaw.matchAll(/([+-]?\s*\d+(?:[.,]\d+)?)\s*°?\s*C/gi),
    ]
      .map((match) => normalizedNumber(match[1].replace(/\s+/g, ""), "c"))
      .filter((value) => value !== null);
    if (values.length >= 2) {
      return {
        normalized_value: `${compactNumber(values[0])}..${compactNumber(values[1])}`,
        unit: "°C",
      };
    }
  }

  if (field === "passages") {
    const semanticPatterns = [
      /^\s*(\d+)\s*$/,
      /(\d+)\s*(?:-?\s*in(?:let)?\b|passages?|channels?|kan[aä]le?|kanal(?:-ausführung)?|流路|канал(?:а|ов|ы)?)/i,
      /(\d+)\s*(?:eing[aä]nge?|eingang|入力|вход(?:а|ов|ы)?)/i,
      /(\d+)\s*-\s*kanal/i,
      /(?:passages?|channels?|kanalzahl|流路数|количество каналов)\D{0,12}(\d+)/i,
    ];
    for (const pattern of semanticPatterns) {
      const match = comparableRaw.match(pattern);
      if (match) {
        return {
          normalized_value: String(Number(match[1])),
          unit: "passages",
          observation_status: "current-observed",
        };
      }
    }
    if (/vierkanal/i.test(comparableRaw) || /четыр[её]хканал/i.test(comparableRaw)) {
      return {
        normalized_value: "4",
        unit: "passages",
        observation_status: "current-observed",
      };
    }
    if (/\d/.test(comparableRaw)) {
      return {
        normalized_value: null,
        unit: null,
        observation_status: "parser-ambiguous",
      };
    }
  }

  if (field === "channel_configuration") {
    const text = normalizeText(raw);
    const inOut = text.match(/(\d+)\s*-?\s*in\s*-?\s*(\d+)\s*-?\s*out/);
    if (inOut) {
      return {
        normalized_value: `${Number(inOut[1])}-in-${Number(inOut[2])}-out`,
        unit: null,
      };
    }
    const passages = text.match(/(\d+)\s*(?:passages?|channels?)/);
    if (passages) {
      const count = Number(passages[1]);
      return { normalized_value: `${count}-in-${count}-out`, unit: null };
    }
  }

  if (field === "compatible_media") {
    const text = normalizeText(raw);
    const media = [];
    if (/(^|[^a-z])(air|luft)([^a-z]|$)|空気|воздух/.test(text)) media.push("air");
    if (/water|wasser|水|вода/.test(text)) media.push("water");
    if (/coolant|kühlmittel|クーラント|сож|охлажда/.test(text)) media.push("coolant");
    if (/(^|[^a-z])oil([^a-z]|$)|hydraulic oil|light oil|öl|油圧|作動油|масло/.test(text)) {
      media.push("oil");
    }
    if (/vacuum|vakuum|真空|вакуум/.test(text)) media.push("vacuum");
    if (media.length) {
      return { normalized_value: [...new Set(media)].sort().join("|"), unit: null };
    }
  }

  if (field === "body_material") {
    const text = normalizeText(raw);
    if (/6061/.test(text)) return { normalized_value: "aluminum-6061", unit: null };
    if (/45#|grade 45|steel 45|aisi 1045/.test(text)) {
      return { normalized_value: "steel-45", unit: null };
    }
    if (/316/.test(text)) return { normalized_value: "stainless-steel-316", unit: null };
    if (/304/.test(text)) return { normalized_value: "stainless-steel-304", unit: null };
  }

  if (field === "seal_material") {
    const text = normalizeText(raw);
    const materials = [];
    if (/ptfe|teflon|птфэ|テフロン/.test(text)) materials.push("ptfe");
    if (/fkm/.test(text)) materials.push("fkm");
    if (/o[- ]?ring|oリング|o-ring/.test(text)) materials.push("o-ring");
    if (materials.length) {
      return { normalized_value: [...new Set(materials)].sort().join("|"), unit: null };
    }
  }

  if (field === "protection_rating") {
    const match = raw.match(/\bIP\s*([0-9]{2})\b/i);
    if (match) return { normalized_value: `IP${match[1]}`, unit: null };
  }

  if (field === "mounting_type") {
    const text = normalizeText(raw);
    const tokens = [];
    if (/flange|flansch|フランジ|фланц/.test(text)) tokens.push("flange");
    if (/thread|gewinde|ねじ|резьб/.test(text)) tokens.push("threaded");
    if (/stator/.test(text)) tokens.push("stator");
    if (/rotor/.test(text)) tokens.push("rotor");
    for (const match of text.matchAll(/(\d+)\s*(?:x|×|-)\s*m\s*(\d+)/gi)) {
      tokens.push(`${Number(match[1])}xm${Number(match[2])}`);
    }
    if (tokens.length) {
      return { normalized_value: [...new Set(tokens)].sort().join("|"), unit: null };
    }
  }

  if (field === "warranty") {
    const match = raw.match(/(\d+)\s*(?:months?|monate|ヶ月|か月|месяц)/i);
    if (match) return { normalized_value: String(Number(match[1])), unit: "months" };
  }

  return {
    normalized_value: normalizeText(raw),
    unit: null,
    observation_status: "current-observed",
  };
}

function addObservation({
  model,
  field,
  rawValue,
  language,
  sourcePath,
  sourceType,
  notes = "",
  evidenceLevel = evidenceLevelFor(sourceType),
  verificationStatus = verificationFor(sourceType),
  publicClaimLevel = publicClaimLevelFor(sourceType),
  observationStatus = null,
  referencedSourcePath = null,
}) {
  const normalizedModel = normalizeModel(model);
  const normalizedField = canonicalField(field) || field;
  if (!normalizedModel || !normalizedField || rawValue === null || rawValue === undefined) return;

  const normalized = normalizeValue(normalizedField, rawValue);
  const normalized_value = normalized.normalized_value;
  const unit = normalized.unit;
  const resolvedObservationStatus =
    observationStatus || normalized.observation_status || "current-observed";
  if (!normalized_value && resolvedObservationStatus !== "parser-ambiguous") return;

  const relativePath = posix(sourcePath);
  const observation = {
    model: normalizedModel,
    field: normalizedField,
    raw_value: String(rawValue).replace(/\s+/g, " ").trim(),
    normalized_value,
    unit,
    language,
    source_path: relativePath,
    source_type: sourceType,
    source_hash: sha256(relativePath),
    evidence_level: evidenceLevel,
    verification_status: verificationStatus,
    observation_status: resolvedObservationStatus,
    referenced_source_path: referencedSourcePath,
    public_claim_level: publicClaimLevel,
    last_checked_at: AUDIT_DATE,
    decision_owner:
      verificationStatus === "manual-review-required" || verificationStatus === "conflict"
        ? "laocao"
        : null,
    notes,
  };
  observations.push(observation);

  const current = inventory.get(relativePath);
  if (current) {
    current.field_types = [...new Set([...current.field_types, normalizedField])].sort();
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter((candidate) => candidate.some(Boolean)).map((candidate) =>
    Object.fromEntries(headers.map((header, index) => [header, candidate[index] || ""])),
  );
}

function addProductHtmlSources() {
  const productFiles = [...trackedFiles].filter((file) => PRODUCT_FILE_RE.test(file)).sort();

  for (const file of productFiles) {
    const match = file.match(PRODUCT_FILE_RE);
    const language = match[1] || "en";
    const model = normalizeModel(match[2]);
    const $ = cheerio.load(readText(file));
    const sourceType = language === "en" ? "website-product-html" : "translated-product-html";
    const discoveredFields = new Set();

    addInventory(file, {
      sourceType,
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: [model],
      notes: "Product detail HTML containing visible specifications and JSON-LD.",
    });

    $("table.spec-table tr").each((_, row) => {
      const label = $(row).find("th").first().text().trim();
      const value = $(row).find("td").first().text().trim();
      const field = canonicalField(label);
      if (!field || !value) return;
      discoveredFields.add(field);
      addObservation({
        model,
        field,
        rawValue: value,
        language,
        sourcePath: file,
        sourceType:
          language === "en" ? "website-product-spec" : "translated-product-spec",
        notes: `Visible specification label: ${label}`,
      });
    });

    $('script[type="application/ld+json"]').each((_, script) => {
      const raw = $(script).html();
      if (!raw) return;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        throw new Error(`Invalid JSON-LD in ${file}: ${error.message}`);
      }
      const nodes = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      for (const node of nodes) {
        if (node?.["@type"] !== "Product") continue;
        for (const property of node.additionalProperty || []) {
          const field = canonicalField(property?.name);
          if (!field || property?.value === undefined) continue;
          discoveredFields.add(field);
          addObservation({
            model,
            field,
            rawValue: property.value,
            language,
            sourcePath: file,
            sourceType:
              language === "en" ? "website-json-ld" : "translated-json-ld",
            notes: `JSON-LD PropertyValue: ${property.name}`,
          });
        }
      }
    });

    const entry = inventory.get(file);
    entry.field_types = [...new Set([...entry.field_types, ...discoveredFields])].sort();
  }
}

function factFromCardTag(tag) {
  const value = tag.trim();
  if (!value) return null;
  if (/MPa|МПа/i.test(value) && /max|maximal|最高|макс/i.test(value)) {
    return ["maximum_pressure", value];
  }
  if (/RPM|min[⁻-]?1|об\/мин/i.test(value)) return ["maximum_speed", value];
  if (/flange|flansch|フランジ|фланц|thread|gewinde|ねじ|резьб/i.test(value)) {
    return ["mounting_type", value];
  }
  if (/6061|45#|steel|stahl|鋼|сталь|aluminum|aluminium|アルミ|алюмин/i.test(value)) {
    return ["body_material", value];
  }
  if (/IP\s*\d{2}|dust|staub|防じん|пыл/i.test(value)) {
    return ["protection_rating", value];
  }
  if (/\d+\s*(?:-in-|inlet|passage|канал|流路)/i.test(value)) {
    return ["channel_configuration", value];
  }
  return null;
}

function addProductListingSources() {
  const files = [...trackedFiles]
    .filter((file) => /^(?:(de|ja|ru)\/)?products(?:-p2)?\.html$/i.test(file))
    .sort();

  for (const file of files) {
    const language = inferLanguage(file);
    const sourceType = language === "en" ? "website-product-list" : "translated-product-list";
    const text = readText(file);
    const models = extractModels(text);
    addInventory(file, {
      sourceType,
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models,
      notes: "Product listing and product-card claims.",
    });
    const $ = cheerio.load(text);
    $(".product-card-large").each((_, card) => {
      const cardText = $(card).text();
      const model = extractModels(cardText)[0];
      if (!model) return;
      $(card)
        .find(".product-specs span")
        .each((__, span) => {
          const fact = factFromCardTag($(span).text());
          if (!fact) return;
          addObservation({
            model,
            field: fact[0],
            rawValue: fact[1],
            language,
            sourcePath: file,
            sourceType:
              language === "en" ? "website-product-card" : "translated-product-card",
            notes: "Product-card specification tag.",
          });
        });
    });
  }
}

function addSearchAndAiSources() {
  const searchFiles = ["search-index.json", "de/search-index.json", "ja/search-index.json", "ru/search-index.json"];
  for (const file of searchFiles) {
    if (!exists(file)) continue;
    const language = inferLanguage(file);
    const rows = readJson(file);
    const models = new Set();
    const fields = new Set();
    for (const row of rows) {
      const model = extractModels(`${row.id || ""} ${row.url || ""}`)[0];
      if (!model) continue;
      models.add(model);
      searchOrAiModels.add(model);
      const description = String(row.description || "");
      for (const [field, pattern] of [
        ["maximum_pressure", /([0-9]+(?:[.,][0-9]+)?)\s*(?:MPa|МПа)/i],
        ["maximum_speed", /([0-9]+(?:[.,][0-9]+)?)\s*(?:RPM|min[⁻-]?1|об\/мин)/i],
      ]) {
        const match = description.match(pattern);
        if (!match) continue;
        fields.add(field);
        addObservation({
          model,
          field,
          rawValue: match[0],
          language,
          sourcePath: file,
          sourceType: "search-or-ai-index",
          notes: "Product search-index description.",
        });
      }
      if (/flange|flansch|フランジ|фланц/i.test(description)) {
        fields.add("mounting_type");
        addObservation({
          model,
          field: "mounting_type",
          rawValue: description.match(/[^.]*?(?:flange|flansch|フランジ|фланц)[^.]*\.?/i)?.[0] || description,
          language,
          sourcePath: file,
          sourceType: "search-or-ai-index",
          notes: "Product search-index description.",
        });
      }
    }
    addInventory(file, {
      sourceType: "search-or-ai-index",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: [...models],
      fieldTypes: [...fields],
      notes: "Derived website search index; not an independent engineering source.",
    });
  }

  for (const file of ["llms.txt", "de/llms.txt", "ja/llms.txt", "ru/llms.txt"]) {
    if (!exists(file)) continue;
    const text = readText(file);
    const models = extractModels(text);
    for (const model of models) searchOrAiModels.add(model);
    addInventory(file, {
      sourceType: "search-or-ai-index",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models,
      notes: "AI-oriented discovery summary; not an independent engineering source.",
    });
  }
}

const CATALOG_FIELD_MAP = {
  passages: "passages",
  channel_configuration: "channel_configuration",
  port_thread: "port_thread",
  maximum_pressure_mpa: "maximum_pressure",
  maximum_speed_rpm: "maximum_speed",
  body_material: "body_material",
  seal_material: "seal_material",
  compatible_media: "compatible_media",
  mounting_type: "mounting_type",
  weight_kg: "weight",
};

function catalogRawValue(field, value) {
  if (value === null || value === undefined || value === "") return null;
  if (field === "maximum_pressure_mpa") return `${value} MPa`;
  if (field === "maximum_speed_rpm") return `${value} RPM`;
  if (field === "weight_kg") return `${value} kg`;
  if (field === "compatible_media" && Array.isArray(value)) return value.join(", ");
  return String(value);
}

function addLocalCatalogSources() {
  const csvPath = "catalog-project/data/catalog-data.csv";
  const jsonPath = "catalog-project/data/catalog-data.json";
  const evidencePath = "catalog-project/data/source-evidence.json";
  const schemaPath = "catalog-project/data/catalog-data-schema.json";

  if (exists(csvPath)) {
    const rows = parseCsv(readText(csvPath));
    addInventory(csvPath, {
      sourceType: "local-untracked-source",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: true,
      models: rows.map((row) => row.model),
      fieldTypes: Object.values(CATALOG_FIELD_MAP),
      notes:
        "Protected local catalog CSV, classified as local-untracked-source by task policy. Current Git tracking state is recorded separately; the file is read-only and not authoritative.",
    });
    for (const row of rows) {
      for (const [sourceField, field] of Object.entries(CATALOG_FIELD_MAP)) {
        const rawValue = catalogRawValue(sourceField, row[sourceField]);
        if (!rawValue) continue;
        addObservation({
          model: row.model,
          field,
          rawValue,
          language: "en",
          sourcePath: csvPath,
          sourceType: "local-untracked-source",
          notes: `CSV field: ${sourceField}; local verification label: ${row.verification_status || "unknown"}.`,
        });
      }
      if (row.temperature_min_c && row.temperature_max_c) {
        addObservation({
          model: row.model,
          field: "operating_temperature",
          rawValue: `${row.temperature_min_c}°C to ${row.temperature_max_c}°C`,
          language: "en",
          sourcePath: csvPath,
          sourceType: "local-untracked-source",
          notes: "CSV temperature range; local untracked source.",
        });
      }
    }
  }

  if (exists(jsonPath)) {
    const rows = readJson(jsonPath);
    addInventory(jsonPath, {
      sourceType: "local-untracked-source",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: true,
      models: rows.map((row) => row.model),
      fieldTypes: [...Object.values(CATALOG_FIELD_MAP), "operating_temperature"],
      notes:
        "Protected local catalog JSON, classified as local-untracked-source by task policy. Current Git tracking state is recorded separately; the file is read-only and not authoritative.",
    });
    for (const row of rows) {
      for (const [sourceField, field] of Object.entries(CATALOG_FIELD_MAP)) {
        const rawValue = catalogRawValue(sourceField, row[sourceField]);
        if (!rawValue) continue;
        addObservation({
          model: row.model,
          field,
          rawValue,
          language: "en",
          sourcePath: jsonPath,
          sourceType: "local-untracked-source",
          notes: `JSON field: ${sourceField}; local verification label: ${row.verification_status || "unknown"}.`,
        });
      }
      if (row.temperature_min_c !== null && row.temperature_max_c !== null) {
        addObservation({
          model: row.model,
          field: "operating_temperature",
          rawValue: `${row.temperature_min_c}°C to ${row.temperature_max_c}°C`,
          language: "en",
          sourcePath: jsonPath,
          sourceType: "local-untracked-source",
          notes: "JSON temperature range; local untracked source.",
        });
      }
    }
  }

  if (exists(evidencePath)) {
    const rows = readJson(evidencePath);
    addInventory(evidencePath, {
      sourceType: "local-untracked-source",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: true,
      models: rows.map((row) => row.model),
      fieldTypes: [
        ...new Set(
          rows.flatMap((row) =>
            (row.resolutions || []).map((resolution) => canonicalField(resolution.field)).filter(Boolean),
          ),
        ),
      ],
      notes:
        "Protected local evidence index, classified as local-untracked-source by task policy. Current Git tracking state is recorded separately; approval statements are not independently confirmed by Codex.",
    });
    for (const row of rows) {
      for (const resolution of row.resolutions || []) {
        const field = canonicalField(resolution.field);
        if (!field || !resolution.final_value) continue;
        addObservation({
          model: row.model,
          field,
          rawValue: resolution.final_value,
          language: "en",
          sourcePath: evidencePath,
          sourceType: "local-untracked-source",
          notes: `Resolution record claims basis ${resolution.resolution_basis || "unknown"}; approval not independently established.`,
        });
      }
    }
  }

  if (exists(schemaPath)) {
    addInventory(schemaPath, {
      sourceType: "local-untracked-source",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      notes: "Schema for read-only local catalog data; contains no product fact values.",
    });
  }
}

function referencedPathFromAudit(value) {
  const source = String(value || "").trim();
  if (!source) return null;
  const pathOnly = source
    .split(/\s+(?:lines?|page|sheet|cells?|metadata)\b/i)[0]
    .replace(/[;,]+$/, "");
  return pathOnly.includes("/") || pathOnly.endsWith(".html") ? posix(pathOnly) : null;
}

function classifyHistoricalObservation({ model, field, rawValue, sourceReference }) {
  const referencedSourcePath = referencedPathFromAudit(sourceReference);
  if (!referencedSourcePath || !exists(referencedSourcePath)) {
    return {
      observationStatus: referencedSourcePath ? "stale-reference" : "historical-unverified",
      referencedSourcePath,
    };
  }

  const binaryVisualCheck = readJson(
    "tests/fixtures/product-truth-audit-regressions.json",
  ).binary_visual_checks?.find(
    (check) =>
      check.source_path === referencedSourcePath &&
      check.source_sha256 === sha256(referencedSourcePath),
  );
  if (binaryVisualCheck?.stale_historical_values.includes(rawValue)) {
    return { observationStatus: "stale-reference", referencedSourcePath };
  }

  if (ENGINEERING_EXTENSIONS.has(path.extname(referencedSourcePath).toLowerCase())) {
    return { observationStatus: "manual-review-required", referencedSourcePath };
  }

  const normalized = normalizeValue(field, rawValue);
  if (
    field === "model_identity" &&
    normalizeModel(path.basename(referencedSourcePath, path.extname(referencedSourcePath))) ===
      normalizeModel(rawValue)
  ) {
    return { observationStatus: "historical-unverified", referencedSourcePath };
  }
  const corroborated = observations.some(
    (observation) =>
      observation.observation_status === "current-observed" &&
      observation.model === normalizeModel(model) &&
      observation.field === field &&
      observation.source_path === referencedSourcePath &&
      observation.normalized_value === normalized.normalized_value &&
      observation.unit === normalized.unit,
  );
  if (corroborated) {
    return { observationStatus: "historical-unverified", referencedSourcePath };
  }

  const currentText = readText(referencedSourcePath);
  if (currentText.includes(String(rawValue || "").trim())) {
    return { observationStatus: "parser-ambiguous", referencedSourcePath };
  }
  return { observationStatus: "stale-reference", referencedSourcePath };
}

function addExistingAuditSources() {
  const conflictCsv = "audit/fact-resolution/phase-1e-a/product-fact-conflicts.csv";
  if (exists(conflictCsv)) {
    const rows = parseCsv(readText(conflictCsv));
    addInventory(conflictCsv, {
      sourceType: "audit-conflict-record",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: true,
      models: rows.map((row) => row.model),
      fieldTypes: rows.map((row) => row.fact_type).filter(Boolean),
      notes: "Existing unresolved fact-conflict register.",
    });

    for (const row of rows) {
      const field = canonicalField(row.fact_type) || row.fact_type;
      for (const candidate of [
        {
          value: row.web_value,
          source: row.web_source,
          type: "website-audit-observation",
          evidence: "website-generated",
        },
        {
          value: row.pdf_value,
          source: row.pdf_source,
          type: "engineering-audit-observation",
          evidence: "engineering-primary",
        },
        {
          value: row.spreadsheet_value,
          source: row.spreadsheet_source,
          type: "engineering-audit-observation",
          evidence: "unknown",
        },
        {
          value: row.other_value,
          source: row.other_source,
          type: "website-audit-observation",
          evidence: "unknown",
        },
      ]) {
        if (!candidate.value) continue;
        const historicalStatus = classifyHistoricalObservation({
          model: row.model,
          field,
          rawValue: candidate.value,
          sourceReference: candidate.source,
        });
        addObservation({
          model: row.model,
          field,
          rawValue: candidate.value,
          language: "en",
          sourcePath: conflictCsv,
          sourceType: candidate.type,
          evidenceLevel: candidate.evidence,
          verificationStatus: "manual-review-required",
          observationStatus: historicalStatus.observationStatus,
          referencedSourcePath: historicalStatus.referencedSourcePath,
          publicClaimLevel:
            candidate.type === "website-audit-observation"
              ? "public-with-qualification"
              : "internal-only",
          notes: `Historical audit source reference: ${candidate.source || "not stated"}. It does not independently establish a current fact.`,
        });
      }
    }
  }

  const evidenceDirectory = "audit/fact-resolution/phase-1e-a/evidence-cards";
  for (const file of listFiles(evidenceDirectory).filter((candidate) => candidate.endsWith(".md"))) {
    const text = readText(file);
    addInventory(file, {
      sourceType: "audit-evidence-card",
      automaticallyParseable: false,
      manualEngineeringVerificationRequired: true,
      models: extractModels(text),
      fieldTypes: LABEL_RULES.map((rule) => rule.field).filter((field) =>
        new RegExp(field.replaceAll("_", "[ _-]"), "i").test(text),
      ),
      notes: "Human-readable evidence card; underlying engineering material requires manual verification.",
    });
  }
}

function inferFieldTypesFromText(text) {
  const fieldTypes = [];
  const tests = [
    ["weight", /\b(?:kg|g)\b|кг|質量|重量/i],
    ["maximum_pressure", /\b(?:MPa|bar|psi)\b|МПа/i],
    ["maximum_speed", /\bRPM\b|min⁻¹|об\/мин/i],
    ["compatible_media", /air|water|coolant|hydraulic|luft|wasser|空気|作動油|воздух|масло/i],
    ["mounting_type", /flange|thread|flansch|gewinde|フランジ|ねじ|фланц|резьб/i],
    ["protection_rating", /\bIP\s*\d{2}\b|dust|staub|防じん|пыл/i],
    ["body_material", /6061|45#|stainless|steel|aluminum|aluminium|сталь|алюмин|鋼|アルミ/i],
  ];
  for (const [field, pattern] of tests) {
    if (pattern.test(text)) fieldTypes.push(field);
  }
  return fieldTypes;
}

function addSecondaryTextSources() {
  const contentPatterns = [
    /^(?:(de|ja|ru)\/)?faq\.html$/i,
    /^(?:(de|ja|ru)\/)?application[^/]*\.html$/i,
    /^(?:(de|ja|ru)\/)?applications\.html$/i,
    /^(?:(de|ja|ru)\/)?blog[^/]*\.html$/i,
    /^(?:(de|ja|ru)\/)?installation\.html$/i,
    /^(?:(de|ja|ru)\/)?product-comparison\.html$/i,
  ];

  for (const file of [...trackedFiles].sort()) {
    if (!contentPatterns.some((pattern) => pattern.test(file))) continue;
    const text = readText(file);
    const language = inferLanguage(file);
    addInventory(file, {
      sourceType: language === "en" ? "website-technical-content" : "translated-content",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: extractModels(text),
      fieldTypes: inferFieldTypesFromText(text),
      notes: "Technical, FAQ, application, comparison, or article content containing product references.",
    });
  }

  for (const file of [...trackedFiles].filter((candidate) => candidate.startsWith("i18n/") && candidate.endsWith(".json")).sort()) {
    const text = readText(file);
    addInventory(file, {
      sourceType: "translated-content-source",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: extractModels(text),
      fieldTypes: inferFieldTypesFromText(text),
      notes: "Localization source, cache, editorial, override, SEO, or configuration data.",
    });
  }

  for (const file of [
    "scripts/build-localized-site.mjs",
    "scripts/validate-product-data.mjs",
    "scripts/generate-public-downloads-manifest.mjs",
    "scripts/translate-catalog-offline.py",
  ]) {
    if (!exists(file)) continue;
    const text = readText(file);
    addInventory(file, {
      sourceType: "content-generation-script",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: extractModels(text),
      fieldTypes: inferFieldTypesFromText(text),
      notes: "Script participating in generation, validation, localization, or download indexing.",
    });
  }

  if (exists("downloads/public-downloads.sha256")) {
    const text = readText("downloads/public-downloads.sha256");
    addInventory("downloads/public-downloads.sha256", {
      sourceType: "product-download-manifest",
      automaticallyParseable: true,
      manualEngineeringVerificationRequired: false,
      models: extractModels(text),
      notes: "Integrity manifest for public downloads; records file identity, not approved parameter values.",
    });
  }
}

function addEngineeringBinarySources() {
  const trackedEngineering = [...trackedFiles]
    .filter((file) => file.startsWith("downloads/"))
    .filter((file) => ENGINEERING_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  for (const file of trackedEngineering) {
    addInventory(file, {
      sourceType: "engineering-binary",
      automaticallyParseable: false,
      manualEngineeringVerificationRequired: true,
      models: extractModels(path.basename(file)),
      notes:
        "Binary engineering or technical file. Inventoried by path and hash only; approval and parameter content require manual engineering verification.",
    });
  }

  for (const file of listFiles("catalog-project/assets").filter((candidate) =>
    ENGINEERING_EXTENSIONS.has(path.extname(candidate).toLowerCase()),
  )) {
    addInventory(file, {
      sourceType: "local-untracked-engineering-binary",
      automaticallyParseable: false,
      manualEngineeringVerificationRequired: true,
      models: extractModels(path.basename(file)),
      notes:
        "Read-only local binary. Not copied into Git; approval and parameter content require manual engineering verification.",
    });
  }
}

function observationEligibleForTextComparison(observation) {
  if (observation.observation_status !== "current-observed") return false;
  const numericFields = new Set([
    "weight",
    "maximum_pressure",
    "maximum_speed",
    "operating_temperature",
    "passages",
    "warranty",
  ]);
  if (numericFields.has(observation.field)) return observation.unit !== null;
  return (
    observation.language === "en" ||
    observation.source_type.includes("local-untracked") ||
    observation.source_type.includes("engineering-audit")
  );
}

function groupConflicts() {
  const groups = new Map();
  for (const observation of observations) {
    if (observation.field === "model" || !observationEligibleForTextComparison(observation)) continue;
    const key = `${observation.model}\0${observation.field}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(observation);
  }

  const conflicts = [];
  for (const [key, candidates] of groups) {
    const [model, field] = key.split("\0");
    const values = new Map();
    for (const candidate of candidates) {
      const valueKey = `${candidate.normalized_value}\0${candidate.unit || ""}`;
      if (!values.has(valueKey)) {
        values.set(valueKey, {
          normalized_value: candidate.normalized_value,
          unit: candidate.unit,
          sources: [],
        });
      }
      const value = values.get(valueKey);
      if (
        !value.sources.some(
          (source) =>
            source.source_path === candidate.source_path &&
            source.source_type === candidate.source_type &&
            source.raw_value === candidate.raw_value,
        )
      ) {
        value.sources.push({
          raw_value: candidate.raw_value,
          source_path: candidate.source_path,
          source_type: candidate.source_type,
          source_hash: candidate.source_hash,
          language: candidate.language,
          evidence_level: candidate.evidence_level,
          verification_status: candidate.verification_status,
          last_checked_at: candidate.last_checked_at,
          notes: candidate.notes,
        });
      }
    }

    if (values.size < 2) continue;

    const observedValues = [...values.values()]
      .map((value) => ({
        ...value,
        sources: value.sources.sort((a, b) =>
          `${a.source_path}:${a.source_type}:${a.raw_value}`.localeCompare(
            `${b.source_path}:${b.source_type}:${b.raw_value}`,
          ),
        ),
      }))
      .sort((a, b) =>
        `${a.normalized_value}:${a.unit || ""}`.localeCompare(
          `${b.normalized_value}:${b.unit || ""}`,
        ),
      );
    if (
      field === "weight" &&
      observedValues.every((value) => value.unit === "kg") &&
      Math.max(...observedValues.map((value) => Number(value.normalized_value))) -
        Math.min(...observedValues.map((value) => Number(value.normalized_value))) <=
        0.01
    ) {
      continue;
    }
    const sourceTypes = observedValues.flatMap((value) =>
      value.sources.map((source) => source.source_type),
    );
    const suggested = [
      `downloads/${model}.pdf`,
      "current approved engineering drawing",
      "formal datasheet or order-specific specification",
    ].filter((candidate) => !candidate.startsWith("downloads/") || exists(candidate));

    conflicts.push({
      model,
      field,
      observed_values: observedValues,
      evidence_levels: [
        ...new Set(
          observedValues.flatMap((value) => value.sources.map((source) => source.evidence_level)),
        ),
      ].sort(),
      status: "unresolved",
      decision_owner: "laocao",
      suggested_engineering_materials: suggested,
      affects_public_website: sourceTypes.some(
        (type) => type.includes("website") || type.includes("translated"),
      ),
      affects_json_ld: sourceTypes.some((type) => type.includes("json-ld")),
      affects_search_or_ai_index: searchOrAiModels.has(model),
      notes:
        "No correct value was selected. Confirm applicability, revision, configuration, and approval status before changing any public source.",
    });
  }
  return conflicts.sort((a, b) => `${a.model}:${a.field}`.localeCompare(`${b.model}:${b.field}`));
}

function findMissingEvidence() {
  const publicGroups = new Map();
  const engineeringGroups = new Set();

  for (const observation of observations) {
    if (observation.observation_status !== "current-observed") continue;
    const key = `${observation.model}\0${observation.field}`;
    if (
      observation.evidence_level === "engineering-primary" ||
      observation.evidence_level === "approved-datasheet"
    ) {
      engineeringGroups.add(key);
    }
    if (
      observation.public_claim_level === "public-with-qualification" ||
      observation.public_claim_level === "public-verified"
    ) {
      if (!publicGroups.has(key)) publicGroups.set(key, new Set());
      publicGroups.get(key).add(observation.source_path);
    }
  }

  return [...publicGroups.entries()]
    .filter(([key]) => !engineeringGroups.has(key))
    .map(([key, sources]) => {
      const [model, field] = key.split("\0");
      return {
        model,
        field,
        verification_status: "missing-evidence",
        decision_owner: "laocao",
        public_sources: [...sources].sort(),
        required_evidence:
          "Approved engineering drawing, approved datasheet, or formal order-specific specification.",
      };
    })
    .sort((a, b) => `${a.model}:${a.field}`.localeCompare(`${b.model}:${b.field}`));
}

function categorizedFindings(statuses) {
  return observations
    .filter((observation) => statuses.includes(observation.observation_status))
    .map((observation) => ({ ...observation }))
    .sort((a, b) =>
      `${a.model}:${a.field}:${a.source_path}:${a.raw_value}`.localeCompare(
        `${b.model}:${b.field}:${b.source_path}:${b.raw_value}`,
      ),
    );
}

function runRegressionChecks(conflictDocument) {
  const fixturePath = "tests/fixtures/product-truth-audit-regressions.json";
  const fixture = readJson(fixturePath);
  for (const regression of fixture.passage_parser) {
    const parsed = normalizeValue("passages", regression.raw_value);
    if (
      parsed.normalized_value !== regression.expected_value ||
      parsed.observation_status !== regression.expected_status
    ) {
      throw new Error(
        `Passage parser regression failed for ${JSON.stringify(regression.raw_value)}.`,
      );
    }
  }

  const activePassageConflict = conflictDocument.active_conflicts.find(
    (conflict) => conflict.model === "BP-4P-30-0001" && conflict.field === "passages",
  );
  if (activePassageConflict) {
    throw new Error("BP-4P-30-0001 passages must not be an active conflict.");
  }
  const currentPassageThirty = observations.some(
    (observation) =>
      observation.model === "BP-4P-30-0001" &&
      observation.field === "passages" &&
      observation.observation_status === "current-observed" &&
      observation.normalized_value === "30",
  );
  if (currentPassageThirty) {
    throw new Error("BP-4P-30-0001 Ø30 mm was incorrectly parsed as 30 passages.");
  }

  for (const regression of fixture.historical_current_source_absence) {
    const finding = conflictDocument.stale_references.find(
      (observation) =>
        observation.model === regression.model &&
        observation.field === regression.field &&
        observation.raw_value === regression.historical_value,
    );
    if (!finding || finding.observation_status !== regression.expected_status) {
      throw new Error(
        `Historical source regression failed for ${regression.model} / ${regression.field}.`,
      );
    }
    if (
      conflictDocument.active_conflicts.some(
        (conflict) =>
          conflict.model === regression.model && conflict.field === regression.field,
      )
    ) {
      throw new Error(
        `Historical-only value incorrectly created an active conflict for ${regression.model} / ${regression.field}.`,
      );
    }
  }
  for (const check of fixture.binary_visual_checks || []) {
    if (!exists(check.source_path) || sha256(check.source_path) !== check.source_sha256) {
      throw new Error(`Binary visual-check identity changed: ${check.source_path}.`);
    }
    for (const staleValue of check.stale_historical_values) {
      if (
        !conflictDocument.stale_references.some(
          (finding) =>
            finding.referenced_source_path === check.source_path &&
            finding.raw_value === staleValue,
        )
      ) {
        throw new Error(`Reviewed stale binary statement was not retained: ${staleValue}.`);
      }
    }
  }
  if (!conflictDocument.active_conflicts.length) {
    throw new Error("No active conflicts remain; current-source conflict detection regressed.");
  }
}

function writeJson(relativePath, value) {
  fs.mkdirSync(path.dirname(absolute(relativePath)), { recursive: true });
  fs.writeFileSync(absolute(relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function markdownEscape(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function regressionCaseSection(conflictDocument) {
  const caseStatus = (model, field) => {
    if (
      conflictDocument.active_conflicts.some(
        (conflict) => conflict.model === model && conflict.field === field,
      )
    ) {
      return "active_conflict";
    }
    const stale = conflictDocument.stale_references.filter(
      (finding) => finding.model === model && finding.field === field,
    );
    const manual = conflictDocument.historical_findings.filter(
      (finding) =>
        finding.model === model &&
        finding.field === field &&
        finding.observation_status === "manual-review-required",
    );
    return [
      stale.length ? `${stale.length} stale-reference` : null,
      manual.length ? `${manual.length} manual-review-required` : null,
    ]
      .filter(Boolean)
      .join("; ") || "current-observed without conflict";
  };

  return [
    "## 7. Required regression cases",
    "",
    "| Model | Field | Result |",
    "| --- | --- | --- |",
    `| \`BP-4P-30-0001\` | \`passages\` | 4 passages retained; Ø30 mm bore excluded from passage count; ${caseStatus("BP-4P-30-0001", "passages")} |`,
    `| \`BP-4P-30-0001\` | \`maximum_speed\` | Current sources show 200 RPM; historical 80 RPM does not create an active conflict; ${caseStatus("BP-4P-30-0001", "maximum_speed")} |`,
    `| \`BP-1P-0003\` | \`operating_temperature\` | Current sources show -20°C to +80°C; historical +120°C does not create an active conflict; ${caseStatus("BP-1P-0003", "operating_temperature")} |`,
    `| \`BP-2P-95-0001\` | \`test_pressure\` | Current public page does not directly state 12 MPa. The current PDF (SHA-256 \`e93209eddc568b7e6b4073e1d5316dbf29ce9be086de65454becd52b29e1b50c\`) visibly says “Test scope confirmed by approved order,” not 1.5× rated pressure; ${caseStatus("BP-2P-95-0001", "test_pressure")} |`,
    "",
    "These classifications are audit-semantics results, not engineering decisions.",
    "",
  ].join("\n");
}

function buildReport(inventoryDocument, conflictDocument) {
  const byType = new Map();
  for (const source of inventoryDocument.sources) {
    byType.set(source.source_type, (byType.get(source.source_type) || 0) + 1);
  }
  const modelList = inventoryDocument.models;
  const fieldList = inventoryDocument.field_types;
  const manualItems = conflictDocument.conflicts
    .map(
      (conflict) =>
        `${conflict.model} / ${conflict.field}: check ${conflict.suggested_engineering_materials.join("; ")}`,
    )
    .sort();

  const lines = [
    "# Product Truth Source Inventory and Conflict Baseline",
    "",
    `Baseline date: ${AUDIT_DATE}`,
    "",
    `Repository baseline: \`${BASELINE_COMMIT}\``,
    "",
    "Issue: `#14`",
    "",
    "## 1. Scope",
    "",
    "Phase 1B re-read product-detail HTML in four languages, JSON-LD, product cards, search and AI derivatives, localization sources, existing audit evidence, public download manifests, tracked engineering files, content-generation scripts, and approved read-only local catalog sources.",
    "",
    "The audit normalizes current observations and reports differences. Historical audit statements remain visible but cannot independently create an active conflict. The audit does not decide which conflicting value is correct.",
    "",
    "## 2. Source inventory",
    "",
    "| Source type | Files |",
    "| --- | ---: |",
    ...[...byType.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => `| \`${type}\` | ${count} |`),
    "",
    `Total source files: **${inventoryDocument.source_count}**`,
    "",
    `Git-tracked sources: **${inventoryDocument.summary.git_tracked_sources}**`,
    "",
    `Git-untracked sources: **${inventoryDocument.summary.local_untracked_sources}**`,
    "",
    `Protected local catalog sources classified by task policy: **${inventoryDocument.summary.protected_local_catalog_sources}**`,
    "",
    "When `PRODUCT_TRUTH_CATALOG_ROOT` is set, every `catalog-project/` source is read from that external directory and classified as a read-only local input, even if a path with the same name also exists in Git. No catalog file is copied into this change.",
    "",
    `Manual engineering verification sources: **${inventoryDocument.summary.manual_engineering_verification_sources}**`,
    "",
    "The complete path, source type, Git state, SHA-256, parseability, model count, and field types are in `audit/product-truth-source-inventory.json`.",
    "",
    "## 3. Models and fields",
    "",
    `Models observed: **${modelList.length}**`,
    "",
    modelList.map((model) => `\`${model}\``).join(", "),
    "",
    `Normalized fields observed: **${fieldList.length}**`,
    "",
    fieldList.map((field) => `\`${field}\``).join(", "),
    "",
    `Normalized fact observations: **${inventoryDocument.summary.observation_count}**`,
    "",
    "## 4. Conflict baseline",
    "",
    `Previous unresolved-conflict baseline: **56**`,
    "",
    `Active conflicts after semantic correction: **${conflictDocument.summary.active_conflicts}**`,
    "",
    `Historical findings: **${conflictDocument.summary.historical_findings}**`,
    "",
    `Stale references: **${conflictDocument.summary.stale_references}**`,
    "",
    `Parser ambiguities: **${conflictDocument.summary.parser_ambiguities}**`,
    "",
    "| Model | Field | Normalized values | Public HTML | JSON-LD | Search/AI |",
    "| --- | --- | --- | --- | --- | --- |",
    ...conflictDocument.conflicts.map(
      (conflict) =>
        `| \`${conflict.model}\` | \`${conflict.field}\` | ${conflict.observed_values
          .map((value) => `\`${markdownEscape(value.normalized_value)}${value.unit ? ` ${value.unit}` : ""}\``)
          .join("<br>")} | ${conflict.affects_public_website ? "Yes" : "No"} | ${conflict.affects_json_ld ? "Yes" : "No"} | ${conflict.affects_search_or_ai_index ? "Yes" : "No"} |`,
    ),
    "",
    "Every active conflict is `unresolved`, has decision owner `laocao`, and contains no winning or correct value. Only `current-observed` values with unambiguous field semantics and normalized units participate.",
    "",
    "## 5. Missing evidence",
    "",
    `Public model-field groups without a parsed primary or approved supporting observation: **${conflictDocument.summary.missing_evidence_count}**`,
    "",
    "This is a traceability count, not proof that evidence does not exist. Binary drawings and datasheets were inventoried but intentionally not interpreted automatically.",
    "",
    "## 6. Manual engineering confirmation queue",
    "",
    ...manualItems.slice(0, 100).map((item) => `- ${item}`),
    ...(manualItems.length > 100
      ? [`- ${manualItems.length - 100} additional model-field checks are retained in the machine-readable conflict report.`]
      : []),
    "",
    regressionCaseSection(conflictDocument),
    "## 8. Potential downstream impact",
    "",
    "- **Website:** unresolved values may appear in visible specifications, cards, articles, or application guidance.",
    "- **JSON-LD:** some unresolved values are repeated as Product `additionalProperty` claims.",
    "- **Search:** product-page bodies and descriptions are copied into language-specific search indexes.",
    "- **AI citation:** `llms.txt`, search indexes, and localized pages can propagate public claims without creating independent evidence.",
    "- **Downloads:** engineering and catalog files may contain primary-looking values, but applicability and approval must be confirmed manually.",
    "",
    "## 9. Next phase recommendation",
    "",
    "The remaining active conflicts should be handled in separate, model-scoped decision tasks. Each task must obtain the current approved engineering source and revision from `laocao` before proposing synchronized public changes.",
    "",
    "## 10. Non-modification declaration",
    "",
    "This task did not modify any public product fact, product HTML, localized parameter, JSON-LD, search index, `llms.txt`, product CSV/JSON fact value, download, `catalog-project/` file, server file, or production deployment.",
  ];
  return `${lines.join("\n")}\n`;
}

function validateRequiredInputs() {
  const missing = requiredPaths.filter((relativePath) => !exists(relativePath));
  if (missing.length) {
    throw new Error(`Required audit input(s) missing: ${missing.join(", ")}`);
  }
  const catalogTrackedChanges = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=no", "--", "catalog-project"],
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  if (catalogTrackedChanges) {
    throw new Error(
      `Protected catalog-project tracked files have local modifications: ${catalogTrackedChanges}`,
    );
  }
}

function initializeKnownModels() {
  for (const file of trackedFiles) {
    const match = file.match(PRODUCT_FILE_RE);
    if (match) knownModels.add(normalizeModel(match[2]));
  }

  const catalogJson = "catalog-project/data/catalog-data.json";
  if (exists(catalogJson)) {
    for (const row of readJson(catalogJson)) {
      if (row.model) knownModels.add(normalizeModel(row.model));
    }
  }

  const conflictCsv = "audit/fact-resolution/phase-1e-a/product-fact-conflicts.csv";
  if (exists(conflictCsv)) {
    for (const row of parseCsv(readText(conflictCsv))) {
      if (row.model) knownModels.add(normalizeModel(row.model));
    }
  }

  for (const file of trackedFiles) {
    if (!file.startsWith("downloads/")) continue;
    const stem = path.basename(file, path.extname(file));
    if (/^BP-[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(stem)) {
      knownModels.add(normalizeModel(stem));
    }
  }
}

function main() {
  validateRequiredInputs();
  initializeKnownModels();
  addProductHtmlSources();
  addProductListingSources();
  addSearchAndAiSources();
  addLocalCatalogSources();
  addExistingAuditSources();
  addSecondaryTextSources();
  addEngineeringBinarySources();

  const activeConflicts = groupConflicts();
  const missingEvidence = findMissingEvidence();
  const historicalFindings = categorizedFindings([
    "historical-unverified",
    "manual-review-required",
  ]);
  const staleReferences = categorizedFindings(["stale-reference"]);
  const parserAmbiguities = categorizedFindings(["parser-ambiguous"]);
  const sources = [...inventory.values()].sort((a, b) =>
    a.source_path.localeCompare(b.source_path),
  );
  const models = [...new Set(sources.flatMap((source) => source.models))].sort();
  const fieldTypes = [...new Set(observations.map((observation) => observation.field))].sort();

  const inventoryDocument = {
    schema_version: "2.0",
    audit_date: AUDIT_DATE,
    repository: "caoguangcheng9-lgtm/begapunk-website",
    baseline_commit: BASELINE_COMMIT,
    source_count: sources.length,
    models,
    model_count: models.length,
    field_types: fieldTypes,
    field_type_count: fieldTypes.length,
    summary: {
      observation_count: observations.length,
      current_observations: observations.filter(
        (observation) => observation.observation_status === "current-observed",
      ).length,
      historical_findings: historicalFindings.length,
      stale_references: staleReferences.length,
      parser_ambiguities: parserAmbiguities.length,
      git_tracked_sources: sources.filter((source) => source.git_tracked).length,
      local_untracked_sources: sources.filter((source) => !source.git_tracked).length,
      protected_local_catalog_sources: sources.filter(
        (source) => source.source_type === "local-untracked-source",
      ).length,
      automatically_parseable_sources: sources.filter(
        (source) => source.automatically_parseable,
      ).length,
      manual_engineering_verification_sources: sources.filter(
        (source) => source.manual_engineering_verification_required,
      ).length,
    },
    sources,
  };

  const conflictDocument = {
    schema_version: "2.0",
    audit_date: AUDIT_DATE,
    repository: "caoguangcheng9-lgtm/begapunk-website",
    baseline_commit: BASELINE_COMMIT,
    summary: {
      active_conflicts: activeConflicts.length,
      historical_findings: historicalFindings.length,
      stale_references: staleReferences.length,
      parser_ambiguities: parserAmbiguities.length,
      missing_evidence_count: missingEvidence.length,
      decision_owner: "laocao",
      conflict_status: "active_conflict",
    },
    active_conflicts: activeConflicts,
    conflicts: activeConflicts,
    historical_findings: historicalFindings,
    stale_references: staleReferences,
    parser_ambiguities: parserAmbiguities,
    missing_evidence: missingEvidence,
  };

  runRegressionChecks(conflictDocument);

  writeJson(INVENTORY_PATH, inventoryDocument);
  writeJson(CONFLICT_PATH, conflictDocument);
  fs.writeFileSync(absolute(REPORT_PATH), buildReport(inventoryDocument, conflictDocument), "utf8");

  console.log(
    `Product truth audit completed: ${sources.length} sources, ${models.length} models, ${fieldTypes.length} normalized fields, ${activeConflicts.length} active conflicts, ${historicalFindings.length} historical findings, ${staleReferences.length} stale references, ${parserAmbiguities.length} parser ambiguities, and ${missingEvidence.length} missing-evidence groups.`,
  );
  console.log("Business conflicts were reported without selecting a winning value.");
}

try {
  main();
} catch (error) {
  console.error(`Product truth audit failed: ${error.message}`);
  process.exit(1);
}
