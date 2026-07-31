import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { load } from 'cheerio';

const sourceRoot = path.resolve(import.meta.dirname, '..');
const i18nRoot = path.join(sourceRoot, 'i18n');
const config = JSON.parse(await fs.readFile(path.join(i18nRoot, 'config.json'), 'utf8'));
const glossary = JSON.parse(await fs.readFile(path.join(i18nRoot, 'glossary.json'), 'utf8'));
const activeLanguageCodes = new Set(config.activeLanguageCodes || config.languages.map((language) => language.code));
const activeLanguages = config.languages.filter((language) => activeLanguageCodes.has(language.code));
const mode = process.argv[process.argv.indexOf('--mode') + 1] || 'extract';
const catalogPath = path.join(i18nRoot, 'source-catalog.json');
const cacheRoot = process.env.I18N_CACHE_ROOT
  ? path.resolve(process.env.I18N_CACHE_ROOT)
  : path.join(i18nRoot, 'cache');
const outputRoot = process.env.I18N_OUTPUT_ROOT
  ? path.resolve(process.env.I18N_OUTPUT_ROOT)
  : sourceRoot;
const overridesByLanguage = new Map();
const editorialOverridesByLanguage = new Map();
const seoByLanguage = new Map();
for (const language of activeLanguages) {
  const overridePath = path.join(i18nRoot, 'overrides', `${language.code}.json`);
  try {
    overridesByLanguage.set(language.code, JSON.parse(await fs.readFile(overridePath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    overridesByLanguage.set(language.code, {});
  }
  const editorialPath = path.join(i18nRoot, 'editorial', `${language.code}.json`);
  try {
    editorialOverridesByLanguage.set(language.code, JSON.parse(await fs.readFile(editorialPath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    editorialOverridesByLanguage.set(language.code, {});
  }
  const seoPath = path.join(i18nRoot, 'seo', `${language.code}.json`);
  try {
    seoByLanguage.set(language.code, JSON.parse(await fs.readFile(seoPath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    seoByLanguage.set(language.code, {});
  }
}
const excludedSelector = config.excludedSelectors.join(',');
const translatableMetaSelectors = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
];

function pageUrl(languageCode, pageName) {
  const suffix = pageName === 'index.html' ? '' : pageName;
  if (languageCode === config.sourceLanguage.code) {
    return `${config.siteUrl}/${suffix}`;
  }
  return `${config.siteUrl}/${languageCode}/${suffix}`;
}

function switcherReference(currentLanguageCode, targetLanguageCode, pageName) {
  if (currentLanguageCode === config.sourceLanguage.code) {
    return targetLanguageCode === config.sourceLanguage.code
      ? pageName
      : `${targetLanguageCode}/${pageName}`;
  }
  if (targetLanguageCode === config.sourceLanguage.code) return `../${pageName}`;
  if (targetLanguageCode === currentLanguageCode) return pageName;
  return `../${targetLanguageCode}/${pageName}`;
}

function shouldTranslate(value) {
  const text = value.trim();
  return text.length > 0 && /[A-Za-z]/.test(text) && !/^[-+]?\d[\d\s.,%°/:-]*$/.test(text);
}

function collectRecords($) {
  const records = [];
  const coveredTextNodes = new WeakSet();
  const primarySelector = 'title,p,h1,h2,h3,h4,h5,h6,li,td,th,label,button,option,figcaption,legend';

  const markCovered = (element) => {
    $(element).find('*').addBack().contents().each((_, node) => {
      if (node.type === 'text') coveredTextNodes.add(node);
    });
  };

  const addHtmlElement = (element) => {
    if ($(element).closest(excludedSelector).length) return;
    const source = ($(element).html() || '').trim();
    if (!shouldTranslate($(element).text())) return;
    records.push({ type: 'html', element, source });
    markCovered(element);
  };

  const addTextNode = (node) => {
    if (coveredTextNodes.has(node)) return;
    const parent = $(node).parent();
    if (parent.closest(excludedSelector).length) return;
    const original = node.data || '';
    const trimmed = original.trim();
    if (!shouldTranslate(trimmed)) return;
    records.push({ type: 'text', node, original, source: trimmed });
  };

  $(primarySelector).each((_, element) => {
    const ancestor = $(element).parents(primarySelector).first();
    if (!ancestor.length) addHtmlElement(element);
  });

  $('body a, body span').each((_, element) => {
    if ($(element).parents(primarySelector).length) return;
    if ($(element).parents('a,span').length) return;
    addHtmlElement(element);
  });

  $('body *').addBack('body').contents().each((_, node) => {
    if (node.type === 'text') addTextNode(node);
  });

  for (const attribute of config.translatedAttributes) {
    $(`[${attribute}]`).each((_, element) => {
      if ($(element).closest(excludedSelector).length) return;
      const source = ($(element).attr(attribute) || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute, source });
    });
  }

  $('input[type="submit"][value], input[type="button"][value]').each((_, element) => {
    const source = ($(element).attr('value') || '').trim();
    if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute: 'value', source });
  });

  for (const selector of translatableMetaSelectors) {
    $(selector).each((_, element) => {
      const source = ($(element).attr('content') || '').trim();
      if (shouldTranslate(source)) records.push({ type: 'attribute', element, attribute: 'content', source });
    });
  }
  return records;
}

async function loadPages() {
  const pages = [];
  for (const pageName of config.pages) {
    const filePath = path.join(sourceRoot, pageName);
    const html = await fs.readFile(filePath, 'utf8');
    const $ = load(html, { decodeEntities: false });
    pages.push({ pageName, html, $, records: collectRecords($) });
  }
  return pages;
}

function catalogFromPages(pages) {
  const sources = new Map();
  for (const page of pages) {
    for (const record of page.records) {
      if (!sources.has(record.source)) sources.set(record.source, new Set());
      sources.get(record.source).add(page.pageName);
    }
  }
  return [...sources.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, pagesUsingText]) => ({
      id: crypto.createHash('sha256').update(source).digest('hex').slice(0, 16),
      source,
      pages: [...pagesUsingText].sort(),
    }));
}

async function extractCatalog(pages) {
  const entries = catalogFromPages(pages);
  const catalog = {
    sourceLanguage: config.sourceLanguage.code,
    generatedAt: new Date().toISOString(),
    pages: config.pages,
    entries,
  };
  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Extracted ${entries.length} unique strings from ${config.pages.length} pages.`);
  console.log(`Catalog: ${catalogPath}`);
  return catalog;
}

function protectTerms(source, languageCode) {
  const replacements = [];
  const terms = [
    ...Object.entries(glossary.preferredTerms[languageCode] || {}).map(([from, to]) => ({ from, to })),
    ...glossary.protectedTerms.map((term) => ({ from: term, to: term })),
  ].sort((a, b) => b.from.length - a.from.length);

  const prepared = source.split(/(<[^>]+>)/g).map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) return part;
    let text = part;
    for (const term of terms) {
      const pattern = new RegExp(term.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      text = text.replace(pattern, () => {
        const token = `__BEGAPUNK_TERM_${replacements.length}__`;
        replacements.push({ token, value: term.to });
        return token;
      });
    }
    return text;
  }).join('');

  return {
    prepared,
    restore(translated) {
      let result = translated;
      for (const replacement of replacements) {
        result = result.replaceAll(replacement.token, replacement.value);
      }
      return decodeEntities(result);
    },
  };
}

function decodeEntities(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeJapaneseOutput(html) {
  const replacements = [
    ['びんの詰物及びおおう', 'ボトル充填・キャッピング'],
    ['びんの詰物およびおおう', 'ボトル充填・キャッピング'],
    ['詰物', '充填'],
    ['おおう', 'キャッピング'],
    ['締め金で止めること', 'クランプ'],
    ['締め金', 'クランプ'],
    ['回転式接合箇所', 'ロータリージョイント'],
    ['中空中空径', '中空穴'],
    ['空中空径', '中空穴'],
    ['空 中空径', '中空穴'],
    ['空中マニホールド', 'エアマニホールド'],
    ['据え付け品', '治具'],
    ['デッサン', '図面'],
    ['インストール', '取付'],
    ['プロシージャ', '手順'],
    ['物質的な', '材質上の'],
    ['物質的', '材質'],
    ['マウントタイプ', '取付方式'],
    ['純重量', '質量'],
    ['提案されたモデル', '推奨機種'],
    ['選択の焦点', '選定時の確認事項'],
    ['共通の機能', '代表的な機能'],
    ['機械類', '機械'],
    ['土台', '取付'],
    ['メディア', '使用流体'],
    ['義務周期', 'デューティサイクル'],
    ['義務', '使用条件'],
    ['derate', '定格を下げる'],
    ['流路 の', '流路の'],
    ['用途 の', '用途の'],
    ['最大の圧力', '最高使用圧力'],
    ['最高の圧力', '最高使用圧力'],
    ['最大の速度', '最高使用回転数'],
    ['最高の速度', '最高使用回転数'],
    ['最高のRPM', '最高使用回転数'],
    ['ニンポー', '寧波'],
    ['ライト オイル', '低粘度油'],
    ['冷却剤', 'クーラント'],
    ['1-in-1-out', '1流路'],
    ['2-in-2-out', '2流路'],
    ['3-in-3-out', '3流路'],
    ['4-in-4-out', '4流路'],
    ['8-in-8-out', '8流路'],
    ['1-in-6-out', '1入力6出力'],
    ['2-in-3-out', '2入力3出力'],
    ['2-in-4-out', '2入力4出力'],
    ['4-in-4out', '4流路'],
    ['images/optimized/2流路-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3流路-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['カスタムロータリージョイント', '特注ロータリージョイント'],
    ['カスタム ロータリージョイント', '特注ロータリージョイント'],
    ['カスタム RFQ', '特注品・見積依頼'],
    ['誰がこれのためにいるのか:', '対象読者：'],
    ['オートメーション エンジニア', '自動化設備技術者'],
    ['メンテナンス マネージャー', '保全担当者'],
    ['レーザーの管の切断', 'レーザー管切断'],
    ['管の打抜き機', 'レーザー管切断機'],
    ['援助のガス', 'アシストガス'],
    ['助けのガス', 'アシストガス'],
    ['索引のテーブル', 'インデックステーブル'],
    ['シーリング頭部', 'シールヘッド'],
    ['使用条件の周期', '運転サイクル'],
    ['コンクルージョン', 'まとめ'],
    ['Specs', '仕様'],
    ['Spec', '仕様'],
    ['Mistake', '失敗例'],
    ['Undersizing', '径不足'],
    ['Distroy', '損傷させる'],
    ['Pinout', 'ピン配列'],
    ['セレクション', '選定'],
    ['カスタム の', '特注品の'],
    ['適用範囲が広いホース', 'フレキシブルホース'],
    ['堅い管', '硬質配管'],
    ['肯定的な圧力', '正圧'],
    ['唇シール', 'リップシール'],
    ['O-Rings', 'Oリング'],
    ['ポジシァヨナー', 'ポジショナー'],
    ['電子工学及び電池のテストの治具', '電子部品・バッテリー試験治具'],
    ['電子工学', '電子機器'],
    ['据え付け品', '治具'],
    ['密集した', 'コンパクトな'],
    ['回転式点検場所', '回転検査装置'],
    ['回転式移動', '回転部への供給'],
    ['空気そして真空', '空気と真空'],
    ['空気電気', '空圧・電気'],
    ['気圧電気', '空圧・電気'],
    ['チャネルカウント', '流路数'],
    ['信号カウント', '信号数'],
    ['流路の計算', '流路数'],
    ['予備チャネル', '予備流路'],
    ['マシンビルダー', '機械メーカー'],
    ['工具細工', '治具'],
    ['真空のコップ', '真空吸着パッド'],
    ['細胞の処理', 'セル搬送'],
    ['電池の巻上げ', '電池材料の巻取り'],
    ['洗剤材料', '清浄性に配慮した材質'],
    ['物質的な条件', '材質条件'],
    ['製造業装置', '製造装置'],
    ['空気吹き出し', 'エアブロー'],
    ['空気の締め金で止めること', '空圧クランプ'],
    ['空気グリッパー', '空圧グリッパー'],
    ['見直しる', '検討する'],
    ['送って下さい', 'お送りください'],
    ['下さい', 'ください'],
    ['堅い治具の封筒', '狭い治具スペース'],
    ['土台スペース', '取付スペース'],
    ['土台:', '取付:'],
    ['織物及び印刷', '繊維・印刷'],
    ['RPM', 'min⁻¹'],
    ['rpm', 'min⁻¹'],
    ['Max pressure', '最高使用圧力'],
    ['max pressure', '最高使用圧力'],
    ['Max speed', '最高使用回転数'],
    ['max speed', '最高使用回転数'],
    ['?78.9', 'φ78.9'],
    ['?64', 'φ64'],
    ['?6 mm', 'φ6 mm'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replaceAll('の特長', '')
    .replace(/最高の(\d+(?:\.\d+)?\s*MPa)/g, '最高使用圧力$1')
    .replace(/最高の(\d[\d,]*(?:\.\d+)?\s*RPM)/g, '最高使用回転数$1')
    .replace(/(\d+(?:\.\d+)?\s*MPa)最高/g, '最高使用圧力$1')
    .replace(/(\d[\d,]*(?:\.\d+)?\s*RPM)最高/g, '最高使用回転数$1')
    .replace(/最大の使用圧力/g, '最高使用圧力')
    .replace(/圧力を変形させ/g, '圧力を下げ')
    .replace(/速度を変形させ/g, '回転数を下げ')
    .replace(/ボディ変形/g, '本体形状')
    .replace(/(\d+\s*mm|G1\/\d+) の変形/g, '$1仕様')
    .replace(/クリーンルームの変形/g, 'クリーンルーム仕様')
    .replace(/([1-9])。\s*(?:\1。|。)\s*/g, '$1. ')
    .replace(/([1-9])。\s*/g, '$1. ')
    .replace(/\s+対\.\s+/g, 'と')
    .replace(/(BP-[A-Z0-9-]+)の特長/g, '$1')
    .replace(/sales@begapunk\.comの特長/g, 'sales@begapunk.com')
    .replace(/(機種比較|カスタム RFQ|空気圧工具|用途|製品情報)の特長/g, '$1');
  return localizeJapaneseStructuredData(normalized);
}

function localizeJapaneseStructuredData(html) {
  const $ = load(html, { decodeEntities: false });
  const pageHeading = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const pageDescription = $('meta[name="description"]').attr('content')?.trim();
  const propertyNames = new Map([
    ['Product type', '製品種別'],
    ['SKU', '型式'],
    ['Passages', '流路数'],
    ['Orifice size', 'オリフィス径'],
    ['Maximum pressure', '最高使用圧力'],
    ['Maximum speed', '最高使用回転数'],
    ['Compatible media', '使用可能流体'],
    ['Body material', '本体材質'],
    ['Seal type', 'シール方式'],
    ['Bearing type', '軸受方式'],
    ['Thread type', 'ねじ規格'],
    ['Rotor connection', '回転側接続'],
    ['Stator connection', '固定側接続'],
    ['Mounting type', '取付方式'],
    ['Operating temperature', '使用温度範囲'],
    ['Net weight', '質量'],
    ['Approx. Weight', '質量'],
    ['Dimensions', '外形寸法'],
    ['Bore diameter', '中空穴径'],
    ['Idle torque', '無負荷トルク'],
    ['Running torque', '回転トルク'],
    ['Service life', '参考寿命'],
    ['Leakage', '漏れ'],
    ['Certifications', '認証'],
    ['Warranty', '保証期間'],
    ['Duty type', '使用条件'],
    ['Typical applications', '主な用途'],
  ]);
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).html());
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const node of nodes) {
        if (node?.['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          for (const item of node.itemListElement) {
            if (item?.position === 1) item.name = 'ホーム';
            if (item?.position === 2) item.name = '製品一覧';
          }
        }
        if (node?.['@type'] !== 'Product') continue;
        if (pageHeading) node.name = pageHeading;
        if (pageDescription) node.description = pageDescription;
        node.category = '空圧ロータリージョイント（回転継手）';
        if (Array.isArray(node.additionalProperty)) {
          for (const property of node.additionalProperty) {
            if (propertyNames.has(property?.name)) property.name = propertyNames.get(property.name);
          }
        }
      }
      $(element).text(JSON.stringify(payload));
    } catch {
      // Verification reports malformed JSON-LD; leave the original block intact for diagnosis.
    }
  });
  return $.html();
}

function normalizeGermanOutput(html) {
  const replacements = [
    ['1-in-1-out', '1-Kanal'],
    ['2-in-2-out', '2-Kanal'],
    ['3-in-3-out', '3-Kanal'],
    ['4-in-4-out', '4-Kanal'],
    ['4-in-4out', '4-Kanal'],
    ['8-in-8-out', '8-Kanal'],
    ['1-in-6-out', '1-zu-6'],
    ['2-in-3-out', '2-zu-3'],
    ['2-in-4-out', '2-zu-4'],
    ['images/optimized/2-Kanal-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3-Kanal-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['RPM', 'min⁻¹'],
    ['rpm', 'min⁻¹'],
    ['Max pressure', 'maximaler Betriebsdruck'],
    ['max pressure', 'maximaler Betriebsdruck'],
    ['Max speed', 'maximale Drehzahl'],
    ['max speed', 'maximale Drehzahl'],
    ['Max ', 'max. '],
    ['Mistake', 'Fehler'],
    ['Triple-Kanal', '3-Kanal'],
    ['PTFE Composite', 'PTFE-Verbund'],
    ['Common Auslöser', 'Typische Gründe'],
    ['Rigid Rohrleitungen', 'starre Rohrleitungen'],
    ['Multi-Kanal', 'Mehrkanal'],
    ['multi-Kanal', 'Mehrkanal'],
    ['Multikanal-', 'Mehrkanal-'],
    ['Rundschalt-Drehscheibe', 'Rundschalttisch'],
    ['through-Bohrung', 'Durchgangsbohrung'],
    ['Through-Bohrung', 'Durchgangsbohrung'],
    ['Air Kanäle', 'Luftkanäle'],
    ['air Kanäle', 'Luftkanäle'],
    ['Rutschring', 'Schleifring'],
    ['Kanal Ausführung', 'Kanalauslegung'],
    ['5-Kanal-Joint', '5-Kanal-Drehdurchführung'],
    ['4-Kanal-Gelenks', '4-Kanal-Drehdurchführung'],
    ['gesamten Gelenks', 'gesamten Drehdurchführung'],
    ['Karte jede pneumatische Funktion', 'Ordnen Sie jede pneumatische Funktion zu'],
    ['Re-Leitungsführungsschläuche', 'erneute Verlegung der Schläuche'],
    ['Automatisierungstabelle', 'Automatisierungs-Rundtisch'],
    ['direkt mit dem Joint', 'direkt mit der Drehdurchführung'],
    ['Kompatible Maschinentypen & Applikationseignung', 'Geeignete Maschinentypen und Anwendungen'],
    ['Verbundene Produkte', 'Ähnliche Produkte'],
    ['Starten Sie Ihr kundenspezifisch Projekt', 'Kundenspezifisches Projekt anfragen'],
    ['kundenspezifisch Bestellungen & Lieferung', 'Kundenspezifische Ausführungen und Lieferung'],
    ['kundenspezifisch Projekt', 'kundenspezifisches Projekt'],
    ['Automation Rundtisch', 'Automatisierungs-Rundtisch'],
    ['Harsche Umweltauswahl', 'Auswahl für raue Umgebungen'],
    ['Electronics & Battery Test', 'Elektronik- und Batterietests'],
    ['Füllen und Capping Fragen', 'Fragen zu Füll- und Verschließanlagen'],
    ['Vergleichen Sie Modelle online oder Herunterladen den Produktkatalog 2026', 'Modelle online vergleichen oder Produktkatalog 2026 herunterladen'],
    ['Fabrik & Qualität', 'Fertigung und Qualität'],
    ['Kompatible Maschinentypen &amp; Applikationseignung', 'Geeignete Maschinentypen und Anwendungen'],
    ['Wie wir eine Drehdurchführung machen', 'Wie wir Drehdurchführungen fertigen'],
    ['Unternehmen Timeline', 'Unternehmensgeschichte'],
    ['Empfohlene Startpunkte', 'Empfohlene Modelle'],
    ['Automatisierungstabelle Checkliste', 'Auswahlcheckliste für Automatisierungs-Rundtische'],
    ['Automatisierungs-Rundtisch Parameter', 'Parameter für Automatisierungs-Rundtische'],
    ['3 Fehler, die die Automatisierung beschädigen können Rundtisch Drehdurchführungen', '3 Fehler, die Drehdurchführungen an Automatisierungs-Rundtischen beschädigen können'],
    ['Montage und Wartung für die Automatisierung Rundtisch Drehdurchführungen', 'Montage und Wartung von Drehdurchführungen an Automatisierungs-Rundtischen'],
    ['Flaschenbefüllung und -verschluss Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Füll- und Verschließmaschinen'],
    ['3 Fehler, die das Füllen und Verschließen von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Füll- und Verschließmaschinen'],
    ['Montage und Wartung zum Befüllen und Verschließen von Drehdurchführungen', 'Montage und Wartung an Füll- und Verschließmaschinen'],
    ['CNC-Vorrichtung Checkliste', 'Auswahlcheckliste für CNC-Spannvorrichtungen'],
    ['CNC-Pneumatische Klemm-Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an CNC-Spannvorrichtungen'],
    ['Elektronik &amp; Batterie Test Drehdurchführung Fragen', 'Fragen zu Drehdurchführungen für Elektronik- und Batterietests'],
    ['Laserrohrschneiden Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Laserrohrschneidmaschinen'],
    ['Montage und Wartung für Laserschneiden Drehdurchführungen', 'Montage und Wartung an Laserrohrschneidmaschinen'],
    ['Verpackungsmaschinen Drehdurchführungsparameter', 'Parameter für Drehdurchführungen an Verpackungsmaschinen'],
    ['Montage und Wartung für die Verpackung Drehdurchführungen', 'Montage und Wartung an Verpackungsmaschinen'],
    ['Roboter EOAT Auswahl Checkliste', 'Auswahlcheckliste für Roboter-EOAT'],
    ['Roboter EOAT Drehdurchführung Anforderungen', 'Anforderungen an Drehdurchführungen für Roboter-EOAT'],
    ['staubgeschützt Drehdurchführungsparameter', 'Parameter für staubgeschützte Drehdurchführungen'],
    ['Quick Reference: Material Performance Table', 'Schnellübersicht: Werkstoffvergleich'],
    ['4. Kosten vs. Lifetime: Reale Zahlen', '4. Kosten und Lebensdauer: Praxiswerte'],
    ['1. O-Ring Dichtungen', '1. O-Ring-Dichtungen'],
    ['3. federunterstütztes kohlenstoffgefülltes PTFE Dichtungen', '3. Federunterstützte PTFE-Dichtungen mit Kohlenstofffüllung'],
    ['Wann zu ersetzen vs. Wann zu reparieren', 'Wann ersetzen, wann reparieren?'],
    ['Fabrikanschrift', 'Werksanschrift'],
    ['kundenspezifisch Bestellungen &amp; Lieferung', 'Sonderausführungen und Lieferung'],
    ['3. Cookies &amp; Tracking Technologien', '3. Cookies und Tracking-Technologien'],
    ['4. Data Sharing', '4. Weitergabe von Daten'],
    ['5. Vorratsdatenspeicherung', '5. Speicherdauer'],
    ['8. Privatsphäre der Kinder', '8. Datenschutz für Kinder'],
    ['10. uns benachrichtigen', '10. Kontakt'],
    ['?230', 'Ø230'],
    ['?78.9', 'Ø78,9'],
    ['?78,9', 'Ø78,9'],
    ['?64', 'Ø64'],
    ['?6 mm', 'Ø6 mm'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replace(/(BP-[A-Z0-9-]+) vs\. Andere Begapunk Modelle/g, '$1 im Vergleich zu anderen Begapunk Modellen')
    .replace(/3 Fehler, die (.+?) zerstören/g, '3 Fehler, die $1 beschädigen können')
    .replaceAll('3 Fehler, die die Automatisierung beschädigen können Rundtisch Drehdurchführungen', '3 Fehler bei Drehdurchführungen an Automatisierungs-Rundtischen')
    .replaceAll('3 Fehler, die das Füllen und Verschließen von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Füll- und Verschließmaschinen')
    .replaceAll('3 Fehler, die die Verpackung von Drehdurchführungen beschädigen können', '3 Fehler bei Drehdurchführungen an Verpackungsmaschinen')
    .replaceAll('CNC-Vorrichtung Drehdurchführung', 'Drehdurchführung für CNC-Spannvorrichtungen')
    .replaceAll('Pneumatische Werkzeugauswahl Checkliste', 'Auswahlcheckliste für Pneumatikwerkzeuge')
    .replaceAll('Pneumatisches Werkzeug Druckluft-Drehdurchführung Anforderungen', 'Anforderungen an Drehdurchführungen für Pneumatikwerkzeuge')
    .replaceAll('Pneumatisches Werkzeug Druckluft-Drehdurchführung Fragen', 'Fragen zu Drehdurchführungen für Pneumatikwerkzeuge')
    .replaceAll('kundenspezifisch ', 'Sonder-')
    .replaceAll('Blow-off', 'Abblasen')
    .replaceAll('Envelope', 'Bauraum')
    .replaceAll('Drehdurchführung für Druckmaschinen &amp; Converter', 'Drehdurchführung für Druck- und Verarbeitungsmaschinen')
    .replaceAll('<span class="icon notranslate" translate="no">5</span> Start Checkliste', '<span class="icon notranslate" translate="no">5</span> Prüfung vor der Inbetriebnahme');
  return localizeStructuredDataWithOptions(normalized, {
    homeLabel: 'Startseite',
    productsLabel: 'Produkte',
    category: 'Pneumatische Drehdurchführung',
    propertyNames: {
      'Product type': 'Produkttyp', SKU: 'Artikelnummer', Passages: 'Kanalzahl',
      'Orifice size': 'Durchgang', 'Maximum pressure': 'Maximaler Betriebsdruck',
      'Maximum speed': 'Maximale Drehzahl', 'Compatible media': 'Betriebsmedien',
      'Body material': 'Gehäusewerkstoff', 'Seal type': 'Dichtung',
      'Bearing type': 'Lagerung', 'Thread type': 'Gewinde',
      'Rotor connection': 'Rotoranschluss', 'Stator connection': 'Gehäuseanschluss',
      'Mounting type': 'Montageart', 'Operating temperature': 'Betriebstemperatur',
      'Net weight': 'Gewicht', 'Approx. Weight': 'Gewicht', Dimensions: 'Abmessungen',
      'Bore diameter': 'Durchgangsbohrung', 'Idle torque': 'Leerlaufdrehmoment',
      'Running torque': 'Drehmoment', 'Service life': 'Richtwert Lebensdauer',
      Leakage: 'Leckage', Certifications: 'Zertifizierungen', Warranty: 'Garantie',
      'Duty type': 'Betriebsart', 'Typical applications': 'Typische Anwendungen',
    },
  });
}

function normalizeRussianOutput(html) {
  const replacements = [
    ['1-in-1-out', '1 канал'],
    ['2-in-2-out', '2 канала'],
    ['3-in-3-out', '3 канала'],
    ['4-in-4-out', '4 канала'],
    ['4-in-4out', '4 канала'],
    ['8-in-8-out', '8 каналов'],
    ['1-in-6-out', '1 вход / 6 выходов'],
    ['2-in-3-out', '2 входа / 3 выхода'],
    ['2-in-4-out', '2 входа / 4 выхода'],
    ['images/optimized/2 канала-Rotary-joint.webp', 'images/optimized/2-in-2-out-Rotary-joint.webp'],
    ['images/optimized/3 канала-M8-rotary-joint-3.webp', 'images/optimized/3-in-3-out-M8-rotary-joint-3.webp'],
    ['RPM', 'об/мин'],
    ['rpm', 'об/мин'],
    ['MPa', 'МПа'],
    ['Max pressure', 'максимальное рабочее давление'],
    ['max pressure', 'максимальное рабочее давление'],
    ['Max speed', 'максимальная скорость вращения'],
    ['max speed', 'максимальная скорость вращения'],
    ['Макс ', 'макс. '],
    ['Max ', 'макс. '],
    ['Ротационное соединение Specs', 'Характеристики ротационного соединения'],
    ['ротационное соединение Specs', 'характеристики ротационного соединения'],
    ['Specs', 'характеристики'],
    ['Mistake', 'Ошибка'],
    ['Air Swivel', 'поворотное пневмосоединение'],
    ['воздушный поворот', 'поворотное пневмосоединение'],
    ['пневматических воздушных плющ', 'поворотного пневмосоединения'],
    ['Пневматический инструмент поворотное пневмосоединение Вопросы', 'Вопросы о поворотных соединениях для пневмоинструмента'],
    ['облегчение деформации', 'разгрузка натяжения'],
    ['пломбы', 'уплотнения'],
    ['носители', 'рабочие среды'],
    ['конверт', 'габарит'],
    ['Тяжелый 2-х проходной ротационное соединение', 'Усиленное двухканальное ротационное соединение'],
    ['Приложение Fit', 'Область применения'],
    ['приложения Fit', 'области применения'],
    ['Связанные продукты', 'Похожие модели'],
    ['Компания Timeline', 'История компании'],
    ['Начните свой пользовательский проект', 'Обсудить индивидуальный проект'],
    ['Пользовательские заказы и доставка', 'Индивидуальные исполнения и поставка'],
    ['пользовательский обзор', 'индивидуальный анализ'],
    ['Рекомендуемые начальные точки', 'Рекомендуемые модели'],
    ['ротационное соединениестол ротационное соединение', 'ротационных соединений для поворотных столов'],
    ['пневматический ротационное соединение', 'пневматическое ротационное соединение'],
    ['индивидуальный пневматическое ротационное соединение', 'индивидуальное пневматическое ротационное соединение'],
    ['Робот EOAT Ротационное соединение', 'Ротационное соединение для робота EOAT'],
    ['Монтаж и техническое обслуживание ротационное соединение', 'Монтаж и обслуживание ротационных соединений'],
    ['Печатная техника Ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для печатного оборудования'],
    ['Вакуумная упаковка ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для вакуумной упаковки'],
    ['Сварочные позиционеры Ротационное соединение Вопросы', 'Вопросы о ротационных соединениях для сварочных позиционеров'],
    ['Когда заменить vs. Когда ремонтировать', 'Когда заменять, а когда ремонтировать'],
    ['Стоимость vs. Время жизни', 'Стоимость и срок службы'],
    ['Материалы для уплотнение и жилищные материалы', 'Материалы уплотнений и корпуса'],
    ['Весочувствительные приложения', 'Применения с ограничением по массе'],
    ['уплотнение для губ', 'Манжетные уплотнения'],
    ['Весенние энергетические углеродные PTFE-уплотнение', 'Подпружиненные PTFE-уплотнения с углеродным наполнителем'],
    ['Как выбрать правильный тип уплотнение', 'Как выбрать подходящий тип уплотнения'],
    ['Установка на проточенную гору', 'Монтаж резьбового соединения'],
    ['Small Models', 'компактные модели'],
    ['роторные таблицы', 'поворотные столы'],
    ['роторных таблиц', 'поворотных столов'],
    ['роторной таблицы', 'поворотного стола'],
    ['роторная таблица', 'поворотный стол'],
    ['роторного стола автоматизации', 'автоматизированного поворотного стола'],
    ['таблицы индексации', 'индексные столы'],
    ['таблица индексации', 'индексный стол'],
    ['многопропускной', 'многоканальный'],
    ['многопроходный', 'многоканальный'],
    ['Многопропускной', 'Многоканальный'],
    ['Многопроходный', 'Многоканальный'],
    ['Многопропуск', 'Многоканал'],
    ['многопропуск', 'многоканал'],
    ['Многопроход', 'Многоканал'],
    ['многопроход', 'многоканал'],
    ['каждый оснастка', 'каждый элемент оснастки'],
    ['каждую оснастка', 'каждый элемент оснастки'],
    ['несколько оснастка', 'несколько элементов оснастки'],
    ['весь ротационное соединение', 'всё ротационное соединение'],
    ['один ротационное соединение', 'одно ротационное соединение'],
    ['ротационное соединение должен', 'ротационное соединение должно'],
    ['ротационное соединение может быть выбран', 'ротационное соединение можно выбрать'],
    ['пользовательский дизайн', 'специальное исполнение'],
    ['Пользовательский дизайн', 'Специальное исполнение'],
    ['пользовательский макет', 'специальную компоновку'],
    ['счет станции', 'число станций'],
    ['счетчик сигналов', 'число сигналов'],
    ['радиальный клиренс', 'радиальный зазор'],
    ['Критический:', 'Важно:'],
    ['Общие ошибки установки и их подписи', 'Типичные ошибки монтажа и их признаки'],
    ['Построено на реальных требованиях к машине', 'На основе реальных требований оборудования'],
    ['Где используются Begapunk Air Ротационные соединения', 'Где применяются пневматические ротационные соединения Begapunk'],
    ['Тип приложения для семейства продуктов', 'Соответствие областей применения сериям продукции'],
    ['Продолжайте процесс выбора', 'Следующий этап подбора'],
    ['Фабрика и качество', 'Производство и контроль качества'],
    ['Ты не нашел свой ответ?', 'Не нашли ответ на свой вопрос?'],
    ['1 Связь', '1 Подключения'],
    ['2 антиротационный', '2 Защита от проворачивания'],
    ['5 Стартап контрольный список', '5 Проверка перед первым запуском'],
    ['Ценообразование и цитаты', 'Цены и коммерческие предложения'],
    ['Доставка и доставка', 'Отгрузка и доставка'],
    ['Возврат и возврат', 'Возврат товара и денежных средств'],
    ['Управляющий закон', 'Применимое право'],
    ['Изменения в терминах', 'Изменение условий'],
    ['11. Контакт', '11. Контакты'],
    ['Cookies и технологии отслеживания', 'Файлы cookie и технологии отслеживания'],
    ['макс. Спид', 'Максимальная скорость'],
    ['#####1. Тест на статическое давление (без вращения)', '1. Статическое испытание давлением (без вращения)'],
    ['####2. Тест на низкоскоростное вращение', '2. Испытание при низкой скорости вращения'],
    ['####3. Полная операция', '3. Работа при номинальных условиях'],
    ['####Ключевое понимание', 'Ключевой вывод'],
    ['Обсуждение Begapunk Ротационные соединения &amp; Ротационные соединения', 'Поиск по ротационным соединениям Begapunk'],
    ['печатного и габаритингового оборудования', 'печатного и конвертингово оборудования'],
    ['Как сделать ротационное соединение', 'Как мы производим ротационные соединения'],
    ['Заполнение бутылок и захват параметров ротационное соединение', 'Параметры соединений для машин розлива и укупорки'],
    ['3 ошибки, которые могут повредить заполнение и захват ротационное соединение', '3 ошибки при выборе соединений для линий розлива и укупорки'],
    ['Заполнение и заполнение вопросов', 'Вопросы о соединениях для машин розлива и укупорки'],
    ['Параметры пневматического зажима ротационное соединение с ЧПУ', 'Параметры соединений для пневматических зажимов станков с ЧПУ'],
    ['Упаковочные машины Ротационное соединение Parameters', 'Параметры соединений для упаковочных машин'],
    ['пневматические воздушные плюшки', 'поворотные соединения для пневмоинструмента'],
    ['Ошибка 5: Использование неправильного метода утепления струй', 'Ошибка 5: Неправильная герметизация резьбы'],
    ['Установка контрольный список', 'Контрольный список монтажа'],
    ['Где появляется утечка, говорит вам о проблеме', 'Место утечки указывает на причину'],
    ['Быстрая ссылка: таблица производительности материалов', 'Краткое сравнение материалов'],
    ['Выводы', 'Вывод'],
    ['Предварительный контрольный список установки: три вещи, которые вы должны проверить', 'Проверьте три пункта перед монтажом'],
    ['Установка анти-ротационных кронштейнов', 'Монтаж кронштейна защиты от проворачивания'],
    ['1 Связь', '1. Подключение'],
    ['2 антиротационный', '2. Защита от проворачивания'],
    ['4 смазка', '4. Смазка'],
    ['5 Стартап контрольный список', '5. Проверка перед первым запуском'],
    ['6 техническое обслуживание', '6. Техническое обслуживание'],
    ['?230', 'Ø230'],
    ['?78.9', 'Ø78,9'],
    ['?78,9', 'Ø78,9'],
    ['?64', 'Ø64'],
    ['?6 mm', 'Ø6 мм'],
  ];
  let normalized = html;
  for (const [from, to] of replacements) normalized = normalized.replaceAll(from, to);
  normalized = normalized
    .replace(/(BP-[A-Z0-9-]+) против\. Другие модели Begapunk/g, '$1: сравнение с другими моделями Begapunk')
    .replace(/3 ошибки, которые (?:уничтожают|разрушают) (.+?)(?=<|\n)/g, '3 ошибки, которые могут повредить $1')
    .replace(/Нужен (ротационное соединение|поворотное пневмосоединение)/g, 'Нужно $1')
    .replaceAll('конвертингово оборудования', 'конвертингового оборудования')
    .replaceAll('3 ошибки, которые могут повредить заполнение и захват ротационное соединение', '3 ошибки при выборе соединений для линий розлива и укупорки')
    .replaceAll('поворотного ротационное соединение крепления с ЧПУ', 'ротационного соединения для зажимной оснастки станка с ЧПУ')
    .replaceAll('Строительство или замена упаковочного станка ротационное соединение?', 'Проектируете или заменяете соединение для упаковочной машины?')
    .replaceAll('<span class="icon notranslate" translate="no">1</span> Связь', '<span class="icon notranslate" translate="no">1</span> Подключение')
    .replaceAll('<span class="icon notranslate" translate="no">2</span> антиротационный', '<span class="icon notranslate" translate="no">2</span> Защита от проворачивания')
    .replaceAll('<span class="icon notranslate" translate="no">4</span> смазка', '<span class="icon notranslate" translate="no">4</span> Смазка')
    .replaceAll('<span class="icon notranslate" translate="no">5</span> Стартап контрольный список', '<span class="icon notranslate" translate="no">5</span> Проверка перед первым запуском')
    .replaceAll('<span class="icon notranslate" translate="no">6</span> техническое обслуживание', '<span class="icon notranslate" translate="no">6</span> Техническое обслуживание')
    .replaceAll('соединение должен', 'соединение должно');
  return localizeStructuredDataWithOptions(normalized, {
    homeLabel: 'Главная',
    productsLabel: 'Продукция',
    category: 'Пневматическое ротационное соединение',
    propertyNames: {
      'Product type': 'Тип изделия', SKU: 'Артикул', Passages: 'Количество каналов',
      'Orifice size': 'Диаметр прохода', 'Maximum pressure': 'Максимальное рабочее давление',
      'Maximum speed': 'Максимальная скорость вращения', 'Compatible media': 'Рабочая среда',
      'Body material': 'Материал корпуса', 'Seal type': 'Тип уплотнения',
      'Bearing type': 'Тип подшипника', 'Thread type': 'Резьба',
      'Rotor connection': 'Подключение ротора', 'Stator connection': 'Подключение статора',
      'Mounting type': 'Тип крепления', 'Operating temperature': 'Рабочая температура',
      'Net weight': 'Масса', 'Approx. Weight': 'Масса', Dimensions: 'Габариты',
      'Bore diameter': 'Диаметр проходного отверстия', 'Idle torque': 'Момент холостого хода',
      'Running torque': 'Крутящий момент', 'Service life': 'Расчётный срок службы',
      Leakage: 'Утечка', Certifications: 'Сертификация', Warranty: 'Гарантия',
      'Duty type': 'Режим работы', 'Typical applications': 'Типичные области применения',
    },
  });
}

function localizeStructuredDataWithOptions(html, options) {
  const $ = load(html, { decodeEntities: false });
  const pageHeading = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const pageDescription = $('meta[name="description"]').attr('content')?.trim();
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const payload = JSON.parse($(element).html());
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const node of nodes) {
        if (node?.['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          for (const item of node.itemListElement) {
            if (item?.position === 1) item.name = options.homeLabel;
            if (item?.position === 2) item.name = options.productsLabel;
          }
        }
        if (node?.['@type'] !== 'Product') continue;
        if (pageHeading) node.name = pageHeading;
        if (pageDescription) node.description = pageDescription;
        node.category = options.category;
        if (Array.isArray(node.additionalProperty)) {
          for (const property of node.additionalProperty) {
            if (options.propertyNames[property?.name]) property.name = options.propertyNames[property.name];
          }
        }
      }
      $(element).text(JSON.stringify(payload));
    } catch {
      // Verification reports malformed JSON-LD; leave the original block intact for diagnosis.
    }
  });
  return $.html();
}

async function translateBatch(apiKey, languageCode, sources) {
  const protectedItems = sources.map((source) => protectTerms(source, languageCode));
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      q: protectedItems.map((item) => item.prepared),
      source: config.sourceLanguage.code,
      target: languageCode,
      format: 'html',
      model: 'nmt',
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Cloud Translation request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  const payload = await response.json();
  const translations = payload?.data?.translations || [];
  if (translations.length !== sources.length) {
    throw new Error(`Expected ${sources.length} translations for ${languageCode}, received ${translations.length}.`);
  }
  return translations.map((translation, index) => protectedItems[index].restore(translation.translatedText));
}

function makeBatches(entries) {
  const batches = [];
  let current = [];
  let characters = 0;
  for (const entry of entries) {
    if (current.length >= 100 || characters + entry.source.length > 20000) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(entry);
    characters += entry.source.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateCatalog(catalog) {
  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY is not set. The key must be supplied through the process environment.');
  }
  await fs.mkdir(cacheRoot, { recursive: true });
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    let cache = { language: language.code, generatedAt: null, translations: {} };
    try {
      cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const missing = catalog.entries.filter((entry) => !cache.translations[entry.id]);
    const batches = makeBatches(missing);
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      console.log(`${language.code}: translating batch ${index + 1}/${batches.length} (${batch.length} strings)`);
      const translated = await translateBatch(apiKey, language.code, batch.map((entry) => entry.source));
      translated.forEach((value, itemIndex) => {
        cache.translations[batch[itemIndex].id] = value;
      });
      cache.generatedAt = new Date().toISOString();
      await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
    }
    console.log(`${language.code}: ${Object.keys(cache.translations).length}/${catalog.entries.length} strings cached.`);
  }
}

function localizeRelativeReference(value, pilotPages) {
  if (!value || value.startsWith('#') || value.startsWith('/') || /^(?:[a-z]+:|\/\/)/i.test(value)) return value;
  const match = value.match(/^([^?#]*)([?#].*)?$/);
  const pathname = match?.[1] || value;
  const suffix = match?.[2] || '';
  if (!pathname) return value;
  const normalized = pathname.replace(/^\.\//, '');
  if (pilotPages.has(normalized)) return `${normalized}${suffix}`;
  return `../${normalized}${suffix}`;
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function schemaTypes(node) {
  const type = node?.['@type'];
  return new Set((Array.isArray(type) ? type : [type]).filter(Boolean));
}

function visibleFaqEntities($) {
  return $('.faq-item, .app-faq-item').map((_, item) => {
    const questionNode = $(item).find('.faq-question, h3').first().clone();
    questionNode.find('svg, i, .faq-icon, .faq-toggle').remove();
    const question = compactText(questionNode.text());
    const answer = compactText($(item).find('.faq-answer, p').first().text());
    if (!question || !answer) return null;
    return {
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    };
  }).get().filter(Boolean);
}

function applySeoMetadata($, languageCode, pageName) {
  const seo = seoByLanguage.get(languageCode)?.[pageName];
  if (!seo?.title || !seo?.description || !seo?.h1) {
    throw new Error(`${languageCode}/${pageName}: missing curated SEO title, description or H1.`);
  }
  $('title').first().text(seo.title);
  const setMeta = (selector, attributes, content) => {
    let element = $(selector).first();
    if (!element.length) {
      element = $('<meta>');
      for (const [name, value] of Object.entries(attributes)) element.attr(name, value);
      $('head').append(element);
    }
    element.attr('content', content);
  };
  setMeta('meta[name="description"]', { name: 'description' }, seo.description);
  $('h1').first().text(seo.h1);
  setMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title);
  setMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description);
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title);
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description);
  // Google ignores meta keywords. Removing the inherited English keyword list
  // avoids mixed-language metadata and unsupported certification phrases.
  $('meta[name="keywords"]').remove();
}

const schemaLocaleByLanguage = {
  de: {
    founderJobTitle: 'Gründer und Ingenieur',
    factoryName: 'Begapunk Fertigung',
    slogan: 'Spezialist für pneumatische Drehdurchführungen',
    knowsAbout: ['Pneumatische Drehdurchführungen', 'Mehrkanal-Drehdurchführungen', 'Industrielle Automatisierung', 'CNC-Maschinen', 'Laserschneidmaschinen', 'Verpackungsmaschinen'],
  },
  ja: {
    founderJobTitle: '創業者・技術責任者',
    factoryName: 'Begapunk 生産拠点',
    slogan: '空圧用ロータリージョイント専門メーカー',
    knowsAbout: ['空圧用ロータリージョイント', '多流路・多ポートロータリージョイント', '特注回転継手', '産業自動化', 'CNC工作機械', 'レーザー切断機', '包装機械'],
  },
  ru: {
    founderJobTitle: 'Основатель и инженер',
    factoryName: 'Производство Begapunk',
    slogan: 'Специалист по пневматическим вращающимся соединениям',
    knowsAbout: ['Пневматические вращающиеся соединения', 'Пневматические ротационные соединения', 'Многоканальные вращающиеся коллекторы', 'Специальные вращающиеся соединения', 'Промышленная автоматизация', 'Станки с ЧПУ', 'Лазерные станки', 'Упаковочное оборудование'],
  },
};

const structuredPropertyNames = {
  de: {
    'Protection rating': 'Schutzart', 'Pneumatic passages': 'Pneumatische Kanäle',
    'Electrical circuits': 'Elektrische Stromkreise', 'Electrical contact material': 'Kontaktwerkstoff',
    'Insulation resistance': 'Isolationswiderstand', 'Surface treatment': 'Oberflächenbehandlung',
    'Hollow bore diameter': 'Durchmesser der Durchgangsbohrung',
  },
  ja: {
    'Protection rating': '保護等級', 'Pneumatic passages': '空圧流路数',
    'Electrical circuits': '電気回路数', 'Electrical contact material': '電気接点材質',
    'Insulation resistance': '絶縁抵抗', 'Surface treatment': '表面処理',
    'Hollow bore diameter': '中空穴径',
  },
  ru: {
    'Protection rating': 'Степень защиты', 'Pneumatic passages': 'Пневматические каналы',
    'Electrical circuits': 'Электрические цепи', 'Electrical contact material': 'Материал электрических контактов',
    'Insulation resistance': 'Сопротивление изоляции', 'Surface treatment': 'Обработка поверхности',
    'Hollow bore diameter': 'Диаметр сквозного отверстия',
  },
};

const structuredApplicationValues = {
  de: {
    'BP-1P-0003.html': 'Handgeführte Pneumatikwerkzeuge, kleine Drehtische, Schlauch-Entdrallung, Etikettier- und Verschließstationen',
    'BP-1P-0006.html': 'Montagestationen, Drehtische, Pneumatikverteiler, Dosierköpfe, Schweißpositionierer und Prüftische',
    'BP-2P-0001.html': 'Verpackungsdrehtische, Schweißpositionierer, Rundschalttische, Abfüllstationen und Zweikanal-Spannvorrichtungen',
    'BP-2P-0002.html': 'CNC-Rundachsen, Roboterschweißtische, pneumatische Rundschalttische, Bildverarbeitung und kundenspezifische Automation',
    'BP-2P-08-0001.html': 'Kleine Elektronik-Drehtische, kompakte Dosier-, Prüf-, Montage- und Verpackungsstationen',
    'BP-2P-130-0001.html': 'Hydraulische Rundschalttische, Hochdruck-Spannsysteme, schwere Schweißpositionierer und CNC-Rundachsen',
    'BP-2P-16-0001.html': 'CNC-Rundschalttische, Schweißpositionierer, Verpackungsdrehtische, pneumatische Spann- und Prüfvorrichtungen',
    'BP-2P-30-0001.html': 'Verpackungsdrehtische, Schweißstationen, pneumatische Spannvorrichtungen, Sprühsysteme und Automatisierungsdrehtische',
    'BP-2P-50-0001.html': 'Stahlwerke, Gießereien, staubige Verpackungslinien, Schweißpositionierer und Rundschalttische in rauer Umgebung',
    'BP-2P-95-0001.html': 'Pneumatische Spannvorrichtungen, Drehvorrichtungen sowie Mehrfachverteilung von Luft, Kühlmittel und leichten Flüssigkeiten',
    'BP-3P-0004.html': 'Dreistationen-Spannvorrichtungen, Rundschalttische, Verpackungs-, Schweiß-, Abfüll- und Prüfanlagen',
    'BP-3P-0006.html': 'Mittelgroße Dreikanal-Spannvorrichtungen, Rundschalttische, Verpackungsmaschinen, Schweißtische und Prüfanlagen',
    'BP-3P-0007.html': 'Kompakte Dreikanal-Vorrichtungen, kleine Rundschalttische, Verpackungsköpfe, Schweißpositionierer und Roboter-EOAT',
    'BP-3P-S06-0001.html': 'Automatisierungsdrehtische, Verpackungsmaschinen, CNC-Spanntechnik, Schweißpositionierer und pneumatisch-elektrische Rundtische',
    'BP-4P-30-0001.html': 'Mehrstations-Drehtische, Systeme mit Kabeldurchführung, Vierstations-Spannvorrichtungen, Schweiß- und Verpackungsanlagen',
    'BP-8P-0001.html': 'Hochdichte Mehrkanalsysteme, Achtstations-Spannvorrichtungen, große Rundschalttische, Verpackungs-, Schweiß- und Prüfanlagen',
  },
  ja: {
    'BP-1P-0003.html': '手持ち空圧工具、小型回転テーブル、ホースのねじれ防止、ラベリング機、ボトルキャッピング装置',
    'BP-1P-0006.html': '組立設備、回転テーブル、エアマニホールド、塗布ヘッド、溶接ポジショナー、検査テーブル',
    'BP-2P-0001.html': '包装用回転テーブル、溶接ポジショナー、2ステーション割出テーブル、充填設備、2流路空圧治具',
    'BP-2P-0002.html': 'CNC第4・第5軸、ロボット溶接テーブル、空圧割出テーブル、画像検査、特注自動化設備',
    'BP-2P-08-0001.html': '小型電子機器用回転テーブル、コンパクトな塗布・検査・組立・包装設備',
    'BP-2P-130-0001.html': '油圧割出テーブル、高圧油圧クランプ、重量物用溶接ポジショナー、大型CNC回転軸',
    'BP-2P-16-0001.html': 'CNC割出テーブル、溶接ポジショナー、包装用回転テーブル、空圧クランプ治具、回転検査装置',
    'BP-2P-30-0001.html': '包装用回転テーブル、溶接設備、空圧クランプ治具、回転スプレー装置、自動化用回転テーブル',
    'BP-2P-50-0001.html': '製鉄所、鋳造設備、粉じんの多い包装ライン、溶接ポジショナー、大型空圧割出テーブル',
    'BP-2P-95-0001.html': '空圧クランプ、回転治具、複数箇所へのエア分配、クーラントおよび低粘度流体の分配',
    'BP-3P-0004.html': '3ステーション空圧クランプ、3流路割出テーブル、包装・溶接・充填・検査設備',
    'BP-3P-0006.html': '中型3流路クランプ治具、割出テーブル、包装機、溶接テーブル、充填・検査設備',
    'BP-3P-0007.html': '小型3流路空圧治具、コンパクトな割出テーブル、包装ヘッド、溶接ポジショナー、ロボットEOAT',
    'BP-3P-S06-0001.html': '自動化用回転テーブル、包装機、CNC空圧クランプ、溶接ポジショナー、空圧・電気複合回転装置',
    'BP-4P-30-0001.html': '多ステーション回転テーブル、ケーブル貫通空圧システム、4ステーションクランプ、溶接・包装設備',
    'BP-8P-0001.html': '高密度多ポート空圧システム、8ステーションクランプ、大型割出テーブル、包装・溶接・検査設備',
  },
  ru: {
    'BP-1P-0003.html': 'Ручной пневмоинструмент, малые поворотные столы, защита шланга от скручивания, этикетировочные и укупорочные машины',
    'BP-1P-0006.html': 'Сборочные станции, поворотные столы, пневмоколлекторы, дозирующие головки, сварочные позиционеры и контрольные стенды',
    'BP-2P-0001.html': 'Упаковочные поворотные столы, сварочные позиционеры, двухпозиционные индексные столы, линии розлива и двухканальные зажимные приспособления',
    'BP-2P-0002.html': 'Поворотные оси станков с ЧПУ, роботизированная сварка, пневматические индексные столы, машинное зрение и специальная автоматизация',
    'BP-2P-08-0001.html': 'Компактные поворотные столы и малогабаритные дозирующие, контрольные, сборочные и упаковочные установки',
    'BP-2P-130-0001.html': 'Гидравлические индексные столы, системы зажима высокого давления, тяжёлые сварочные позиционеры и поворотные оси ЧПУ',
    'BP-2P-16-0001.html': 'Индексные столы ЧПУ, сварочные позиционеры, упаковочные поворотные столы, пневматические зажимные и контрольные приспособления',
    'BP-2P-30-0001.html': 'Упаковочные поворотные столы, сварочные станции, пневматические зажимы, распылительные установки и автоматизированные столы',
    'BP-2P-50-0001.html': 'Металлургические и литейные производства, запылённые упаковочные линии, сварочные позиционеры и индексные столы',
    'BP-2P-95-0001.html': 'Пневматический зажим, поворотные приспособления и распределение воздуха, СОЖ и маловязких жидкостей',
    'BP-3P-0004.html': 'Трёхпозиционные пневмозажимы, индексные столы, упаковочные, сварочные, разливочные и контрольные установки',
    'BP-3P-0006.html': 'Средние трёхканальные зажимные приспособления, индексные столы, упаковочные машины, сварочные столы и контрольные установки',
    'BP-3P-0007.html': 'Компактные трёхканальные приспособления, малые индексные столы, упаковочные головки, сварочные позиционеры и оснастка роботов',
    'BP-3P-S06-0001.html': 'Автоматизированные поворотные столы, упаковочные машины, зажимы ЧПУ, сварочные позиционеры и пневмоэлектрические системы',
    'BP-4P-30-0001.html': 'Многопозиционные поворотные столы, системы с проходом кабеля, четырёхпозиционные зажимы, сварочные и упаковочные установки',
    'BP-8P-0001.html': 'Многоканальные пневмосистемы высокой плотности, восьмипозиционные зажимы, большие индексные столы, упаковочные, сварочные и контрольные установки',
  },
};

const conservativeProductPropertyValues = {
  de: {
    Betriebsmedien: 'Luft. Andere Medien erfordern eine schriftliche Kompatibilitätsbestätigung für die Betriebsbedingungen.',
    Dichtung: 'PTFE-Dichtung mit O-Ring.',
    Schutzart: 'Schutzhauben- und Labyrinthkonstruktion für staubige Umgebungen; derzeit wird keine zertifizierte IP-Schutzart angegeben.',
    Montageart: 'Statorseite: 4 × M5, Gewindetiefe 10 mm; Rotorseite: 6 × M5, Gewindetiefe 8 mm. Vor der Bearbeitung vollständige Einbaumaße anhand der mitgelieferten Zeichnung bestätigen.',
  },
  ja: {
    使用可能流体: '標準使用流体：空気。その他の流体は、使用条件に対する適合性を書面で確認する必要があります。',
    シール方式: 'PTFEシール＋Oリング。',
    保護等級: '粉じん環境向けの保護カバー・ラビリンス構造。現時点で認証済みIP保護等級は表示していません。',
    取付方式: '固定側：4 × M5、ねじ深さ10 mm；回転側：6 × M5、ねじ深さ8 mm。加工前に、支給図面で取付寸法全体をご確認ください。',
  },
  ru: {
    'Рабочая среда': 'Стандартная рабочая среда: воздух. Для других сред требуется письменное подтверждение совместимости с рабочими условиями.',
    'Тип уплотнения': 'Уплотнение из ПТФЭ с O-кольцом.',
    'Степень защиты': 'Защитный кожух и лабиринт для запылённых условий; сертифицированная степень защиты IP в настоящее время не заявляется.',
    'Тип крепления': 'Сторона статора: 4 × M5, глубина резьбы 10 мм; сторона ротора: 6 × M5, глубина резьбы 8 мм. До механической обработки сверьте все монтажные размеры с предоставленным чертежом.',
  },
};

const localizedWeightPropertyNames = new Set(['Net weight', 'Weight', 'Gewicht', 'Nettogewicht', '質量', '製品質量', 'Масса', 'Масса нетто']);

function inflectRussianCount(count, singular, paucal, plural) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return plural;
  if (mod10 === 1) return singular;
  if (mod10 >= 2 && mod10 <= 4) return paucal;
  return plural;
}

function localizePassageValue(value, languageCode) {
  return value.replace(/(\d+) inlet\s*\/\s*(\d+) outlet(?:\s*\(([^)]+)\))?/gi, (_, inletText, outletText, detail = '') => {
    const inlet = Number(inletText);
    const outlet = Number(outletText);
    if (languageCode === 'de') {
      const base = `${inlet} ${inlet === 1 ? 'Eingang' : 'Eingänge'} / ${outlet} ${outlet === 1 ? 'Ausgang' : 'Ausgänge'}`;
      const details = detail
        .replace(/single passage/gi, 'einkanalig').replace(/dual passage/gi, 'zweikanalig')
        .replace(/triple passage/gi, 'dreikanalig').replace(/quad passage/gi, 'vierkanalig')
        .replace(/single inlet, six outlets/gi, 'ein Eingang, sechs Ausgänge')
        .replace(/dual inlet, triple outlet/gi, 'zwei Eingänge, drei Ausgänge')
        .replace(/(\d+)mm bore/gi, '$1 mm Durchgang').replace(/8 passages/gi, 'acht Kanäle');
      return details ? `${base} (${details})` : base;
    }
    if (languageCode === 'ja') {
      const base = `${inlet}入力／${outlet}出力`;
      const details = detail
        .replace(/single passage/gi, '1流路').replace(/dual passage/gi, '2流路')
        .replace(/triple passage/gi, '3流路').replace(/quad passage/gi, '4流路')
        .replace(/single inlet, six outlets/gi, '1入力6出力').replace(/dual inlet, triple outlet/gi, '2入力3出力')
        .replace(/(\d+)mm bore/gi, '中空穴径$1 mm').replace(/8 passages/gi, '8流路');
      return details ? `${base}（${details}）` : base;
    }
    const inletWord = inflectRussianCount(inlet, 'вход', 'входа', 'входов');
    const outletWord = inflectRussianCount(outlet, 'выход', 'выхода', 'выходов');
    const base = `${inlet} ${inletWord} / ${outlet} ${outletWord}`;
    const details = detail
      .replace(/single passage/gi, 'одноканальное исполнение').replace(/dual passage/gi, 'двухканальное исполнение')
      .replace(/triple passage/gi, 'трёхканальное исполнение').replace(/quad passage/gi, 'четырёхканальное исполнение')
      .replace(/single inlet, six outlets/gi, 'один вход, шесть выходов').replace(/dual inlet, triple outlet/gi, 'два входа, три выхода')
      .replace(/(\d+)mm bore/gi, 'проходное отверстие $1 мм').replace(/8 passages/gi, 'восемь каналов');
    return details ? `${base} (${details})` : base;
  });
}

function localizeStructuredValue(rawValue, languageCode) {
  let value = localizePassageValue(String(rawValue), languageCode)
    .replaceAll('&Oslash;', 'Ø').replaceAll('&le;', '≤').replaceAll('&ge;', '≥').replaceAll('&middot;', '·');
  const replacements = {
    de: [
      ['Pneumatic-electric rotary joint', 'Pneumatisch-elektrische Drehdurchführung'],
      ['Pneumatic rotary joint', 'Pneumatische Drehdurchführung'], ['air rotary union with slip ring', 'Luft-Drehdurchführung mit Schleifring'],
      ['air rotary union', 'Luft-Drehdurchführung'], ['air swivel', 'Druckluft-Drehgelenk'],
      ['manifold rotary joint', 'Verteiler-Drehdurchführung'], ['dual passage rotary joint', 'Zweikanal-Drehdurchführung'],
      ['dual inlet rotary joint', 'Drehdurchführung mit zwei Eingängen'], ['heavy duty rotary joint', 'Schwerlast-Drehdurchführung'],
      ['dust-proof rotary joint', 'staubgeschützte Drehdurchführung'], ['high pressure rotary union', 'Hochdruck-Drehdurchführung'],
      ['triple passage rotary joint', 'Dreikanal-Drehdurchführung'], ['hollow bore rotary joint', 'Drehdurchführung mit Durchgangsbohrung'],
      ['multi-channel rotary joint', 'Mehrkanal-Drehdurchführung'],
      ['Air, water, water-soluble coolant, light hydraulic oil', 'Luft, Wasser, wassermischbares Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, coolant, light hydraulic oil', 'Luft, Wasser, Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, oil, coolant, light hydraulic oil', 'Luft, Wasser, Öl, Kühlmittel, leichtes Hydrauliköl'],
      ['Air, water, coolant, hydraulic oil', 'Luft, Wasser, Kühlmittel, Hydrauliköl'],
      ['ISO VG 32 max', 'max. ISO VG 32'], ['45# Steel', 'Stahl 45#'],
      ['AL6061 Aluminum Alloy, anodized', 'Aluminiumlegierung AL6061, eloxiert'],
      ['AL6061 aluminum alloy, anodized', 'Aluminiumlegierung AL6061, eloxiert'],
      ['AL6061 aluminum alloy', 'Aluminiumlegierung AL6061'], ['Aluminum Alloy 6061', 'Aluminiumlegierung 6061'],
      ['PTFE composite seal with FKM O-ring backup', 'PTFE-Verbunddichtung mit zusätzlichem FKM-O-Ring'],
      ['PTFE composite seal with FKM O-ring', 'PTFE-Verbunddichtung mit FKM-O-Ring'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'PTFE-Verbunddichtung mit zusätzlichem FKM-O-Ring'],
      ['PTFE (Teflon) Composite Seal', 'PTFE-Verbunddichtung'], ['PTFE composite seal', 'PTFE-Verbunddichtung'],
      ['PTFE + Graphite Composite / PEEK', 'PTFE-Graphit-Verbund / PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'PTFE-Verbund- und Si3N4-Keramikdichtung'],
      ['Deep Groove Ball Bearing', 'Rillenkugellager'], ['Deep groove ball bearing', 'Rillenkugellager'],
      ['Threaded mount', 'Gewindemontage'], ['threaded mount', 'Gewindemontage'], ['Flange mount', 'Flanschmontage'],
      ['G1/8 threaded', 'G1/8-Gewinde'], ['BSP parallel', 'BSPP (zylindrisch)'], [' or ', ' oder '],
      ['mounting holes', 'Befestigungsbohrungen'], ['bolt pattern', 'Lochkreis'], ['rotor /', 'Rotor /'], ['stator', 'Stator'],
      [' with ', ' mit '], [' per ISO ', ' nach ISO '], [' rotor ', ' Rotor-'],
      ['rotating side', 'Rotorseite'], ['fixed side', 'Statorseite'], ['through-hole', 'Durchgangsbohrung'],
      ['dust-proof structure', 'staubgeschützte Ausführung'], ['hollow bore', 'Durchgangsbohrung'],
      ['PTFE-Verbund + Si3N4 Ceramic Seal', 'PTFE-Verbund- und Si3N4-Keramikdichtung'],
      ['Gold-plated copper alloy', 'Vergoldete Kupferlegierung'], ['circuits', 'Stromkreise'], ['per circuit', 'je Stromkreis'],
      ['2A max', 'max. 2 A'], ['<=500 MOhm', '≤500 MΩ'], ['at 500V DC', 'bei 500 V DC'],
      ['Anodized (Aluminum)', 'Eloxiert (Aluminium)'], ['Diameter', 'Durchmesser'],
      ['hours (rated conditions)', 'Stunden (unter Nennbedingungen)'], ['rated conditions', 'Nennbedingungen'],
      ['Confirmed by model-specific inspection plan', 'Nach modellbezogenem Prüfplan zu bestätigen'],
      ['Approx.', 'ca.'], ['Months', 'Monate'], ['months', 'Monate'], ['Heavy duty', 'Schwerlastausführung'], ['distribution', 'Verteilung'],
    ],
    ja: [
      ['Pneumatic-electric rotary joint', '空圧・電気複合ロータリージョイント'],
      ['Pneumatic rotary joint', '空圧用ロータリージョイント'], ['air rotary union with slip ring', 'スリップリング一体型エアロータリーユニオン'],
      ['air rotary union', 'エアロータリーユニオン'], ['air swivel', 'エアスイベル'],
      ['manifold rotary joint', '分配型ロータリージョイント'], ['dual passage rotary joint', '2流路ロータリージョイント'],
      ['dual inlet rotary joint', '2入力ロータリージョイント'], ['heavy duty rotary joint', '高荷重用ロータリージョイント'],
      ['dust-proof rotary joint', '防じんロータリージョイント'], ['high pressure rotary union', '高圧用ロータリーユニオン'],
      ['triple passage rotary joint', '3流路ロータリージョイント'], ['hollow bore rotary joint', '中空穴付きロータリージョイント'],
      ['multi-channel rotary joint', '多流路・多ポートロータリージョイント'],
      ['Air, water, water-soluble coolant, light hydraulic oil', '空気、水、水溶性クーラント、低粘度作動油'],
      ['Air, water, coolant, light hydraulic oil', '空気、水、クーラント、低粘度作動油'],
      ['Air, water, oil, coolant, light hydraulic oil', '空気、水、油、クーラント、低粘度作動油'],
      ['Air, water, coolant, hydraulic oil', '空気、水、クーラント、作動油'],
      ['ISO VG 32 max', 'ISO VG 32以下'], ['45# Steel', '45#鋼'],
      ['AL6061 Aluminum Alloy, anodized', 'AL6061アルミニウム合金（アルマイト処理）'],
      ['AL6061 aluminum alloy, anodized', 'AL6061アルミニウム合金（アルマイト処理）'],
      ['AL6061 aluminum alloy', 'AL6061アルミニウム合金'], ['Aluminum Alloy 6061', '6061アルミニウム合金'],
      ['PTFE composite seal with FKM O-ring backup', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE composite seal with FKM O-ring', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'PTFE複合シール＋FKM Oリング'],
      ['PTFE (Teflon) Composite Seal', 'PTFE複合シール'], ['PTFE composite seal', 'PTFE複合シール'],
      ['PTFE + Graphite Composite / PEEK', 'PTFE・グラファイト複合材／PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'PTFE複合シール＋Si3N4セラミックシール'],
      ['Deep Groove Ball Bearing', '深溝玉軸受'], ['Deep groove ball bearing', '深溝玉軸受'],
      ['Threaded mount', 'ねじ取付'], ['threaded mount', 'ねじ取付'], ['Flange mount', 'フランジ取付'],
      ['G1/8 threaded', 'G1/8ねじ取付'], ['BSP parallel', 'BSPP平行ねじ'], [' or ', 'または'],
      ['mounting holes', '取付穴'], ['bolt pattern', 'ボルト穴配置'], ['rotor /', '回転側／'], ['stator', '固定側'],
      [' with ', '、'], [' per ISO ', '、ISO '], [' rotor ', ' 回転側'],
      ['rotating side', '回転側'], ['fixed side', '固定側'], ['through-hole', '貫通穴'],
      ['dust-proof structure', '防じん構造'], ['hollow bore', '中空穴'],
      ['Gold-plated copper alloy', '金めっき銅合金'], ['circuits', '回路'], ['per circuit', '各回路'],
      ['2A max', '最大2 A'], ['<=500 MOhm', '500 MΩ以下'], ['at 500V DC', 'DC 500 V印加時'],
      ['Anodized (Aluminum)', 'アルマイト処理（アルミニウム）'], ['Diameter', '外径'],
      ['hours (rated conditions)', '時間（定格条件）'], ['rated conditions', '定格条件'],
      ['Confirmed by model-specific inspection plan', '型式ごとの検査計画で確認'],
      ['Approx.', '約'], ['Months', 'か月'], ['months', 'か月'], ['Heavy duty', '高荷重仕様'], ['distribution', '分配'],
    ],
    ru: [
      ['Pneumatic-electric rotary joint', 'Пневмоэлектрическое вращающееся соединение'],
      ['Pneumatic rotary joint', 'Пневматическое вращающееся соединение'], ['air rotary union with slip ring', 'вращающееся пневмосоединение с контактным кольцом'],
      ['air rotary union', 'вращающееся пневмосоединение'], ['air swivel', 'поворотное пневмосоединение'],
      ['manifold rotary joint', 'вращающийся распределительный коллектор'], ['dual passage rotary joint', 'двухканальное вращающееся соединение'],
      ['dual inlet rotary joint', 'вращающееся соединение с двумя входами'], ['heavy duty rotary joint', 'вращающееся соединение для тяжёлых условий'],
      ['dust-proof rotary joint', 'пылезащищённое вращающееся соединение'], ['high pressure rotary union', 'вращающееся соединение высокого давления'],
      ['triple passage rotary joint', 'трёхканальное вращающееся соединение'], ['hollow bore rotary joint', 'вращающееся соединение со сквозным отверстием'],
      ['multi-channel rotary joint', 'многоканальный вращающийся коллектор'],
      ['Air, water, water-soluble coolant, light hydraulic oil', 'Воздух, вода, водорастворимая СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, coolant, light hydraulic oil', 'Воздух, вода, СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, oil, coolant, light hydraulic oil', 'Воздух, вода, масло, СОЖ, маловязкое гидравлическое масло'],
      ['Air, water, coolant, hydraulic oil', 'Воздух, вода, СОЖ, гидравлическое масло'],
      ['ISO VG 32 max', 'не выше ISO VG 32'], ['45# Steel', 'Сталь 45#'],
      ['AL6061 Aluminum Alloy, anodized', 'Алюминиевый сплав AL6061, анодированный'],
      ['AL6061 aluminum alloy, anodized', 'Алюминиевый сплав AL6061, анодированный'],
      ['AL6061 aluminum alloy', 'Алюминиевый сплав AL6061'], ['Aluminum Alloy 6061', 'Алюминиевый сплав 6061'],
      ['PTFE composite seal with FKM O-ring backup', 'Композитное уплотнение из ПТФЭ с дополнительным кольцом FKM'],
      ['PTFE composite seal with FKM O-ring', 'Композитное уплотнение из ПТФЭ с кольцом FKM'],
      ['PTFE (Teflon) composite seal with FKM O-ring backup', 'Композитное уплотнение из ПТФЭ с дополнительным кольцом FKM'],
      ['PTFE (Teflon) Composite Seal', 'Композитное уплотнение из ПТФЭ'], ['PTFE composite seal', 'Композитное уплотнение из ПТФЭ'],
      ['PTFE + Graphite Composite / PEEK', 'Композит ПТФЭ с графитом / PEEK'],
      ['PTFE Composite + Si3N4 Ceramic Seal', 'Композитное уплотнение из ПТФЭ и керамическое уплотнение Si3N4'],
      ['Deep Groove Ball Bearing', 'Радиальный шариковый подшипник'], ['Deep groove ball bearing', 'Радиальный шариковый подшипник'],
      ['Threaded mount', 'Резьбовое крепление'], ['threaded mount', 'резьбовое крепление'], ['Flange mount', 'Фланцевое крепление'],
      ['G1/8 threaded', 'Резьбовое крепление G1/8'], ['BSP parallel', 'цилиндрическая резьба BSPP'], [' or ', ' или '],
      ['mounting holes', 'крепёжными отверстиями'], ['bolt pattern', 'схема крепёжных отверстий'], ['rotor /', 'ротор /'], ['stator', 'статор'],
      [' with ', ' с '], [' per ISO ', ' по ISO '], [' rotor ', ' со стороны ротора '],
      ['rotating side', 'со стороны ротора'], ['fixed side', 'со стороны статора'], ['through-hole', 'сквозное отверстие'],
      ['dust-proof structure', 'пылезащищённая конструкция'], ['hollow bore', 'сквозное отверстие'],
      ['Gold-plated copper alloy', 'Позолоченный медный сплав'], ['circuits', 'цепей'], ['per circuit', 'на цепь'],
      ['2A max', 'макс. 2 А'], ['<=500 MOhm', '≤500 МОм'], ['at 500V DC', 'при 500 В пост. тока'],
      ['Anodized (Aluminum)', 'Анодирование (алюминий)'], ['Diameter', 'Диаметр'],
      ['hours (rated conditions)', 'часов (при номинальных условиях)'], ['rated conditions', 'номинальные условия'],
      ['Confirmed by model-specific inspection plan', 'Подтверждается планом контроля для модели'],
      ['Approx.', 'Около'], ['Months', 'месяцев'], ['months', 'месяцев'], ['Heavy duty', 'Для тяжёлых условий'], ['distribution', 'распределение'],
    ],
  };
  for (const [from, to] of replacements[languageCode] || []) value = value.replaceAll(from, to);
  if (languageCode === 'de') {
    value = value
      .replaceAll('BSPP (zylindrisch) (BSPP)', 'BSPP (zylindrisch)')
      .replace(/\b(\d+)\.(\d+)\b/g, '$1,$2')
      .replace(/\b(\d+),(\d{3})\b/g, '$1.$2')
      .replace(/Ø(\d+)mm/g, 'Ø$1 mm')
      .replace(/\b(\d+(?:,\d+)?) x (\d+(?:,\d+)?)\b/g, '$1 × $2');
  } else if (languageCode === 'ja') {
    value = value
      .replaceAll('BSPP平行ねじ (BSPP)', 'BSPP平行ねじ')
      .replaceAll(' (', '（').replaceAll(')', '）')
      .replaceAll(', ', '、').replaceAll(' / ', '／')
      .replace(/Ø(\d+)mm/g, 'Ø$1 mm');
  } else if (languageCode === 'ru') {
    value = value
      .replaceAll('цилиндрическая резьба BSPP (BSPP)', 'цилиндрическая резьба BSPP')
      .replace(/\b(\d+),(\d{3})\b/g, '$1 $2')
      .replace(/\b(\d+)\.(\d+)\b/g, '$1,$2')
      .replace(/\bbar\b/g, 'бар').replace(/\bkg\b/g, 'кг').replace(/\bmm\b/g, 'мм')
      .replace(/Ø(\d+)мм/g, 'Ø$1 мм');
  }
  return value.replace(/\s+/g, ' ').trim();
}

function localizeProductProperty(property, languageCode, pageName) {
  if (!property || typeof property !== 'object') return;
  const nameMap = structuredPropertyNames[languageCode] || {};
  const isApplications = property.name === 'Typical applications'
    || ['Typische Anwendungen', '主な用途', 'Типичные области применения'].includes(property.name);
  if (nameMap[property.name]) property.name = nameMap[property.name];
  const conservativeValue = pageName === 'BP-2P-50-0001.html'
    ? conservativeProductPropertyValues[languageCode]?.[property.name]
    : undefined;
  if (conservativeValue) {
    property.value = conservativeValue;
    return;
  }
  if (isApplications && structuredApplicationValues[languageCode]?.[pageName]) {
    property.value = structuredApplicationValues[languageCode][pageName];
  } else if (property.value !== undefined && property.value !== null) {
    property.value = localizeStructuredValue(property.value, languageCode);
  }
}

function updateJsonLd($, languageCode, pageName) {
  const englishUrl = pageUrl(config.sourceLanguage.code, pageName);
  const localizedUrl = pageUrl(languageCode, pageName);
  const seo = seoByLanguage.get(languageCode)?.[pageName];
  const site = seoByLanguage.get(languageCode)?._site || {};
  const schemaLocale = schemaLocaleByLanguage[languageCode] || {};
  const faqEntities = visibleFaqEntities($);
  const contentTypes = new Set(['Article', 'BlogPosting', 'TechArticle', 'WebPage', 'WebSite', 'Product', 'FAQPage', 'HowTo']);
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const data = JSON.parse($(element).html());
      const pruneHiddenFaq = (value) => {
        if (Array.isArray(value)) return value.map(pruneHiddenFaq).filter((item) => item !== null);
        if (!value || typeof value !== 'object') return value;
        if (schemaTypes(value).has('FAQPage') && !faqEntities.length) return null;
        for (const [key, child] of Object.entries(value)) value[key] = pruneHiddenFaq(child);
        return value;
      };
      const visit = (value) => {
        if (Array.isArray(value)) return value.map(visit);
        if (!value || typeof value !== 'object') return value === englishUrl ? localizedUrl : value;
        for (const [key, child] of Object.entries(value)) value[key] = visit(child);
        const types = schemaTypes(value);
        if ([...types].some((type) => contentTypes.has(type))) value.inLanguage = languageCode;
        if (types.has('Product')) {
          value.name = seo.h1;
          value.description = seo.description;
          if (Array.isArray(value.additionalProperty)) {
            if (pageName === 'BP-2P-50-0001.html') {
              value.additionalProperty = value.additionalProperty.filter(
                (property) => !localizedWeightPropertyNames.has(property?.name),
              );
            }
            for (const property of value.additionalProperty) localizeProductProperty(property, languageCode, pageName);
          }
        }
        if (types.has('WebPage')) {
          value.name = seo.title;
          value.description = seo.description;
        }
        if (types.has('Article') || types.has('BlogPosting') || types.has('TechArticle')) {
          value.headline = seo.h1;
          value.description = seo.description;
        }
        if (types.has('WebSite')) {
          value.name = site.heading || 'Begapunk';
          value.description = site.description || seo.description;
        }
        if (types.has('Organization') && value.description) {
          value.description = site.organizationDescription || site.description || seo.description;
          if (value.slogan && schemaLocale.slogan) value.slogan = schemaLocale.slogan;
          if (value.founder && schemaLocale.founderJobTitle) {
            value.founder = Array.isArray(value.founder)
              ? value.founder.map((founder) => ({ ...founder, jobTitle: schemaLocale.founderJobTitle }))
              : { ...value.founder, jobTitle: schemaLocale.founderJobTitle };
          }
          if (schemaLocale.knowsAbout) value.knowsAbout = schemaLocale.knowsAbout;
        }
        if (types.has('LocalBusiness') && schemaLocale.factoryName) value.name = schemaLocale.factoryName;
        if (types.has('BreadcrumbList') && Array.isArray(value.itemListElement) && value.itemListElement.length) {
          for (const item of value.itemListElement) {
            if (!item || typeof item !== 'object' || typeof item.item !== 'string') continue;
            try {
              const itemUrl = new URL(item.item);
              if (itemUrl.origin !== new URL(config.siteUrl).origin) continue;
              const itemPage = itemUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
              if (config.pages.includes(itemPage)) item.item = pageUrl(languageCode, itemPage);
            } catch {
              // Keep malformed or non-URL breadcrumb values for the validator to report.
            }
          }
          const current = value.itemListElement[value.itemListElement.length - 1];
          if (current && typeof current === 'object') {
            current.name = seo.h1;
            current.item = localizedUrl;
          }
        }
        if (types.has('FAQPage') && faqEntities.length) value.mainEntity = faqEntities;
        return value;
      };
      const localized = visit(pruneHiddenFaq(data));
      if (localized === null) {
        $(element).remove();
        return;
      }
      $(element).text(JSON.stringify(localized));
    } catch {
      // Existing JSON-LD validity is handled by the release verifier.
    }
  });
}

function injectAlternateLinks($, currentLanguage, pageName) {
  $('link[rel="alternate"][hreflang]').remove();
  const canonical = $('link[rel="canonical"]').first();
  const links = [config.sourceLanguage, ...activeLanguages]
    .map((language) => `<link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}">`)
    .join('\n');
  canonical.before(`${links}\n`);
  canonical.attr('href', pageUrl(currentLanguage, pageName));
}

function injectLanguageSwitcher($, currentLanguage, pageName) {
  $('.i18n-switcher').remove();
  const languages = [config.sourceLanguage, ...activeLanguages];
  const options = languages.map((language) => {
    const selected = language.code === currentLanguage ? ' selected' : '';
    return `<option value="${switcherReference(currentLanguage, language.code, pageName)}"${selected}>${language.label}</option>`;
  }).join('');
  const switcher = `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">Language</label><select id="language-${currentLanguage}" aria-label="Language" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
  const mobileToggle = $('.mobile-toggle').first();
  if (mobileToggle.length) mobileToggle.before(switcher);
  else $('.header-inner').first().append(switcher);
}

function applyTranslations(page, language, catalog, cache) {
  const { $, records, pageName } = page;
  const idBySource = new Map(catalog.entries.map((entry) => [entry.source, entry.id]));
  const overrides = overridesByLanguage.get(language.code) || {};
  const editorialOverrides = editorialOverridesByLanguage.get(language.code) || {};
  const sharedEditorialOverrides = editorialOverrides['*'] || {};
  const pageEditorialOverrides = editorialOverrides[pageName] || {};
  const preservedBrowserContent = (config.browserNoTranslateSelectors || []).map((selector) => ({
    selector,
    values: $(selector).map((_, element) => $(element).html()).get(),
  }));
  for (const record of records) {
    const id = idBySource.get(record.source);
    const translated = pageEditorialOverrides[id]
      || pageEditorialOverrides[record.source]
      || sharedEditorialOverrides[id]
      || sharedEditorialOverrides[record.source]
      || overrides[record.source]
      || cache.translations[id];
    if (!translated) throw new Error(`${language.code}/${pageName}: missing translation for ${record.source}`);
    if (record.type === 'html') {
      $(record.element).html(translated);
    } else if (record.type === 'text') {
      const leading = record.original.match(/^\s*/)?.[0] || '';
      const trailing = record.original.match(/\s*$/)?.[0] || '';
      record.node.data = `${leading}${translated}${trailing}`;
    } else {
      $(record.element).attr(record.attribute, translated);
    }
  }

  for (const { selector, values } of preservedBrowserContent) {
    $(selector).each((index, element) => {
      if (values[index] !== undefined) $(element).html(values[index]);
      $(element).attr('translate', 'no').addClass('notranslate');
    });
  }

  applySeoMetadata($, language.code, pageName);

  $('html').attr('lang', language.code);
  const localizedUrl = pageUrl(language.code, pageName);
  injectAlternateLinks($, language.code, pageName);
  injectLanguageSwitcher($, language.code, pageName);
  $('meta[property="og:url"]').attr('content', localizedUrl);
  if (!$('meta[property="og:url"]').length) $('head').append(`<meta property="og:url" content="${localizedUrl}">`);
  $('meta[property="og:locale"]').attr('content', language.locale);
  if (!$('meta[property="og:locale"]').length) $('head').append(`<meta property="og:locale" content="${language.locale}">`);

  const pilotPages = new Set(config.pages);
  $('[href], [src], [poster], [action]').each((_, element) => {
    for (const attribute of ['href', 'src', 'poster', 'action']) {
      const value = $(element).attr(attribute);
      if (value) $(element).attr(attribute, localizeRelativeReference(value, pilotPages));
    }
  });
  $('[srcset]').each((_, element) => {
    const localized = ($(element).attr('srcset') || '').split(',').map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      parts[0] = localizeRelativeReference(parts[0], pilotPages);
      return parts.join(' ');
    }).join(', ');
    $(element).attr('srcset', localized);
  });

  $('input[name="redirect"][value]').each((_, element) => {
    const value = $(element).attr('value');
    try {
      const redirectUrl = new URL(value);
      const redirectPage = redirectUrl.pathname.split('/').filter(Boolean).at(-1) || 'index.html';
      if (redirectUrl.origin === new URL(config.siteUrl).origin && pilotPages.has(redirectPage)) {
        $(element).attr('value', pageUrl(language.code, redirectPage));
      }
    } catch {
      // Leave non-URL form values unchanged.
    }
  });

  $('form input[name="source_language"]').remove();
  $('form#quoteForm, form[action*="send_inquiry.php"]').each((_, form) => {
    $(form).prepend(`<input type="hidden" name="source_language" value="${language.code}">`);
  });
  let localized = $.html().replace(/[ \t]+$/gm, '');
  if (language.code === 'ja') localized = normalizeJapaneseOutput(localized);
  if (language.code === 'de') localized = normalizeGermanOutput(localized);
  if (language.code === 'ru') localized = normalizeRussianOutput(localized);
  const finalized = load(localized, { decodeEntities: false });
  applySeoMetadata(finalized, language.code, pageName);
  updateJsonLd(finalized, language.code, pageName);
  return finalized.html().replace(/[ \t]+$/gm, '');
}

async function writeLocalizedSearchIndex(language, outputDirectory) {
  const searchIndex = JSON.parse(await fs.readFile(path.join(sourceRoot, 'search-index.json'), 'utf8'));
  const conservativeSearchKeywords = {
    de: [
      'BP-2P-50-0001', '2 Kanäle', 'Standardmedium Luft', 'PTFE-Dichtung mit O-Ring',
      'Schutzhaube und Labyrinth', 'keine zertifizierte IP-Schutzart angegeben',
      'Stator 4 × M5 Gewindetiefe 10 mm', 'Rotor 6 × M5 Gewindetiefe 8 mm',
      'Gewicht der gelieferten Konfiguration bestätigen',
    ],
    ja: [
      'BP-2P-50-0001', '2流路', '標準使用流体 空気', 'PTFEシール Oリング',
      '保護カバー ラビリンス', '認証済みIP保護等級の表示なし',
      '固定側 4 × M5 ねじ深さ10 mm', '回転側 6 × M5 ねじ深さ8 mm',
      '納入仕様の質量を確認',
    ],
    ru: [
      'BP-2P-50-0001', '2 канала', 'стандартная среда воздух', 'уплотнение ПТФЭ с O-кольцом',
      'защитный кожух и лабиринт', 'сертифицированная степень защиты IP не заявляется',
      'статор 4 × M5 глубина резьбы 10 мм', 'ротор 6 × M5 глубина резьбы 8 мм',
      'уточнить массу поставляемой конфигурации',
    ],
  };
  const localizedItems = [];
  for (const item of searchIndex) {
    if (!config.pages.includes(item.url)) {
      localizedItems.push(item);
      continue;
    }
    const html = await fs.readFile(path.join(outputDirectory, item.url), 'utf8');
    const $ = load(html, { decodeEntities: false });
    const content = $('body').clone();
    content.find('script,style,header,nav,footer,.cookie-banner,.i18n-switcher').remove();
    localizedItems.push({
      ...item,
      title: $('title').text().trim() || item.title,
      description: $('meta[name="description"]').attr('content')?.trim() || item.description,
      h1: $('h1').first().text().replace(/\s+/g, ' ').trim() || item.h1,
      h2s: $('h2').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean),
      body: content.text().replace(/\s+/g, ' ').trim(),
      ...(item.url === 'BP-2P-50-0001.html'
        ? { keywords: conservativeSearchKeywords[language.code] }
        : {}),
    });
  }
  await fs.writeFile(
    path.join(outputDirectory, 'search-index.json'),
    `${JSON.stringify(localizedItems, null, 2)}\n`,
    'utf8',
  );
}

const llmsLabels = {
  de: {
    summary: 'Technischer Seitenindex für pneumatische Drehdurchführungen von Begapunk. Die Auswahl erfolgt nach Medium, Betriebsdruck, Drehzahl, Kanalzahl, Anschluss und Einbausituation.',
    sections: { products: 'Produkte', applications: 'Anwendungen', articles: 'Technische Beiträge', other: 'Unternehmen und Service' },
  },
  ja: {
    summary: 'Begapunkの空圧用ロータリージョイントに関する技術ページ索引です。使用流体、圧力、回転数、流路数・ポート数、接続、取付条件から選定してください。',
    sections: { products: '製品', applications: '用途別ガイド', articles: '技術記事', other: '会社・サポート' },
  },
  ru: {
    summary: 'Технический указатель страниц Begapunk о пневматических вращающихся и ротационных соединениях. При подборе учитывайте среду, давление, частоту вращения, число каналов, присоединение и монтаж.',
    sections: { products: 'Продукция', applications: 'Области применения', articles: 'Технические статьи', other: 'Компания и поддержка' },
  },
};

function llmsGroup(pageName) {
  if (/^BP-/.test(pageName) || ['products.html', 'products-p2.html', 'product-comparison.html'].includes(pageName)) return 'products';
  if (pageName === 'applications.html' || pageName.startsWith('application-')) return 'applications';
  if (pageName === 'blog.html' || pageName.startsWith('blog-')) return 'articles';
  return 'other';
}

async function writeLocalizedLlms(language, outputDirectory) {
  const seo = seoByLanguage.get(language.code);
  const labels = llmsLabels[language.code];
  if (!seo || !labels) throw new Error(`${language.code}: localized llms configuration is missing.`);
  const grouped = new Map(['products', 'applications', 'articles', 'other'].map((group) => [group, []]));
  for (const pageName of config.pages) {
    const entry = seo[pageName];
    if (!entry) throw new Error(`${language.code}/${pageName}: cannot add missing SEO entry to llms.txt.`);
    grouped.get(llmsGroup(pageName)).push(`- [${entry.title}](${pageUrl(language.code, pageName)}): ${entry.description}`);
  }
  const sections = [...grouped.entries()].map(([group, lines]) => `## ${labels.sections[group]}\n\n${lines.join('\n')}`).join('\n\n');
  const contents = `# ${seo._site.heading}\n\n> ${labels.summary}\n\n- [Multilingual sitemap](${config.siteUrl}/sitemap-i18n.xml)\n- [English AI index](${config.siteUrl}/llms.txt)\n\n${sections}\n`;
  await fs.writeFile(path.join(outputDirectory, 'llms.txt'), contents, 'utf8');
}

async function buildLocalizedPages(catalog) {
  const pages = await loadPages();
  for (const language of activeLanguages) {
    const cachePath = path.join(cacheRoot, `${language.code}.json`);
    const cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    const missingCount = catalog.entries.filter((entry) => !cache.translations[entry.id]).length;
    if (missingCount) throw new Error(`${language.code}: ${missingCount} translations are missing.`);
    const outputDirectory = path.join(outputRoot, language.code);
    await fs.mkdir(outputDirectory, { recursive: true });
    for (const sourcePage of pages) {
      const html = await fs.readFile(path.join(sourceRoot, sourcePage.pageName), 'utf8');
      const $ = load(html, { decodeEntities: false });
      const page = { pageName: sourcePage.pageName, $, records: collectRecords($) };
      const localized = applyTranslations(page, language, catalog, cache);
      await fs.writeFile(path.join(outputDirectory, page.pageName), localized, 'utf8');
    }
    await writeLocalizedSearchIndex(language, outputDirectory);
    await writeLocalizedLlms(language, outputDirectory);
    console.log(`${language.code}: built ${pages.length} localized pages.`);
  }
}

async function refreshLocalizedMetadata() {
  for (const language of activeLanguages) {
    const outputDirectory = path.join(outputRoot, language.code);
    for (const pageName of config.pages) {
      const filePath = path.join(outputDirectory, pageName);
      const html = await fs.readFile(filePath, 'utf8');
      const $ = load(html, { decodeEntities: false });
      applySeoMetadata($, language.code, pageName);
      updateJsonLd($, language.code, pageName);
      await fs.writeFile(filePath, $.html().replace(/[ \t]+$/gm, ''), 'utf8');
    }
    await writeLocalizedSearchIndex(language, outputDirectory);
    await writeLocalizedLlms(language, outputDirectory);
    console.log(`${language.code}: refreshed metadata and structured data for ${config.pages.length} pages.`);
  }
}

function alternateMarkup(pageName) {
  return [config.sourceLanguage, ...activeLanguages]
    .map((language) => `<link rel="alternate" hreflang="${language.code}" href="${pageUrl(language.code, pageName)}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}">`)
    .join('\n');
}

function switcherMarkup(currentLanguage, pageName) {
  const options = [config.sourceLanguage, ...activeLanguages].map((language) => {
    const selected = language.code === currentLanguage ? ' selected' : '';
    return `<option value="${switcherReference(currentLanguage, language.code, pageName)}"${selected}>${language.label}</option>`;
  }).join('');
  return `<div class="i18n-switcher" data-no-translate><label class="sr-only" for="language-${currentLanguage}">Language</label><select id="language-${currentLanguage}" aria-label="Language" onchange="if(this.value)window.location.href=this.value">${options}</select></div>`;
}

async function integrateEnglishPages() {
  for (const pageName of config.pages) {
    const sourcePath = path.join(sourceRoot, pageName);
    const filePath = path.join(outputRoot, pageName);
    let html = await fs.readFile(sourcePath, 'utf8');
    html = html.replace(/<link\s+rel=["']alternate["']\s+hreflang=["'][^"']+["'][^>]*>\s*/gi, '');
    const alternates = alternateMarkup(pageName);
    if (!/<link\s+rel=["']canonical["']/i.test(html)) throw new Error(`${pageName}: canonical link is missing.`);
    html = html.replace(/(<link\s+rel=["']canonical["'][^>]*>)/i, `${alternates}\n$1`);
    html = html.replace(/<div class=["']i18n-switcher["'][\s\S]*?<\/div>\s*/i, '');
    const switcher = switcherMarkup(config.sourceLanguage.code, pageName);
    if (!/<button\s+class=["']mobile-toggle["']/i.test(html)) throw new Error(`${pageName}: mobile navigation toggle is missing.`);
    html = html.replace(/(<button\s+class=["']mobile-toggle["'])/i, `${switcher}\n   $1`);
    html = html.replace(/<input\s+type=["']hidden["']\s+name=["']source_language["'][^>]*>\s*/gi, '');
    const inquiryFormPattern = /(<form\b(?=[^>]*(?:\bid=["']quoteForm["']|\baction=["'][^"']*send_inquiry\.php[^"']*["']))[^>]*>)/i;
    if (inquiryFormPattern.test(html)) {
      html = html.replace(inquiryFormPattern, `$1\n<input type="hidden" name="source_language" value="${config.sourceLanguage.code}">`);
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html, 'utf8');
  }
}

async function writeInternationalSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];
  const excludedPages = new Set(config.sitemapExcludedPages || []);
  const sitemapPages = config.pages.filter((pageName) => !excludedPages.has(pageName));
  for (const language of [config.sourceLanguage, ...activeLanguages]) {
    for (const pageName of sitemapPages) {
      const alternates = [config.sourceLanguage, ...activeLanguages]
        .map((candidate) => `    <xhtml:link rel="alternate" hreflang="${candidate.code}" href="${pageUrl(candidate.code, pageName)}" />`)
        .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(config.sourceLanguage.code, pageName)}" />`)
        .join('\n');
      urls.push(`  <url>\n    <loc>${pageUrl(language.code, pageName)}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}\n  </url>`);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(outputRoot, 'sitemap-i18n.xml'), sitemap, 'utf8');

  const robotsPath = path.join(outputRoot, 'robots.txt');
  let robots = await fs.readFile(path.join(sourceRoot, 'robots.txt'), 'utf8');
  const sitemapLine = `Sitemap: ${config.siteUrl}/sitemap-i18n.xml`;
  if (!robots.includes(sitemapLine)) robots = `${robots.trimEnd()}\n${sitemapLine}\n`;
  await fs.writeFile(robotsPath, robots, 'utf8');
}

async function integrateLocalizedSite() {
  for (const language of activeLanguages) {
    for (const pageName of config.pages) {
      await fs.access(path.join(outputRoot, language.code, pageName));
    }
  }
  await integrateEnglishPages();
  await writeInternationalSitemap();
  console.log(`Integrated hreflang and language switching into ${config.pages.length} English pages.`);
  const sitemapPageCount = config.pages.length - (config.sitemapExcludedPages || []).length;
  console.log(`Generated sitemap-i18n.xml for ${(activeLanguages.length + 1) * sitemapPageCount} URLs.`);
}

const pages = await loadPages();
let catalog;
try {
  catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (mode === 'extract') {
  await extractCatalog(pages);
} else if (mode === 'translate') {
  catalog ||= await extractCatalog(pages);
  await translateCatalog(catalog);
} else if (mode === 'build') {
  if (!catalog) throw new Error('Run the extract step before building localized pages.');
  await buildLocalizedPages(catalog);
} else if (mode === 'refresh-metadata') {
  await refreshLocalizedMetadata();
} else if (mode === 'integrate') {
  await integrateLocalizedSite();
} else {
  throw new Error(`Unsupported mode: ${mode}`);
}
