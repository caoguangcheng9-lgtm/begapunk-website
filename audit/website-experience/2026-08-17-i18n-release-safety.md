# Localized release safety closure

Date: 2026-08-17 (Asia/Tokyo)
Scope: localization generator ownership and release-time source safety
Result: PASS for the local read-only release gate; no localized page was synchronized

## Problem addressed

A repository-external diagnostic build had shown pre-existing whole-page drift in 47 translation-managed pages for each of DE, JA, and RU (141 non-Contact pages). The drift belongs to the older generic builder/shared-navigation ownership boundary and must not be repaired by overwriting the currently reviewed localized HTML.

## Implemented controls

- `build`, `refresh-metadata`, and `integrate` refuse any output root inside the source repository. The guard uses canonical real paths and the nearest existing ancestor so path aliases, junctions, Windows short paths, and names merely beginning with `..` cannot bypass it.
- `verify-metadata` renders the expected managed metadata in memory and compares 144 localized pages without writing files.
- The same read-only gate renders and strictly compares the three localized Search Index files and three localized `llms.txt` files.
- Search ownership is explicit: root Search Index owns identity/category/tag fields; localized HTML owns title, description, headings, and body; the three approved localized-keyword routes retain their reviewed locale-specific values.
- Product-detail skip links marked with the exact UI-only selector are excluded consistently from Search body generation.
- JSON-LD parse failures are separated from transformation failures; strict verification does not swallow transformation errors.
- `deploy:prepare` uses the read-only metadata gate rather than a source-mutating metadata refresh. It still rebuilds `dist/production`, so it is source-tree non-mutating rather than globally write-free.

## Evidence

`npm run i18n:metadata:verify` returned:

- 144 localized pages checked;
- three Search Index files checked;
- three `llms.txt` files checked;
- `wroteFiles: false`.

The default source-tree invocations of `i18n:build`, `i18n:refresh-metadata`, and `i18n:integrate` each stopped before writing with the required external-output message. The 144 managed HTML pages plus six localized discovery files retained the same aggregate SHA-256 before and after the refusal tests:

`9F679822696DE58FB82DCEF19D764D8EB81B968255FD12DDA2CF6200CB62DE5F`

Search, discovery, i18n, and the complete local release chain are rerun in the final release evidence.

## Boundary

This closes accidental source overwrite and release verification gaps. It does not make the generic whole-page builder idempotent, and it does not authorize synchronizing the 141 known-drift pages. Shared Header/Footer ownership remains a separate maintenance task. No commit, push, PR, deployment, translation API, or production access occurred.
