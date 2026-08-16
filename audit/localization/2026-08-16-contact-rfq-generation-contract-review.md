# Contact RFQ Generation Contract Review — 2026-08-16

## Decision

PASS for the RFQ-G1/G1B Contact-owned generation contract.

The general localization builder can now reproduce the controlled DE, JA, and RU Contact regions in memory without comparing or overwriting the whole page. The inquiry contract verifier invokes this real generation path and rejects missing scopes, extra scopes, duplicate scopes, invalid hashes, schema drift, placeholder loss, unsafe JSON serialization, localized-copy fallback, or behavior-script divergence.

This review does not approve a general localization rebuild. An earlier repository-external build exposed pre-existing non-idempotent drift on 47 non-Contact pages in each of three target languages (141 pages total). Those 141 pages were not synchronized or modified during RFQ-G1 or RFQ-G1B.

## Ownership boundary

The Contact generation contract owns and verifies these six scopes for each target language:

1. section.bp-rfq-hero
2. main.bp-rfq-main
3. section.bp-rfq-details
4. form#quoteForm
5. script#contact-rfq-copy[type="application/json"]
6. the single executable inline script containing both const rfqCopyData and REQUEST_CODE_MAP

Header and Footer are managed by the separate navigation synchronization system. They are deliberately outside the RFQ comparison boundary. No selector ignore list, text folding, internal whitespace folding, or whole-page bypass is used.

The behavior-script selector rejects every script that has a src attribute, including src="". Only a genuinely inline, executable JavaScript or module script containing both RFQ runtime anchors can satisfy the scope.

For DOM scopes, both generated and current HTML are parsed by the same parser. Only CRLF/LF normalization and outer trim are applied before exact comparison. The RFQ JSON is parsed and deeply compared, while independently enforcing 38 non-empty string leaves, 7 requestLabels, 7 requestTemplates, 5 contextLabels, 6 requiredFields, the language separator, four required placeholders, and safe escaping for less-than, U+2028, and U+2029. The behavior script is compared exactly after EOL normalization and outer trim.

## Controlled-scope evidence

The read-only verify-contact mode returned result “Contact-owned regions verified”, targetLanguageCount 3, wroteFiles false, and exactly 18 unique comparison records.

| Language | Scope | SHA-256 |
|---|---|---|
| DE | section.bp-rfq-hero | EA9D405D700A14AC2B7483EAD3AEF9A1FC552F5FAA364644F2F82BF7D9E31104 |
| DE | main.bp-rfq-main | C7302E4259CDE645E4F48FCB64FA3CAC27378B22406CE0B6858380E4DE5BA741 |
| DE | section.bp-rfq-details | D5C24C5BF54D5049916C45191AF8F396D6997C2E91103D8AB0F376AA68C945A9 |
| DE | form#quoteForm | 9DDA0D2B799A7BE6E06E5784A961A8FA6EB9B958E1E3E3C0733BC14478784B3D |
| DE | RFQ JSON | ADBB8A14096D753E9CB7AE70F6BADBF52FE512C817A264ABA8A0B689FD712E31 |
| DE | RFQ behavior script | 23D75B7816B3B51358EE65AD8A9FC6B34D0D4B1498A8378385745F19CD96CDB6 |
| JA | section.bp-rfq-hero | 9DA12E028EC8DEBE227DD94E3FE626E106F430243B63B4862EEA6CBCAE63B339 |
| JA | main.bp-rfq-main | E4CC9B613F48312358F8803C22EF0B6F58726809FC15A5DCC46DD763A2DEDCAA |
| JA | section.bp-rfq-details | AEA279E74A203F5162009235F6D2095A0EF32294880BE90A783DECA4B99BBEDE |
| JA | form#quoteForm | 5DF4832AE7AEFAC258443CCCEBB2599D287407A028AB81F049501289AD2B5ADD |
| JA | RFQ JSON | 093A282F60A5D6654DA4597E26F99F832AD9E5D09B43F21FE3870360200E8A1E |
| JA | RFQ behavior script | 23D75B7816B3B51358EE65AD8A9FC6B34D0D4B1498A8378385745F19CD96CDB6 |
| RU | section.bp-rfq-hero | 4C8D63BEB29A60288CF3C2AAD9AA9D049182B2405FFE53A5BDC6E0F31962804E |
| RU | main.bp-rfq-main | E77C2465DA7B819C1D77A34AE5292803ED8C902A9BFE19D4F288996E5C23F6A6 |
| RU | section.bp-rfq-details | AF7CD328DF2ACA215081B36171A6D59F27E7C9E3960DD5CE9E12306324590434 |
| RU | form#quoteForm | B0C49B5117CC2A493DEB8545842741B9BF61C1D6E6192C83C039E7909411D9D5 |
| RU | RFQ JSON | 19BDC8584E2F71827E6692CE6FB6BE0284CBF0FF6B13F8D713349AB00B5919AE |
| RU | RFQ behavior script | 23D75B7816B3B51358EE65AD8A9FC6B34D0D4B1498A8378385745F19CD96CDB6 |

## Browser acceptance

A local server bound only to 127.0.0.1 was used. The in-app browser exercised EN, DE, JA, and RU at 1440 × 900 and 390 × 844. Each view covered three isolated scenarios:

- no query parameters with the localized custom required-field path;
- quote context with localized prefill and localized invalid-email feedback;
- application-review context with fetch absent and native HTML constraint fallback retained.

| Language | 1440 × 900 | 390 × 844 |
|---|---|---|
| EN | 3/3 PASS | 3/3 PASS |
| DE | 3/3 PASS | 3/3 PASS |
| JA | 3/3 PASS | 3/3 PASS |
| RU | 3/3 PASS | 3/3 PASS |

Browser total: 24/24 PASS.

The tests confirmed runtime use of localized request labels, request templates, required feedback, invalid-email feedback, context separators, quantity label and placeholder, upload label and action, native constraints, and FormData quantity preservation. The loaded DE, JA, and RU JSON also contained distinct localized sending and network-failure values; those two feedback branches were inspected as data and were not triggered. None of the values checked in the browser matrix fell back to English.

The no-fetch fixture loaded the real local HTML with script execution disabled, re-enabled execution, set fetch to undefined, and replayed only the page's actual RFQ inline runtime against the loaded DOM. It confirmed noValidate remained false, required and email constraints remained active, and application-review prefill still used the localized JSON. This was browser-only test instrumentation; no repository file was changed by it.

Across the 24 fixtures:

- browser-observed POST attempts: 0
- local-server POST requests: 0
- external HTTP requests: 0
- console errors: 0
- uncaught page exceptions: 0
- resource failures: 0
- HTTP error responses: 0
- horizontal-overflow cases: 0

All server-log entries were GET requests. No PHP, SMTP, production endpoint, or real inquiry submission was used.

## Verification commands

All commands completed with exit code 0:

- node --check scripts/build-localized-site.mjs
- node --check scripts/verify-inquiry-contract.mjs
- node scripts/build-localized-site.mjs --mode verify-contact
- npm run inquiry:verify — 1242 checks
- npm run i18n:verify — 220 localized pages
- npm run search:verify
- npm run discovery:verify
- node scripts/verify-public-claims.mjs --source-only — 247 files
- npm run quality:source
- git diff --check

The complete i18n:build was not rerun in RFQ-G1B. No quality:pr, PHP runtime matrix, deploy preparation, synchronization command, translation API, build deployment, or form POST was run.

## Frozen G1 evidence

The following 12 files remained byte-for-byte unchanged during RFQ-G1B:

| Path | SHA-256 |
|---|---|
| i18n/manual/contact-rfq-copy.json | 9C6C70388FA038725CFA7B70F988D022FE9BF2E24DECFF8F24EEEDF841DA8C3A |
| contact.html | 7BA4573170448DCF6B6BE0E116A606F3E16208DB1CC73C08F104AF25F7D23376 |
| de/contact.html | 5C7E89C6CB5F6BFE84C931472273528022DD99EA29FE0000205F42261F93B1D1 |
| ja/contact.html | 6E9CCFC7FD58997E51F35D74B6F54585B7A4DB59727F4D2DEC19F89B108FAA3E |
| ru/contact.html | 685A003F6531A72CED93E07DEBC0C029CE13E7B20B705C7B9DA8E94B7854A1A7 |
| i18n/source-catalog.json | 46608CA2E481FFC67131AECF85BE6227658EF2FDCC7ED2B0BF8EF4A500D3C683 |
| i18n/cache/de.json | 0A3089C727E9FB3E6C5030AAD2DE74EC3F92BBA72A4E1893EA07A91CBD99D62A |
| i18n/cache/ja.json | A34DB6F6FA08113C6751B9C6FDDADC637E3232134F5C266B13984028DA048258 |
| i18n/cache/ru.json | 949BE58AE0EF8DB68D0BFAD56A2D9B7D51AF1FE43A8AB810E87CFD9ED7125CA3 |
| i18n/editorial/de.json | 60DED8C52410E949F9DE6E7433287F1EE096D333A9B8E704A65A1C108D137320 |
| i18n/editorial/ja.json | 21FC81035D797D20E9CBC49DAB9819EB7DF62A6F543448EADC655B3F4889F89D |
| i18n/editorial/ru.json | 57CC637608E7EACBBCE7DC71A1819BBFDA24919270AB07F87C6E71E0BCB32491 |

## Repository protection

Preflight was main at 958efd4ab5129fde7296f9c27afa35f9cf9658a8, with origin/main at the same commit, 299 status paths, zero staged paths, zero conflicts, and zero catalog-project status paths. The original G1 outside-scope fingerprint was E7485668EEB7996C63E2709A71B512C452500445C4425B9886305F5046A59E34. The G1B five-file outside-scope fingerprint was E4CB7375BED2C187A4585E32A720AD61D7620D3C8F669484838C5AA923D5B3A5.

No files under catalog-project were read. No 141-page synchronization occurred. No file was staged, committed, pushed, deployed, or submitted to production.
