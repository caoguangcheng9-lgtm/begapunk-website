# FAQ Four-Language Localization Review — 2026-08-15

## Decision

- Source page: `faq.html`
- Localized pages: `de/faq.html`, `ja/faq.html`, `ru/faq.html`
- Scope: 27 visible questions and answers, six topic groups, eight contextual internal links, CTA copy, SEO metadata, FAQPage JSON-LD, localized search records, and localized `llms.txt` entries.
- Result: PASS for the approved English source and all three target-market localizations.
- Unresolved localization issues: 0.

## Review method and evidence boundary

Each language completed an `AI-assisted target-market line-by-line localization review`. This review checked every question and answer against the approved English fact source, then checked terminology, sentence structure, B2B tone, and search wording against official target-market manufacturer and industrial references.

There was no independent native-speaker review or signature. This work must not be described as native-speaker reviewed, human translated, professionally translated, or independently signed off.

The external references below were used only for terminology and target-market reading/search habits. No competitor specification, certification, performance claim, customer evidence, commercial promise, or product capability was adopted as a Begapunk fact.

## English source review

Before localization, the English master was reviewed for international industrial B2B usage and cross-page claim consistency. The final source preserves these boundaries:

- Product-page maximum values are not assumed to be simultaneously available; project limits come from the drawing approved by both parties.
- Published project experience is limited to compressed air, water, specified additive-containing water-soluble coolant, and hydraulic oil; this is not a claim that every model supports every medium.
- Dry running is conditional on Begapunk review, and oil-free or ESD-sensitive compressed-air applications require a separately reviewed configuration.
- Standard production leak testing is stated as 1.0 MPa compressed air, approximately one second of pressurization, and approximately four seconds of pressure hold while rotating.
- The standard test does not prove service life, maximum speed, every-medium compatibility, or project-specific high-pressure operation.
- Cross-port performance is described against the defined detection threshold under the stated test conditions; no absolute zero-leakage promise is made.
- Inspection records are retained for two years; shipment copies and project-specific formats or acceptance criteria must be agreed before order.
- The current standard warranty is one year from shipment, subject to the formal quotation, accepted order, and written warranty terms.
- MOQ and production timing are presented as one unit, approximately 20 days for standard products, and approximately 30 days for custom products, with the formal quotation or accepted order controlling the final commitment.

## German target-market review

Primary term: `Drehdurchführung`. The English regional names `rotary joint`, `rotary union`, and `swivel joint` remain visible in the terminology question rather than being forced into structurally different German product terms. `Partikelfilter`, `Wasserabscheider`, and `Druckluftöler/Nebelöler` are used for the owner-confirmed three-stage air treatment; a regulator was not added. Commercial wording uses `Garantie` and `Fertigungszeit` to avoid unintended legal or shipping meanings.

Official terminology references:

- https://www.deublin.com/de/produkte/drehdurchfuehrungen
- https://www.deublin.com/-/media/API-Sync-Assets/MAN/040-563-D-RevF.pdf
- https://schunk.com/de/de/automatisierungstechnik/drehdurchfuehrungen/ddf-2/ddf-2-125-p4-e10/p/000000000000323137
- https://www.festo.com/de/de/c/produkte/druckluftaufbereitung-id_pim31/
- https://www.festo.com/de/de/c/produkte/druckluftaufbereitung/druckluftoeler-id_pim147/

## Japanese target-market review

Primary term: `ロータリージョイント`, with `ロータリジョイント` retained as a recognized Japanese-market spelling in the terminology context. `流路` is used for the internal fluid path. The compressed-air assembly is written explicitly as `エアフィルタ`, `ウォータセパレータ`, and `ルブリケータ`; it is not mislabeled as a conventional FRL set containing a regulator. Test language uses `リークテスト`, `加圧`, `保持`, `PASS/NG`, and `検出しきい値`.

Official terminology references:

- https://www.ckd.co.jp/kiki/jp/product/detail/424/RJF
- https://www.ckd.co.jp/kiki/jp/file/20305
- https://www.nitta.co.jp/product/moore/faq/qdc/
- https://www.smcworld.com/webcatalog/ja-jp/air-preparation-equipment/
- https://www.smcworld.com/webcatalog/s3s/ja-jp/list/AC-A
- https://www.cosmo-k.co.jp/leak-test/principle/
- https://www.cosmo-k.co.jp/support/traceability/

## Russian target-market review

Primary term: `ротационное соединение`, with `вращающееся соединение` and `вращающаяся муфта` used only where the context is clear. The English regional names remain in the terminology question because a blanket translation to `вертлюг` or `шарнирное соединение` could imply a different structure. Air treatment uses `фильтр твёрдых частиц`, `влагоотделитель`, and `маслораспылитель`.

Official terminology references:

- https://deublin.com.ru/
- https://fluidhandling.kadant.com/ru/produktsiya/vrashchayushchiesya-golovki-i-soedineniya/standartnye-vrashchayushchiesya-golovki
- https://www.smwautoblok.com/kz/ru/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3%D0%B8/t%D0%BE%D0%BA%D0%B0%D1%80%D0%BD%D0%B0%D1%8F-%D0%BE%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0/%D0%B7%D0%B0%D0%BA%D1%80%D1%8B%D1%82%D1%8B%D0%B5-%D1%86%D0%B8%D0%BB%D0%B8%D0%BD%D0%B4%D1%80%D1%8B-%D0%BF%D0%BE%D0%BB%D1%8B%D0%B5-%D1%86%D0%B8%D0%BB%D0%B8%D0%BD%D0%B4%D1%80%D1%8B-%D0%B4%D0%B2%D1%83/
- https://ftp.festo.com/public/PNEUMATIC/SOFTWARE_SERVICE/Documentation/2020/RU/MS-CONFIG-COMBINATION_RU.PDF

## Controlled implementation

- Approved localization sources: `i18n/manual/faq-de.json`, `i18n/manual/faq-ja.json`, `i18n/manual/faq-ru.json`.
- Synchronizer and verification gate: `scripts/sync-localized-faq-content.mjs`.
- The FAQ is a manually localized controlled page and is excluded from the generic translation catalog.
- The dedicated gate synchronizes visible page copy, FAQPage JSON-LD, localized SEO, localized search records, localized AI-index entries, and the localized RFQ source paths.
- The gate also preserves critical limits for simultaneous maximum conditions, medium experience, conditional dry running, standard leak-test parameters, detection threshold, record retention, warranty, MOQ, and production-time references.

## Verification still required before release

The local four-language browser matrix was completed at 1440 × 900 and 390 × 844:

- 8/8 page-and-viewport combinations contained 27 questions, six sections, eight contextual links, one main landmark, and no duplicate IDs.
- FAQPage JSON-LD matched all 27 visible questions and answers in all four languages.
- Horizontal overflow: 0 in all eight combinations.
- Console errors: 0.
- Mobile navigation opened and closed correctly in all four languages.
- The long repair/warranty answer expanded without clipping in all four languages; computed `max-height` was unrestricted and overflow remained visible.
- With JavaScript disabled, all 27 answers remained visible in all four languages, all FAQ buttons stayed in their non-interactive expanded fallback state, and horizontal overflow remained 0.
- No form was submitted and no POST request was made.

This editorial/localization and browser PASS does not by itself authorize a commit, merge, push, production release, deployment, or real inquiry submission. The complete repository quality chain must still pass on the final candidate.
