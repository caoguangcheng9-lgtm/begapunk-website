# Multilingual Localization Cleanup Deployment

Date: 2026-07-18 (Asia/Tokyo)

## Scope

- Source commit: `aa5d9e5` (`Prevent localized symbol corruption and clean sitemap`)
- Branch: `feature/multilingual-pilot`
- Production root: `/www/wwwroot/47.252.73.192`
- Deployed files: 59
- Deployed paths: changed production files under `de/`, `ja/`, and `sitemap-i18n.xml`
- Production-only files such as `.env`, `.well-known/`, and `PHPMailer/` were not included or modified.

## Release and rollback

- Local release directory: `E:\begapunk-site-releases\localization-cleanup-20260718-093925-aa5d9e5`
- Release archive: `begapunk-localization-cleanup-aa5d9e5.tar.gz`
- Archive SHA-256: `6e8fde1fcd86789cc0aab252463aa50e28dfa7725d0dda9e3b54efbb30cae10b`
- Server staging directory: `/www/releases/localization-cleanup-20260718-093925-aa5d9e5`
- Pre-deployment backup: `/www/backups/begapunk-localization-pre-cleanup-20260718-084150.tar.gz`
- Backup integrity: passed `gzip -t`

## Deployment verification

- Release archive hash matched before extraction.
- Staging validation confirmed 59 expected production files.
- All 59 deployed files matched the staging SHA-256 manifest.
- Nginx configuration test passed.
- Public HTTP checks returned status 200 for:
  - `/ja/blog-rotary-joint-selection.html`
  - `/ja/faq.html`
  - `/ja/about.html`
  - `/ja/BP-3P-0004.html`
  - `/sitemap-i18n.xml`
- Japanese blog validation found the corrected channel heading and no repeated number or `X` corruption.
- Japanese FAQ validation found the corrected quote question, single category icons, single arrows, and no repeated symbols.
- Japanese About validation found `GC`, `LW`, and `SZ` plus the expected team names with browser auto-translation protection.
- The localized sitemap contains 144 URLs and excludes `404.html`, `thank-you.html`, and `search.html`.
- No Unicode replacement characters were found in the checked public pages.
- Browser inspection found no horizontal overflow on the checked Japanese pages.

## External actions intentionally skipped

- The localized sitemap was not submitted to Google Search Console, per the user's decision to wait.
- No contact form was submitted and no test email was sent during this deployment.
