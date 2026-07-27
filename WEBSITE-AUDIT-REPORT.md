# Begapunk Website Audit Report

**Date:** 2026-07-27
**Site:** https://www.begapunk.com/
**Scope:** HTML, CSS, JavaScript, SEO, Schema, Sitemap, robots.txt, Multi-language, Security Headers
**Version:** v2 (static HTML/CSS/JS, no framework)

---

## Executive Summary

Overall quality is **good** for a static B2B industrial website. Strong technical SEO fundamentals (canonical URLs, hreflang, structured data) are in place. 4-language support (EN/DE/JA/RU) with proper i18n indexing. Two critical issues need immediate attention: duplicate cookie consent systems and a dual-sitemap strategy that risks search engine confusion.

---

## P0 — Critical

### 1. Duplicate Cookie Consent Systems

**Files:** `index.html:964-970`, `js/analytics.js:357-390`

The site has **two independent cookie consent banners**:
- A hardcoded `<div class="cookie-bar" id="cookieBar">` in HTML (every page)
- A programmatically injected `#bp-consent-banner` from `analytics.js`

Both fire on page load. The HTML banner uses `localStorage` key `cookiesAccepted`, while analytics.js uses `begapunk_cookie_consent`. They are unaware of each other. A user clicking "Accept" on one will still see the other.

**Fix:** Remove the HTML cookie bar (`#cookieBar`) entirely. Let `analytics.js` be the single source of truth.

---

### 2. Competing Sitemaps With Stale Dates

**Files:** `sitemap.xml`, `sitemap-i18n.xml`, `robots.txt:22-25`

`robots.txt` references both `sitemap.xml` (English-only, 51 URLs) and `sitemap-i18n.xml` (all 4 languages, ~196 URLs). This creates two problems:

1. **Duplicate coverage**: The same English URLs appear in both files, competing for priority signals.
2. **Stale dates**: `sitemap.xml` has `lastmod` values from **2026-05-14** for most pages; `sitemap-i18n.xml` has consistent **2026-07-18** dates.

**Fix:** Remove the English-only `sitemap.xml` from both disk and `robots.txt`. Keep only `sitemap-i18n.xml` as the authoritative sitemap. Update `robots.txt` to reference only one sitemap file.

---

### 3. Schema.org Founder Field Type Inconsistency

**Files:** `index.html:210-218`, `de/about.html:57` (inline JSON-LD), `ja/about.html:57` (inline JSON-LD)

- **English index**: Uses `"founder": { "@type": "Person", ... }` (single object)
- **German/Japanese about pages**: Uses `"founders": [{ "@type": "Person", ... }]` (array)

Schema.org's `Organization.founder` expects a `Person` (singular). The `founders` key is not a recognized property and will be silently ignored by parsers. Furthermore, the German and Japanese Organization blocks are inline-minified with no line breaks, making debugging difficult.

**Fix:** Standardize on `"founder"` (singular, `Person` object) across all pages. Indent JSON-LD consistently.

---

### 4. Duplicate favicon Declarations

**File:** `index.html:28`, `index.html:326`

```html
<link rel="icon" type="image/png" href="images/favicon.png">  <!-- line 28 -->
<link rel="icon" type="image/x-icon" href="images/favicon.ico"> <!-- line 326 -->
```

Two favicon declarations with two different files and MIME types. Browsers and crawlers may pick either one unpredictably.

**Fix:** Keep one. Prefer the PNG with `type="image/png"` and remove the ICO line.

---

## P1 — High

### 5. Large Inline CSS Block on Homepage

**File:** `index.html:744-873`

The English homepage contains a **130-line inline `<style>` block** for the testimonials/engineering support section. This CSS is not shared across pages and adds ~3KB to every page load that includes this component. It also misses browser caching benefits.

**Fix:** Move these styles into `css/style.css` and reference them by class name. If the component is page-specific, create a small `css/home.css`.

---

### 6. Unminified CSS (107KB / 4584 lines)

**File:** `css/style.css`

The main stylesheet is served uncompressed. At 107KB, this could be reduced to ~70KB with minification. No build pipeline enforces minification on the production CSS.

**Fix:** The project has `clean-css` in `package.json` and a `build:minify` script. Run `npm run build:minify` and serve the minified output. Consider adding a CI step.

---

### 7. Localized Pages Missing `<meta name="keywords">`

**Evidence:** `grep` for `<meta name="keywords"` across all `.html` files found 24 matches — all in English root pages only. The `de/`, `ja/`, and `ru/` localized HTML files contain **no keywords meta tag**.

For example:
- English `index.html:19` has: `keywords="rotary joint, rotary union, swivel joint, ..."`
- German `de/index.html` has: **no keywords meta tag**
- Japanese `ja/index.html` has: **no keywords meta tag**

**Fix:** Ensure the i18n build pipeline (`scripts/build-localized-site.mjs`) injects translated `keywords` meta tags, or add them manually.

---

### 8. Homepage Duplicate H1 (Implied)

**File:** `index.html`

The homepage hero has `<h1><span class="highlight">Air Rotary Union</span> Specialist for OEM Machinery</h1>` at line 417. While there's no explicit second `<h1>` tag, the hero badge and engineering notices section use `<h2>` correctly. This item is low-risk but worth noting — verify that no `<h1>` exists elsewhere in the page body.

---

### 9. analytics.js Loaded As Defer — Banner Timing

**File:** `index.html:330`

```html
<script defer src="js/analytics.js?v=20260715-1"></script>
```

`analytics.js` creates the cookie banner **after DOMContentLoaded**. Combined with the requestAnimationFrame double-nest (lines 399-403), the banner may appear 200-500ms after the page becomes interactive, causing a visible layout shift.

**Fix:** The `injectStyles()` call creates a `<style>` element in `<head>`. Consider pre-loading the banner styles inline in a tiny `<style>` block to prevent CLS.

---

## P2 — Medium

### 10. Fuse.js Loaded From unpkg CDN (External Dependency)

**File:** `js/search.js:10`

```javascript
FUSE_CDN: 'https://unpkg.com/fuse.js@7.0.0/dist/fuse.min.js'
```

Relies on a third-party CDN (`unpkg.com`) that has had reliability issues. If unpkg is down, site search breaks completely.

**Fix:** Download `fuse.min.js`, place it in `js/`, and change `CONFIG.FUSE_CDN` to a local path. Use the project's `package.json` to manage the version.

---

### 11. Sitemap-i18n XML Missing `<priority>` and `<changefreq>`

**File:** `sitemap-i18n.xml`

The i18n sitemap has no `<priority>` or `<changefreq>` fields on any `<url>`. In contrast, `sitemap.xml` has these for every entry. Search engines use these as hints; their absence may reduce crawl efficiency.

**Fix:** Add `<priority>` and `<changefreq>` to `sitemap-i18n.xml`. Match the logic from `sitemap.xml` (homepage=1.0, products=0.9, blog=0.5, legal=0.3).

---

### 12. Generic Open Graph Image on Blog Posts

**Files:** All blog `*.html` files (7 articles)

Every blog post uses `https://www.begapunk.com/images/og-image.jpg` as its OG image. Article-specific social images (like `images/social/blog-*-social.jpg`) were generated for product pages but not for blog articles. This reduces click-through from social media shared links.

**Fix:** Generate per-article social images using the existing `scripts/generate-social-images.mjs` pipeline. Even a templated image with the article title is better than a generic fallback.

---

### 13. 404 Page Has Redundant `Disallow` + `noindex`

**Files:** `robots.txt:8`, `404.html:52`

`robots.txt` disallows `/404.html`, AND the page itself has `<meta name="robots" content="noindex, follow">`. While not harmful, it's redundant and adds confusion. The `Disallow` in robots is sufficient.

---

### 14. Homepage Statistics <div> Could Be a `<dl>` List

**File:** `index.html:424-472`

```html
<div class="hero-stats">
    <div class="stat-item">
        <span class="stat-number">200K+</span>
        <span class="stat-label">Units Delivered</span>
    </div>
    ...
</div>
```

Semantically, this is a definition list. Using `<dl>`, `<dt>`, `<dd>` would improve accessibility for screen readers interpreting key-value pairs.

---

### 15. German/Japanese/Russian Pages Use `min⁻¹` Instead of RPM

**Evidence:** e.g., `ja/BP-2P-08-0001.html` uses `min⁻¹` in product schema while English pages use `RPM`.

The mixed notation in structured data may cause confusion for comparison engines and product aggregators that parse `RPM` as a canonical unit.

**Fix:** Standardize on `RPM` in `additionalProperty` schemas across all languages, or at minimum use both values (e.g., `"500 min⁻¹ (RPM)"`).

---

### 16. Index HTML Has Empty Lines / Trailing Whitespace Structure

**File:** `index.html`, all English root pages

English HTML files have alternating blank lines between each tag (e.g., lines 1-13 have blank lines between every element). This inflates file size by ~15-20% and makes the markup harder to scan. The localized pages are minified (single-line), but the English source files are not.

**Fix:** Run the existing `npm run build:minify` pipeline to strip unnecessary whitespace. Use blank lines sparingly for logical section separation only.

---

## P3 — Suggestions & Optimizations

### 17. Self-Host Fuse.js Instead of CDN

As noted in P2 #10. Also consider: Fuse.js v7.0.0 was released in 2023. Check for v7.1.x patches.

### 18. Add Brotli Compression

**File:** `.htaccess:111-113`

The `.htaccess` enables **gzip** via `mod_deflate`. Adding Brotli (`mod_brotli`) would reduce transferred CSS/JS/HTML size by an additional 15-20% over gzip for modern browsers.

```apache
<IfModule mod_brotli.c>
    AddOutputFilterByType BROTLI_COMPRESS text/html text/css text/javascript application/javascript
</IfModule>
```

### 19. Add `Cache-Control` for Fonts

**File:** `.htaccess:115-124`

The `mod_expires` block sets cache for images, CSS, and JS — but **not WOFF2 fonts**. Fonts change almost never and should have long cache:

```apache
ExpiresByType font/woff2 "access plus 1 year"
```

### 20. WhatsApp Link in Floating CTA

**File:** `index.html:956`

```html
<a href="https://wa.me/8618368425342" target="_blank" rel="noopener" class="floating-btn whatsapp">WhatsApp</a>
```

The `rel="noopener"` is present (good), but `rel="noreferrer"` is missing. This leaks the visitor's page URL to WhatsApp's servers.

**Fix:** Change to `rel="noopener noreferrer"`.

### 21. Missing `application/ld+json` for `SearchAction`

**File:** `index.html:168-320` (Organization schema)

The `Organization` schema could include a `potentialAction` for Sitelinks Search Box:

```json
{
  "@type": "SearchAction",
  "target": "https://www.begapunk.com/search.html?q={search_term_string}",
  "query-input": "required name=search_term_string"
}
```

This enables Google's sitelink search box in SERPs for branded queries.

### 22. Language Selector Uses Inline `onchange`

**File:** `index.html:387`

```html
<select id="language-en" aria-label="Language" onchange="if(this.value)window.location.href=this.value">
```

The inline `onchange` works but violates Content-Security-Policy best practices. Since the site has no build-time event wiring, the pragmatic fix would be to move this to a small `<script>` or document-level event listener.

### 23. CSS Variable Naming Consistency

**File:** `css/style.css:19-43`

Variables are a mix of semantic (`--primary`, `--text`) and utility (`--radius`, `--shadow`). Some are unused or redundant (`--primary-light`, `--dark-soft`). A quick audit could trim unused custom properties.

### 24. Robot `Disallow` for `css/`, `js/`, `images/` Is Unnecessary

**File:** `robots.txt:3-5`

```text
Allow: /css/
Allow: /js/
Allow: /images/
```

These are already covered by the root `Allow: /`. The explicit rules add no value unless there's a specific reason to highlight them. No harm, just noise.

### 25. Consider Adding WebP fallback `<img>` inside `<picture>`

**File:** `index.html:495-498`

The hero image uses `<picture>` with WebP `<source>` and a fallback `<img>` — this is correct. Other images on the site use plain `<img>` tags pointing to optimized WebP files directly with no `<picture>` fallback for browsers that don't support WebP. Modern browser support for WebP is >97%, so this is low urgency.

### 26. Blog Articles Have No Estimated Reading Time

None of the 7 blog/TechArticle pages show reading time. Adding this (even as a simple schema `timeRequired` property) improves SERP appearance.

### 27. No `manifest.json` / PWA Support

**Absence:** No `manifest.json`, no service worker. For a B2B industrial site this is appropriate — not a problem. Listed here for completeness.

---

## Scoring Summary

| Category | Score | Notes |
|---|---|---|
| **HTML Semantics** | 7/10 | Good structure, inline styles hurt. Use `<dl>` for stats. |
| **CSS Quality** | 6/10 | Unminified, 107KB. Inline CSS on homepage. Good use of custom properties. |
| **JavaScript** | 7/10 | Clean vanilla JS. Fuse.js loaded from CDN. Double cookie banner is a bug. |
| **SEO (on-page)** | 8/10 | Strong title/desc/hreflang/canonical on all pages. Keywords missing on i18n pages. |
| **SEO (technical)** | 6/10 | Dual sitemaps confuse crawlers. Good robots.txt and .htaccess. |
| **Schema.org** | 7/10 | Rich markup across all page types. Founder/founders inconsistency. Missing SearchAction. |
| **Multi-language** | 7/10 | Complete hreflang coverage. Missing keywords meta. Machine translation quality varies (JA needs editorial review). |
| **Performance** | 6/10 | Self-hosted fonts good. CSS/JS unminified. Fonts lack cache policy. |
| **Security Headers** | 9/10 | Comprehensive .htaccess headers. Missing `noreferrer` on WhatsApp link only. |
| **Accessibility** | 7/10 | Alt text present. Select has aria-label. Color contrast not audited. |

---

## Quick Win Prioritization

If time is limited, fix in this order:

1. **Remove HTML cookie bar** (P0 #1) — 5 minutes, zero risk
2. **Remove stale sitemap.xml, update robots.txt** (P0 #2) — 10 minutes
3. **Fix founder/founders schema** (P0 #3) — 10 minutes, grep-and-replace
4. **Remove duplicate favicon** (P0 #4) — 2 minutes
5. **Add keywords meta to i18n pages** (P1 #7) — 15 minutes with pipeline
6. **Move homepage inline CSS to style.css** (P1 #5) — 15 minutes
7. **Self-host Fuse.js** (P2 #10) — 10 minutes, download + move
