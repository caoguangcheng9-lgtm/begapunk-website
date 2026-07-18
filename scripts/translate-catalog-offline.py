#!/usr/bin/env python3
"""Build an i18n translation cache with a local CTranslate2/Argos model.

The script deliberately translates HTML text nodes instead of complete HTML
fragments. This keeps markup and attributes deterministic while still using the
same source-catalog/cache contract as build-localized-site.mjs.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import html
import json
import os
from pathlib import Path
import re
from typing import Iterable

import ctranslate2
from lxml import html as lxml_html
import sentencepiece as spm


ROOT = Path(__file__).resolve().parents[1]
HTML_TAG_PATTERN = re.compile(r"</?[A-Za-z][^>]*>")
SENTENCE_BOUNDARY_PATTERN = re.compile(r"(?<=[.!?])\s+")
PROTECTED_VALUE_PATTERN = re.compile(
    r"https?://[^\s<>\"']+"
    r"|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"
    r"|\bBP-[A-Z0-9-]+\b"
    r"|\b\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?\s*(?:rpm|MPa|kPa|psi|bar|mm|cm|kg|g|°C|°F)\b",
    re.IGNORECASE,
)
NUMBER_PATTERN = re.compile(r"\d+(?:[.,]\d+)*")
MALFORMED_PLACEHOLDER_PATTERN = re.compile(
    r"__(?:PH|TR|Ф|ТР)?[A-ZА-ЯЁ]{4,8}__",
    re.IGNORECASE,
)


def placeholder_code(index: int) -> str:
    letters = []
    value = index
    for _ in range(4):
        letters.append(chr(ord("A") + (value % 26)))
        value //= 26
    return "".join(reversed(letters))


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def term_pattern(term: str) -> re.Pattern[str]:
    escaped = re.escape(term)
    if term[:1].isalnum() and term[-1:].isalnum():
        escaped = rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])"
    return re.compile(escaped, re.IGNORECASE)


def replace_preferred_terms(
    text: str,
    preferred_terms: dict[str, str],
    protected_terms: Iterable[str],
) -> tuple[str, list[tuple[str, str]]]:
    result = text
    replacements: list[tuple[str, str]] = []
    protected_exact = set(protected_terms)

    def replace(match: re.Match[str], target: str) -> str:
        if match.group(0) in protected_exact:
            return match.group(0)
        token = f"__TR{placeholder_code(len(replacements))}__"
        replacements.append((token, target))
        return token

    for source, target in sorted(preferred_terms.items(), key=lambda item: len(item[0]), reverse=True):
        result = term_pattern(source).sub(
            lambda match, replacement=target: replace(match, replacement),
            result,
        )
    return result, replacements


def protect_values(text: str, protected_terms: Iterable[str]) -> tuple[str, list[tuple[str, str]]]:
    replacements: list[tuple[str, str]] = []

    def replace(match: re.Match[str]) -> str:
        token = f"__PH{placeholder_code(len(replacements))}__"
        replacements.append((token, match.group(0)))
        return token

    result = PROTECTED_VALUE_PATTERN.sub(replace, text)
    for term in sorted(protected_terms, key=len, reverse=True):
        result = term_pattern(term).sub(replace, result)
    return result, replacements


def restore_values(text: str, replacements: list[tuple[str, str]]) -> str:
    result = text
    for token, value in replacements:
        candidates = [token]
        match = re.fullmatch(r"__(PH|TR)([A-Z]{4})__", token)
        if match:
            prefix, code = match.groups()
            code_pattern = "".join(
                {
                    "A": "[AА]", "B": "[BВ]", "C": "[CС]", "D": "[DД]",
                    "E": "[EЕ]", "H": "[HН]", "K": "[KК]", "M": "[MМ]",
                    "O": "[OО]", "P": "[PР]", "T": "[TТ]", "X": "[XХ]",
                }.get(letter, re.escape(letter))
                for letter in code
            )
            prefix_pattern = "(?:PH|PН|РH|РН|Ф)" if prefix == "PH" else "(?:TR|TР|ТР)"
            fuzzy = re.compile(rf"__{prefix_pattern}{code_pattern}__", re.IGNORECASE)
            candidates.extend(fuzzy.findall(result))
            if token not in result:
                result, count = fuzzy.subn(value, result, count=1)
                if count:
                    continue
        for candidate in candidates:
            if candidate in result:
                while result.count(candidate) > 1:
                    result = result.replace(candidate, "", 1)
                result = result.replace(candidate, value)
                break
    return result


def normalize_translation(language: str, text: str, source: str = "") -> str:
    if language != "ru":
        return text
    replacements = [
        (r"воздушн(?:ый|ого|ому|ым|ом|ые|ых|ыми)?\s+ротационн(?:ый|ого|ому|ым|ом|ые|ых|ыми)?\s+(?:союз|сустав)(?:а|у|ом|ы|ов|ам|ами|ах)?", "пневматическое ротационное соединение"),
        (r"пневматическ(?:ий|ого|ому|им|ом|ие|их|ими)?\s+ротационн(?:ый|ого|ому|ым|ом|ые|ых|ыми)?\s+(?:союз|сустав|стык)(?:а|у|ом|ы|ов|ам|ами|ах)?", "пневматическое ротационное соединение"),
        (r"роторн(?:ый|ого|ому|ым|ом|ые|ых|ыми)?\s+(?:шарнирн(?:ый|ого|ому|ым|ом)?\s+)?(?:стык|сустав)(?:а|у|ом|ы|ов|ам|ами|ах)?", "ротационное соединение"),
        (r"ротационн(?:ый|ого|ому|ым|ом|ые|ых|ыми)?\s+(?:союз|сустав)(?:а|у|ом|ы|ов|ам|ами|ах)?", "ротационное соединение"),
        (r"\bRotary Joints\b", "Ротационные соединения"),
        (r"\bRotary Joint\b", "Ротационное соединение"),
        (r"\bRotary Unions\b", "Ротационные соединения"),
        (r"\bRotary Union\b", "Ротационное соединение"),
    ]
    result = text
    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    if re.search(r"\brotary\s+(?:joint|union)s?\b", source, flags=re.IGNORECASE):
        result = re.sub(
            r"\b(?:(?:роторн|ротационн|вращающ)[А-Яа-яЁё-]*\s+)?(?:стык|сустав|союз|шарнир)[А-Яа-яЁё-]*\b",
            "ротационное соединение",
            result,
            flags=re.IGNORECASE,
        )
        result = re.sub(r"\bРотари\s+Совместн[А-Яа-яЁё-]*\b", "Ротационное соединение", result, flags=re.IGNORECASE)
    if re.search(r"\bjoints?\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\b(?:сустав|стык)[А-Яа-яЁё-]*\b", "соединение", result, flags=re.IGNORECASE)
    if re.search(r"\bunions?\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\bсоюз[А-Яа-яЁё-]*\b", "соединение", result, flags=re.IGNORECASE)
        result = re.sub(r"\bпрофсоюз[А-Яа-яЁё-]*\b", "соединение", result, flags=re.IGNORECASE)
    if re.search(r"\bseal(?:s|ing)?\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\bпечат(?:ь|и|ей|ям|ями|ях)\b", "уплотнение", result, flags=re.IGNORECASE)
        result = re.sub(r"\bтюлен[А-Яа-яЁё-]*\b", "уплотнение", result, flags=re.IGNORECASE)
    if re.search(r"\bquote\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\bцитат(?:а|у|ы|е|ой|ами|ах)\b", "коммерческое предложение", result, flags=re.IGNORECASE)
    if re.search(r"\bmedia\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\bСМИ\b", "рабочая среда", result)
        result = re.sub(r"\bмедиа\b", "рабочая среда", result, flags=re.IGNORECASE)
    if re.search(r"\bbore\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\b(?:Боре|скважин[А-Яа-яЁё-]*)\b", "проходное отверстие", result, flags=re.IGNORECASE)
    if re.search(r"\bcustom\b", source, flags=re.IGNORECASE):
        result = re.sub(r"\bобыча(?:й|ем|я|и|ев|ю)\b", "индивидуальное исполнение", result, flags=re.IGNORECASE)
    result = re.sub(r"\bБегапанк[А-Яа-яЁё-]*\b", "Begapunk", result, flags=re.IGNORECASE)
    result = re.sub(r"\b(?:Фланж|Флэндж|Фланг)[ -]Маунт\b", "фланцевое крепление", result, flags=re.IGNORECASE)
    result = re.sub(r"\bПроточенная гора\b", "резьбовое крепление", result, flags=re.IGNORECASE)
    result = re.sub(r"\bПыль-доказательство\b", "пылезащищённое исполнение", result, flags=re.IGNORECASE)
    result = re.sub(r"\bРотари Джойтс\b", "Ротационные соединения", result, flags=re.IGNORECASE)
    result = re.sub(r"\bРотар(?:и|ий)ный\s+ротационное соединение\b", "ротационное соединение", result, flags=re.IGNORECASE)
    result = re.sub(r"\bРотари\s+ротационное соединение\b", "ротационные соединения", result, flags=re.IGNORECASE)
    visible_term_replacements = [
        (r"\b(?:Маунт|Гора)\s+(?:Фланж|Флэндж|Фланг)[А-Яа-яЁё-]*\b", "Фланцевое крепление"),
        (r"\b(?:Фланж|Флэндж|Фланг)[А-Яа-яЁё-]*\s+(?:Маунт|Гора)\b", "фланцевое крепление"),
        (r"\bфланжев[А-Яа-яЁё-]*\s+гор[А-Яа-яЁё-]*\b", "фланцевое крепление"),
        (r"\b(?:Фланж|Флэндж|Фланг)[А-Яа-яЁё-]*\b", "фланец"),
        (r"\bБольшая\s+бора\b", "Большое проходное отверстие"),
        (r"\bБоре\b", "проходное отверстие"),
        (r"\bRobot End-of-Arm Tooling\s*\(англ\.\)русск\.", "Оснастка конца руки робота (EOAT)"),
        (r"\bThreaded\s+vs\.?\s+Flange\s+Mounting\b", "Резьбовое и фланцевое крепление"),
        (r"\bA\s+Maintenance\s+Team['’]s\s+Field\s+Guide\b", "Практическое руководство для службы технического обслуживания"),
        (r"\bflange\s+mount(?:ing)?\b", "фланцевое крепление"),
        (r"\bthreaded\s+mount(?:ing)?\b", "резьбовое крепление"),
        (r"\bthreaded\s+connections?\b", "резьбовые соединения"),
        (r"\bthrough[- ]bore\b", "сквозное отверстие"),
        (r"\bhollow[- ]bore\b", "полое проходное отверстие"),
        (r"\bbore\b", "проходное отверстие"),
        (r"\bRead\s+Guide\b", "Читать руководство"),
        (r"\bView\s+Guide\b", "Смотреть руководство"),
        (r"\bSelection\s+Guide\b", "Руководство по выбору"),
        (r"\bFlowchart\b", "блок-схема"),
        (r"\bChecklist\b", "контрольный список"),
        (r"\bProduct\s+Catalog\b", "Каталог продукции"),
        (r"\bFile\s*\(Request\)", "файл (по запросу)"),
        (r"\bFile\b", "файл"),
        (r"\bGuide\b", "руководство"),
        (r"\bAir\s+Ротационное соединение\b", "Пневматическое ротационное соединение"),
        (r"\bfor\b", "для"),
        (r"\bThe\b", ""),
        (r"\bCompact\b", "Компактный"),
        (r"\bMax\b", "макс."),
        (r"\bFlange\b", "фланец"),
        (r"\bThreaded\b", "резьбовой"),
    ]
    source_channel_models = re.findall(r"\b\d+-in-\d+-out\b", source, flags=re.IGNORECASE)
    model_index = 0

    def normalize_visible_segment(segment: str) -> str:
        nonlocal model_index
        normalized = segment
        for pattern, replacement in visible_term_replacements:
            normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
        if re.search(r"\bfixtures?\b", source, flags=re.IGNORECASE):
            normalized = re.sub(r"\bсветильник[А-Яа-яЁё-]*\b", "оснастка", normalized, flags=re.IGNORECASE)
        if re.search(r"\bchucks?\b", source, flags=re.IGNORECASE):
            normalized = re.sub(r"\b(?:цыпленок|цыплят|Чаков|Чак)[А-Яа-яЁё-]*\b", "патрон", normalized, flags=re.IGNORECASE)
        if re.search(r"\bthreads?\b", source, flags=re.IGNORECASE):
            normalized = re.sub(r"\bнит(?:ь|и|ей|ям|ями|ях)\b", "резьба", normalized, flags=re.IGNORECASE)
        if re.search(r"\bthrough[- ]bore\b", source, flags=re.IGNORECASE):
            normalized = re.sub(r"\bсквозн[А-Яа-яЁё-]*\s+(?:штанг|стержн)[А-Яа-яЁё-]*\b", "сквозное отверстие", normalized, flags=re.IGNORECASE)
        if re.search(r"\bno bore\b", source, flags=re.IGNORECASE):
            normalized = re.sub(r"\bНе скучно\.?", "Без проходного отверстия.", normalized, flags=re.IGNORECASE)
        if "Ø" in source:
            normalized = normalized.replace("?", "Ø")
        if re.search(r"-?\d+°C\s+to\s+\+?-?\d+°C", source):
            normalized = normalized.replace("_", " – ")
        if source_channel_models:
            def restore_channel_model(match: re.Match[str]) -> str:
                nonlocal model_index
                if model_index >= len(source_channel_models):
                    return match.group(0)
                value = source_channel_models[model_index]
                model_index += 1
                return value

            normalized = re.sub(
                r"\b\d+-(?:in|в)-\d+-(?:out|вне|вход)\b",
                restore_channel_model,
                normalized,
                flags=re.IGNORECASE,
            )
        if "·" in source and "_" in normalized:
            normalized = normalized.replace("_", "·", 1)
        return normalized

    result_parts = re.split(r"(<[^>]+>)", result)
    result = "".join(
        part if part.startswith("<") else normalize_visible_segment(part)
        for part in result_parts
    )
    for attribute in ("href", "src", "poster", "action"):
        source_values = re.findall(rf"\b{attribute}\s*=\s*(['\"])(.*?)\1", source, flags=re.IGNORECASE)
        if not source_values:
            continue
        value_index = 0

        def restore_attribute(match: re.Match[str]) -> str:
            nonlocal value_index
            if value_index >= len(source_values):
                return match.group(0)
            quote, value = source_values[value_index]
            value_index += 1
            return f"{attribute}={quote}{value}{quote}"

        result = re.sub(
            rf"\b{attribute}\s*=\s*(['\"])(.*?)\1",
            restore_attribute,
            result,
            flags=re.IGNORECASE,
        )
    return result


def split_for_model(text: str, tokenizer: spm.SentencePieceProcessor, max_tokens: int = 180) -> list[str]:
    sentences = SENTENCE_BOUNDARY_PATTERN.split(text)
    chunks: list[str] = []
    for sentence in sentences:
        if len(tokenizer.encode(sentence, out_type=str)) <= max_tokens:
            chunks.append(sentence)
            continue

        words = sentence.split()
        word_chunk = ""
        for word in words:
            candidate = word if not word_chunk else f"{word_chunk} {word}"
            if word_chunk and len(tokenizer.encode(candidate, out_type=str)) > max_tokens:
                chunks.append(word_chunk)
                word_chunk = word
            else:
                word_chunk = candidate
        if word_chunk:
            chunks.append(word_chunk)
    return chunks


def fragment_texts(
    source: str,
    translated_attributes: Iterable[str],
) -> tuple[lxml_html.HtmlElement, list[str]]:
    wrapper = lxml_html.fragment_fromstring(source, create_parent="div")
    values: list[str] = []
    for element in wrapper.iter():
        if element.text and element.text.strip():
            values.append(element.text)
        if element.tail and element.tail.strip():
            values.append(element.tail)
        for attribute in translated_attributes:
            value = element.get(attribute)
            if value and re.search(r"[A-Za-z]", value):
                values.append(value)
    return wrapper, values


def serialize_fragment(wrapper: lxml_html.HtmlElement) -> str:
    parts = [wrapper.text or ""]
    parts.extend(lxml_html.tostring(child, encoding="unicode", method="html") for child in wrapper)
    return "".join(parts)


def replace_fragment_texts(
    wrapper: lxml_html.HtmlElement,
    translations: dict[str, str],
    translated_attributes: Iterable[str],
) -> None:
    for element in wrapper.iter():
        if element.text and element.text.strip():
            element.text = translations[element.text]
        if element.tail and element.tail.strip():
            element.tail = translations[element.tail]
        for attribute in translated_attributes:
            value = element.get(attribute)
            if value and value in translations:
                element.set(attribute, translations[value].strip())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="de")
    parser.add_argument("--model-root", type=Path, required=True)
    parser.add_argument("--catalog", type=Path, default=ROOT / "i18n" / "source-catalog.json")
    parser.add_argument("--glossary", type=Path, default=ROOT / "i18n" / "glossary.json")
    parser.add_argument("--overrides", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--force", action="store_true", help="Retranslate entries already present in the cache.")
    parser.add_argument(
        "--refresh-pattern",
        action="append",
        default=[],
        help="Retranslate cached entries whose English source matches this regular expression. May be repeated.",
    )
    parser.add_argument(
        "--refresh-placeholders",
        action="store_true",
        help="Retranslate cached entries containing damaged placeholder residue.",
    )
    parser.add_argument(
        "--refresh-damaged-output",
        action="store_true",
        help="Retranslate entries with malformed placeholders or missing BP-series product codes.",
    )
    parser.add_argument(
        "--raw-model",
        action="store_true",
        help="Skip terminology/value placeholders for the entries being translated.",
    )
    parser.add_argument(
        "--raw-terms",
        action="store_true",
        help="Let the model translate terminology naturally while still protecting technical values.",
    )
    parser.add_argument(
        "--refresh-numbers",
        action="store_true",
        help="Retranslate cached entries that no longer contain every source number.",
    )
    parser.add_argument(
        "--literal-numbers",
        action="store_true",
        help="Keep numbers outside the model and translate only the surrounding text.",
    )
    parser.add_argument("--batch-size", type=int, default=max(8, min(64, (os.cpu_count() or 4) * 2)))
    parser.add_argument("--beam-size", type=int, default=4)
    parser.add_argument(
        "--chunk-cache",
        type=Path,
        help="Optional resumable cache for model-level translated text chunks.",
    )
    args = parser.parse_args()

    catalog = load_json(args.catalog)
    glossary = load_json(args.glossary)
    config = load_json(ROOT / "i18n" / "config.json")
    override_path = args.overrides or ROOT / "i18n" / "overrides" / f"{args.language}.json"
    overrides = load_json(override_path) if override_path.exists() else {}
    translated_attributes = config.get("translatedAttributes", [])
    preferred_terms = glossary.get("preferredTerms", {}).get(args.language, {})
    if not preferred_terms:
        raise SystemExit(f"No preferred terminology configured for {args.language}.")

    output = args.output or ROOT / "i18n" / "cache" / f"{args.language}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    existing_translations: dict[str, str] = {}
    if output.exists() and not args.force:
        existing_cache = load_json(output)
        if existing_cache.get("language") != args.language:
            raise SystemExit(f"Existing cache language does not match {args.language}: {output}")
        existing_translations = existing_cache.get("translations", {})
    refresh_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in args.refresh_pattern]

    def needs_translation(entry: dict) -> bool:
        if entry["source"] in overrides:
            return False
        if entry["id"] not in existing_translations:
            return True
        if args.refresh_placeholders and (
            re.search(r"(?:ZY|ZX|ザイQ|__(?:TR|PH)[A-Z]{4}__)", existing_translations[entry["id"]])
            or MALFORMED_PLACEHOLDER_PATTERN.search(existing_translations[entry["id"]])
        ):
            return True
        if args.refresh_damaged_output:
            translated = existing_translations[entry["id"]]
            source_codes = set(re.findall(r"\bBP-[A-Z0-9-]+\b", entry["source"]))
            if re.search(r"_{4,}|(?:PH|TR)[A-Z]{3,}", translated) or MALFORMED_PLACEHOLDER_PATTERN.search(translated):
                return True
            if any(code not in translated for code in source_codes):
                return True
        if args.refresh_numbers:
            translated = existing_translations[entry["id"]]
            if any(value not in translated for value in set(NUMBER_PATTERN.findall(entry["source"]))):
                return True
        return any(pattern.search(entry["source"]) for pattern in refresh_patterns)

    pending_entries = [entry for entry in catalog["entries"] if needs_translation(entry)]
    pending_ids = {entry["id"] for entry in pending_entries}
    print(
        f"Reusing {len(catalog['entries']) - len(pending_entries)} existing or manually overridden entries; "
        f"translating {len(pending_entries)} new entries.",
        flush=True,
    )
    tokenizer = spm.SentencePieceProcessor(model_file=str(args.model_root / "sentencepiece.model"))
    translator = ctranslate2.Translator(str(args.model_root / "model"), device="cpu", compute_type="int8")

    plain_sources: set[str] = set()
    parsed_fragments: dict[str, lxml_html.HtmlElement] = {}
    for entry in pending_entries:
        source = entry["source"]
        if HTML_TAG_PATTERN.search(source):
            wrapper, values = fragment_texts(source, translated_attributes)
            parsed_fragments[source] = wrapper
            plain_sources.update(values)
        else:
            plain_sources.add(html.unescape(source))

    jobs: dict[str, list[tuple[str, str, str, list[tuple[str, str]], list[str]]]] = {}
    all_chunks: list[str] = []
    for source in sorted(plain_sources):
        parts: list[tuple[str, str, str, list[tuple[str, str]], list[str]]] = []
        pieces = re.split(f"({NUMBER_PATTERN.pattern})", source) if args.literal_numbers else [source]
        for piece in pieces:
            if not piece:
                continue
            if args.literal_numbers and NUMBER_PATTERN.fullmatch(piece):
                parts.append(("literal", piece, "", [], []))
                continue
            leading = re.match(r"^\s*", piece).group(0)
            trailing = re.search(r"\s*$", piece).group(0)
            body_end = len(piece) - len(trailing) if trailing else len(piece)
            body = piece[len(leading):body_end]
            if not body:
                parts.append(("literal", piece, "", [], []))
                continue
            if args.raw_model:
                protected = body
                replacements = []
                term_replacements = []
            else:
                if args.raw_terms:
                    prepared = body
                    term_replacements = []
                    protected_terms = []
                else:
                    prepared, term_replacements = replace_preferred_terms(
                        body,
                        preferred_terms,
                        glossary.get("protectedTerms", []),
                    )
                    protected_terms = glossary.get("protectedTerms", [])
                protected, replacements = protect_values(prepared, protected_terms)
            chunks = split_for_model(protected, tokenizer)
            parts.append(("model", leading, trailing, [*replacements, *term_replacements], chunks))
            all_chunks.extend(chunks)
        jobs[source] = parts

    translated_chunks: dict[str, str] = {}
    if args.chunk_cache and args.chunk_cache.exists():
        chunk_cache_payload = load_json(args.chunk_cache)
        translated_chunks = chunk_cache_payload.get("translations", {})
        print(f"Reusing {len(translated_chunks)} translated text chunks from {args.chunk_cache}.", flush=True)
    unique_chunks = list(dict.fromkeys(all_chunks))
    pending_chunks = [chunk for chunk in unique_chunks if chunk not in translated_chunks]
    for start in range(0, len(pending_chunks), args.batch_size):
        batch = pending_chunks[start:start + args.batch_size]
        results = translator.translate_batch(
            [tokenizer.encode(value, out_type=str) for value in batch],
            beam_size=args.beam_size,
            max_batch_size=args.batch_size,
            batch_type="tokens",
            replace_unknowns=True,
        )
        for source, result in zip(batch, results, strict=True):
            translated_chunks[source] = tokenizer.decode_pieces(result.hypotheses[0]).strip()
        completed = len(unique_chunks) - len(pending_chunks) + min(start + len(batch), len(pending_chunks))
        if args.chunk_cache and (start // args.batch_size + 1) % 8 == 0:
            args.chunk_cache.parent.mkdir(parents=True, exist_ok=True)
            args.chunk_cache.write_text(
                json.dumps({"language": args.language, "translations": translated_chunks}, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        print(f"Translated {completed}/{len(unique_chunks)} text segments.", flush=True)

    if args.chunk_cache:
        args.chunk_cache.parent.mkdir(parents=True, exist_ok=True)
        args.chunk_cache.write_text(
            json.dumps({"language": args.language, "translations": translated_chunks}, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    plain_translations: dict[str, str] = {}
    for source, parts in jobs.items():
        translated_parts: list[str] = []
        for kind, leading_or_value, trailing, replacements, chunks in parts:
            if kind == "literal":
                translated_parts.append(leading_or_value)
                continue
            translated = " ".join(translated_chunks[chunk] for chunk in chunks)
            translated_parts.append(f"{leading_or_value}{restore_values(translated, replacements)}{trailing}")
        plain_translations[source] = "".join(translated_parts)

    translations: dict[str, str] = {}
    for entry in catalog["entries"]:
        source = entry["source"]
        if source in overrides:
            translations[entry["id"]] = normalize_translation(args.language, overrides[source], source)
            continue
        if entry["id"] in existing_translations and entry["id"] not in pending_ids:
            translations[entry["id"]] = normalize_translation(
                args.language,
                existing_translations[entry["id"]],
                source,
            )
            continue
        if source in parsed_fragments:
            wrapper = parsed_fragments[source]
            replace_fragment_texts(wrapper, plain_translations, translated_attributes)
            translations[entry["id"]] = normalize_translation(args.language, serialize_fragment(wrapper), source)
        else:
            translations[entry["id"]] = normalize_translation(
                args.language,
                plain_translations[html.unescape(source)].strip(),
                source,
            )

    payload = {
        "language": args.language,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "engine": f"local-ctranslate2-argos-{args.model_root.name.removeprefix('translate-')}",
        "translations": translations,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(translations)} translations to {output} ({len(overrides)} manual overrides configured).")


if __name__ == "__main__":
    main()
