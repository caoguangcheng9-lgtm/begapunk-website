# Multilingual German and Japanese deployment — 2026-07-17

## Release

- Source branch: `feature/multilingual-pilot`
- Source commit: `770d584` (`Add full Japanese site translation`)
- Uploaded archive: `/www/releases/begapunk-multilingual-text-770d584-v2.zip`
- SHA-256: `2d8e14a70e4f9f0812a3083c65f3fbb2d265fa0755850c228590ce0edc3757a8`
- Staging directory: `/www/releases/multilingual-770d584`
- Production root: `/www/wwwroot/47.252.73.192`

## Backup and protected server files

- Pre-deployment backup: `/www/backups/begapunk-ja-predeploy-20260717-1915.tar.gz`
- The backup passed `gzip -t` before deployment.
- Production `.env`, `.well-known/`, and `PHPMailer/` were excluded from the copy.
- Hashes for all three protected items were unchanged after deployment.

## Deployment verification

- Archive hash on the server matched the local archive.
- German and Japanese homepage, product, and contact entry files existed in staging.
- 172 deployed files passed a staging-to-production SHA-256 comparison.
- Deployed directories use mode `755`; deployed files use mode `644` and owner `www:www`.
- `send_inquiry.php` passed PHP syntax validation.
- Nginx configuration validation passed.
- Public English, German, Japanese, product, contact, and multilingual sitemap URLs returned HTTP 200.
- All 102 German and Japanese HTML URLs returned HTTP 200; zero 404 responses.
- German and Japanese pages returned `Content-Encoding: gzip`.
- German and Japanese `lang` and `hreflang` values were present.
- Japanese contact form retained `source_language=ja`.
- A GET request to `/send_inquiry.php` returned the expected HTTP 405 response.
- Browser checks confirmed the German and Japanese product layouts and images rendered correctly.
- Browser language switching succeeded from Japanese to German and from German to Japanese.

No real inquiry form submission or email was sent during this deployment.
