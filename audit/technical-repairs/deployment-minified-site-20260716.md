# Begapunk minified-site deployment - 2026-07-16

## Scope

- Source branch: `release-phase-2b-predeploy-repair`
- Source commit: `66b88a7` (`Add verified minified site build`)
- Local release site: `E:\begapunk-site-releases\minified-site-20260716-133239-66b88a7\site`
- Deployed files: 130
- Deployment type: incremental copy into the existing document root
- Production document root: `/www/wwwroot/47.252.73.192`

The deployment included the minified HTML, CSS, JavaScript, search index, revised `llms.txt`, optimized content images, and social-sharing cards that differed from the previously verified production baseline. Unchanged large assets, including the factory video and product manuals, were not re-uploaded.

## Release and rollback material

- Local delta archive: `E:\begapunk-site-releases\minified-site-20260716-133239-66b88a7\begapunk-minified-delta-20260716-66b88a7.zip`
- Server delta archive: `/www/releases/begapunk-minified-delta-20260716-66b88a7.zip`
- Server release directory: `/www/releases/minified-20260716-66b88a7`
- Archive entries: 130
- Archive SHA-256: `CA089BEEF4FE6497ED39BA46B2DC45A06F8CBCB7079E252E8D731A0CCE4244A0`
- Server rollback backup: `/www/backups/begapunk-minified-predeploy-20260716-131426.tar.gz`

The failed full-package upload left a 10 MB temporary upload fragment. It was removed after the successful delta deployment and verification.

## Server verification

- Uploaded archive SHA-256 matched the local archive.
- The archive extracted to an independent release directory before the live copy.
- All 130 release files matched their production copies byte-for-byte after deployment.
- `index.html`, `llms.txt`, and `css/style.css` hashes matched explicitly during the deployment step.
- Nginx configuration syntax passed.
- No Nginx reload was required because only static website files changed.
- Production-only `.env`, `.well-known/`, backend secrets, and unrelated server files were not changed.

## Gzip verification

Nginx reported the following effective compression settings:

- `gzip on`
- `gzip_min_length 1k`
- `gzip_comp_level 5`
- `gzip_vary on`

The public homepage returned HTTP 200 with `Vary: Accept-Encoding` and `Content-Encoding: gzip`. Public HTML, `llms.txt`, CSS, and JavaScript requests also returned Gzip-encoded responses.

## Public checks

The following resources returned HTTP 200 after deployment:

- `/`
- `/products.html`
- `/contact.html`
- `/llms.txt`
- `/css/style.css`
- `/js/analytics.js`
- `/images/social/BP-8P-0001-social.jpg`

Additional checks:

- The live `llms.txt` starts with the expected H1 and exposes the new Markdown link index.
- `GET /send_inquiry.php` returned HTTP 405, the expected response for a reachable POST-only form endpoint.
- Browser visual checks passed on the homepage, product catalog, and contact/RFQ page.
- Browser console errors and warnings: 0 on all three checked pages.
- No real inquiry email was sent during this deployment verification.
