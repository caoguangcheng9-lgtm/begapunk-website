# Hero cache ownership repair

Date: 2026-08-16
Result: PASS

## Scope

This repair changed only:

1. `scripts/sync-page-hero-system.mjs`
2. `scripts/verify-page-heroes.mjs`
3. `audit/website-experience/2026-08-16-hero-cache-ownership-repair.md`

No HTML or CSS file changed.

## Root cause

The Hero synchronizer and verifier still claimed ownership of the shared `css/style.css` cache version `20260814-hero1`, while the localized-site/mobile-language contract correctly requires `20260815-mobile-lang1`. This caused the Hero check to report all 220 pages even though their Hero structures and current shared stylesheet links were valid.

The repair removes shared `style.css` version ownership from the Hero scripts. Hero-specific stylesheets remain pinned to `20260814-hero1`, and the verifier still requires every page to contain exactly one shared `css/style.css` link. The localized-site verifier remains the single owner of the shared stylesheet cache version.

## Hashes

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `scripts/sync-page-hero-system.mjs` | `191A9E6E421D3EEC8CE9DEA05A9C5C041F8505BCD23624F0119E63BE46E49DFF` | `87605E01C014B11710E5A5D85C1FDF7F218249CAC6C84838DE0E3CA0F81E3E2F` |
| `scripts/verify-page-heroes.mjs` | `52EE7C8F8C2C0AD65530932AF99C3E3D9ACB92D3424B6EBE5B67BBF5B24F42C5` | `5D58ADC6977517E034F529DD27E4247CB20EEF138A66544AB135F42A86C30B8A` |

## Verification

All checks exited 0:

- Node syntax checks for both Hero scripts.
- Hero synchronization check: 220 pages synchronized, planned writes 0.
- Hero verification: 220 pages passed across all page families.
- Localized-site verification: 220 pages passed.
- `git diff --check` (existing line-ending warnings only).

SHA-256 values for all 220 HTML pages were captured immediately before the checks and compared after them. Changed HTML files: 0.

No non-check synchronization, build, commit, push, PR, deployment, production access, or form submission was performed.

## 2026-08-17 addendum

The later release-performance task bundled the scoped application-case rules into `case-studies.css` to remove one render-blocking request. Because that changed the stylesheet bytes, its governed cache key advanced to `20260817-case-bundle1` on the 12 EN/DE/JA/RU case-family pages. The Hero synchronizer, Hero verifier, and localized-site verifier now own and require that file-specific key; the other Hero-governed stylesheet keys remain `20260814-hero1`. This addendum does not change the evidence or scope of the original 2026-08-16 repair.
