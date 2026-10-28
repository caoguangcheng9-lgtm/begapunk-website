# Inquiry delivery review — 2026-10-28 ACME token mode tolerance

Scope: the `deploy-20261028` candidate changes `ops/activate-release.sh`. The
release-authorization gate classifies every `ops/` path as an inquiry runtime
path, so this record states what was reviewed.

## What changed

Ten added lines and one replaced line inside `validate_baota_acme_runtime_tree`:

- The function used to require exactly `www:www:644` for every file under
  `/www/begapunk/shared/.well-known/acme-challenge/`.
- It now also accepts `www:www:600` and `www:www:640` for those token files.
- Directory modes, the www ownership requirement, the token filename pattern,
  the ban on www ownership outside `/acme-challenge/`, and the ban on symlinks
  are all unchanged.
- Error messages now include the metadata that was actually found.

## Why

The 2026-10-28 21:34 UTC release failed at `Activate release` with:

```
Release safety check failed: ACME runtime owner/mode mismatch
(/www/begapunk/shared/.well-known/acme-challenge/o2jvxrGnU4wGlAdBNcRFOSN37Yyn5R7O3HWIBTH6eY4)
```

BaoTa's root-run ACME renewer had written the challenge token as `600`. Because
the check demanded `644`, every release that followed a certificate renewal
would have failed. All three accepted modes keep the token unreadable to users
other than `www` and root, and the `www` nginx workers can read their own file,
so the stricter requirement bought no security.

## What did NOT change

- `send_inquiry.php`, `PHPMailer/`, `.env`, `package.json` and `.htaccess` are
  untouched in this candidate.
- No form field name, endpoint, header, or mail-routing rule changed.
- The only other paths in this candidate are `sitemap.xml`, `.gitignore` and
  `scripts/verify-localized-site.mjs` (sitemap expectation for STEP files).

## Consequence

This candidate cannot alter inquiry delivery: it changes which file modes the
pre-activation safety check tolerates, and nothing on the request or mail path.

## What this record does not prove

No SMTP acceptance or inbox delivery test was run for this candidate. The
inquiry backend and credentials are byte-identical to the 2026-10-24 release
that was delivering inquiries, but that release was not re-tested here.
