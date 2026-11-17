# Multilingual Pilot Infrastructure - 2026-07-17

## Outcome

The Begapunk static website now has a local, repeatable multilingual generation pipeline for a five-language, 12-page SEO pilot. No localized production pages were generated with placeholder translations, and no files were deployed to the server.

## Pilot Scope

- Languages: German (`de`), Spanish (`es`), Italian (`it`), Japanese (`ja`), and Polish (`pl`).
- English source pages: 12 high-value product, application, installation, and RFQ pages.
- Planned localized pages: 60.
- Planned hreflang URL set, including the 12 English equivalents: 72.
- Extracted translation segments: 1,336.
- Source characters per language: 141,159.
- Total source characters for five target languages: 705,795.

## Implemented

- Google Cloud Translation Basic v2 integration using `GOOGLE_CLOUD_TRANSLATION_API_KEY` from the process environment only.
- Translation caching without credential persistence.
- Protected product, material, certification, CAD, and engineering terms.
- Preferred industrial terminology per target language.
- Static localized URLs under `/de/`, `/es/`, `/it/`, `/ja/`, and `/pl/`.
- Self-referencing localized canonical URLs.
- Reciprocal language and `x-default` hreflang annotations.
- User-controlled language selector without IP-based redirects.
- Localized relative-link and shared-asset rewriting.
- Localized Open Graph locale and URL updates.
- JSON-LD URL and `inLanguage` updates.
- Automatic `source_language` inquiry field and GA4 `content_language` event parameter.
- International sitemap generation and robots.txt sitemap registration.
- Minified release build support for localized language directories.

## Validation

- Offline identity-translation pipeline build: passed.
- Generated and verified 60 localized test pages plus 12 integrated English test pages.
- Verified 72 page-language combinations for canonical, reciprocal hreflang, x-default, language switcher, form language source, JSON-LD, doctype count, and local references.
- Existing source-site minified release build: passed.
- Existing release verification: passed for 51 HTML files, 57 JSON-LD blocks, 3,610 local references, 3 CSS files, and 2 JavaScript files.
- JavaScript syntax checks: passed.
- `git diff --check`: passed.
- PHP lint was not available locally; `send_inquiry.php` must be checked with `php -l` before any deployment.

## External Requirement

Actual translation is intentionally blocked until a Google Cloud project has the Cloud Translation API enabled and its API key is supplied through the local process environment. The key must never be committed, pasted into a repository file, or included in a release package.

## Deployment Gate

Before production deployment:

1. Generate real translations through the configured API.
2. Review technical terminology, specifications, units, product codes, and claims in every language.
3. Run localized verification and a full minified release build.
4. Run `php -l send_inquiry.php` on the server or another trusted PHP runtime.
5. Validate the inquiry form and GA4 language parameter without sending duplicate leads.
6. Create a production backup and deploy through the standard rollback-safe release process.
