# Pre-i18n Baseline Validation - 2026-07-17

## Scope

- Preserved the existing full-site performance changes: self-hosted fonts, cache-busted shared CSS, and deferred analytics loading.
- Preserved the existing case-studies layout repair and its page-specific stylesheet.
- Added the self-hosted `fonts/` directory to the minified release build so production packages do not omit required font assets.
- Did not modify or stage `catalog-project/`.
- Did not deploy any files to the production server.

## Validation

- `git diff --check`: passed.
- Clean minified release build: passed.
- Minified release verification: passed.
- Verified 51 HTML files, 57 JSON-LD blocks, 3,610 local references, 3 CSS files, and 2 JavaScript files.
- Verified that the release package includes the Inter and Playfair Display WOFF2 files referenced by `css/style.css`.

## Validation Artifact

- Local release directory: `E:\begapunk-site-releases\pre-i18n-validation-20260717-v2`
- This directory is a local validation artifact only and is not a production deployment package.
