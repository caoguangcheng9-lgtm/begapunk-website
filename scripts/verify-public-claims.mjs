import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const repoArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const repo = path.resolve(repoArgument || process.cwd());
const includeProduction = !process.argv.includes('--source-only');
const config = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'config.json'), 'utf8'));
const languages = config.activeLanguageCodes || ['de', 'ja', 'ru'];
const files = new Set();
const failures = [];
const productionRoot = path.join(repo, 'dist', 'production');
let productionAvailable = false;

for (const pageName of config.pages) {
  files.add(path.join(repo, pageName));
  for (const language of languages) files.add(path.join(repo, language, pageName));
}
for (const relativePath of [
  'search-index.json', 'llms.txt',
  'de/search-index.json', 'de/llms.txt',
  'ja/search-index.json', 'ja/llms.txt',
  'ru/search-index.json', 'ru/llms.txt',
  'i18n/source-catalog.json', 'i18n/glossary.json',
  'i18n/cache/de.json', 'i18n/cache/ja.json', 'i18n/cache/ru.json',
  'i18n/overrides/de.json', 'i18n/overrides/ja.json', 'i18n/overrides/ru.json',
  'i18n/editorial/de.json', 'i18n/editorial/ja.json', 'i18n/editorial/ru.json',
  'i18n/seo/de.json', 'i18n/seo/ja.json', 'i18n/seo/ru.json',
  'ops/indexnow-extra-urls.txt',
]) files.add(path.join(repo, relativePath));

async function addTextFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await addTextFiles(filePath);
      else if (/\.(?:html?|json|txt|xml|md|dxf)$/i.test(entry.name)) files.add(filePath);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// Public download-side text can carry claims even when no HTML page repeats them.
await addTextFiles(path.join(repo, 'downloads'));

if (includeProduction) {
  try {
    const stat = await fs.stat(productionRoot);
    if (!stat.isDirectory()) throw new Error('not a directory');
    await fs.access(path.join(productionRoot, 'manifest.sha256'));
    productionAvailable = true;
    await addTextFiles(productionRoot);
  } catch (error) {
    failures.push(`dist/production: a built release with manifest.sha256 is required (${error.message}).`);
  }
}

const excludedPdfNames = [
  'BP-2P-0001_draft.pdf',
  'BP-2P-30-0001.pdf',
  'BP-2P-95-0001.pdf',
];

async function rejectExcludedDownloads(directory) {
  for (const fileName of excludedPdfNames) {
    const filePath = path.join(directory, fileName);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        failures.push(`${path.relative(repo, filePath)}: excluded public PDF must not exist.`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

if (includeProduction && productionAvailable) {
  await rejectExcludedDownloads(path.join(productionRoot, 'downloads'));
}

const disclaimerPatterns = [
  /\b(?:do|does|did|can|could|will|would|must|should)\s+not\s+(?:claim|guarantee|promise|state|advertise|represent|offer)\b/i,
  /\b(?:cannot|can't|won't)\s+(?:be\s+)?(?:claimed|guaranteed|promised|confirmed|assured)\b/i,
  /\bno\b[^.!?。！？\n]{0,70}\b(?:claim|guarantee|promise|assurance|certification)\b/i,
  /\bnot\b[^.!?。！？\n]{0,70}\b(?:guaranteed|claimed|promised|verified|confirmed|certified|assured)\b/i,
  /\b(?:estimate|estimated|indicative|illustrative|typical)\b[^.!?。！？\n]{0,70}\bnot\s+(?:a\s+)?guarantee\b/i,
  /\b(?:subject to|requires?|must be)\b[^.!?。！？\n]{0,50}\b(?:confirmation|verification|written approval)\b/i,
  /\bavailability\b[^.!?。！？\n]{0,50}\b(?:must be|is|will be)\s+confirmed\b/i,
  /\b(?:nicht|keine?|ohne)\b[^.!?。！？\n]{0,70}\b(?:garantiert|zugesagt|bestätigt|zertifiziert|behauptet|Garantie|Zusage)\b/i,
  /\b(?:wird|werden)\s+nicht\b[^.!?。！？\n]{0,60}\b(?:garantiert|behauptet|zugesagt|beworben)\b/i,
  /(?:保証|確約|表示|記載|主張|認証|確認)(?:して|されて)?いません/,
  /(?:保証|確約|表示|記載|主張|認証|確認)しません/,
  /保証[^。！？\n]{0,40}(?:しません|使用しません|していません|されていません)/,
  /(?:要確認|確認が必要|注文ごとに確認|案件ごとに確認|保証対象外)/,
  /\bне\b[^.!?。！？\n]{0,70}\b(?:гарантируется|заявляется|обещается|подтверждено|сертифицировано)\b/i,
  /\b(?:нет|без)\b[^.!?。！？\n]{0,70}\b(?:гарантии|обещания|подтверждения|сертификации)\b/i,
  /\b(?:требует|подлежит)\b[^.!?。！？\n]{0,50}\bподтверждени/i,
];

function getStatementContext(source, index, length) {
  const lowerBound = Math.max(0, index - 220);
  const upperBound = Math.min(source.length, index + length + 260);
  let start = lowerBound;
  let end = upperBound;
  const before = source.slice(lowerBound, index);
  const after = source.slice(index + length, upperBound);
  const beforeBreak = Math.max(
    before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'),
    before.lastIndexOf('。'), before.lastIndexOf('！'), before.lastIndexOf('？'),
    before.lastIndexOf('\n'), before.lastIndexOf('>'),
  );
  if (beforeBreak >= 0) start = lowerBound + beforeBreak + 1;
  const afterBreaks = ['.', '!', '?', '。', '！', '？', '\n', '<']
    .map((separator) => after.indexOf(separator))
    .filter((position) => position >= 0);
  if (afterBreaks.length) end = index + length + Math.min(...afterBreaks) + 1;
  return source.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isDisclaimerContext(source, index, length) {
  const context = getStatementContext(source, index, length);
  return disclaimerPatterns.some((pattern) => pattern.test(context));
}

const banned = [
  { name: 'unsupported ISO 9001 claim', pattern: /\bISO[\s‐‑‒–—-]*9001(?::2015)?\b|\bISO9001\b/gi, allowDisclaimer: true },
  { name: 'unsupported RoHS claim', pattern: /\bRoHS\b/gi, allowDisclaimer: true },
  { name: 'unsupported CE claim', pattern: /\bCE\b/g, allowDisclaimer: true },
  { name: 'unsupported translated CE claim', pattern: /セリウム/g, allowDisclaimer: true },
  { name: 'unsupported countries-served claim', pattern: /40\s*\+?\s*(?:countries|country|Länder|Ländern|か国|カ国|ヶ国|国|стран|страны)|(?:more than|mehr als|über|более(?: чем)?)\s*40\s*(?:countries|Länder|Ländern|стран)/gi, allowDisclaimer: true },
  { name: 'unsupported 40-plus standard-model claim', pattern: /40\s*\+\s*(?:standard\s+models?|Standardmodelle|標準(?:モデル|機種)|стандартн(?:ых|ые)\s+модел(?:ей|и))|40\s*以上の標準(?:モデル|機種)|標準(?:モデル|機種)\s*40\s*以上/gi, allowDisclaimer: true },
  { name: 'incorrect 200k delivery claim', pattern: /(?:200\s*[KК]\+?|200[.,\s]?000\+?|20万(?:台|個)?以上?)\s*(?:units?|Einheiten|台|個|единиц|изделий)?\s*(?:were\s+|を)?(?:delivered|ausgeliefert|geliefert|出荷|納入|届け|渡しました|поставлено|доставлено)/gi, allowDisclaimer: true },
  { name: 'incorrect reverse-order 200k delivery claim', pattern: /(?:delivered|ausgeliefert|geliefert|出荷|納入|届け|渡しました|поставлено|доставлено)\s*(?:worldwide\s*)?(?:more than\s*)?(?:200\s*[KК]\+?|200[.,\s]?000\+?|20万)/gi, allowDisclaimer: true },
  { name: 'incorrect 200k experience claim', pattern: /(?:200\s*[KК]\+?|200[.,\s]?000\+?|20万)[^.!?。]{0,80}(?:field experience|Praxiserfahrung|Felderfahrung|現場経験|полевого опыта|практического опыта)/gi, allowDisclaimer: true },
  { name: 'unsupported global-service history', pattern: /(?:worldwide\s+since\s+2010|since\s+2010[^\n<]{0,180}(?:delivered|shipping|supplied|served)[^\n<]{0,40}worldwide|delivered\s+worldwide[^\n<]{0,180}since\s+2010|seit\s+2010[^\n<]{0,180}weltweit\s+(?:ausgeliefert|geliefert)|weltweit[^\n<]{0,80}seit\s+2010|2010年(?:から|以来)[^\n<]{0,180}(?:世界(?:中)?|海外)[^\n<]{0,80}(?:供給|出荷|納入|配信)|(?:世界(?:中)?|海外)[^\n<]{0,80}(?:供給|出荷|納入|配信)[^\n<]{0,180}2010年(?:から|以来)|с\s+2010\s+года[^\n<]{0,180}(?:доставлено|поставлено)[^\n<]{0,80}по\s+всему\s+миру|по\s+всему\s+миру[^\n<]{0,80}с\s+2010\s+года)/gi, allowDisclaimer: true },
  { name: 'unsupported structured service area', pattern: /["']areaServed["']\s*:/g, publicOnly: true },
  { name: 'unsupported ISO lead-auditor claim', pattern: /Lead Auditor|Leitender Auditor|主任監査員|鉛の監査人|ведущий аудитор/gi, allowDisclaimer: true },
  { name: 'unsupported 100-percent pressure-test claim', pattern: /(?:100\s*%[^.!?。！？\n]{0,60}(?:pressure|leak(?:age)?)[^.!?。！？\n]{0,30}(?:test(?:ed|ing)?|inspection)|(?:pressure|leak(?:age)?)[^.!?。！？\n]{0,30}(?:test(?:ed|ing)?|inspection)[^.!?。！？\n]{0,30}100\s*%|全数[^。！？\n]{0,30}(?:圧力試験|漏れ検査)|100\s*%[^。！？\n]{0,30}(?:圧力試験|漏れ検査)|100\s*%[^.!?。！？\n]{0,50}(?:Druckprüfung|Dichtheitsprüfung|испытани[^.!?。！？\n]{0,20}давлени|провер[^.!?。！？\n]{0,20}герметич))/gi, allowDisclaimer: true },
  { name: 'unsupported 1.5x pressure-test claim', pattern: /(?:1[.,]5\s*(?:×|x|&times;|fach(?:en)?|-fach(?:en)?|倍|[-‑–—]?кратн\w*)[^.!?。！？\n]{0,60}(?:rated|working|operating|Nenn|Betriebs|定格|使用|рабоч\w*)?\s*(?:pressure|Druck|圧力|давлени\w*)|(?:pressure|Druck|圧力|давлени\w*)[^.!?。！？\n]{0,60}1[.,]5\s*(?:×|x|&times;|fach(?:en)?|-fach(?:en)?|倍|[-‑–—]?кратн\w*))/gi, allowDisclaimer: true },
  { name: 'unsupported zero-leakage promise', pattern: /\b(?:zero[-\s]?leakage(?![-\s]+requirements?\b)|leak[-\s]?free|guaranteed\s+(?:no|zero)\s+leakage|(?:guarantees?|ensures?|provides?|achieves?|maintains?|with|offers?)[^.!?。！？\n]{0,30}no\s+leakage|no\s+leakage[^.!?。！？\n]{0,30}(?:between|under|at|during|across|for))\b|(?:null|keine)\s+Leckage|leckagefrei|漏れ(?:ゼロ|なし)|無漏洩|(?:нулев\w*\s+утеч\w*|без\s+утеч\w*)/gi, allowDisclaimer: true },
  { name: 'unsupported fixed 7-day shipping claim', pattern: /(?:(?:ships?|shipping|dispatch(?:ed)?|delivery|lead[\s-]?time|turnaround)[^.!?。！？\n]{0,55}(?:within|in|of|:)?\s*7(?:\s*[-‐‑‒–—~～]\s*14)?\s*[-‐‑‒–—]?\s*(?:business\s*)?days?|7(?:\s*[-‐‑‒–—~～]\s*14)?\s*[-‐‑‒–—]?\s*(?:business\s*)?days?[^.!?。！？\n]{0,55}(?:ship|deliver|dispatch|lead[\s-]?time|turnaround)|(?:Lieferung|Versand|Lieferzeit)[^.!?。！？\n]{0,55}7(?:\s*[-‐‑‒–—~～]\s*14)?\s*Tage?|7(?:\s*[-‐‑‒–—~～]\s*14)?\s*Tage?[^.!?。！？\n]{0,55}(?:Lieferung|Versand|Lieferzeit)|(?:出荷|納期|配送)[^。！？\n]{0,40}7(?:\s*[-‐‑‒–—~～]\s*14)?\s*日|7(?:\s*[-‐‑‒–—~～]\s*14)?\s*日[^。！？\n]{0,40}(?:出荷|納期|配送)|(?:доставк\w*|отправк\w*|срок\s+поставки)[^.!?。！？\n]{0,55}7(?:\s*[-‐‑‒–—~～]\s*14)?\s*дн\w*|7(?:\s*[-‐‑‒–—~～]\s*14)?\s*дн\w*[^.!?。！？\n]{0,55}(?:доставк\w*|отправк\w*|срок\s+поставки))/gi, allowDisclaimer: true },
  { name: 'unsupported 24-hour response promise', pattern: /(?:(?:respond|reply|response|quote|quotation|feedback|support|review|check|contact)[^.!?。！？\n]{0,70}(?:within\s+)?24\s*[-‐‑‒–—]?\s*(?:hours?|hrs?|h\b)|(?:within\s+)?24\s*[-‐‑‒–—]?\s*(?:hours?|hrs?|h\b)[^.!?。！？\n]{0,70}(?:respond|reply|response|quote|quotation|feedback|support|review|check|contact)|(?:Antwort|Angebot|Rückmeldung|Prüfung)[^.!?。！？\n]{0,60}24\s*[-‐‑‒–—]?\s*Stunden|24\s*[-‐‑‒–—]?\s*Stunden[^.!?。！？\n]{0,60}(?:Antwort|Angebot|Rückmeldung|Prüfung)|(?:返信|回答|見積|対応|確認)[^。！？\n]{0,45}24\s*時間|24\s*時間[^。！？\n]{0,45}(?:返信|回答|見積|対応|確認)|(?:ответ|предложени\w*|провер\w*|свяж\w*)[^.!?。！？\n]{0,65}24\s*час\w*|24\s*час\w*[^.!?。！？\n]{0,65}(?:ответ|предложени\w*|провер\w*|свяж\w*))/gi, allowDisclaimer: true },
  { name: 'unsupported exact factory metric', pattern: /(?:(?:factory|facility|plant|workshop|assembly\s+hall|Fabrik|Werk|Werkstatt|Montagehalle|工場|組立棟|завод|цех)[^.!?。！？\n]{0,100}(?:\d{1,3}(?:,\d{3})+|\d{3,})\s*(?:square\s+meters?|m\s*(?:2|²)|sqm|㎡|平方米)|(?:\d{1,3}(?:,\d{3})+|\d{3,})\s*(?:square\s+meters?|m\s*(?:2|²)|sqm|㎡|平方米)[^.!?。！？\n]{0,100}(?:factory|facility|plant|workshop|assembly\s+hall|Fabrik|Werk|Werkstatt|Montagehalle|工場|組立棟|завод|цех)|\b\d+\s*(?:CNC\s+machines?|seal\s+testing\s+stations?|production\s+lines?|assembly\s+lines?|CNC[-\s]?Maschinen|Prüfstationen|CNC設備|試験ステーション|станк\w*\s+с\s+ЧПУ|испытательн\w*\s+стенд\w*)\b)/gi, allowDisclaimer: true },
  { name: 'production presented as application experience', pattern: /informed by cumulative production of (?:more than )?200,000 rotary joints/gi, publicOnly: true, allowDisclaimer: true },
  { name: 'excluded public PDF reference', pattern: /\b(?:BP-2P-0001_draft|BP-2P-30-0001|BP-2P-95-0001)\.pdf\b/gi },
  { name: 'broken double punctuation', pattern: /\.\s+\.|(?<!\.)\.\.(?![./])/g, publicOnly: true, excludedExtensions: ['.dxf'] },
  { name: 'broken production counter', pattern: /200K\+\+/g },
  { name: 'corrupted diameter in search index', pattern: /\?(?:230|64|78\.9)\b|3-\?6\b/g, publicOnly: true, pathPattern: /(?:^|\/)search-index\.json$/ },
  { name: 'unsupported material-certificate heading', pattern: /(?:>|\")(?:Material Certificate|Werkstoffzeugnis|材質証明書|Сертификат на материал)(?:<|\")/g },
];

function matchIsBlocked(rule, source, match) {
  if (rule.name === 'unsupported fixed 7-day shipping claim') {
    const index = match.index || 0;
    const rangeContext = source.slice(Math.max(0, index - 35), index + match[0].length);
    if (/\d+\s*(?:[-‐‑‒–—~～〜]|&(?:n|m)dash;)\s*7\s*[-‐‑‒–—]?\s*(?:business\s*)?(?:days?|Tage?|日|дн\w*)/iu.test(rangeContext)) {
      return false;
    }
  }
  if (!rule.allowDisclaimer) return true;
  return !isDisclaimerContext(source, match.index || 0, match[0].length);
}

function hasBlockedMatch(rule, source) {
  rule.pattern.lastIndex = 0;
  for (const match of source.matchAll(rule.pattern)) {
    if (matchIsBlocked(rule, source, match)) return true;
  }
  return false;
}

const blockedSamples = [
  'ISO-9001-zertifizierter Hersteller',
  '200,000 units delivered worldwide',
  '20万台以上を出荷',
  '200K+ Einheiten ausgeliefert',
  'поставлено 200 000',
  '40+ countries served',
  '40+ 国',
  '40+ standard models in stock.',
  '200.000 Einheiten Praxiserfahrung',
  'Serving machine builders worldwide since 2010',
  'Precision rotary joint manufacturing since 2010. Made in Ningbo, delivered worldwide.',
  'Every rotary joint undergoes 100% pressure testing before shipment.',
  'Pressure testing is performed at 1.5× rated pressure.',
  'Pressure testing is performed at 1.5x rated pressure.',
  'Zero leakage is guaranteed between passages.',
  'The seal provides no leakage between passages.',
  'Ships in 7 days.',
  '7-day delivery is guaranteed.',
  'Standard models: 7-14 day delivery worldwide.',
  'Our engineering team will respond within 24 hours.',
  '24-hour response guaranteed.',
  '24h response guaranteed.',
  'Our factory covers 3,200 square meters with 28 CNC machines.',
  'The factory has 6 seal testing stations.',
  'New 1,200m2 assembly hall added.',
  'Download BP-2P-0001_draft.pdf.',
  'Download BP-2P-30-0001.pdf.',
  'Download BP-2P-95-0001.pdf.',
  'Max 5 MPa,?230 mm outer diameter.',
  '?64 × 78 mm',
  '?78.9 × 63.9 mm',
  '3-?6 mm Through-Hole (fixed side)',
  '"areaServed":["Germany"]',
];
const allowedSamples = [
  'ISO VG 32',
  'ISO 228-1',
  'No ISO 9001 certification is claimed.',
  'Cumulative production has exceeded 200,000 rotary joints.',
  'Insgesamt wurden mehr als 200.000 Drehdurchführungen gefertigt.',
  'ロータリージョイントの累計生産数は20万台を超えています。',
  'Совокупный объём производства превысил 200 000 ротационных соединений.',
  'No claim is made that every rotary joint receives 100% pressure testing.',
  'Pressure testing at 1.5× rated pressure is not guaranteed.',
  'Zero leakage is not guaranteed.',
  'No leakage guarantee is provided.',
  '7-14 day delivery is an estimate, not a guarantee.',
  'We do not promise a response within 24 hours.',
  'We do not claim 40+ standard models.',
  'We do not claim a 3,200 square meter factory.',
  '全数圧力試験を実施すると表示していません。',
  'Response timing and lead time must be confirmed per order.',
  '.icon { width: 24px; height: 24px; }',
  'The machine can run for 24 hours per shift.',
];
for (const sample of blockedSamples) {
  if (!banned.some((rule) => hasBlockedMatch(rule, sample))) {
    failures.push(`Verifier self-test did not block: ${sample}`);
  }
}
for (const sample of allowedSamples) {
  if (banned.some((rule) => hasBlockedMatch(rule, sample))) {
    failures.push(`Verifier self-test incorrectly blocked: ${sample}`);
  }
}

for (const filePath of [...files].sort()) {
  let source;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  const relativePath = path.relative(repo, filePath).replaceAll('\\', '/');
  const persistentI18n = relativePath.startsWith('i18n/');
  for (const rule of banned) {
    if (rule.publicOnly && persistentI18n) continue;
    if (rule.pathPattern && !rule.pathPattern.test(relativePath)) continue;
    if (rule.excludedExtensions?.includes(path.extname(relativePath).toLowerCase())) continue;
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      if (!matchIsBlocked(rule, source, match)) continue;
      const index = match.index || 0;
      const line = source.slice(0, index).split(/\r?\n/).length;
      const excerpt = source.slice(Math.max(0, index - 70), Math.min(source.length, index + match[0].length + 100))
        .replace(/\s+/g, ' ')
        .trim();
      failures.push(`${path.relative(repo, filePath)}:${line}: ${rule.name}: ${excerpt}`);
      if (failures.length >= 200) break;
    }
    if (failures.length >= 200) break;
  }
  if (failures.length >= 200) break;
}

const catalog = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'source-catalog.json'), 'utf8'));
const seenSources = new Set();
for (const entry of catalog.entries || []) {
  const expectedId = crypto.createHash('sha256').update(entry.source || '').digest('hex').slice(0, 16);
  if (!entry.source) failures.push(`i18n/source-catalog.json: empty source for ${entry.id}.`);
  if (entry.id !== expectedId) failures.push(`i18n/source-catalog.json: hash mismatch for ${entry.id}.`);
  if (seenSources.has(entry.source)) failures.push(`i18n/source-catalog.json: duplicate source for ${entry.id}.`);
  seenSources.add(entry.source);
}
for (const language of languages) {
  const cache = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'cache', `${language}.json`), 'utf8'));
  for (const entry of catalog.entries || []) {
    if (!cache.translations?.[entry.id]) failures.push(`i18n/cache/${language}.json: missing translation for ${entry.id}.`);
  }
}

const requiredProductionClaims = [
  ['index.html', /Cumulative production has exceeded 200,000 rotary joints\.|200K\+ Units Produced/i],
  ['de/index.html', /200\.000[^<\n]{0,80}gefertigt/i],
  ['ja/index.html', /20万[^<\n]{0,40}生産/],
  ['ru/index.html', /(?:произвед|производств)[^<\n]{0,80}200\s*000|200\s*000[^<\n]{0,80}(?:произвед|производств)/i],
];
for (const [relativePath, pattern] of requiredProductionClaims) {
  const source = await fs.readFile(path.join(repo, relativePath), 'utf8');
  if (!pattern.test(source)) failures.push(`${relativePath}: missing the approved cumulative-production wording.`);
}

if (failures.length) {
  console.error(`Public claim verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Public claim verification passed across ${files.size} ${includeProduction ? 'source, localized, download, i18n, and production' : 'source, localized, download, and i18n'} text files.`);
console.log('Protected technical references such as ISO VG 32 and ISO 228-1 remain allowed.');
