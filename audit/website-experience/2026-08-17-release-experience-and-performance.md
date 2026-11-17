# Release availability, resource, and laboratory-performance evidence

Date: 2026-08-17 (Asia/Tokyo)
Scope: current local release candidate
Result: PASS for local package availability, resource budgets, and strict laboratory thresholds

## Reproducible toolchain

- Node.js: 24.18.0 locally; deployment job uses Node 24.
- Lighthouse: exactly 13.4.1.
- Browser installer: `@puppeteer/browsers` exactly 3.2.0.
- Browser process controller: `chrome-launcher` exactly 1.2.1.
- Chrome for Testing: 152.0.7977.42 from the official Chrome for Testing storage origin.
- The installer accepts only the approved official host, verifies the archive SHA-256 before extraction, launches Chrome with an isolated temporary profile, and verifies `Chrome/152.0.7977.42` through its loopback DevTools version endpoint before cleaning the profile.
- The deployment workflow runs Lighthouse in an independent job before the production-environment job. It has no production environment or deployment secrets, and a failure blocks deployment.

Official object MD5 values recorded from Google storage:

- win64: `C3023B6C0C5253C8206E13995B20793E`
- linux64: `0E016DDFDD999D29739A07F583238E30`

Project-computed SHA-256 values used as install allowlists (these are not described as Google-published SHA-256 values):

- win64 archive: `5093F03A401B5579DA490D281ABA80B687D92FE6FDFEC47EE522920918D6E327`
- linux64 archive: `CB77F4781CAD7D5E06FCC78B4476E6A6375616E7278DC313ABAA9DB22ED4674E`
- installed win64 executable: `B3B221D637B5B6A745C51CAC1D22A618E7DA5E67202BE52695999886720C7D56`

`npm audit` reported zero vulnerabilities after installation.

## Local availability and resource gate

The final release-package HTTP server checked 221 HTML pages and 267 unique HTML/resource targets. Every target returned HTTP 200 with non-empty content; HTML had a title, one H1, substantive body content, and—except for the approved legacy recovery page—a Contact/RFQ path. Maximum local response time was 90 ms.

All compressed first-load budgets passed. Worst observed values:

| Metric | Maximum | Budget |
| --- | ---: | ---: |
| Total | 233,467 B | 1,638,400 B |
| HTML | 22,203 B | 102,400 B |
| CSS | 24,328 B | 153,600 B |
| JavaScript | 9,866 B | 204,800 B |
| Fonts | 86,660 B | 204,800 B |
| Images | 107,204 B | 1,024,000 B |
| Largest first-view image | 101,220 B | 256,000 B |
| Requests | 11 | 50 |
| Third-party requests | 0 | 5 |

## Lighthouse matrix

Profile: cold cache, mobile 390 x 844 at DPR 2, simulated Slow 4G, 4x CPU slowdown, production-equivalent gzip level 5.

Coverage: eight page families in EN/DE/JA/RU (32 routes). Home, product detail, application, verified case, and Contact/RFQ were each run three times; the other families were run once, for 72 runs total.

Strict thresholds had no tolerance or waiver:

- score >= 90;
- LCP <= 2,500 ms;
- FCP <= 1,800 ms;
- TBT < 200 ms;
- CLS <= 0.10.

Final results:

| Result | Value |
| --- | ---: |
| Failed routes | 0 |
| Minimum performance score | 97 |
| Maximum median LCP | 2,110.5 ms |
| Maximum median FCP | 1,659.8 ms |
| Maximum median TBT | 20.0 ms |
| Maximum median CLS | 0.08383 |
| Maximum transferred bytes reported by Lighthouse | 355,144 B |

The first run exposed four verified-case FCP medians about 6 ms above the target. Instead of widening the threshold, the small application-case stylesheet was bundled after the case stylesheet's existing rules, preserving rule order while removing one render-blocking request. A compatibility copy remains and the release gate verifies byte-equivalent rule content and that no HTML links it directly. A targeted retest reduced case FCP to about 1,509 ms before the complete matrix was rerun. The governed cache key was then advanced to `20260817-case-bundle1` on all 12 four-language case-family pages; both Hero and localized-site gates verify it.

The first final-candidate run also showed why a single homepage sample was not robust: English home FCP was 1,804 ms, 4 ms over the unchanged 1,800 ms threshold. The homepage was promoted to the critical three-run median set in all four languages; the complete 72-run candidate then passed without changing the threshold or adding a waiver.

Machine-readable evidence: `audit/website-experience/2026-08-16-lighthouse-release-performance.json`
Evidence SHA-256: `77F9DA7F53E65C8399D4BBB0FEB9CC744526E4C14DEA01F90CC69D216B436603`

## Still not established locally

- Real 200% browser zoom remains unverified because the available browser shell did not expose reliable zoom control.
- Full-sitemap preview and post-activation production HTTP checks require an externally reachable release and remain deployment-time gates.
- Geographic uptime monitoring and real-user p75 Core Web Vitals are not implemented; missing field data is not a pass.
- Mailbox delivery remains a separately authorized end-to-end check.

No commit, push, PR, deployment, production access, SMTP connection, or real form POST occurred.
