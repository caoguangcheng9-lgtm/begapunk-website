# PTFE-coated O-ring article — multilingual review

Date: 2026-09-15
Scope: approved English article plus DE, FR, JA and RU; local website content only.

## Editorial review

AI-assisted target-language review of every translated article text segment, image description, navigation label, metadata field and article-specific blog card was completed against the user-approved English master. This is not independent human or native-speaker certification.

| Locale | Terminology and meaning checked |
| --- | --- |
| DE | Drehdurchführung, O-Ring, Gleitring-Verbunddichtung; coating remains optional and application-selected. |
| FR | raccord tournant, joint torique, joint composite à bague de glissement; no claim that all models include the coating. |
| JA | ロータリージョイント, Oリング, 複合スリッパーシール; working fluid and operating-condition selection inputs retained. |
| RU | вращающееся соединение, кольцо O-ring, комбинированное уплотнение с кольцом скольжения; optional scope and supplier attribution retained. |

All four versions preserve the O-ring preload/support function, surface-treatment purpose, optional/nonstandard configuration, supplier report attribution and application review inputs. No FKM-only restriction, universal compatibility, lifetime, wear-test result or certification was added. PTFE material resistance is not rewritten as a tested assembly guarantee.

Sample marking 25 × 2, sample range 5–15 µm and measurements 10.02 / 7.99 / 7.96 µm remain unchanged in meaning. German, French and Russian tables use decimal commas. Original supplier report image is shared unchanged; descriptive text/table is localized. The report is not relabelled as Begapunk testing.

## Integration

- Four localized article files use existing local blog header/footer and article-scoped CSS.
- Five-way language switch now resolves to the same article; reciprocal hreflang and self-canonical links are present.
- Four localized blog cards, Blog JSON-LD records, search records and llms.txt links added.
- New English blog-card strings have explicit four-language translation overrides; source catalog refreshed.
- Article registered as manually localized in i18n/config.json. Shared images and stylesheet registered in public asset inventory.
- International sitemap and content-hash-backed lastmod state synchronized after content changes.
- Existing unrelated translations and pages were not regenerated. Source extraction automatically removed one obsolete French cache entry; no live page was removed.

## Checks

- Article-specific automated tests cover metadata, source facts, images, links/fragments, localized inquiry routing, blog cards, search, language switch, sitemap and asset declarations.
- Search-index verification passed for five languages; copy regression verification passed for 228 targeted page checks.
- International sitemap verification passed for 270 hash-backed entries.
- Browser: DE/FR/JA/RU checked at 390 × 844 and 1440 × 1000; no observed title clipping or page horizontal overflow. Longer titles wrap/hyphenate.
- Actual language-selector transitions reached the expected local articles.
- Actual inquiry CTA clicks reached each corresponding language contact page with the existing quoteForm and locale-specific source parameter. No inquiry submitted.
- Actual return-to-blog and article-title clicks passed in all four locales; each blog contains five cards.
- Japanese process anchor and all three process image loads verified in browser.

## Release boundary

No commit, push, deployment, server operation or real form submission performed. Production bundle was not rebuilt. The default release-inventory check inspected the pre-existing dist/production bundle and reported the five new article files absent there; this is expected for the old bundle, not a claim of production readiness. A deployment stage must build and validate the new bundle.

The earlier English-preview report's deferred localization and discovery work is superseded by this report. No full-site release readiness is claimed.
