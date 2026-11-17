# Japanese terminology and SEO review — 2026-07-26

## Decision

The Japanese pages contained terminology and machine-translation defects that could reduce relevance and user trust. However, the available Search Console screenshot does not prove that wording is the only cause of low impressions. The Japanese section was newly launched, so indexing time, internal-link strength, authority, and search demand remain material factors.

## Japanese reference sites reviewed

- Rix rotary-joint category: https://www.rix.co.jp/products_services/products/category/rotary/
- Rix multi-port rotary joint: https://www.rix.co.jp/products_services/products/category/rotary/rj_tablecooling/
- Pascal rotary joint: https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/
- Nambu rotary joint and swivel joint: https://www.nambu-cyl.co.jp/product/rotarycyl.htm
- KONSEI rotary joint: https://www.konsei.co.jp/chuck/?cid=6

## Terminology decisions

| Previous or inconsistent wording | Standardized Japanese wording |
| --- | --- |
| Rotary Joint | ロータリージョイント（回転継手） |
| Passage / Channel Count | 流路数 |
| Compatible Media | 使用可能流体 / 使用流体 |
| Max Pressure | 最高使用圧力 |
| Max Speed / RPM | 最高使用回転数 / min⁻¹ |
| Mount Type | 取付方式 |
| Flange Mount | フランジ取付 |
| Bore | 中空穴 |
| Custom | 特注 / 特注対応 |
| Engineering Support | 技術相談 |

## Changes applied

- Rewrote the Japanese homepage title, description, H1, navigation, hero copy, key statistics, application labels, support copy, and footer wording.
- Rewrote titles, H1 headings, and meta descriptions for all 16 product pages using model, flow count, mounting, pressure, and speed terminology.
- Standardized shared specification labels and common product-selection wording across all 51 Japanese pages.
- Removed known damaged text patterns, including repeated `X`, repeated `+`, malformed headings, and machine-translated phrases.
- Corrected damaged diameter strings such as `?64`, `?78.9`, and `?6 mm` in Japanese output.
- Localized the name, description, category, breadcrumb labels, and specification property names in Product JSON-LD.
- Regenerated `ja/search-index.json` from the revised Japanese pages.

## Validation

- Japanese HTML pages: 51/51 present.
- Product page titles and H1 headings reviewed as a complete list: 16/16 use Japanese catalog terminology.
- JSON-LD blocks parsed: 57/57.
- Product schemas checked for Japanese name, description, and category: 16/16.
- Local references checked: 3,529; missing references: 0.
- Known corruption and placeholder patterns: 0 matches.
- HTML basics checked per page: doctype, `lang=ja`, title, meta description, one H1, and Japanese canonical URL.

## Remaining gate before deployment

Chrome rejected local `file://` preview navigation under its security policy. Therefore this review does not claim a completed rendered, page-by-page visual inspection. A browser-based visual pass of all 51 pages remains a deployment gate. Long-form application and article copy also merits native-Japanese editorial review over time; the current work prioritizes search-critical fields, product terminology, shared UI, known corruption, and structural consistency.

No production server or live website was changed during this work.
