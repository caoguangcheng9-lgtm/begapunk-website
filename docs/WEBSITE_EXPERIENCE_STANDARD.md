# Begapunk Website Experience Standard

Status: mandatory project standard
Effective date: 2026-08-14
Scope: all Begapunk public static pages, localized editions, shared UI, release packages, preview environments, and production releases

This document is the single source of truth for website UI consistency, B2B acquisition structure, responsive and accessible behavior, multilingual presentation, page availability, and page performance. It supplements `PROJECT_HANDOFF.md`, `i18n/README.md`, and the product-truth rules. When requirements conflict, safety, factual accuracy, accessibility, successful inquiry completion, and release integrity take priority over visual decoration.

## 1. Required outcome

Begapunk must use one recognizable design language across multiple page-family templates. The site must remain useful to a technical buyer when JavaScript, analytics, social widgets, or other non-essential third-party services fail.

The website must help a B2B visitor complete this sequence:

1. Recognize the relevant problem or application.
2. Identify a plausible product or engineering path.
3. Understand selection parameters and limitations.
4. Verify claims through approved technical, manufacturing, or case evidence.
5. Take a clear next step such as submitting operating conditions, a drawing, or an RFQ.

Visual consistency alone is not success. A page that looks polished but is unavailable, slow, misleading, inaccessible, difficult to localize, or unable to lead a qualified buyer to an inquiry fails this standard.

## 2. Architecture and change principles

- Static HTML remains the public output. Do not migrate to WordPress, React, Vue, a generic theme, or a large UI framework merely to make the site look consistent.
- A technology or theme migration requires a separate business case covering measurable conversion benefit, SEO and localization preservation, operating cost, security, rollback, and long-term maintenance.
- Shared design values, shells, and components must be changed centrally and propagated through the existing synchronization/build workflow. Do not solve a shared problem by copying a new page-specific patch into every language.
- Preserve canonical URLs, `hreflang`, JSON-LD, metadata, internal links, search indexes, analytics contracts, form field names, downloadable evidence, and legacy recovery routes.
- Existing inline styles and page-specific CSS are migration debt. They may be reduced progressively, but new work must not increase the approved baseline without a recorded exception.
- Complete and stabilize one page family before deleting its legacy styles. Do not rewrite all localized pages at once.

## 3. Page-family contracts

Every public content page must belong to exactly one family. Search, 404, and thank-you pages are utility exceptions and retain their dedicated behavior.

| Page family | Required information order |
| --- | --- |
| Home | Positioning -> core evidence -> product families -> application paths -> quality evidence -> RFQ |
| Product catalog | Selection guidance -> product cards -> comparison path -> customization/RFQ |
| Product detail | Model and image -> decision parameters -> suitable and unsuitable boundaries -> drawing/evidence -> applications -> RFQ |
| Application/selection guide | Buyer problem -> selection inputs -> plausible models -> technical boundaries/evidence -> RFQ |
| Verified case | Case status -> operating context -> configuration -> verifiable evidence -> evidence limits -> product/RFQ |
| Technical article/FAQ | Direct answer -> technical explanation -> risks/limits -> related product/application -> RFQ |
| Quality/evidence | Process or inspection method -> source evidence -> what it proves and does not prove -> RFQ |
| Contact/RFQ | Information the buyer should provide -> form -> handling process -> alternate contact and privacy information |

Requirements for all acquisition pages:

- Product, application, case, quality, and contact pages must expose one clear primary action in the first viewport or first content section.
- A button group must not visually present more than one primary action.
- CTA wording must describe the next useful buyer action. Prefer requests such as sending a drawing, pressure, speed, media, passage count, or mounting constraints over vague wording such as "Learn more".
- Do not use autoplay, intrusive pop-ups, or overlays that hide technical content or the RFQ path.
- Product limits, certifications, delivery, warranty, customer evidence, and performance claims remain governed by the approved fact sources. UI hierarchy must not make a qualified statement appear absolute.

## 4. Design foundations

### 4.1 Design tokens

Shared values must use semantic CSS custom properties wherever an approved token exists. The token set must cover:

- brand, text, surface, border, status, and focus colors;
- heading, body, supporting, label, and table typography;
- spacing, container widths, reading widths, grid gaps, and section rhythm;
- radii, borders, shadows, motion durations, and focus treatment;
- page-hero and component variants.

New CSS must not add an arbitrary color, font size, radius, shadow, spacing value, or animation duration when an existing token expresses the same meaning. If a genuinely new semantic value is required, add and document the token before using it. Breakpoint values remain explicit in media/container queries because CSS custom properties cannot be used as query conditions.

Initial layout baseline:

- maximum page container: 1280 px;
- standard desktop page inset: 24 px;
- standard mobile page inset: 20 px;
- recommended long-form reading width: no more than 800 px;
- breakpoints must be chosen where content stops working, not by targeting named device models.

### 4.2 Shared components

The first governed component set is:

1. Header, navigation, language switcher, and footer.
2. Breadcrumb and approved page-family heroes.
3. Primary button, secondary button on a light surface, and inverse/ghost button on a dark surface.
4. Product card, application card, and case/evidence card.
5. Technical specification table, comparison table, and download block.
6. Evidence and limitation notice.
7. RFQ form field, help, error, pending, and success states.
8. FAQ disclosure.
9. Page-end CTA and mobile inquiry action.
10. Image gallery, caption, and media placeholder.

Use native semantic HTML: links navigate, buttons perform actions, form controls have labels, and page regions use appropriate headings and landmarks. ARIA may supplement native behavior but must not replace it.

The existing ambiguous `.btn-secondary` behavior must be migrated into separate light-surface and dark-surface variants. Do not continue adding page-level overrides that make the same class mean opposite visual treatments.

### 4.3 Responsive and accessible acceptance

Every changed component or template must pass:

- desktop, tablet, and mobile review at 1440 px, 1024 px, and 390 px;
- a 320 CSS px reflow check without page-level horizontal scrolling;
- 200% browser zoom without lost content or functionality;
- keyboard access, visible focus, usable menu/disclosure behavior, and no focus hidden behind sticky UI;
- WCAG 2.2 AA contrast and control-state checks;
- reduced-motion behavior when motion is present;
- usable touch targets, with 44 x 44 CSS px preferred for primary CTA and form actions;
- no clipped headings, overlapping controls, uncontrolled tables, or fixed bars covering content.

Only an inherently two-dimensional table or drawing may use a local horizontal scroll container. The whole page must not scroll sideways.

## 5. Multilingual presentation and localization

- Machine translation remains draft content. Follow the AI-assisted target-market localization review and native-speaker-status rules in `i18n/README.md`.
- Shared UI, component, or template changes must propagate from one governed source. Do not manually maintain four independent layouts.
- German or Russian long text and Japanese text must be included in visual acceptance. An English-only review is insufficient.
- Components must wrap naturally and must not depend on a fixed label, title, CTA, number, or sentence length.
- Language-specific CSS is limited to justified typography, line-breaking, or script-specific adjustments. Do not create a separate design system for a locale.
- UI changes must preserve localized canonical links, reciprocal `hreflang`, metadata, JSON-LD text, form context, search indexes, and analytics events.
- For a route-level change, review that route in all four languages on desktop and mobile. For a global token, header/footer, shared component, or global CSS change, review representative pages from all page families, all four languages, and all standard viewports.

## 6. Availability and performance are separate gates

"The page opens" and "the page opens quickly" must be measured separately. A Lighthouse score does not prove DNS, TLS, routing, HTTP status, critical assets, or the inquiry path are available. Page analytics also cannot report a visit when the page never loads.

### 6.1 Availability hard gate

Any of the following blocks a preview approval, release, or production acceptance:

- DNS, TLS, connection, or navigation timeout;
- unexpected 4xx or 5xx response;
- redirect loop or a legacy redirect that does not reach its approved final page;
- HTTP 200 with empty, error-template, or soft-404 content;
- missing title, main heading, primary content, or required RFQ path;
- unavailable same-origin critical CSS, JavaScript, font, or first-view image;
- a JavaScript failure that prevents navigation, language switching, product discovery, or RFQ submission;
- a third-party service failure that hides the core HTML content or blocks the RFQ path.

Project timeout limits for automated availability checks:

- connection timeout: 5 seconds;
- complete HTML request timeout: 10 seconds;
- approved legacy redirect: preferably one hop to the final 200 response; any longer chain requires a recorded reason.

Required coverage:

1. Before release packaging, every canonical URL in the primary and multilingual sitemap must map to a valid release page, and all same-origin references must exist.
2. In a preview/staging environment, every sitemap URL must receive its expected final 2xx response and non-empty page structure.
3. After production activation, recheck all sitemap URLs and critical same-origin resources from outside the origin server.
4. The immediate production smoke set must include EN/DE/JA/RU homepages, product catalog, a representative product detail, application, verified case, quality page, Contact/RFQ, `robots.txt`, and both sitemaps.
5. The inquiry endpoint and mailbox receipt remain a separate authorized end-to-end gate. `GET /send_inquiry.php` returning 405 proves route reachability only, not successful delivery.

A production activation must be rolled back or stopped when the availability hard gate fails. Do not accept "it works on my computer" or a screenshot as availability evidence.

### 6.2 Real-user performance KPI

Measure real-user results separately for mobile and desktop and report the 75th percentile:

| Metric | Good target | Poor threshold |
| --- | ---: | ---: |
| Largest Contentful Paint (LCP) | <= 2.5 s | > 4.0 s |
| Interaction to Next Paint (INP) | <= 200 ms | > 500 ms |
| Cumulative Layout Shift (CLS) | <= 0.10 | > 0.25 |
| Time to First Byte (TTFB, supporting metric) | <= 0.8 s | > 1.8 s |

All three Core Web Vitals must be good at p75 for a page family to be reported as good. TTFB is a supporting diagnostic, not a Core Web Vital. Search Console, PageSpeed Insights, and CrUX may represent a rolling historical window or origin-level fallback; missing data must be reported as "insufficient field data", never as a pass.

Segment results where volume permits by page family, device, target country, and connection type. A low-volume B2B site should add first-party or approved real-user Web Vitals collection before relying on averages from page analytics.

### 6.3 Release laboratory performance gate

Laboratory testing must use a cold cache and a mobile profile equivalent to Slow 4G with 4x CPU slowdown. Run each critical page at least three times and use the median. A formal release or nightly audit should use five runs for the critical acquisition pages.

Target thresholds:

| Measure | Target |
| --- | ---: |
| Lighthouse performance score | >= 90, used as a regression signal rather than the sole decision |
| LCP | <= 2.5 s |
| First Contentful Paint (FCP) | <= 1.8 s |
| Total Blocking Time (TBT, laboratory responsiveness proxy) | < 200 ms |
| CLS | <= 0.10 |

Until every page family has an approved baseline, the following red-zone result is a release blocker and must not be waived merely to make automation pass:

- LCP > 4.0 seconds;
- TBT > 600 milliseconds;
- CLS > 0.25;
- Lighthouse performance score < 50;
- a greater than 10% regression in the median LCP, TBT, or transferred bytes against the approved comparable baseline without a documented business reason.

A single Lighthouse score is not sufficient evidence because laboratory results vary. Record the test profile, tool version, route, language, run count, median, and comparison baseline.

### 6.4 Initial resource budgets

Budgets apply to the compressed first load of a page and exclude a CAD/PDF download that is linked but not automatically loaded. An automatically loaded download, video, or embed counts in full.

| Resource | Initial maximum per page |
| --- | ---: |
| Total transferred resources | 1600 KiB |
| HTML | 100 KiB |
| CSS | 150 KiB |
| JavaScript | 200 KiB |
| Fonts | 200 KiB |
| Images | 1000 KiB |
| Largest first-view/LCP image | 250 KiB |
| Total requests | 50 |
| Third-party requests | 5 |

Additional rules:

- First-view images must be correctly sized, compressed, have explicit intrinsic dimensions, and must not be lazy-loaded when they are the LCP candidate.
- Offscreen images should use responsive sources and lazy loading where it does not break print, accessibility, or critical interaction.
- Non-essential JavaScript and third-party marketing code must not block HTML or first-view rendering.
- Analytics, chat, social, video, and other embeds must fail independently. Their failure must not remove content, navigation, or RFQ functionality.
- New or changed pages must stay within the budgets. An existing over-budget page must not become heavier and must receive a dated remediation record.
- Do not raise a budget merely to make a new page pass. Any exception must follow Section 9.

## 7. Test matrix and evidence

### Page-level change

- changed route in EN/DE/JA/RU;
- desktop and mobile visual checks;
- 320 px reflow and 200% zoom;
- keyboard/focus and CTA review;
- local release availability and resource validation;
- laboratory performance for the changed page family, including English plus Japanese and any affected German/Russian long-text route.

### Global CSS, token, shared component, header/footer, or template change

- one representative route from each of the eight page families;
- all four languages;
- 1440 px, 1024 px, and 390 px browser checks;
- full sitemap availability and local-resource validation;
- laboratory performance on every page-family representative, with the critical acquisition pages run at least three times.

### Release and production

- record the release commit, environment, test time, tool/browser versions, routes, languages, viewport/network profile, results, regressions, exceptions, and evidence locations;
- store durable reports under `audit/website-experience/`;
- do not report a manual spot check, local file validation, historical PageSpeed result, or old CI run as current production proof;
- once external monitoring is configured, monitor home, product catalog, a representative product page, and Contact/RFQ at least every five minutes from an external location; rotate the remaining sitemap routes through scheduled checks;
- target 99.9% monthly availability for the critical route set. This is a Begapunk service objective, not a Core Web Vitals or Google ranking guarantee.

## 8. Migration order

1. Complete and review the current page-hero unification as an independent baseline.
2. Record initial UI and performance baselines without hiding existing debt.
3. Separate light-surface secondary buttons from dark-surface inverse buttons.
4. Consolidate product-detail inline styles and repeated four-language structures.
5. Standardize Contact/RFQ form states, application/case evidence modules, cards, specification tables, and CTA hierarchy.
6. Migrate product discovery, home, knowledge, quality, and utility pages by family.
7. Delete legacy rules only after the affected page family passes its complete visual, localization, availability, and performance matrix.

Commercial priority is product detail and Contact/RFQ first, then application and verified case, then catalog, home, knowledge, and legal/utility pages.

## 9. Exceptions

An exception must be written before release and must include:

- affected route, language, component, metric, or budget;
- measured current result and required threshold;
- user/business benefit that justifies the exception;
- risk to availability, performance, accessibility, localization, SEO, and inquiry conversion;
- named owner, remediation action, and expiration date;
- evidence that core content and RFQ remain usable.

Exceptions must be narrow and time-limited. "The page is visually impressive", "the theme requires it", "Lighthouse is inconsistent", or "the current site already has this problem" are not sufficient reasons.

## 10. Current automation boundary

As of 2026-08-17, the repository validates source structure, local resources, links, JavaScript/JSON-LD syntax, images, multilingual contracts, release contents, and the production homepage health check. The built release also has automated local HTTP availability, Contact/RFQ-path, critical-resource, and compressed resource-budget checks across all 221 HTML files.

The deployment workflow has an independent, secret-free Lighthouse job using an allowlisted Chrome for Testing build. It covers eight page families in all four languages with a cold-cache mobile Slow 4G/4x CPU profile; critical acquisition pages use three-run medians. A failure prevents the production-environment job from starting.

The following are not yet fully automated or cannot be established before an externally reachable candidate exists:

- every preview and production sitemap URL and critical resource from an external location;
- multi-route activation rollback health checks beyond the current homepage rollback check;
- real 200% browser zoom in the current browser-control environment;
- geographic uptime monitoring;
- real-user Core Web Vitals collection and p75 reporting.

Required evidence must be recorded under `audit/website-experience/`. Continuous geographic monitoring and real-user measurement must remain explicit open control gaps until implemented; they cannot be replaced by an unrealistic claim of continuous manual checking. Never describe an unimplemented check as automated or an unmeasured metric as passing.

## 11. Authoritative references

- Core Web Vitals and field measurement: https://web.dev/articles/vitals
- Core Web Vitals threshold definitions: https://web.dev/articles/defining-core-web-vitals-thresholds
- TTFB guidance: https://web.dev/articles/optimize-ttfb
- PageSpeed Insights field/lab data boundary: https://developers.google.com/speed/docs/insights/v5/about
- Lighthouse: https://developer.chrome.com/docs/lighthouse
- Lighthouse CI configuration: https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
- Lighthouse network payload guidance: https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight
- Google HTTP status and crawling behavior: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes
- CSS custom properties: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties
- Responsive design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Progressive design-system adoption: https://designsystem.digital.gov/maturity-model/
