#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Content consistency guard for begapunk-site-v2.

Fails (exit 1) when a retired phrase, a DOM text-glue defect, or an invalid
JSON-LD block reappears in the published HTML or in the editorial source layer.
Intended to run in CI *after* any sync/build step.

Usage:  python scripts/verify-content-consistency.py
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HTML_EXT = (".html",)
SOURCE_FILES = (
    "data/page-faq.en.json",
    "i18n/source-catalog.json",
    "i18n/editorial/de.json",
    "i18n/editorial/fr.json",
    "i18n/editorial/ja.json",
    "i18n/editorial/ru.json",
    "data/owner-confirmed-product-policy.json",
)

# Phrases that must never come back (retired copy, retired address, dead disclaimers).
RETIRED = [
    ("retired factory address", re.compile(r"Yugong|Zonghan|315300")),
    ("evasive certification answer", re.compile(r"Contact Begapunk for the certification")),
    ("hedged replacement answer", re.compile(r"It depends on the model\.")),
    ("french language waiver", re.compile(r"trait[ée]s en anglais")),
    ("old weight disclaimer", re.compile(r"not a physical weighing result")),
    ("case-study self-deprecation", re.compile(r"not customer performance results")),
    ("anodising life disclaimer", re.compile(r"not a service-life guarantee")),
    ("anodising one-control claim", re.compile(r"one design control, not a service-life")),
]

LD = re.compile(r'(?is)<script[^>]*application/ld\+json[^>]*>(.*?)</script>')
SPAN_GLUE = b"</span><span"

def walk_html():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "dist", "output")]
        for name in files:
            if name.lower().endswith(HTML_EXT):
                yield os.path.join(base, name)

def main():
    failures = []

    # 1) retired phrases in html and source layer
    targets = [(os.path.relpath(p, ROOT).replace(os.sep, "/"), open(p, "rb").read().decode("utf-8", "replace"))
               for p in walk_html()]
    for rel in SOURCE_FILES:
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        if os.path.exists(path):
            targets.append((rel, open(path, "rb").read().decode("utf-8", "replace")))
    for rel, text in targets:
        for label, pattern in RETIRED:
            if pattern.search(text):
                line = text[: pattern.search(text).start()].count("\n") + 1
                failures.append("%s:%d: %s is back" % (rel, line, label))

    # 2) DOM text glue
    glued = 0
    for path in walk_html():
        glued += open(path, "rb").read().count(SPAN_GLUE)
    if glued:
        failures.append("DOM text glue: %d occurrence(s) of </span><span>" % glued)

    # 3) JSON-LD must parse
    blocks = 0
    for rel, text in targets:
        if not rel.endswith(".html"):
            continue
        for match in LD.finditer(text):
            body = match.group(1).strip()
            if not body:
                continue
            blocks += 1
            try:
                json.loads(body)
            except Exception as exc:                     # noqa: BLE001 - report, never raise
                failures.append("%s: JSON-LD parse error: %s" % (rel, exc))

    # 4) source-catalog hash integrity (id == sha256(source)[:16])
    cat_path = os.path.join(ROOT, "i18n", "source-catalog.json")
    if os.path.exists(cat_path):
        catalog = json.loads(open(cat_path, "rb").read().decode("utf-8"))
        entries = catalog if isinstance(catalog, list) else catalog.get("entries", [])
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            expected = hashlib.sha256(entry.get("source", "").encode("utf-8")).hexdigest()[:16]
            if entry.get("id") != expected:
                failures.append("i18n/source-catalog.json: hash mismatch for %s" % entry.get("id"))

    print("checked %d files, %d JSON-LD blocks, %d glue markers" % (len(targets), blocks, glued))
    if failures:
        print("content consistency FAILED with %d issue(s):" % len(failures))
        for item in failures[:40]:
            print(" - %s" % item)
        return 1
    print("content consistency OK")
    return 0

if __name__ == "__main__":
    sys.exit(main())
