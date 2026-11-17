# RFQ quantity and form-simplification review — 2026-08-16

## Scope and decision

- Workspace: `E:\begapunk-site-v2`
- Branch and baseline: `main` at `958efd4ab5129fde7296f9c27afa35f9cf9658a8`
- Review scope: the four Contact pages, inquiry PHP endpoint, three inquiry/claims validators, four search indexes, `PROJECT_HANDOFF.md`, and this record only.
- Decision: the optional quantity field and reduced form guidance are acceptable for the four target markets within the local evidence described below.
- No commit, push, deployment, production request, mailbox access, or real inquiry submission was performed.

## Localized copy reviewed

| Language | Quantity label | Placeholder | Upload label | Upload action |
|---|---|---|---|---|
| EN | Estimated Quantity (Optional) | e.g. 1 prototype, 10 units, or 100 units/year | Drawing or Photo (Optional) | Choose a file |
| DE | Voraussichtliche Menge (optional) | z. B. 1 Muster, 10 Stück oder 100 Stück/Jahr | Zeichnung oder Foto (optional) | Datei auswählen |
| JA | 予定数量（任意） | 例：試作1個、10個、年間100個 | 図面または写真（任意） | ファイルを選択 |
| RU | Ориентировочное количество (необязательно) | Например: 1 образец, 10 шт. или 100 шт./год | Чертёж или фото (необязательно) | Выбрать файл |

The German, Japanese, and Russian quotation-context templates were shortened so they ask for the information needed to prepare a quotation and assess availability without requesting quantity a second time. The English template was already concise and was retained.

## Contract review

- `quantity` is optional commercial information, implemented as `type="text"`, limited to 100 characters, and positioned after application and before the drawing input.
- It is not in the required-field set, is not URL-prefilled, and is not included in the inquiry-success analytics event.
- Native POST and enhanced AJAX both carry it through the form's existing `FormData` contract.
- PHP reads it after product and before application. Empty values are omitted by the shared mail-row loop; non-empty values use the existing `escape_html($value)` path.
- A 101-character ASCII quantity is rejected as `422 field_too_long` before PHPMailer or SMTP.
- The two repeated instruction areas were removed to reduce form cognitive load. The RFQ heading, native constraints, attachment formats, 10 MB limit, filename feedback, `aria-describedby`, file validation, honeypot, Origin checks, rate limiting, and attachment security order were retained.

## Automated evidence

| Check | Result |
|---|---|
| Three Node syntax checks | PASS, exit 0 |
| `npm run inquiry:verify` | PASS, 810 checks, exit 0 |
| PHP 8.2.33 isolated matrix | PASS, 9/9, SMTP connections 0, loopback targets 9/9 |
| PHP 8.3.33 isolated matrix | PASS, 9/9, SMTP connections 0, loopback targets 9/9 |
| Public Claims self-test | PASS, exit 0 |
| Public Claims source-only scan | PASS across 247 files, exit 0 |
| `npm run search:verify` | PASS, exit 0 |
| `npm run discovery:verify` | PASS, exit 0 |
| `npm run i18n:verify` | PASS for 220 pages, exit 0 |
| `npm run quality:source` | PASS, exit 0 |
| `git diff --check` | PASS, exit 0; existing checkout EOL warnings only |

The Claims exception is restricted to an exact quoted `..` literal on the right side of a comparison operator inside an executable inline script in an HTML file. The dedicated tests continue to block visible copy, metadata, JSON-LD, ordinary JavaScript strings, strings/comments containing comparison-like text, regular expressions, and external-script cases.

## Search-index evidence

The pre-sync check reported the four language search-index files as stale; a record-level comparison localized each delta to that index's single Contact record. The authorized `npm run search:sync` was run once and updated the four indexes. Each index still contains 43 records in the same order; the sole structural change in each language is the `body` value of its one Contact record. No other record or field changed.

## Browser evidence and limits

- Four languages at 1440 px, 390 px, and 320 px: 12/12 views passed with no document-level horizontal overflow.
- The quantity control and label remained inside the viewport, the optional label was not clipped, and the complete approved placeholder remained present as the input attribute. A single-line input cannot display a long placeholder as wrapped text at 320 px; this review does not claim otherwise.
- The duplicate paragraph and blue help block were absent in all 12 views. Upload wording, allowed formats, 10 MB limit, and `aria-describedby="drawing-help drawing-name"` were present.
- Four non-empty quantities, including non-ASCII and ampersand values, survived exactly in intercepted multipart `FormData`; one empty-quantity submission reached the same enhanced path without frontend blocking.
- Browser-level response interception returned local synthetic JSON before network transmission. The local static server recorded zero POST requests. External requests, console errors, failed resources, and HTTP error responses were all zero.
- With JavaScript disabled, all four pages retained `/send_inquiry.php`, `POST`, `multipart/form-data`, native validation, and the optional `quantity` control. No submission was triggered.
- The in-app browser cannot automate the operating-system file chooser. Focus and filename feedback were therefore exercised with an in-memory PNG `File` dispatched through the real `change` handler in each language; all four returned the selected filename. No file was written or transmitted. Manual OS-dialog confirmation remains outside this automated evidence.

## Localization-review method and residual risk

This was an AI-assisted, line-by-line four-language target-market review. It is not an independent native-speaker or human editorial sign-off. The quantity field is optional commercial information, and removing two duplicate prompts is intended to reduce cognitive load without weakening the technical-information request.

The generic Contact localization generator can still fall back to English for interactive RFQ feedback. That consistency issue remains a release-time risk. No translation API, `i18n:extract`, `i18n:build`, source-catalog update, cache rebuild, editorial-state change, SEO update, or general localization generation was run in this task.

## File hashes

| Path | Before SHA-256 | After SHA-256 |
|---|---|---|
| `contact.html` | `8C0526294054A3DF87A6359BAEFA661411483BC3B46F9941877FDC56FE12FF6E` | `50AD73ED76C434F9D836F9D001D2D39FADB798D6B25A97D4FF9AA6D284232F7C` |
| `de/contact.html` | `EDBFDC5ACD0053C43079A3C41F1063B6806FB6A420A475ADCF2698A8B399984C` | `58B67C1030B8433BBB4EE92058CD3AC4756FB4D6D64714CF23D6720891E8197D` |
| `ja/contact.html` | `2253D8991A934E05E4B18E6D41F722E575C9989F3791CE8757625ACB7A339705` | `A9F44A8F461F1711090F3D07343EC295E4EF98B7686B6B289CBC60BCA11FA683` |
| `ru/contact.html` | `7AF8B7C6A897B662157534581AB2059C3A8FBDD6D6941AC3DE023D79D9D94C4E` | `72BA6BE87B1D0938CF831D96CD21062243FA98733866BDFDD470BDBFF1B4CAF3` |
| `send_inquiry.php` | `B9A825FFAD0484647A0406FE65D15965509380C04EC35B6793204C8FDC283DE6` | `4A1418055957704AE301918887FA714F379F06913EBF2809AEDDC0BE84662000` |
| `scripts/verify-inquiry-contract.mjs` | `506815B0808C3E4157A7036B72EB2BC8E93DC5404C8626F5A9EC371E5EDAA799` | `09F6E95372FE29A199281474FCFB964F1C752614B8D9CBD9BDB12835528F95A1` |
| `scripts/verify-inquiry-php-runtime.mjs` | `42A66021532D2A21E7AE729E2E01BA2C92B9B718FDAB9F039B3080364AD1572B` | `F17325244E1B39CFEC4BBC65901840FB231A4B1124B0259C7B86CED8021239C7` |
| `scripts/verify-public-claims.mjs` | `B818A36A85F077FCD26C4D130F0E9C6F16F7FBFEB1F5B9623E830A132C557476` | `82635508C6C30A5A50CAFF42CAB24EC003E62AE8520C67BCDCE40DD049D3A4C6` |
| `PROJECT_HANDOFF.md` | `922EBC0E93ADD25B5FDEEA3A3337D1B749F2AE91FA23EE6E87DD5C54D4637A2C` | `3120BE6FE4CA7694699ED328BD0D735B0FB2B2BA7CAE81FD34712B556554A6FC` |
| `search-index.json` | `163E3B11F837852324A5D94CEA14BA1EEF83C53564FF563C6859A83F48056BF2` | `A69B78317D32AF8CEE5D4B07942F2B4F64F31F17CF033A4DA557810B96E59E18` |
| `de/search-index.json` | `F9CC3E049E3567BE106D01ADA5F99CF05E43F9B555650DCBFB7FB85BE13B75A2` | `6732DC90C022EECAA9BF54911558760620ACDA3F00EB61FD1E122B8B15D2BB4D` |
| `ja/search-index.json` | `549B0D323DCBCF218136D46BE103009BBA5204C388A2B8919BC81FA599A1DB81` | `942ED3FBAD7FE36357C6090CEF9E103176D231FF3355752DB177BBAC550B82B1` |
| `ru/search-index.json` | `90256FBAE4E2846B2D042A52011D0111729B19D8F980D0CEB731369F18E10A61` | `B6E6B25C47FDDFC9D7B2F625A11DCC4BCBBF045BB6960BBDCA1D14339B65698A` |
| `audit/localization/2026-08-16-rfq-quantity-form-simplification-review.md` | absent | recorded in the final task report to avoid a circular self-hash |
