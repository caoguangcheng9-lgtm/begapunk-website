# Blog Knowledge Center Localization Review

- Review date: 2026-08-16 (Asia/Tokyo)
- Route: `blog.html`
- Languages: German (`de`), Japanese (`ja`), Russian (`ru`)
- Review method: AI-assisted target-market line-by-line localization review
- Reviewer role: AI localization reviewer working from the approved English source and Begapunk evidence boundaries
- Independent native-speaker sign-off: not performed
- Unresolved Blog-specific localization issues: none

## Scope and method

The redesigned English Blog/Engineering Knowledge Center was used as the factual source. The three localized pages were reviewed record by record for industrial terminology, natural B2B reading, buyer search vocabulary, task-oriented navigation, article titles, calls to action, image alternative text, accessibility labels, links, and evidence limits. Page-specific editorial translations and localized SEO values were recorded before generating only `de/blog.html`, `ja/blog.html`, and `ru/blog.html` from the approved English structure.

This was not an unreviewed whole-page machine translation. Peer and manufacturer pages were used only to check local terminology and reading patterns. No competitor parameter, certification, customer statement, performance claim, or commercial promise was imported into Begapunk content.

## Content and evidence boundaries preserved

- The Knowledge Center presents three currently published technical guides: rotary-joint selection, installation, and seal comparison.
- Four decision paths lead to the model comparison, application overview, production inspection/testing, and engineering FAQ. They are navigation paths, not proof that one standard model fits every application.
- Product suitability still depends on the medium, pressure, speed, temperature, passage count, mounting, and the approved project drawing.
- The inspection path describes Begapunk's published production-test process; it is not presented as third-party certification, field-life proof, or proof of suitability beyond the stated test conditions.
- The technical-review call to action requests engineering input and does not promise acceptance, a fixed lead time, or a performance result.
- The four excluded draft/soft-isolated articles were not reintroduced as indexable Blog cards.
- The installation guide's visible publication date was aligned with its existing `datePublished`, `dateModified`, Blog card, and technical-note date (`2026-06-12`) in all four languages.
- A corrupted Japanese visible date on the selection guide was corrected to `2026年5月24日`, matching the existing structured date.
- One Russian-language checklist phrase accidentally present on the German installation page was replaced with reviewed German wording.

## German review

Primary term: `Drehdurchführung`. Selection uses `Auswahl`; operating conditions use `Betriebsbedingungen`; sealing structures use `Dichtungsbauarten`; application review uses `technische Prüfung` or `Anwendungsprüfung` according to context. The three article-card titles were aligned to their existing German article pages.

Terminology references accessed 2026-08-16:

- Deublin Drehdurchführungen: https://www.deublin.com/de/produkte/drehdurchfuehrungen
- Deublin Luft: https://www.deublin.com/de/produkte/drehdurchfuehrungen/luft
- HAAG + ZEISSLER Drehdurchführungen: https://haag-zeissler.com/de/produkte/drehdurchfuehrungen/

## Japanese review

Primary term: `ロータリージョイント`. Selection uses `選定`; mounting uses `取付`; sealing structures use `シール構造`; application review uses `用途確認` or `技術検討` according to context. The concise Japanese headings avoid literal English word order and match industrial technical-page reading habits. The three article-card titles were aligned to their existing Japanese article pages.

Terminology references accessed 2026-08-16:

- CKD RJF: https://www.ckd.co.jp/kiki/jp/product/detail/424/RJF
- SMC MQR: https://ca01.smcworld.com/catalog/ja/fitting_tube/MQR/7-9-2-p0657-0666-MQR/data/7-9-2-p0657-0666-MQR.pdf

## Russian review

Primary term: `ротационное соединение`, consistent with the site's controlled Russian vocabulary. Selection uses `подбор`; rotational speed uses `частота вращения`; sealing structures use `конструкции уплотнений`; application review uses `инженерный анализ применения`. The three article-card titles were aligned to their existing Russian article pages.

Terminology references accessed 2026-08-16:

- Deublin Russian installation documentation: https://www.deublin.com/-/media/API-Sync-Assets/INS/040-501-GB-JP.pdf
- SMW-AUTOBLOK Russian-language product terminology: https://www.smwautoblok.com/kz/ru/

## Machine-readable localization

- Each localized page has its own localized title, description, H1, `lang`, canonical, and hreflang values.
- The `Blog` JSON-LD root now carries the localized URL, name, description, and `inLanguage` value.
- Each of the three nested `BlogPosting` objects carries the correct localized article URL, headline, description, and language instead of inheriting the Blog hub H1.
- The Blog and affected article records in all four search indexes, the three language-specific `llms.txt` files, and the four Blog entries in the root AI index were synchronized to the reviewed pages.
- The localization verifier now checks the Blog root and all three nested article mappings.

## Reviewed artifact hashes

```text
E83F258CE90528082E81F3AC0B4E0FA73E9A6FFA47B63D6C25AC1057F5E2348C  blog.html
1D7EA3BC358AAE44DC4D2B2EC1775CC218D5E0B89645053CE5F496E25E2AD72E  de/blog.html
C5418D632AA1340BFBFE7856D5CADCB8E0841274AC15D756EC85B7FFF89B4D82  ja/blog.html
177B462E3172171843BA61C424860AB7A866FBEF4819383F3B766DAF1606E311  ru/blog.html
12AF439C1E77CBE5CF4AA0515F043510FE9948BBBE9E45E44F9BA21081B52320  blog-rotary-joint-installation-mistakes.html
C12BB85A9073519708FE8C841B7E72A9B4E6E4B1A584EA977C5B589074F27077  de/blog-rotary-joint-installation-mistakes.html
06FF0D11308EE792C9A5BF698132ACA157D342A0D25B50750793FAB5EF4E2C96  ja/blog-rotary-joint-installation-mistakes.html
81C8F8CF22A4559E7B442E15BA72ED8C7A0BE69827701AABA351E7CB7364AF63  ru/blog-rotary-joint-installation-mistakes.html
C6C81DE0DBFD0E305DCAA3B4CA75F134B4EF818D13DFDA6004AE9B193F63E0CF  ja/blog-rotary-joint-selection.html
9208C51F32243F96E9E9D54EA992F138667914980E7C7AE43CF21DA1214F0310  llms.txt
03232178A3C96DB591746CDA82BC85003D11602E1B955B274D250C957D90D1B4  scripts/build-localized-site.mjs
E78901079DB668A039D6EA544CD66BE9BA907AEC5B045DB68780255F62310568  scripts/verify-localized-site.mjs
```

These hashes describe the reviewed source artifacts after localization and responsive browser QA. Any later change to the four pages or the Blog structured-data generation contract requires review of the affected scope and hash refresh.

## Local responsive QA

The four routes were checked on a local HTTP server. No form was submitted and no production endpoint was contacted.

- Viewport matrix: EN, DE, JA, and RU at `1440 x 900`, `1024 x 768`, `390 x 844`, and `320 x 800` (16 route/viewport combinations).
- Each route retained one `main`, one H1, four task paths, three published article cards, twenty in-main links, and one Blog JSON-LD block.
- Horizontal page overflow: `0` in all 16 combinations.
- Missing or failed Blog-page images after full page load: `0`.
- Fake newsletter forms, fake Load More controls, category-filter click handlers, and other inline `onclick` handlers: `0`.
- At `390 x 844`, the mobile menu opened and closed in all four languages and reported the correct `aria-expanded` state.
- Console errors observed during the four-language responsive run: `0`.
- Form POST requests: `0`.
- Follow-up checks at `390 x 844` confirmed that all four installation pages display `2026-06-12` in their localized format and match their `TechArticle.datePublished`; the Japanese selection page displays `2026年5月24日` and matches `2026-05-24` in structured data.
- The corrected German checklist phrase was present in the rendered page; follow-up horizontal overflow and console errors were `0`.

One existing shared-component issue remains outside this Blog localization scope: at `320` CSS pixels, the Russian global fixed CTA label `Запросить предложение` has a text width about `12` pixels greater than its button content box. The Blog document itself has no horizontal overflow, and the problem belongs to the global four-language floating CTA component; it should be corrected and regression-tested across all page families in a separate bounded task.
