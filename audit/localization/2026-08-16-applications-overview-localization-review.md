# Applications Overview Localization Review

- Review date: 2026-08-16 (Asia/Tokyo)
- Route: `applications.html`
- Languages: German (`de`), Japanese (`ja`), Russian (`ru`)
- Review method: AI-assisted target-market line-by-line localization review
- Reviewer role: AI localization reviewer working from the approved English source and Begapunk evidence boundaries
- Independent native-speaker sign-off: not performed
- Unresolved localization issues: none in the reviewed Applications overview scope

## Scope and method

The redesigned English Applications overview was used as the factual source. The three localized pages were reviewed record by record for industrial terminology, natural B2B reading, buyer search vocabulary, calls to action, image alternative text, accessibility labels, links, model numbers, and evidence limits. The reviewed translations were stored as page-specific editorial overrides and the localized HTML was regenerated from the English structure; this was not an unreviewed whole-page machine translation.

Peer and manufacturer pages were used only to check local terminology and reading patterns. No competitor product parameter, certification, customer claim, performance claim, or commercial promise was imported into Begapunk content.

## Evidence boundaries preserved

- Laser tube cutting: the page identifies documented rear-chuck compressed-air application paths for `BP-3P-0004` and `BP-2P-08-0001`; the photograph is not presented as individual model identification. Process or assist gas remains a separate engineering project.
- CNC clamping: the customer-authorized project remains limited to `BP-2P-130-0001`, two independent compressed-air passages, and clamp/release functions in the documented fixture.
- Bottle capping: the documented installation remains limited to `BP-2P-16-0001`, two compressed-air passages, and the three-jaw gripper clamp/release function.
- Application photographs do not replace approved drawings or establish fit for another machine.
- Materials, cleaning conditions, applicable requirements, and supporting documents remain configuration-specific.

## German review

Primary term: `Drehdurchführung`. Application-review language uses `technische Anwendungsprüfung`; robot tooling uses `Roboter-Endeffektoren (EOAT)`; hose handling uses `Schlauchverdrehschutz`. `Garantie` is used in the resource summary to avoid implying a statutory `Gewährleistung` statement.

Terminology references accessed 2026-08-16:

- Deublin: https://www.deublin.com/de/produkte/drehdurchfuehrungen
- TRUMPF: https://www.trumpf.com/de_DE/produkte/maschinen-systeme/laser-rohrschneidmaschinen/trulaser-tube-5000/
- SCHUNK pneumatic chucks: https://schunk.com/de/de/werkstueckspanntechnik/stationaere-spannfutter/pneumatische-spannfutter/c/PUB_8560
- SCHUNK robot tool changers: https://schunk.com/de/de/automatisierungstechnik/werkzeugwechsler/cps/c/PGR_7385
- KUKA positioners: https://www.kuka.com/de-de/produkte-leistungen/robotersysteme/roboterperipherie/positionierer
- Krones filling and capping: https://www.krones.com/de/produkte/maschinen/dynafill-revolutionaere-fuell-und-verschliesstechnologie.php

## Japanese review

Primary term: `ロータリージョイント`. Internal independent passages are described as `流路`, while machine functional circuits use `空圧回路`. Robot tooling uses `ロボット先端治具（EOAT）`. The existing `後方チャック` wording is retained because the reviewed Japanese sources did not establish one alternative rear-chuck term as an industry-wide default.

Terminology references accessed 2026-08-16:

- CKD RJF: https://www.ckd.co.jp/kiki/jp/product/detail/424/RJF
- SMC MQR: https://www.smcworld.com/webcatalog/ja-jp/fittings-and-tubing/fittings-for-general-purposes/MQR
- Pascal rotary joints: https://www.pascaleng.co.jp/jp/products/work_clamp/rotary_joint/
- SMC robot vacuum handling: https://www.smcworld.com/products/subject/ja-jp/robot/handring/vacuum
- SMC collaborative-robot gripper unit: https://www.smcworld.com/products/pickup/ja-jp/vacuum_device/gripper-unit-for-collaborative-robots/
- AMADA pipe-processing terminology: https://www.sheetmetal.amada.co.jp/lineup/soft/vpss4ie/vpss4ie.html

## Russian review

Primary term: `ротационное соединение`. Independent passages use `канал`; rotational speed uses `частота вращения`; the RFQ path uses `инженерный анализ применения`. Customer authorization is expressed as permission to publish the project, not customer technical certification.

Terminology references accessed 2026-08-16:

- Begapunk controlled Russian FAQ: `i18n/manual/faq-ru.json`
- SMW-AUTOBLOK Russian documentation: https://www.smwautoblok.com/ru/wp-content/uploads/sites/7/2021/04/RU-2-22_RU.pdf
- SMC Russia: https://www.smc.eu/ru-ru/products/bystroraz-emnye-soedineniya~20947~nav
- BLM GROUP tube-laser terminology: https://www.blmgroup.com/ru/stanki-dlja-lazjernoj-rjezki-trub/ltx/tjehnichjeskije-haraktjeristiki
- Festo Russian vacuum-gripper documentation: https://ftp.festo.com/public/PNEUMATIC/SOFTWARE_SERVICE/Documentation/2020/RU/ESG_RU.PDF

## Reviewed artifact hashes

```text
EAD1C74EFD6FF67222FE4A2D0A31D5C0128CBE286B2D8EF84794527816F830EC  applications.html
6B5A16FC18D7ECD3D289191841FEDD18C6BA135DBE6D1948F89A8EA94A7E4FC9  de/applications.html
3F9AF8C505EA439915F8EC526194ED79BBEE1487CF03C11266A2403915904EB6  ja/applications.html
B3F2E1FA0DD2CB12008F89C0C355F25E15716F08D93C80C55C8C3BA15591233F  ru/applications.html
C1A19EE2C4EA6DFBC864664AE853533D38DD3840E5AC9103603021D698BEEC37  css/applications-overview.css
```

These hashes describe the source artifacts after localization and responsive browser QA. Any later content or CSS change requires hash refresh and review of the affected scope.

## Local responsive QA

The four localized routes and the English source were checked on a local HTTP server. No form was submitted and no production endpoint was contacted.

- Viewport matrix: EN, DE, JA, and RU at `1440 x 900`, `1024 x 768`, `390 x 844`, and `320 x 720`.
- Final horizontal page overflow: `0` in all checked language and viewport combinations.
- Broken images: `0`; each route retained three evidence cards, nine focused application guides, four resource links, and twelve unique application-detail routes.
- At `390 x 844`, the four mobile menus opened and closed with the expected `aria-expanded` state; each compact language control measured 60 CSS pixels wide.
- At `320 x 720`, the primary application-review buttons remained at least 52 CSS pixels high and wrapped instead of clipping.
- The in-page “Browse application guides” link placed its target at 88 CSS pixels from the viewport top, below the 65-pixel sticky header, in all four languages.
- The keyboard skip link received a visible 3-pixel focus outline.
- Console errors, failed same-origin page resources, and form POST requests observed during this route QA: `0`.

The route’s conservative raw local-file total, counting both alternatives referenced by each `picture` element, was approximately 754-767 KB across the four languages with 12 unique local static references. This is a source-level payload check, not a Lighthouse, Core Web Vitals, compressed-transfer, CDN, or production-server result.
