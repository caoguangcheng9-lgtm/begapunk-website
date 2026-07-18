# Multilingual llms.txt deployment - 2026-07-18

## Scope

- Updated the single root `/llms.txt` AI-readable index for English, German, Japanese, and Russian.
- Added language-entry links, the complete multilingual sitemap, and compact German, Japanese, and Russian sections covering catalogs, comparison, applications, technical support, company information, RFQ pages, and representative product models.
- Preserved the existing detailed English product, application, engineering, and company index.

## Validation

- Source commit: `2edc837` (`Add multilingual llms site index`).
- Unique published links in `llms.txt`: 92.
- Missing local targets: 0.
- Format checks: one H1, nine H2 link sections, valid Markdown link-list structure.
- Published file SHA-256: `32155ED08F785B8E7536FA26EE617C286C8BC48ADA52E4F1F6F55B3D4E4994D4`.
- Public `/llms.txt`: HTTP 200, `text/plain`, gzip enabled, and an exact hash match with the committed source.
- English, German, Japanese, Russian homepages; localized catalog pages; and `sitemap-i18n.xml` returned HTTP 200 during public verification.

## Deployment

- Deployed file: `/www/wwwroot/47.252.73.192/llms.txt`.
- Rollback backup: `/www/backups/begapunk-llms-pre-multilingual-20260718-2edc837.txt`.
- Nginx configuration validation passed.
- No HTML, PHP, `.env`, mail runtime, or other production file was changed.
