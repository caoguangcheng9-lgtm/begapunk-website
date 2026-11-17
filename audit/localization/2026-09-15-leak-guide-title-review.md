# Leakage-guide title correction — 2026-09-15

## Scope and authorization

User approved correcting the leakage article's flowchart promise to match its existing five-step guide, including the other language versions. This is a local content correction, not deployment approval. Existing unrelated worktree changes were preserved.

## Changes

- EN/DE/FR/JA/RU: article title, H1, Open Graph/Twitter title and TechArticle headline; corresponding homepage link and installation-article related-card heading.
- Four localized SEO sources and translation overrides updated; English extraction source catalog and search indexes synchronized.
- Four localized llms.txt article labels synchronized. English llms.txt already accurately says diagnostic guide and was left unchanged.
- International sitemap/hash state synchronized. A read-only render comparison before writing confirmed exactly the 15 affected HTML pages changed; no unrelated page lastmod was advanced.
- No URL, redirect, CSS, JavaScript, technical specification, inquiry form, or diagnostic-step content change.

## Language review boundary

AI-assisted review of these changed title strings only, not a new full-page or native-speaker certification. Each title describes a five-step diagnostic/troubleshooting guide rather than promising a flowchart.

- en: Leaking Rotary Union? 5-Step Troubleshooting | Begapunk
- de: Drehdurchführung undicht? Fehlersuche in 5 Schritten
- fr: Raccord tournant qui fuit ? Diagnostic en 5 étapes
- ja: ロータリージョイントの漏れ：5段階の点検ガイド
- ru: Утечка в ротационном соединении: 5 шагов диагностики

English H1: Leaking Rotary Union? A Five-Step Troubleshooting Guide.

## Verification

- New regression suite: 10/10 passed; five-language title/H1/social metadata/schema/search/SEO/AI-index consistency, canonical paths, five ordered steps, homepage entry and related-card heading.
- Source catalog current: 1,714 strings from 47 translation-managed English pages.
- Search indexes current: five languages.
- Copy regressions: 228 checks passed.
- Localized metadata verification: 188 managed pages, four target-language search and llms indexes passed.
- Localized site verification: 280 pages passed after sitemap synchronization.
- International sitemap verification: 265 content-hash-backed entries passed.
- Browser DOM/layout checks: all five article variants at widths 390 and 1366; no H1 clipping or horizontal page overflow, all five ordered steps present. English desktop and Russian mobile screenshots inspected. Viewport override reset.
- Byte-level main-content comparison with the immediate pre-edit baseline, ignoring H1 only, passed for all five articles. Baseline SHA-256 values:

- blog-rotary-joint-leaking.html: 0d328e6137e44a1b2000b5b8c2fc91f7181e76f41e6917f435b652c0c43f0045
- de/blog-rotary-joint-leaking.html: ee456eee70cf0fd1cfaaaa759af0cd225a723618eee0a70c71a7852499da62af
- fr/blog-rotary-joint-leaking.html: 8930e8ec8fa851c5cebdf11c0b154910071d5882e76eb6da9c5a8254182df5b0
- ja/blog-rotary-joint-leaking.html: cddbf0303a01a177719d4911bfa2f31f0b687c4fb0880844b4d4659a6daf15ce
- ru/blog-rotary-joint-leaking.html: 17fbfc8b50fd896c8dbdaad02fae3a5fbbfb2a3a2f254ff28f693e944ea7c260

## Release boundary / unresolved separate work

The broader editorial release verifier is NOT green: it reports review-evidence/snapshot and trusted-baseline mismatches across many unrelated pages, plus release-approval/debt-contract mismatches. These cannot be resolved honestly by marking the whole site reviewed during a title-only task. This report is bounded evidence, not a fabricated whole-site review or release approval. No editorial manifests were refreshed, no commit/push/deployment was performed, and no production or Search Console setting was changed. A later release must resolve the relevant review evidence against the intended release diff.
