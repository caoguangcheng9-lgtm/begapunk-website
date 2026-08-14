# Begapunk Multilingual Site

This directory contains the translation, editorial review, SEO, and generation sources for the Begapunk static website.

## Scope

- Active languages: German, Japanese, and Russian (`activeLanguageCodes` in `config.json`).
- Pages: all 55 public pages listed in `config.json`.
- Output: real static HTML files under `/de/`, `/ja/`, and `/ru/`.
- Production deployment is intentionally separate from translation generation.

## Credentials

The translation builder reads the Google Cloud Translation Basic API key only from the process environment:

```text
GOOGLE_CLOUD_TRANSLATION_API_KEY
```

Never add an API key to this repository, a JSON file, a command-line argument, a report, or a deployment package.

## Commands

Extract the unique English strings without calling an external service:

```text
npm run i18n:extract
```

Translate the extracted catalog through Google Cloud Translation Basic:

```text
npm run i18n:translate
```

Build the localized HTML pages after all translations are present:

```text
npm run i18n:build
```

Refresh curated SEO, the localized search indexes, AI indexes, and JSON-LD without rebuilding translated body copy:

```text
npm run i18n:refresh-metadata
```

Use the refresh command after editing `i18n/seo/*.json` or the structured-data localization rules. It is safe when current English copy has changed but the translation catalog has not yet been re-extracted and reviewed.

Production deployment uses this refresh-and-verify path so that a release cannot silently replace human-reviewed localized body copy. Run `i18n:build` explicitly only after the English catalog and all active-language translations have been updated and reviewed.

Verify the generated localized pages:

```text
npm run i18n:verify
```

The builder never writes the API key to disk. Translation caches contain only source and translated text.

## Publishing Gate

Localized pages must not be deployed until:

1. Technical terms, product codes, units, pressures, speeds, and media are reviewed.
2. Every page has a self-referencing canonical and reciprocal `hreflang` links.
3. Local links, images, downloads, analytics, and the inquiry form pass verification.
4. The translated content is reviewed for usefulness and not merely page-count expansion.
