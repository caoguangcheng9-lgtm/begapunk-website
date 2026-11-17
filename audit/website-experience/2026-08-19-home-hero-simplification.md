# Homepage hero simplification — local acceptance record

Date: 2026-08-19
Status: Local implementation and automated verification complete; not deployed

## Approved scope

- Simplify the four-language homepage hero.
- Keep one short badge, the existing localized H1, one concise qualified description, and two CTA buttons.
- Keep the product-family image with three technical tags.
- Move the four application links into a separate equal-width application section directly below the hero.
- Preserve catalog-project/.

## Deliberately removed from the hero

- Six proof-point statistics.
- The separate CAD paragraph.
- The CAD tag over the product image.
- Application cards embedded inside the product-image panel.

The CAD statement was retained inside the main paragraph without broadening availability: STEP/IGES files remain conditional on model and application review, and format and timing remain project-specific.

## Responsive contract

- Desktop: four equal application cards.
- Tablet: two columns.
- Small mobile: one column.
- Decorative inline SVG icons are hidden from assistive technology.
- The existing laser rear-chuck scoped-entry marker and all four destination links remain intact.

## Homepage navigation cleanup

After local review, the full-width catalog-style search bar was removed from all four homepages. With 16 standard models, it duplicated the hero “View Models” action and the application paths while adding disproportionate visual weight.

One small localized model-comparison link remains beside the “New Products” heading. `search.html` remains a valid utility route for direct or bookmarked access, but it is no longer promoted on the homepage.

## Localization boundary

English, German, Japanese, and Russian pages were updated together. Editorial mappings were added so a future localization generation does not restore the retired hero. The Russian mounting label was corrected to “Резьба / фланец”.

The media tag uses “Air / hydraulic oil” rather than the broader “Air / hydraulic”. This states the supported medium category without implying that every model is suitable for general high-pressure hydraulic service; model-specific medium, viscosity, pressure, temperature, and duty limits still require confirmation.

Localization is AI-assisted and technically verified. It is not native-speaker or human editorial sign-off.

## Verification

- Homepage contract: PASS across 4 languages.
- Localized-site verification: PASS across 224 pages.
- Search indexes: PASS across 4 languages.
- Full quality:pr: PASS.
- Local release build: 225 HTML files, 689 total files, 272 HTTP targets.
- Public claims, inquiry contract, product data, images, responsive CSS contract, discovery exclusions, and deployment package validation: PASS.
- Browser screenshot review: NOT RUN because the in-app browser bridge was unavailable. This remains a manual pre-deployment visual gate at desktop, tablet, 390 px, and 320 px.

## Authority boundary

No commit, push, deployment, production form submission, server change, or external message was performed.
