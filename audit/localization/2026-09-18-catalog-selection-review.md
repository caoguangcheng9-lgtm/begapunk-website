# Catalog selection entry review — 2026-09-18

Scope: products.html in EN, DE, FR, JA and RU. Local main source E:/begapunk-site-v2 only.
Review method: AI-assisted review of the new selection section, its links and page-scoped styles against the English text and existing verified product facts. This is not a native-speaker review or a new full-site release approval.

## Purpose and content decisions

The catalog now offers three ways to begin selection: multi-passage, through-bore and pneumatic-electric. These lead to the existing comparison table and appropriate model pages. Machine links lead to laser tube cutting, CNC pneumatic clamping and bottle capping guides in the same language. No new landing pages or speculative performance claims were created.

The 30 mm bore and two air passages are restricted to BP-2P-30-0001 and checked against data/product-drawing-facts.json. The pneumatic-electric entry requests both sets of requirements without inventing electrical ratings, supported protocols or circuit allocation.

DE uses Mehrwege-Drehdurchführungen and Durchgangsbohrung; FR uses raccords tournants multicanaux and alésage traversant; JA uses 多流路 / 中空型 / 空圧・電気複合; RU uses многоканальные / со сквозным отверстием / пневмоэлектрические вращающиеся соединения. Reviewed all 14 new strings per locale, including the same-language link destinations. Existing page metadata, specifications and product cards were preserved.

Terminology/context sources accessed 2026-09-18 (terminology only; competitor specifications were not transferred):
- https://rotarysystems.com/rotary-unionsmultiple-passage/
- https://www.deublin.eu/tl_files/pdf/catalog/multipassage_union/D.pdf
- https://www.deublin.com/fr/produits/unions-rotatives/multimedia
- https://www.smcworld.com/assets/manual/ja-jp/files/MQR-OML0001.pdf
- https://www.precise-rotation.ru/Deublin/obshhij_obzor-rotacionnye_soedinenija_deublin-rus.pdf
- https://www.moog.com/products/fluid-rotary-union/
SEO approach: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## Validation

- Current working-copy baseline captured before editing, independently of Git HEAD.
- Removing only the added selection section and its scoped style reproduces the exact pre-edit source for all five pages.
- Five self-canonical URLs and six hreflang entries each retained; 30 new local links resolve to existing files.
- Browser checked all five languages at 390 × 844 and 1440 × 1000: three stacked mobile cards / three desktop columns, no document or card horizontal overflow. Representative desktop and all mobile locale screenshots inspected. Temporary viewport reset.
- Original two-passage filter still shows eight two-passage models.
- Actual clicks reached the comparison table, Russian BP-2P-30-0001 and English BP-3P-S06-0001. One transient browser click timeout was retried after checking current state and then succeeded.
- Source quality passed; source catalog is current (1,737 strings / 47 managed pages); five search indexes current; 228 copy regression checks passed; 270 sitemap content-hash entries verified.
- Four locales have complete effective translation coverage after adding HTML-wrapped application-link translations; i18n:verify still reports only the pre-existing 56/57 ownership-baseline mismatch.
- sitemap.xml products.html lastmod updated to 2026-09-18; international sitemap and hashes updated only for changed content.

## Release limitation and diagnosis

This work has NOT been deployed, committed or pushed. No emails/forms submitted.

The mismatch is broader than a page count. The local HEAD remains 3f215df, while the existing remote-tracking reference is 17 commits ahead at 75f86dc. This comparison uses already-known Git refs; it is not a claim that a fresh remote fetch or production-version verification was performed. The tracked upstream already has a 57-page reviewed scope. The main folder still carries a 56-page historical snapshot, and later footer changes affect the governed projections of all 228 localized pages. The existing September 16 footer report records the bounded footer work separately.

Therefore merely replacing 56 with 57 or silently signing all current pages would be incorrect. The existing release verifier also flags trusted-baseline transitions and old release-approval/debt records. Full release readiness remains unestablished. Protected records and unrelated working changes were preserved. Version reconciliation and review-evidence consolidation are the prerequisite to publishing the combined main folder; this selection-section review does not certify unrelated changes.

## Exact scoped file fingerprints

- products.html
  - before SHA-256: 63f872fb196aa5c976bc026580b1146508e82401080de83d39a010ca82de793f
  - after SHA-256: ae105cbb8daed8955214f53a0bdc2b57f148f85ab11e1d268bec7159a3761bc4
- de/products.html
  - before SHA-256: b8b13c0e70fcb52e230fd0218100ca6f63196e927ab8914c38ba7bdf8c5e1738
  - after SHA-256: 8336790feb7f0dbbaf8558a7a28b79c55b1514434c34be1d87c80c53735c5bea
- fr/products.html
  - before SHA-256: 596001afa10222e59ae808854835e2906e42a768f6a5980ba8a2a2419a53177d
  - after SHA-256: a19158fc4b360995dbc01ec25c4521fcc9ac379dbb248c3adc8091b343afb1c3
- ja/products.html
  - before SHA-256: d78cf62244e8d0bf5b570bccdf89ed4d4b6a3b5e6ac98f9fc03e319f1cadef7c
  - after SHA-256: 950751e981bb8a211afb11b0f90daf795ddf75147b018c5ac8c743d43a056107
- ru/products.html
  - before SHA-256: d4651973296e22188611d07d5b7d6693296cd0dea604a67a4ec8ba354946908a
  - after SHA-256: 1dfe0dff1d48fbf784cd98efb9dadd813a10c03ab4b8c11dc693d97d39cee3e1
