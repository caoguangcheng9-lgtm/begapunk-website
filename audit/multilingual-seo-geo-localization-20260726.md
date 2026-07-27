# Multilingual SEO and GEO Localization Audit

Date: 2026-07-26  
Scope: German (`de`), Japanese (`ja`), and Russian (`ru`) local source only  
Deployment: Not deployed  
Git commit: Not created

## Objective

Replace machine-translated search metadata with curated local-language terminology and make structured data and AI-readable indexes consistent with each localized page.

## Terminology references

- German terminology was aligned with industrial usage such as `Drehdurchführung`, `Mehrkanal-Drehdurchführung`, `Druckluft`, `Medium`, `Betriebsdruck` and `Drehzahl` used by DEUBLIN: https://www.deublin.eu/mehrkanal-drehdurchfuehrungen
- Japanese terminology was aligned with Showa Giken usage such as `ロータリージョイント`, `固定配管`, `回転部分`, `流体`, `最高圧力` and `最高回転数`: https://www.sgk-p.co.jp/products/rotaryjoint/
- Russian metadata consistently uses `ротационное соединение`, `пневматическое`, `рабочее давление`, `частота вращения`, `число каналов`, and unambiguous `вход/выход` descriptions. Product values are taken from the existing approved English source pages rather than inferred from competitor claims.

## Implemented changes

- Added a maintainable SEO source layer under `i18n/seo/`.
- Added a unique curated title, meta description, and H1 for all 51 pages in each language.
- Forced Open Graph and Twitter title/description fields to use the same curated local-language metadata.
- Localized content-bearing JSON-LD nodes and added the correct `inLanguage` value.
- Localized Product, WebPage, WebSite, Article/BlogPosting, Organization description, and visible FAQ structured data.
- Rebuilt FAQPage data from the visible localized questions and answers.
- Removed seven FAQPage declarations per language where the declared FAQ was not visibly present on the page. This avoids structured-data/content mismatch.
- Generated `de/llms.txt`, `ja/llms.txt`, and `ru/llms.txt`, each containing all 51 localized URLs and descriptions.
- Linked all three localized AI indexes from the root `llms.txt`.
- Extended the multilingual verifier so future builds fail when curated metadata, social metadata, JSON-LD language, visible FAQ parity, or localized llms coverage is missing.

## Validation results

| Check | German | Japanese | Russian |
|---|---:|---:|---:|
| Pages with curated SEO metadata | 51/51 | 51/51 | 51/51 |
| Unique page titles | 51 | 51 | 51 |
| Duplicate title groups | 0 | 0 | 0 |
| Valid JSON-LD blocks | 50 | 50 | 50 |
| Content schema nodes with correct `inLanguage` | 57/57 | 57/57 | 57/57 |
| Visible FAQ schema blocks | 13 | 13 | 13 |
| FAQ questions matching visible content | 60/60 | 60/60 | 60/60 |
| URLs in localized `llms.txt` | 51/51 | 51/51 | 51/51 |

- `scripts/verify-localized-site.mjs`: passed for 204 English and localized pages.
- `git diff --check`: passed; line-ending conversion notices are informational and do not indicate whitespace errors.
- Build and verifier JavaScript syntax checks: passed.

## Scope boundary and risk

This audit proves the SEO/GEO layer is complete and internally consistent. It does not claim that every sentence in the body copy of all 153 localized pages has completed native-speaker editorial review. Body-copy status remains separately and accurately recorded in `i18n/editorial/status.json`.

Search ranking and impressions are not guaranteed by metadata or `llms.txt`. Results still depend on crawling, indexing, query demand, content usefulness, backlinks, and user engagement. After deployment, use Search Console URL inspection and performance reports to evaluate the effect over several weeks.
