# Begapunk Multilingual Pilot

This directory defines the first multilingual SEO pilot for the Begapunk static website.

## Scope

- Languages: German, Spanish, Italian, Japanese, and Polish.
- Pages: the 12 high-value pages listed in `config.json`.
- Output: real static HTML files under `/de/`, `/es/`, `/it/`, `/ja/`, and `/pl/`.
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
