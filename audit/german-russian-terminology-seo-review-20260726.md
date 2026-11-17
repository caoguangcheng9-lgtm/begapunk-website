# German and Russian terminology / SEO review — 2026-07-26

## Scope

- Reviewed all 51 German pages in `de/` and all 51 Russian pages in `ru/`.
- Reviewed page titles, H1/H2 headings, common product terms, units, visible corruption patterns, localized search indexes, HTML language markers, and JSON-LD syntax.
- Regenerated the localized pages from the English source through `scripts/build-localized-site.mjs` so later builds preserve the fixes.
- This review modified the local source only. It did not deploy the website or commit changes.

## Terminology references

German industry terminology was checked against:

- KOCH Maschinenbau: `Drehdurchführung`, `Betriebsmedium`, `Betriebsdruck`, `maximale Drehzahl`, `Anzahl Kanäle`
  - https://www.kochmaschinenbau.de/produkte/pneumatik-spannfutter/drehdurchfuehrung/
- DESETEC: `Mehrwege-Drehdurchführung`, `Kanäle/Ports`, `Medium`, `Betriebsdruck`, `zulässige Drehzahl`
  - https://desetec.de/de/drehdurchfuehrungen/mehrwege-drehdurchfuehrungen
- HYDROKOMP: `Pneumatische Drehdurchführungen`
  - https://www.hydrokomp.de/drehdurchfuehrungen/800-1-pneumatische-drehdurchfuehrungen

Russian terminology was checked against:

- ElectricSlipRing: `пневматические ротационные соединения`, `рабочее давление`, `рабочая среда`, `максимальная скорость вращения`
  - https://www.electricslipring.ru/2026/03/10/%D0%BF%D0%BD%D0%B5%D0%B2%D0%BC%D0%B0%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5-%D1%80%D0%BE%D1%82%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%BD%D1%8B%D0%B5-%D1%81%D0%BE%D0%B5%D0%B4%D0%B8%D0%BD%D0%B5%D0%BD/
- DirectIndustry (Russian): `вращающееся соединение`, `количество каналов`, `рабочая среда`, `максимальное давление`
  - https://www.directindustry.com.ru/prod/jiujiang-ingiant-technology-co-ltd/product-204639-2445263.html

## Changes

- Standardized German product terminology around `Drehdurchführung`, `Kanalzahl`, `Betriebsdruck`, `Drehzahl`, and `Betriebsmedien`.
- Standardized Russian product terminology around `ротационное (вращающееся) соединение`, `количество каналов`, `рабочее давление`, `скорость вращения`, and `рабочая среда`.
- Rewrote the German and Russian model titles/H1 fields and corrected recurring application, installation, comparison, FAQ, and policy headings.
- Replaced English unit remnants: `RPM/rpm` becomes `min⁻¹` in German and `об/мин` in Russian; `MPa` becomes `МПа` in Russian.
- Removed broken diameter markers, repeated plus signs, Markdown heading remnants, English UI fragments, and malformed flow labels.
- Localized Product JSON-LD names, descriptions, categories, and property labels.
- Updated `de/search-index.json` and `ru/search-index.json` from the corrected pages.

## Validation

- German HTML pages: 51
- Russian HTML pages: 51
- JSON-LD blocks parsed in the isolated review: 114 total (57 per language)
- Product JSON-LD objects reviewed: 32 total (16 per language)
- Suspicious visible patterns (`AAA`, `XXX`, replacement character, repeated plus signs, Markdown hashes, `?` dimensions, `RPM/rpm`, common English UI remnants): 0
- Project verifier: `Localized site verification passed for 204 pages.`

## Remaining editorial limitation

This pass fixes search-critical fields, recurring terminology, common UI text, obvious corruption, and the most visible machine-translation errors. It is not equivalent to a native German and Russian technical editor reviewing every paragraph for style. Long-form technical articles should receive native-speaker editorial review before using them as authoritative paid-search or distributor collateral.
