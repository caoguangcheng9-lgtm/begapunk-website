# Russian full-site localization audit — 2026-07-18

## Scope

- Added Russian (`ru_RU`) as the fourth active site language alongside English, German, and Japanese.
- Generated 51 static Russian HTML pages under `/ru/`.
- Added Russian language switching and `hreflang` references to the 51 English source pages and regenerated the existing German and Japanese pages.
- Regenerated `sitemap-i18n.xml` with 192 indexable URLs (48 pages × 4 languages).

## Translation workflow

- Source catalog: 4,622 unique strings extracted from 51 English pages.
- Translation engine: official Argos Translate English-to-Russian offline model.
- Manual Russian overrides: 57 high-value titles, headings, calls to action, and industrial terminology corrections.
- Added source-aware normalization for rotary joint/union, flange, bore, seal, media, fixture, chuck, thread, model codes, and protected technical values.
- Translation cache and checkpoint workflow allow later source changes to translate incrementally rather than rebuilding the full corpus.

## Verification

- `scripts/verify-localized-site.mjs`: passed for 204 pages.
- Russian page count: 51.
- Sitemap URL count: 192.
- Missing or malformed replacement characters: 0 pages.
- Visible high-risk English residue in Russian pages: 0 pages for the audited common UI/SEO vocabulary.
- Placeholder residue (`__PH`, `__TR`) and long placeholder artifacts: 0.
- Audited Russian mistranslation patterns (brand transliteration, body-joint/union/seal false senses, flange transliterations): 0.
- `git diff --check`: passed.

## Deployment status

- Production deployment and live visual verification are recorded separately after the server backup and release verification complete.
