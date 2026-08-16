# Customer-authorized laser rear-chuck image record

Date: 2026-08-13
Scope: local source only; not deployed

## Authorization and source

- The project owner stated that the customer supplied the clean original image and authorized its website use.
- Source path: `E:\360MoveData\Users\cao19\Desktop\C62DF5A589C7029C9AAB6A9A904568FE.png`
- Source SHA-256: `E98F6AD4F7E4669ADD524D57AAB54116BD327F5DDA44E6E40AE8C3BEAF4A6269`
- Source dimensions: 1280 × 683 pixels.
- The source PNG contained XMP software metadata but no EXIF block.

## Website derivatives

| File | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `images/applications/laser-tube-cutting/laser-tube-rear-chuck-assembly-lineup.jpg` | 1280 × 683 | 118,722 | `A612A0BAAE58C38106D146B71F347ED6934C7B556B71B79FEDEA8700D03CCBD4` |
| `images/applications/laser-tube-cutting/laser-tube-rear-chuck-assembly-lineup.webp` | 1280 × 683 | 66,588 | `4BB59E4797C1FD0E99CD9747756622C1482F734AB6EC6F49BD8F246D6356E93D` |

- The original composition and pixel dimensions were preserved; no crop, generative fill, synthetic component, or equipment alteration was applied.
- JPEG and WebP derivatives were re-encoded without EXIF, XMP, IPTC, ICC, GPS, or orientation metadata.
- The WebP is the preferred browser source and the JPEG is the compatibility fallback.

## Public claim boundary

- The image documents multiple rear-chuck assemblies with visible pneumatic rotary unions and air connections.
- The image is not used to identify a specific product model, passage assignment, pressure, rotational speed, service life, leakage performance, customer identity, or operating result.
- English, German, Japanese, and Russian pages use localized alternative text with the same evidence boundary.

## Release status

- Four-language image-path, localized-alt, intrinsic-dimension, fallback, and metadata assertions: PASS.
- `npm run i18n:verify`: PASS for 220 pages.
- `npm run products:validate`: PASS for 16 models across four languages.
- `npm run images:verify`: PASS.
- `npm run quality`: PASS; production-build validation reported 221 HTML files, 672 release files, and 24 verified public downloads.
- `git diff --check`: PASS.
- The source and WebP derivative were visually inspected at original resolution. Page-level browser rendering was not claimed because the in-app browser component failed to initialize (`Cannot redefine property: process`).
- Commit: not created.
- Push: not performed.
- Deployment: not performed.
