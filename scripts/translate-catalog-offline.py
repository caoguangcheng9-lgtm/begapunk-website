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
) -> str:
    result = text
    protected_exact = set(protected_terms)
    for source, target in sorted(preferred_terms.items(), key=lambda item: len(item[0]), reverse=True):
        result = term_pattern(source).sub(
            lambda match: match.group(0) if match.group(0) in protected_exact else target,
            result,
        )
    return result


def protect_values(text: str, protected_terms: Iterable[str]) -> tuple[str, list[tuple[str, str]]]:
    replacements: list[tuple[str, str]] = []

    def replace(match: re.Match[str]) -> str:
        token = f"ZXQ{len(replacements):04d}ZX"
        replacements.append((token, match.group(0)))
        return token

    result = PROTECTED_VALUE_PATTERN.sub(replace, text)
    for term in sorted(protected_terms, key=len, reverse=True):
        result = term_pattern(term).sub(replace, result)
    return result, replacements


def restore_values(text: str, replacements: list[tuple[str, str]]) -> str:
    result = text
    for token, value in replacements:
        result = result.replace(token, value)
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
    parser.add_argument("--batch-size", type=int, default=max(8, min(64, (os.cpu_count() or 4) * 2)))
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

    jobs: dict[str, tuple[str, str, list[tuple[str, str]], list[str]]] = {}
    all_chunks: list[str] = []
    for source in sorted(plain_sources):
        leading = re.match(r"^\s*", source).group(0)
        trailing = re.search(r"\s*$", source).group(0)
        body_end = len(source) - len(trailing) if trailing else len(source)
        body = source[len(leading):body_end]
        prepared = replace_preferred_terms(body, preferred_terms, glossary.get("protectedTerms", []))
        protected, replacements = protect_values(prepared, glossary.get("protectedTerms", []))
        chunks = split_for_model(protected, tokenizer)
        jobs[source] = (leading, trailing, replacements, chunks)
        all_chunks.extend(chunks)

    translated_chunks: dict[str, str] = {}
    unique_chunks = list(dict.fromkeys(all_chunks))
    for start in range(0, len(unique_chunks), args.batch_size):
        batch = unique_chunks[start:start + args.batch_size]
        results = translator.translate_batch(
            [tokenizer.encode(value, out_type=str) for value in batch],
            beam_size=4,
            max_batch_size=args.batch_size,
            batch_type="tokens",
            replace_unknowns=True,
        )
        for source, result in zip(batch, results, strict=True):
            translated_chunks[source] = tokenizer.decode_pieces(result.hypotheses[0]).strip()
        completed = min(start + len(batch), len(unique_chunks))
        print(f"Translated {completed}/{len(unique_chunks)} text segments.", flush=True)

    plain_translations: dict[str, str] = {}
    for source, (leading, trailing, replacements, chunks) in jobs.items():
        translated = " ".join(translated_chunks[chunk] for chunk in chunks)
        plain_translations[source] = f"{leading}{restore_values(translated, replacements)}{trailing}"

    translations: dict[str, str] = {}
    for entry in catalog["entries"]:
        source = entry["source"]
        if source in overrides:
            translations[entry["id"]] = overrides[source]
            continue
        if entry["id"] in existing_translations and entry["id"] not in pending_ids:
            translations[entry["id"]] = existing_translations[entry["id"]]
            continue
        if source in parsed_fragments:
            wrapper = parsed_fragments[source]
            replace_fragment_texts(wrapper, plain_translations, translated_attributes)
            translations[entry["id"]] = serialize_fragment(wrapper)
        else:
            translations[entry["id"]] = plain_translations[html.unescape(source)].strip()

    payload = {
        "language": args.language,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "engine": "local-ctranslate2-argos-en_de-1_3",
        "translations": translations,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(translations)} translations to {output} ({len(overrides)} manual overrides configured).")


if __name__ == "__main__":
    main()
