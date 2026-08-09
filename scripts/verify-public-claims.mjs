import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const repoArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const repo = path.resolve(repoArgument || process.cwd());
const selfTestOnly = process.argv.includes('--self-test-only');
const maxFailuresArgument = process.argv.find((argument) => argument.startsWith('--max-failures='));
const parsedMaxFailures = Number.parseInt(maxFailuresArgument?.split('=')[1] || '200', 10);
const maxFailures = Number.isFinite(parsedMaxFailures) && parsedMaxFailures > 0 ? parsedMaxFailures : 200;
const includeProduction = !selfTestOnly && !process.argv.includes('--source-only');
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

function getSemanticStatementContext(source, index, length) {
  const before = source.slice(Math.max(0, index - 320), index)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const after = source.slice(index + length, Math.min(source.length, index + length + 320))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const beforeBreak = Math.max(
    before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'),
    before.lastIndexOf('。'), before.lastIndexOf('！'), before.lastIndexOf('？'),
  );
  const afterBreaks = ['.', '!', '?', '。', '！', '？']
    .map((separator) => after.indexOf(separator))
    .filter((position) => position >= 0);
  const statementBefore = beforeBreak >= 0 ? before.slice(beforeBreak + 1) : before;
  const statementAfter = afterBreaks.length ? after.slice(0, Math.min(...afterBreaks) + 1) : after;
  return `${statementBefore} ${source.slice(index, index + length).replace(/<[^>]+>/g, ' ')} ${statementAfter}`
    .replace(/\s+/g, ' ')
    .trim();
}

const ip65BoundaryPatterns = [
  /\bno\b[^.!?。！？]{0,55}\bIP\s*65\b[^.!?。！？]{0,55}\b(?:claim(?:ed)?|certif(?:ied|ication)|rat(?:ed|ing)|protection)\b/i,
  /\bIP\s*65\b[^.!?。！？]{0,55}\b(?:is|are|was|were)?\s*not\b[^.!?。！？]{0,35}\b(?:claim(?:ed)?|certif(?:ied|ication)|rat(?:ed|ing)|confirmed)\b/i,
  /\b(?:if|when)\b[^.!?。！？]{0,55}\bIP\s*65\b[^.!?。！？]{0,55}\b(?:required|needed)\b[^.!?。！？]{0,55}\bconfirm(?:ed|ation)?\b/i,
  /\bIP\s*65\b[^.!?。！？]{0,70}\b(?:must|requires?|subject to)\b[^.!?。！？]{0,45}\bconfirm(?:ed|ation)?\b/i,
  /\buse\b[^.!?。！？]{0,25}\bIP\s*65\b[^.!?。！？]{0,35}\bonly\b[^.!?。！？]{0,45}\bconfirm(?:ed|ation)?\b/i,
  /\bkeine?\b[^.!?。！？]{0,55}\bIP\s*65\b[^.!?。！？]{0,55}\b(?:Zertifizierung|Schutzart|Schutzklasse|Bestätigung|beansprucht|behauptet)\b/i,
  /\bIP\s*65\b[^.!?。！？]{0,55}\bnicht\b[^.!?。！？]{0,35}\b(?:zertifiziert|bestätigt|beansprucht|behauptet)\b/i,
  /\b(?:wenn|falls)\b[^.!?。！？]{0,55}\bIP\s*65\b[^.!?。！？]{0,55}\b(?:erforderlich|benötigt)\b[^.!?。！？]{0,55}\bbestätig/i,
  /\bIP\s*65\b[^.!?。！？]{0,25}\bnur\b[^.!?。！？]{0,55}\b(?:verwenden|angeben)\b[^.!?。！？]{0,55}\bbestätigt\b/i,
  /IP\s*65[^。！？]{0,55}(?:認証|保護等級|保証|主張|確認)[^。！？]{0,30}(?:していません|されていません|ありません)/,
  /IP\s*65[^。！？]{0,55}(?:必要|要求)[^。！？]{0,55}(?:確認|承認|指定)(?:が必要|してください|ください|する)/,
  /(?:если|когда)[^.!?。！？]{0,55}\bIP\s*65\b[^.!?。！？]{0,55}\bтребу\w*[^.!?。！？]{0,55}\bподтвержд\w*/i,
  /(?:если|когда)[^.!?。！？]{0,30}требу\w*[^.!?。！？]{0,30}\bIP\s*65\b[^.!?。！？]{0,70}(?:подтвержд\w*|укаж\w*)/i,
  /\bIP\s*65\b[^.!?。！？]{0,55}\bне\b[^.!?。！？]{0,40}\b(?:заявл\w*|сертифиц\w*|подтвержд\w*)/i,
  /\bIP\s*65\b[^.!?。！？]{0,35}\bтолько\b[^.!?。！？]{0,55}\bподтвержд\w*/i,
];

const affirmativeIp65Patterns = [
  /\b(?:certified|rated|protected)\b[^.!?。！？]{0,25}\bIP\s*65\b/i,
  /\bIP\s*65\b[^.!?。！？]{0,25}\b(?:certified|rated|protection|protected|compliant)\b/i,
  /\b(?:has|provides?|offers?|meets?|complies\s+with)\b[^.!?。！？]{0,45}\bIP\s*65\b/i,
  /\b(?:dust|water)[-\s]?(?:proof|protected)\b[^.!?。！？]{0,40}\bIP\s*65\b|\bIP\s*65\b[^.!?。！？]{0,40}\b(?:dust|water)[-\s]?(?:proof|protected)\b/i,
  /\b(?:Schutzart|Schutzklasse)\s*IP\s*65\b|\bIP\s*65\b[^.!?。！？]{0,25}\b(?:zertifiziert|geschützt|Schutzart|Schutzklasse)\b/i,
  /IP\s*65[^。！？]{0,25}(?:認証|保護等級|対応|準拠|防塵|防水)|(?:認証|保護等級|防塵|防水)[^。！？]{0,25}IP\s*65/,
  /(?:сертифиц\w*|степень\s+защиты|класс\s+защиты)[^.!?。！？]{0,25}\bIP\s*65\b|\bIP\s*65\b[^.!?。！？]{0,25}(?:сертифиц\w*|степень\s+защиты|защит\w*)/i,
];

const explicitModelLimitNegationPatterns = [
  /\b(?:not|never)\b[^.!?。！？]{0,45}\b(?:rated|approved|specified|designed|permitted|allowed|supported)\b/i,
  /\bno\b[^.!?。！？]{0,45}\b(?:rating|approval|specification|support)\b/i,
  /\bdoes\s+not\b[^.!?。！？]{0,45}\b(?:support|permit|allow|have)\b/i,
  /\bnicht\b[^.!?。！？]{0,45}\b(?:ausgelegt|freigegeben|zugelassen|spezifiziert|bewertet)\b/i,
  /\bkeine?\b[^.!?。！？]{0,45}\b(?:Freigabe|Zulassung|Spezifikation|Nennwert)\b/i,
  /(?:対応|定格|承認|仕様|許容)[^。！？]{0,35}(?:していません|ではありません|されていません|しません)/,
  /(?:していません|ではありません|されていません|しません)[^。！？]{0,35}(?:対応|定格|承認|仕様|許容)/,
  /(?:^|[\s(])не[^.!?。！？]{0,45}(?:рассчитан\w*|допущен\w*|утвержд[её]н\w*|предназначен\w*|является|поддержива\w*)/i,
  /(?:^|[\s(])нет[^.!?。！？]{0,45}(?:допуска|разрешения|утверждения|номинала)/i,
];

function isAllowedIp65Context(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  return ip65BoundaryPatterns.some((pattern) => pattern.test(context));
}

function isAffirmativeIp65Context(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  if (ip65BoundaryPatterns.some((pattern) => pattern.test(context))) return false;
  return affirmativeIp65Patterns.some((pattern) => pattern.test(context));
}

function isExplicitModelLimitNegation(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  return explicitModelLimitNegationPatterns.some((pattern) => pattern.test(context));
}

const qualifiedCadPatterns = [
  /\b(?:selected|supported|eligible|qualified)\b[^.!?。！？]{0,35}\b(?:models?|projects?|orders?)\b/i,
  /\b(?:where|when)\b[^.!?。！？]{0,35}\bavailable\b/i,
  /\b(?:may|can)\s+be\s+(?:provided|supplied|available)\b[^.!?。！？]{0,70}\b(?:after|once|subject to|for)\b[^.!?。！？]{0,55}\b(?:technical|commercial|project|order|model|configuration)\b[^.!?。！？]{0,45}\b(?:review|confirm(?:ed|ation)?|approval|qualification)\b/i,
  /\b(?:availability|format|charge|pricing)\b[^.!?。！？]{0,55}\b(?:confirmed|agreed|quoted)\b[^.!?。！？]{0,35}\b(?:per|for each|for the)\b[^.!?。！？]{0,25}\b(?:project|order|model)\b/i,
  /\b(?:projekt|auftrag|modell)\w*\b[^.!?。！？]{0,55}\b(?:bestätigt|vereinbart|geprüft)\b/i,
  /(?:案件|注文|型式|モデル)[^。！？]{0,45}(?:ごと|別)[^。！？]{0,35}(?:確認|合意|審査)/,
  /(?:проект|заказ|модел)\w*[^.!?。！？]{0,55}(?:подтвержд\w*|соглас\w*|провер\w*)/i,
];

function isQualifiedCadContext(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  if (disclaimerPatterns.some((pattern) => pattern.test(context))) return true;
  if (/\b(?:CAD files?|drawings?|technical documents?)\b[^.!?。！？]{0,80}\bprovided by Begapunk\b[^.!?。！？]{0,80}\b(?:buyer(?:'s)? internal use only|may not be shared)\b/i.test(context)) return true;
  return qualifiedCadPatterns.some((pattern) => pattern.test(context));
}

function isSourcedSmrpContext(source, match) {
  const index = match.index || 0;
  const nearby = source.slice(Math.max(0, index - 500), Math.min(source.length, index + match[0].length + 500));
  if (/href=\\?["']https:\/\/(?:www\.)?smrp\.org\//i.test(nearby)) return true;
  if (/\]\(https:\/\/(?:www\.)?smrp\.org\//i.test(nearby)) return true;
  if (/\b(?:do|does|did)\s+not\s+(?:attribute|cite|reference)\b[^.!?。！？]{0,55}\bSMRP\b/i.test(nearby)) return true;
  return isDisclaimerContext(source, index, match[0].length);
}

const projectConfirmationPatterns = [
  /\b(?:must|needs?\s+to|will)\s+be\s+(?:confirmed|agreed|quoted|verified)\b[^.!?。！？]{0,45}\b(?:per|for each|for the)\b[^.!?。！？]{0,25}\b(?:project|order|model|configuration|service\s+report)\b/i,
  /\b(?:per|for each)\b[^.!?。！？]{0,25}\b(?:project|order|model|configuration|service\s+report)\b[^.!?。！？]{0,55}\b(?:confirm(?:ed|ation)?|agreed|quoted|verified)\b/i,
  /\b(?:projekt|auftrag|modell|ausführung)\w*\b[^.!?。！？]{0,55}\b(?:bestätigt|vereinbart|geprüft|angeboten)\b/i,
  /(?:案件|注文|型式|モデル|仕様)[^。！？]{0,45}(?:ごと|別)[^。！？]{0,35}(?:確認|合意|審査|見積)/,
  /(?:项目|订单|型号|配置)[^。！？]{0,45}(?:逐项|分别|每个)[^。！？]{0,35}(?:确认|约定|审核|报价)/,
  /(?:проект|заказ|модел|конфигурац)\w*[^.!?。！？]{0,55}(?:подтвержд\w*|соглас\w*|провер\w*|указ\w*)/i,
];

const p1ExplicitNegativePatterns = [
  /\b(?:no|not)\b[^.!?。！？]{0,50}\bFDA[-\s]?(?:approved|compatible|grade|compliant)\b/i,
  /\bFDA[-\s]?(?:approved|compatible|grade|compliant)\b[^.!?。！？]{0,45}\bnot\b/i,
  /\b(?:keine?|nicht)\b[^.!?。！？]{0,50}\bFDA[-\s]?(?:zugelassen|kompatibel|konform)\b/i,
  /FDA(?:承認|適合|対応|グレード)[^。！？]{0,35}(?:ではありません|していません|されていません)/,
  /FDA(?:承認|適合|対応|グレード)[^。！？]{0,35}(?:表明|主張)しません/,
  /\bFDA[-\s]?(?:одобрен\w*|совместим\w*|класс\w*)[^.!?。！？]{0,45}\bне\b/i,
];

function isP1BoundaryContext(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  if (disclaimerPatterns.some((pattern) => pattern.test(context))) return true;
  if (p1ExplicitNegativePatterns.some((pattern) => pattern.test(context))) return true;
  return projectConfirmationPatterns.some((pattern) => pattern.test(context));
}

const orderConfirmedDeratingPatterns = [
  /\bderat(?:e|ing|ed)\w*\b[^.!?。！？]{0,90}\b(?:confirmed|specified|agreed|defined|stated)\b[^.!?。！？]{0,55}\b(?:approved\s+)?(?:order|quotation|drawing|specification|model|configuration)\b/i,
  /\b(?:approved\s+)?(?:order|quotation|drawing|specification|model|configuration)\b[^.!?。！？]{0,70}\b(?:confirms?|specifies?|defines?|states?|agrees?)\b[^.!?。！？]{0,55}\bderat(?:e|ing|ed)\w*\b/i,
  /\bderat(?:e|ing|ed)\w*\b[^.!?。！？]{0,75}\b(?:must|needs?\s+to|will)\s+be\s+(?:confirmed|specified|agreed|defined)\b[^.!?。！？]{0,45}\b(?:per|for)\b[^.!?。！？]{0,25}\b(?:order|project|model|configuration)\b/i,
];

function isOrderConfirmedDeratingContext(source, match) {
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  return orderConfirmedDeratingPatterns.some((pattern) => pattern.test(context));
}

const banned = [
  {
    name: 'unsupported 60/80/18/22 marketing statistic',
    pattern: /(?:(?:60|80|18|22)\s*%(?![0-9A-Fa-f]{2})[^.!?。！？\n]{0,90}(?:warranty\s+claims?|custom[^.!?。！？\n]{0,25}inquiries|failures?|leaks?|downtime|service\s+calls?|returns?|defects?|root\s+causes?|costs?|savings?|improvement|reduction|increase|seal\s+life|longer|lower|higher|more|less|Garantieanspr(?:uch|üche)|Anfragen|Ausfälle|Leckagen|Stillstand|保証請求|問い合わせ|故障|漏れ|гарантийн\w*\s+претензи\w*|запрос\w*|отказ\w*|утеч\w*|просто\w*)|(?:warranty\s+claims?|custom[^.!?。！？\n]{0,25}inquiries|failures?|leaks?|downtime|service\s+calls?|returns?|defects?|root\s+causes?|costs?|savings?|improvement|reduction|increase|seal\s+life|longer|lower|higher|more|less|Garantieanspr(?:uch|üche)|Anfragen|Ausfälle|Leckagen|Stillstand|保証請求|問い合わせ|故障|漏れ|гарантийн\w*\s+претензи\w*|запрос\w*|отказ\w*|утеч\w*|просто\w*)[^.!?。！？\n]{0,90}(?:60|80|18|22)\s*%(?![0-9A-Fa-f]{2}))/giu,
    p1Boundary: true,
  },
  {
    name: 'unsupported related-card From-price',
    pattern: /<a\b[^>]{0,320}class=\\?["'][^"']*(?:related-card|app-related-product)[^"']*\\?["'][\s\S]{0,1100}?\bFrom\s+\$\s*\d+(?:[.,]\d+)?/gi,
    p1Boundary: true,
  },
  {
    name: 'unsupported absolute free/all/every CAD promise',
    pattern: /(?:\bfree\b[^.!?。！？\n]{0,45}\b(?:3D\s+(?:CAD\s+)?files?|CAD(?:\s+files?)?|STEP(?:\s*\/\s*IGES)?(?:\s+files?)?|IGES(?:\s+files?)?)\b|\b(?:all|every)\b[^.!?。！？\n]{0,45}\b(?:CAD|STEP|IGES|3D\s+files?)\b[^.!?。！？\n]{0,45}\b(?:free|no\s+charge|provided|available)\b|\b(?:CAD|STEP|IGES|3D\s+files?)\b[^.!?。！？\n]{0,70}\b(?:all|every)\b[^.!?。！？\n]{0,25}\b(?:free|free\s+of\s+charge|inquir(?:y|ies))\b)/gi,
    semantic: 'cad-absolute',
  },
  {
    name: 'unsupported fixed universal life or service interval',
    pattern: /(?:(?:seal|bearing|product|rotary\s+joint|service)\s+(?:life|lifetime)|(?:replacement|maintenance|inspection|service)\s+(?:interval|cycle|schedule))[^.!?。！？\n]{0,100}(?:&ge;|>=|≥|about|approximately|typical(?:ly)?|from|:)?\s*\d+(?:[.,]\d+)?(?:\s*(?:[-–—]|to)\s*\d+\+?)?\s*(?:hours?|hrs?|h\b|months?|years?|cycles?)|\b(?:replace|replacement|service|inspect(?:ion)?)\b[^.!?。！？\n]{0,75}\b(?:every|after)\b[^.!?。！？\n]{0,25}\d+(?:[.,]\d+)?\s*(?:hours?|months?|years?|cycles?)|\b8[,.]?000\s*(?:hours?|hrs?|h\b)\b/gi,
    p1Boundary: true,
  },
  {
    name: 'unsupported product-level FDA approval or compatibility claim',
    pattern: /(?:FDA[-\s]?(?:approved|compatible|grade|compliant|zugelassen|kompatibel|konform)|FDA(?:承認|適合|対応|グレード)|FDA[-\s]?(?:одобрен\w*|совместим\w*|класс\w*))[^.!?。！？\n]{0,70}(?:seals?|PTFE|FKM|materials?|options?|rotary\s+joints?|products?|Dicht|Werkstoff|シール|材料|製品|уплотнен\w*|материал\w*|издели\w*)|(?:seals?|PTFE|FKM|materials?|options?|rotary\s+joints?|products?|Dicht|Werkstoff|シール|材料|製品|уплотнен\w*|материал\w*|издели\w*)[^.!?。！？\n]{0,70}(?:FDA[-\s]?(?:approved|compatible|grade|compliant|zugelassen|kompatibel|konform)|FDA(?:承認|適合|対応|グレード)|FDA[-\s]?(?:одобрен\w*|совместим\w*|класс\w*))/giu,
    p1Boundary: true,
  },
  {
    name: 'misleading FDA seal shorthand',
    pattern: /\bFDA\s*[- ]?\s*(?:seals?|Dichtung(?:en)?)\b|FDA\s*シール|シール\s*FDA|(?:уплотнен[а-яё]*)\s*FDA\b|\bFDA\s*(?:уплотнен[а-яё]*)/giu,
  },
  {
    name: 'unsupported absolute product-fit label',
    pattern: /(?:✅\s*)?\b(?:Perfect|Perfekt)\b(?=\s*(?:[—–-]|<|$))|\*Идеальн[а-яё]*\*|<td\b[^>]*>\s*(?:✅\s*)?Идеальн[а-яё]*/giu,
  },
  {
    name: 'invalid BP-2P-130 M0 mounting designation',
    pattern: /\b8\s*(?:[-×x])\s*M0\b/giu,
  },
  {
    name: 'unsupported BP-2P-16 identical-rating or same-lead-time claim',
    pattern: /\bNo\s+bore\s*=\s*simpler,?\s+lower\s+cost\s+for\s+same\s+pressure\s+and\s+speed\b|\bidentical\s+pressure,?\s+speed,?\s+and\s+temperature\s+ratings\b|\blead\s+time\s+is\s+the\s+same\s+for\s+both\s+versions\b/giu,
  },
  {
    name: 'known unsupported absolute performance sentence',
    pattern: /\b3\s*(?:×|x|times)\s+margin\b[^.!?。！？\n]{0,65}\bwithout\s+seal\s+overheating\b|\b(?:pressurized\s+)?purge\s+port\b[^.!?。！？\n]{0,55}\bprevents?\s+dust\s+ingress\b[^.!?。！？\n]{0,55}\bextreme\s+environments?\b|\b(?:the\s+)?FKM\s+seal\b[^.!?。！？\n]{0,65}\bhardens?\s+within\s+(?:two|2)\s+weeks?\b|\bwill\s+cause\s+seal\s+wear\s+and\s+leakage\s+within\s+weeks\b|\bside\s+loads?\s*(?:>|&gt;|above|over)\s*5\s*N\b[^.!?。！？\n]{0,55}\bwill\s+damage\b/giu,
  },
  {
    name: 'unsupported fixed generic derating',
    pattern: /\b(?:\d+(?:[.,]\d+)?\s*%\s+derating(?:\s+factor)?|derat(?:e|ing|ed)(?:\s+factor)?\b[^.!?。！？\n]{0,120}(?:\d+(?:[.,]\d+)?\s*%|\b(?:to|by)\s+\d+(?:[.,]\d+)?\s*(?:MPa|bar|psi|RPM|U\/min|min⁻¹|об\/мин)))/giu,
    semantic: 'fixed-derating',
  },
  { name: 'unsourced SMRP attribution', pattern: /\bSMRP\b/gi, semantic: 'smrp' },
  {
    name: 'unsupported number-one cause claim',
    pattern: /(?:#\s*1|number\s+one|leading|most\s+common)\s+(?:root\s+)?cause\b|(?:häufigste|wichtigste)\s+Ursache\b|(?:最大|最も一般的)の?原因|(?:причина\s*№\s*1|самая\s+частая\s+причина)/giu,
    p1Boundary: true,
  },
  {
    name: 'unsupported fixed downtime or upgrade cost',
    pattern: /(?:\$\s*\d[\d,]*(?:\+|(?:\s*(?:[-–—]|&ndash;|to)\s*\$?\s*\d[\d,]*))?(?:\s*\/\s*(?:hour|hr))?[^.!?。！？\n]{0,110}(?:downtime|stoppage|upgrade|replacement|cleanup|scrapped\s+parts?|failure|repair)|(?:downtime|stoppage|upgrade|replacement|cleanup|scrapped\s+parts?|failure|repair)[^.!?。！？\n]{0,110}\$\s*\d[\d,]*(?:\+|(?:\s*(?:[-–—]|&ndash;|to)\s*\$?\s*\d[\d,]*))?|(?:upgrade|replac(?:e|ing|ement)|adding\s+a\s+spare\s+passage)[^.!?。！？\n]{0,100}(?:costs?|is)[^.!?。！？\n]{0,30}\d+\s*%\s+more|\d+\s*%\s+more[^.!?。！？\n]{0,80}(?:upgrade|replac(?:e|ing|ement)|spare\s+passage))/gi,
    p1Boundary: true,
  },
  { name: 'incorrect ISO 17799 leakage standard', pattern: /\bISO(?:\/IEC)?\s*17799\b/gi },
  { name: 'obsolete Begapunk company LinkedIn entity', pattern: /https?:\/\/(?:www\.)?linkedin\.com\/company\/begapunk\/?/gi },
  { name: 'obsolete Begapunk YouTube entity', pattern: /https?:\/\/(?:www\.)?youtube\.com\/@begapunk(?:[\/?#]|$)/gi },
  { name: 'BP-2P-95 pressure above approved 1 MPa rating', pattern: /(?:BP-2P-95(?:-0001)?[^\n]{0,220}\b(?:10|12)(?:[.,]0)?\s*(?:MPa|МПа)|\b(?:10|12)(?:[.,]0)?\s*(?:MPa|МПа)[^\n]{0,220}BP-2P-95(?:-0001)?)/giu, semantic: 'model-limit' },
  { name: 'BP-2P-0002 pressure above approved 1 MPa rating', pattern: /(?:BP-2P-0002[^\n]{0,180}1[.,]5\s*(?:MPa|МПа)|1[.,]5\s*(?:MPa|МПа)[^\n]{0,180}BP-2P-0002)/giu, semantic: 'model-limit' },
  { name: 'BP-2P-16 speed above approved 200 RPM rating', pattern: /(?:BP-2P-16(?:-0001)?[^\n]{0,180}500\s*(?:RPM|U\/min|об\/мин)|500\s*(?:RPM|U\/min|об\/мин)[^\n]{0,180}BP-2P-16(?:-0001)?)/giu, semantic: 'model-limit' },
  { name: 'unsupported affirmative IP65 claim', pattern: /\bIP\s*65\b/gi, semantic: 'ip65' },
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
  { name: 'unsupported 100-percent pressure-test claim', pattern: /(?:100\s*%[^.!?。！？\n]{0,60}(?:pressure|leak(?:age)?)[^.!?。！？\n]{0,30}(?:test(?:ed|ing)?|inspection)|(?:pressure|leak(?:age)?)[^.!?。！？\n]{0,30}(?:test(?:ed|ing)?|inspection)[^.!?。！？\n]{0,30}100\s*%|全数[^。！？\n]{0,30}(?:圧力試験|漏れ検査|检漏|泄漏测试|气密性检测|压力测试)|100\s*%[^。！？\n]{0,30}(?:圧力試験|漏れ検査|检漏|泄漏测试|气密性检测|压力测试)|100\s*%[^.!?。！？\n]{0,50}(?:Druckprüfung|Dichtheitsprüfung|испытани[^.!?。！？\n]{0,20}давлени|провер[^.!?。！？\n]{0,20}герметич))/gi, allowDisclaimer: true },
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

const exactProductionInspectionLabels = new Set([
  '100% Leak Testing',
  'See 100% Leak Testing',
  'View 100% Leak Testing',
  '100%-Dichtheitsprüfung',
  '100%-Dichtheitsprüfung',
  '100 % Dichtheitsprüfung',
  '100%-Dichtheitsprüfung ansehen',
  '100%-Dichtheitsprüfung ansehen',
  '全数漏れ検査',
  '全数漏れ検査を見る',
  '100% 泄漏测试',
  '100%泄漏测试',
  '查看 100% 泄漏测试',
  '查看100%泄漏测试',
  '100%-ный контроль герметичности',
  '100%-ный контроль герметичности',
  '100% проверка герметичности',
  'Смотреть 100%-ный контроль герметичности',
]);

function isEscapedCharacter(source, index) {
  let slashCount = 0;
  for (let position = index - 1; position >= 0 && source[position] === '\\'; position -= 1) slashCount += 1;
  return slashCount % 2 === 1;
}

function getEnclosingJsonString(source, index) {
  let start = index;
  while (start >= 0) {
    start = source.lastIndexOf('"', start);
    if (start < 0) return null;
    if (!isEscapedCharacter(source, start)) break;
    start -= 1;
  }
  let end = index;
  while (end < source.length) {
    end = source.indexOf('"', end);
    if (end < 0) return null;
    if (!isEscapedCharacter(source, end)) break;
    end += 1;
  }
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isExactProductionInspectionAnchor(value) {
  if (!value || typeof value !== 'string') return false;
  const match = value.match(/^<a\s+[^>]*href=["'](?:\.\.\/)?production-inspection-testing\.html["'][^>]*>([\s\S]*?)<\/a>$/i);
  if (!match) return false;
  const body = match[1];
  const label = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (exactProductionInspectionLabels.has(label)) return true;
  const strong = body.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
  if (!strong) return false;
  const strongLabel = strong[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return exactProductionInspectionLabels.has(strongLabel);
}

function isExactProductionInspectionFragment(value) {
  if (!value || typeof value !== 'string') return false;
  const strong = value.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
  const span = value.match(/<span\b[^>]*>([\s\S]*?)<\/span>/i);
  if (!strong || !span) return false;
  const label = strong[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const evidence = span[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!exactProductionInspectionLabels.has(label)) return false;
  return [
    /documented production leak-test process[^.!?]{0,80}stated test conditions/i,
    /dokumentierten Produktions-Dichtheitsprüfprozess[^.!?]{0,80}angegebenen Prüfbedingungen/i,
    /公開済みの生産時漏れ検査工程[^。！？]{0,80}試験条件/,
    /описанный процесс производственной проверки герметичности[^.!?]{0,100}указанные условия испытания/i,
    /current passage-by-passage production inspection process/i,
    /aktuellen kanalweisen Produktionsprüfprozess/i,
    /現在実施している流路ごとの生産検査工程/,
    /現在実施している流路別の量産検査工程/,
    /действующий поканальный процесс производственного контроля/i,
  ].some((pattern) => pattern.test(evidence));
}

function isSearchIndexProductionInspectionReference(relativePath, source, match) {
  const normalizedPath = relativePath.replace(/^dist\/production\//, '');
  if (!/^(?:de\/|ja\/|ru\/)?search-index\.json$/.test(normalizedPath)) return false;
  const context = getSemanticStatementContext(source, match.index || 0, match[0].length);
  return [
    /\b(?:see|view|under)\b[^.!?。！？]{0,45}\b100\s*%\s*Leak Testing\b/i,
    /\b100\s*%\s*Leak Testing\b[^.!?。！？]{0,55}\b(?:page|described|documented|reference)\b/i,
    /\bunter\b[^.!?。！？]{0,45}\b100\s*%\s*Leak Testing\b[^.!?。！？]{0,35}\bbeschrieben\b/i,
    /\b100\s*%-Dichtheitsprüfung\s+ansehen\b/i,
    /\b100\s*%\s*Leak Testing\b[^。！？]{0,45}(?:に記載|に掲載|を参照)/,
    /(?:описан\w*|см\.)[^.!?。！？]{0,55}(?:страниц\w*\s+)?100\s*%\s*Leak Testing/i,
    /(?:详见|参见|查看)[^。！？]{0,30}100\s*%\s*(?:泄漏测试|检漏)/,
  ].some((pattern) => pattern.test(context));
}

function isExactProductionInspectionReference(relativePath, source, match) {
  const normalizedPath = relativePath.replace(/^dist\/production\//, '');
  const index = match.index || 0;

  if (/\.html$/.test(normalizedPath)) {
    const anchorStart = source.lastIndexOf('<a', index);
    const anchorEnd = source.indexOf('</a>', index);
    if (anchorStart >= 0 && anchorEnd >= index
      && isExactProductionInspectionAnchor(source.slice(anchorStart, anchorEnd + 4))) {
      return true;
    }
  }

  if (/^i18n\/(?:source-catalog|cache\/(?:de|ja|ru)|editorial\/(?:de|ja|ru)|overrides\/(?:de|ja|ru))\.json$/.test(normalizedPath)) {
    const jsonValue = getEnclosingJsonString(source, index);
    if (exactProductionInspectionLabels.has(jsonValue)
      || isExactProductionInspectionAnchor(jsonValue)
      || isExactProductionInspectionFragment(jsonValue)) return true;
  }

  return isSearchIndexProductionInspectionReference(normalizedPath, source, match);
}

function isApprovedProductionInspectionClaim(relativePath, source, match) {
  if (!relativePath) return false;
  if (isExactProductionInspectionReference(relativePath, source, match)) return true;
  const normalizedPath = relativePath.replace(/^dist\/production\//, '');
  const index = match.index || 0;
  const nearby = source.slice(Math.max(0, index - 700), Math.min(source.length, index + match[0].length + 700));
  if (/\.html$/.test(normalizedPath)) {
    const anchorStart = source.lastIndexOf('<a', index);
    const anchorEnd = source.indexOf('</a>', index);
    if (anchorStart >= 0 && anchorEnd >= index) {
      const anchor = source.slice(anchorStart, anchorEnd + 4);
      const anchorText = anchor.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const strong = anchor.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
      const strongText = strong?.[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (/href=["'](?:\.\.\/)?production-inspection-testing\.html["']/.test(anchor)
          && (exactProductionInspectionLabels.has(anchorText)
            || (strongText && exactProductionInspectionLabels.has(strongText)))) {
        return true;
      }
    }
  }
  if (/^(?:de\/|ja\/|ru\/)?production-inspection-testing\.html$/.test(normalizedPath)) {
    return /page-production-inspection-testing/.test(source)
      && /production-inspection-testing\.html/.test(source)
      && /(?:1[.,]0\s*(?:MPa|МПа)|1\.0\s*MPa)/i.test(source);
  }
  if (/^(?:de\/|ja\/|ru\/)?manufacturing-quality\.html$/.test(normalizedPath)) {
    return /(?:production-leak-testing-title|mq-stator-leak-link)/.test(nearby)
      && /production-inspection-testing\.html/.test(nearby);
  }
  if (/^i18n\/editorial\/(?:de|ja|ru)\.json$/.test(normalizedPath)) {
    return /After final assembly, every finished rotary union and every individual passage enters the existing 100% leak-testing process\./.test(nearby)
      && /View 100% Leak Testing/.test(nearby);
  }
  if (/^(?:de\/|ja\/|ru\/)?search-index\.json$/.test(normalizedPath)) {
    const recordStart = source.lastIndexOf('"id":', index);
    const recordContext = source.slice(Math.max(0, recordStart), Math.min(source.length, index + match[0].length + 200));
    return /"id":\s*"(?:manufacturing-quality|production-inspection-testing)"/.test(recordContext);
  }
  if (/^(?:de\/|ja\/|ru\/)?llms\.txt$/.test(normalizedPath)) {
    return /production-inspection-testing\.html/.test(nearby);
  }
  if (/^i18n\/seo\/(?:de|ja|ru)\.json$/.test(normalizedPath)) {
    return /"production-inspection-testing\.html"/.test(nearby);
  }
  return false;
}

function matchIsBlocked(rule, source, match, relativePath = '') {
  if (rule.p1Boundary) {
    return !isP1BoundaryContext(source, match);
  }
  if (rule.semantic === 'cad-absolute') {
    return !isQualifiedCadContext(source, match);
  }
  if (rule.semantic === 'smrp') {
    return !isSourcedSmrpContext(source, match);
  }
  if (rule.semantic === 'ip65') {
    if (isAllowedIp65Context(source, match)) return false;
    return isAffirmativeIp65Context(source, match);
  }
  if (rule.semantic === 'model-limit') {
    return !isExplicitModelLimitNegation(source, match);
  }
  if (rule.semantic === 'fixed-derating') {
    return !isOrderConfirmedDeratingContext(source, match);
  }
  if (rule.name === 'unsupported 100-percent pressure-test claim'
    && isApprovedProductionInspectionClaim(relativePath, source, match)) {
    return false;
  }
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

function hasBlockedMatch(rule, source, relativePath = '') {
  rule.pattern.lastIndex = 0;
  for (const match of source.matchAll(rule.pattern)) {
    if (matchIsBlocked(rule, source, match, relativePath)) return true;
  }
  return false;
}

const blockedSamples = [
  'ISO 17799 Class 0 leakage performance.',
  'BP-2P-95-0001 is rated to 10 MPa.',
  'BP-2P-95-0001 рассчитан на 12 МПа.',
  'BP-2P-0002 maximum pressure is 1.5 MPa.',
  'BP-2P-16-0001 maximum speed is 500 RPM.',
  'BP-2P-16-0001 Nenndrehzahl 500 U/min.',
  'https://www.linkedin.com/company/begapunk',
  'https://www.youtube.com/@begapunk',
  'Certified IP65 dust protection.',
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
  'BP-2P-95-0001 maximum pressure is 1 MPa and maximum speed is 200 RPM.',
  'BP-2P-0002 maximum pressure is 1 MPa.',
  'BP-2P-16-0001 maximum speed is 200 RPM.',
  'No certified IP65 rating is claimed.',
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

function verifyRuleSamples(ruleName, { blocked: blockedRuleSamples, allowed: allowedRuleSamples }) {
  const rule = banned.find((candidate) => candidate.name === ruleName);
  if (!rule) {
    failures.push(`Verifier self-test could not find rule: ${ruleName}`);
    return;
  }
  for (const sample of blockedRuleSamples) {
    if (!hasBlockedMatch(rule, sample)) {
      failures.push(`Verifier self-test did not block ${ruleName}: ${sample}`);
    }
  }
  for (const sample of allowedRuleSamples) {
    if (hasBlockedMatch(rule, sample)) {
      failures.push(`Verifier self-test incorrectly blocked ${ruleName}: ${sample}`);
    }
  }
}

verifyRuleSamples('unsupported affirmative IP65 claim', {
  blocked: [
    'BP-2P-50-0001 is IP65 rated for dust protection.',
    'BP-2P-50-0001 hat die Schutzart IP65.',
    'BP-2P-50-0001はIP65保護等級に対応しています。',
    'BP-2P-50-0001 имеет степень защиты IP65.',
  ],
  allowed: [
    'No certified IP65 rating is claimed.',
    'If IP65 protection is required, the selected configuration must be confirmed.',
    'Keine zertifizierte IP65-Schutzart wird beansprucht.',
    'Falls IP65 erforderlich ist, muss die gewählte Ausführung bestätigt werden.',
    'IP65認証は取得していません。',
    'IP65が必要な場合は、選定仕様の確認が必要です。',
    'IP65が必要な場合は、選定型式の保護等級をご指定ください。',
    'Сертификация IP65 не заявлена.',
    'Если требуется IP65, выбранную конфигурацию необходимо подтвердить.',
    'Если требуется IP65, укажите класс защиты и подтвердите его для выбранной модели.',
  ],
});

verifyRuleSamples('BP-2P-95 pressure above approved 1 MPa rating', {
  blocked: [
    'BP-2P-95-0001 is rated to 10 MPa.',
    'BP-2P-95-0001: 12 MPa requires confirmation.',
    'BP-2P-95-0001 ist für 10 MPa ausgelegt.',
    'BP-2P-95-0001は12 MPa定格です。',
    'BP-2P-95-0001 рассчитан на 12 МПа.',
  ],
  allowed: [
    'BP-2P-95-0001 maximum pressure is 1 MPa.',
    'BP-2P-95-0001 is not rated to 10 MPa.',
    'BP-2P-95-0001 ist nicht für 10 MPa freigegeben.',
    'BP-2P-95-0001は12 MPa定格ではありません。',
    'BP-2P-95-0001 не рассчитан на 12 МПа.',
  ],
});

verifyRuleSamples('BP-2P-0002 pressure above approved 1 MPa rating', {
  blocked: [
    'BP-2P-0002 is rated to 1.5 MPa.',
    'BP-2P-0002: 1.5 MPa requires confirmation.',
  ],
  allowed: [
    'BP-2P-0002 maximum pressure is 1 MPa.',
    'BP-2P-0002 is not rated to 1.5 MPa.',
  ],
});

verifyRuleSamples('BP-2P-16 speed above approved 200 RPM rating', {
  blocked: [
    'BP-2P-16-0001 maximum speed is 500 RPM.',
    'BP-2P-16-0001: 500 RPM requires confirmation.',
  ],
  allowed: [
    'BP-2P-16-0001 maximum speed is 200 RPM.',
    'BP-2P-16-0001 is not rated for 500 RPM.',
  ],
});

verifyRuleSamples('incorrect ISO 17799 leakage standard', {
  blocked: ['ISO 17799 Class 0 leakage performance.'],
  allowed: ['ISO 228-1 threaded connection.'],
});

verifyRuleSamples('obsolete Begapunk company LinkedIn entity', {
  blocked: ['https://www.linkedin.com/company/begapunk'],
  allowed: ['https://www.linkedin.com/in/guangcheng-cao/'],
});

verifyRuleSamples('obsolete Begapunk YouTube entity', {
  blocked: ['https://www.youtube.com/@begapunk'],
  allowed: ['https://www.youtube.com/@BEGAPUNKRotaryJointsTV'],
});

verifyRuleSamples('unsupported 60/80/18/22 marketing statistic', {
  blocked: [
    'Installation errors cause 60% of warranty claims.',
    'Roughly 18% of custom rotary-joint inquiries come from food equipment builders.',
    'These root causes account for 80% of early failures.',
    'The change reduced downtime by 22%.',
    'The new seal claims 22% longer service life.',
  ],
  allowed: [
    'Tighten the bolts initially to 60% of final torque.',
    'https://example.com/guide%20download',
    'We do not claim that installation errors cause 60% of warranty claims.',
    'The 18% inquiry-share figure must be confirmed for each project report.',
  ],
});

verifyRuleSamples('unsupported related-card From-price', {
  blocked: [
    '<a class="related-card" href="BP-2P-0001.html"><h3>BP-2P-0001</h3><div class="price">From $55</div></a>',
  ],
  allowed: [
    '<div class="catalog-price">From $55</div>',
    '<a class="related-card" href="BP-2P-0001.html"><div class="price">From $55; price requires confirmation per order.</div></a>',
  ],
});

verifyRuleSamples('unsupported absolute free/all/every CAD promise', {
  blocked: [
    'Free 3D STEP file with every inquiry.',
    'Free STEP/IGES files are available for all standard models.',
    'All CAD files are provided free of charge.',
  ],
  allowed: [
    'A free STEP file may be provided for qualified projects after technical review.',
    'We do not promise free CAD files with every inquiry.',
    'CAD format, availability, and any charge must be confirmed for each project.',
    'All CAD files, drawings, and technical documents provided by Begapunk are for the buyer\'s internal use only.',
  ],
});

verifyRuleSamples('unsupported fixed universal life or service interval', {
  blocked: [
    'Typical seal life: 6-10 months in continuous duty.',
    'Service life is at least 8,000 hours under rated conditions.',
    'Replace the seal every 6 months.',
  ],
  allowed: [
    'No universal 8,000-hour service life is claimed.',
    'A service interval of 8,000 hours must be confirmed per model.',
    'Set the replacement interval from measured condition and the documented duty cycle.',
  ],
});

verifyRuleSamples('unsupported product-level FDA approval or compatibility claim', {
  blocked: [
    'This model uses FDA-approved PTFE seals.',
    'FDA-compatible seal options are available for this rotary joint.',
    'Specify an FDA-grade material for the product.',
  ],
  allowed: [
    'FDA-compatible seal status must be confirmed for each selected material and project.',
    'This seal is not FDA-compatible.',
    'No FDA approval is claimed for this rotary joint or its seals.',
    'FDA 21 CFR 177.1550 is a regulatory reference; it is not a product approval.',
  ],
});

verifyRuleSamples('misleading FDA seal shorthand', {
  blocked: [
    'Specify FDA seal if required.',
    'FDA-Dichtung optional.',
    'FDA シールを指定してください。',
    'Доступно уплотнение FDA.',
  ],
  allowed: [
    'Food-contact requirements must be reviewed for the selected wetted materials, seal compound, and project.',
    'Any FDA-related requirement must be documented for the selected configuration.',
    'No FDA approval is claimed for this rotary joint or its seals.',
  ],
});

verifyRuleSamples('unsupported absolute product-fit label', {
  blocked: [
    '<td>✅ Perfect — 220 g, Ø64 mm</td>',
    '<td>✅ Perfekt - 265 g AL6061</td>',
    '<td>*Идеальный*</td>',
    'RequirementFit✅ Perfect——Alternative',
  ],
  allowed: [
    'The selected configuration may be a perfect fit after engineering review.',
    'A perfectly aligned flange helps reduce external load.',
    '<td>Suitable configuration to review</td>',
  ],
});

verifyRuleSamples('invalid BP-2P-130 M0 mounting designation', {
  blocked: [
    'Flange Mount (8-M0 + 8-M10)',
    'BP-2P-130 rotor connection: 8×M0.',
  ],
  allowed: [
    'Flange Mount (8-M10)',
    'Rotor connection: 8×M8.',
    'Confirm the mounting pattern from the approved BP-2P-130 drawing.',
  ],
});

verifyRuleSamples('unsupported BP-2P-16 identical-rating or same-lead-time claim', {
  blocked: [
    'No bore = simpler, lower cost for same pressure and speed.',
    'Both versions have identical pressure, speed, and temperature ratings.',
    'Lead time is the same for both versions.',
  ],
  allowed: [
    'Compare pressure and speed against the approved drawing for each model.',
    'Lead time for each version is confirmed in the quotation or order.',
    'The BP-2P-16 maximum pressure is 1 MPa and maximum speed is 200 RPM.',
  ],
});

verifyRuleSamples('known unsupported absolute performance sentence', {
  blocked: [
    'The 100 RPM rating provides 3× margin without seal overheating.',
    'A pressurized purge port prevents dust ingress even in extreme environments.',
    'The FKM seal overheats and hardens within two weeks.',
    'A rigid setup will cause seal wear and leakage within weeks.',
    'Side loads >5 N will damage the deep groove ball bearing.',
  ],
  allowed: [
    'Confirm the required speed margin against the approved duty cycle.',
    'A purge port may reduce direct dust exposure; effectiveness requires engineering confirmation.',
    'A rigid setup can contribute to premature seal wear and leakage.',
    'Support external radial loads separately and confirm the allowable load from the approved drawing.',
  ],
});

verifyRuleSamples('unsupported fixed generic derating', {
  blocked: [
    'Derate pressure by 30% for continuous duty.',
    'Maximum pressure is 1 MPa — derate to 0.7 MPa for continuous water duty.',
    'Maximum speed is 200 RPM — derate to 150 RPM for continuous coolant.',
    'Apply a 30% derating factor for round-the-clock operation.',
  ],
  allowed: [
    'Maximum pressure is 1 MPa and maximum speed is 200 RPM.',
    'Pressure-speed derating is confirmed for the selected model and order.',
    'The approved order specifies a 30% pressure derating for this configuration.',
    'Published running torque is ≤5 N·m; support external radial and axial loads separately.',
  ],
});

verifyRuleSamples('unsourced SMRP attribution', {
  blocked: ['SMRP guidelines specify this seal-life interval.'],
  allowed: [
    '<a href="https://smrp.org/resources/example">SMRP source</a>',
    'We do not attribute this interval to SMRP.',
  ],
});

verifyRuleSamples('unsupported number-one cause claim', {
  blocked: [
    'Overtightening is the #1 cause of warranty claims.',
    'Misalignment is the leading cause of early leakage.',
  ],
  allowed: [
    'We do not claim that overtightening is the #1 cause of warranty claims.',
    'Whether this is the leading cause must be confirmed for each service report.',
    'Cause 1: inspect alignment before replacing the seal.',
  ],
});

verifyRuleSamples('unsupported fixed downtime or upgrade cost', {
  blocked: [
    'A line stoppage costs $5,000-$15,000 per hour.',
    'The $20 savings cost $300 in downtime and cleanup.',
    'Replacing the four-passage unit costs 300% more.',
  ],
  allowed: [
    'Product price: $300.',
    'The illustrative $300 downtime estimate is not a guarantee.',
    'Downtime cost must be confirmed for each project.',
    'Tighten initially to 60% of final torque.',
  ],
});

const approvedProductionInspectionSample = '<body class="page-production-inspection-testing"><a href="production-inspection-testing.html">100% passage-by-passage leak testing</a><p>Every passage is tested individually with compressed air at 1.0 MPa.</p></body>';
const pressureTestRule = banned.find((rule) => rule.name === 'unsupported 100-percent pressure-test claim');

const productionInspectionReferenceSamples = [
  {
    language: 'English',
    allowed: '<a href="production-inspection-testing.html">100% Leak Testing</a>',
    blocked: 'Every rotary joint receives 100% leak testing before shipment.',
  },
  {
    language: 'Chinese',
    allowed: '<a href="production-inspection-testing.html">100% 泄漏测试</a>',
    blocked: '我们对每个产品进行100%泄漏测试。',
  },
  {
    language: 'German',
    allowed: '<a href="production-inspection-testing.html">100%-Dichtheitsprüfung</a>',
    blocked: 'Jedes Produkt erhält garantiert eine 100%-Dichtheitsprüfung.',
  },
  {
    language: 'Japanese',
    allowed: '<a href="production-inspection-testing.html">全数漏れ検査</a>',
    blocked: 'すべての製品に全数漏れ検査を実施します。',
  },
  {
    language: 'Russian',
    allowed: '<a href="production-inspection-testing.html">100%-ный контроль герметичности</a>',
    blocked: 'Каждое изделие гарантированно проходит 100%-ную проверку герметичности.',
  },
];

if (pressureTestRule) {
  for (const sample of productionInspectionReferenceSamples) {
    if (hasBlockedMatch(pressureTestRule, sample.allowed, 'unrelated-page.html')) {
      failures.push(`Verifier self-test incorrectly blocked the exact ${sample.language} production-inspection reference.`);
    }
    if (!hasBlockedMatch(pressureTestRule, sample.blocked, 'unrelated-page.html')) {
      failures.push(`Verifier self-test did not block the generalized ${sample.language} production-inspection promise.`);
    }
  }

  const escapedCatalogReference = '{"source":"<a href=\\"production-inspection-testing.html\\">100% Leak Testing</a>"}';
  if (hasBlockedMatch(pressureTestRule, escapedCatalogReference, 'i18n/source-catalog.json')) {
    failures.push('Verifier self-test incorrectly blocked the exact escaped production-inspection catalog link.');
  }
  if (hasBlockedMatch(pressureTestRule, '<a href="quality.html">100% Leak Testing</a>', 'unrelated-page.html')) {
    // Expected: an exact label pointing to the wrong destination remains blocked.
  } else {
    failures.push('Verifier self-test allowed the exact production-inspection label with the wrong destination.');
  }
  if (hasBlockedMatch(pressureTestRule, 'See the documented process under 100% Leak Testing.', 'search-index.json')) {
    failures.push('Verifier self-test incorrectly blocked the exact search-index page-title reference.');
  }
}

if (!pressureTestRule || hasBlockedMatch(pressureTestRule, approvedProductionInspectionSample, 'production-inspection-testing.html')) {
  failures.push('Verifier self-test did not allow the path-bound, evidence-approved production inspection claim.');
}
if (!pressureTestRule || !hasBlockedMatch(pressureTestRule, approvedProductionInspectionSample, 'unrelated-page.html')) {
  failures.push('Verifier self-test allowed the production inspection claim outside its approved path boundary.');
}

if (selfTestOnly) {
  if (failures.length) {
    console.error(`Public claim verifier self-test failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log('Public claim verifier self-test passed.');
  process.exit(0);
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
      if (!matchIsBlocked(rule, source, match, relativePath)) continue;
      const index = match.index || 0;
      const line = source.slice(0, index).split(/\r?\n/).length;
      const excerpt = source.slice(Math.max(0, index - 70), Math.min(source.length, index + match[0].length + 100))
        .replace(/\s+/g, ' ')
        .trim();
      failures.push(`${path.relative(repo, filePath)}:${line}: ${rule.name}: ${excerpt}`);
      if (failures.length >= maxFailures) break;
    }
    if (failures.length >= maxFailures) break;
  }
  if (failures.length >= maxFailures) break;
}

const catalog = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'source-catalog.json'), 'utf8'));
const translationManagedPages = config.translationManagedPages || config.pages;
if (JSON.stringify(catalog.pages) !== JSON.stringify(translationManagedPages)) {
  failures.push('i18n/source-catalog.json: pages must exactly match translationManagedPages.');
}
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
  const editorial = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'editorial', `${language}.json`), 'utf8'));
  const overrides = JSON.parse(await fs.readFile(path.join(repo, 'i18n', 'overrides', `${language}.json`), 'utf8'));
  const validIds = new Set((catalog.entries || []).map((entry) => entry.id));
  for (const id of Object.keys(cache.translations || {})) {
    if (!validIds.has(id)) failures.push(`i18n/cache/${language}.json: orphaned translation ${id}.`);
  }
  for (const entry of catalog.entries || []) {
    for (const pageName of entry.pages || []) {
      const pageEditorial = editorial[pageName] || {};
      const sharedEditorial = editorial['*'] || {};
      const resolved = pageEditorial[entry.id]
        || pageEditorial[entry.source]
        || sharedEditorial[entry.id]
        || sharedEditorial[entry.source]
        || overrides[entry.source]
        || cache.translations?.[entry.id];
      if (!resolved) failures.push(`i18n/${language}: missing effective translation for ${entry.id} on ${pageName}.`);
    }
  }
}

/* Owner confirmation is pending for the cumulative-production figure.
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
*/

if (failures.length) {
  console.error(`Public claim verification failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Public claim verification passed across ${files.size} ${includeProduction ? 'source, localized, download, i18n, and production' : 'source, localized, download, and i18n'} text files.`);
console.log('Protected technical references such as ISO VG 32 and ISO 228-1 remain allowed.');
