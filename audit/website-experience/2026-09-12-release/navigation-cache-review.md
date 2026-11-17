# Fresh-body navigation acceptance

2026-09-12, Codex AI-assisted engineering review under the owner's ongoing
fix/verify/deploy authorization. Not independent human review.

Candidate 1a79bdf passed all 60 canonical gates, 560 mobile/desktop navigation
cases, exact public artifact validation, 120 Lighthouse runs (40 route medians
98–100, zero red-zone findings), server preflight, activation and public boundary.
Performance observations: de/products.html FCP 1809 ms and the German vacuum
application guide FCP 1806 ms versus the internal 1800 ms target. These are small
nonblocking observations, not zero findings or missing evidence.

Run 34681739461 then failed production browser acceptance: all 62 recorded
failures were HTTP 304 responses after repeat navigation, not missing URLs or
different HTML digests. The 10 fresh responses whose bytes were compared had no
artifact mismatch. Nginx and current rollback succeeded. Independent SSH verified
the old current path and its complete file manifest. Four candidate approval
bindings were cleared. No final production acceptance or IndexNow notification.

The active source used strict 200 checks with request interception but left the
browser cache enabled. A local real-browser HTTP fixture reproduces conditional
If-None-Match revalidation and Puppeteer's 304 status. Explicitly disabling that
page's cache obtains fresh 200 bodies with exact expected content and no
conditional request; 404 is still 404. The fixture passes locally.

Correction: the browser navigation verifier calls requireFreshNavigationResponses
immediately after creating each page, before its first request. This only invokes
page.setCacheEnabled(false) for the audit browser. No server cache policy, URL,
public file, application behavior, response-status assertion or SHA-256 comparison
is relaxed. Repeated cache behavior remains a fixture; this release acceptance
pass intentionally measures fresh public bodies, not warm-cache performance.

All six browser-interaction fixtures pass. Other workflow/policy/boundary tests:
43 pass, three Linux-only skips, zero failures. Full canonical CI must rerun for
the new exact candidate; earlier evidence is retained at its original binding.

An additional live agentic diagnostic was interrupted after rollback detection.
Its partial en/de/fr results may span two active releases and MUST NOT be used as
accepted new-release evidence. Repeat that diagnostic after a successful committed
deployment. No additional real inquiry was sent; prior unchanged-runtime delivery
evidence remains separately bound, not inferred from these browser tests.
