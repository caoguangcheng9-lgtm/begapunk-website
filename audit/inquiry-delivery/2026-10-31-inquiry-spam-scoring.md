# Inquiry delivery review — 2026-10-31 spam scoring

Scope: the `deploy-20261031-131842` candidate changes `send_inquiry.php`. The
release-authorization gate classifies that path as an inquiry runtime path, so
this record states what was reviewed.

## What changed

One new function, two constants, and three call sites inside `send_inquiry.php`:

- `score_inquiry_spam()` scores a submission on evidence that it came from an
  automated client: absent `Origin`, absent or foreign `Referer`, an empty or
  non-browser `User-Agent`, a known automation `User-Agent` token, a placeholder
  company field, a very short message, and a language that contradicts the
  declared `source_language`.
- `SPAM_MARK_SCORE = 2` only prefixes the notification subject with
  `[Possible spam]` and lists the fired signals in the body. Delivery is not
  affected.
- `SPAM_REJECT_SCORE = 6` returns `400 spam_detected` before the mail is sent.
- The assessment runs after field validation and before the message is built, so
  every pre-existing rejection path keeps its status code.

## Why

Between September and October 2026 the form received 93 successful submissions
from 69 rotating hosting-provider IPs. Twelve of them used the user agent
`cve-2026-63030/1.0`. The rate limit (five per fifteen minutes per IP) never
fired, the honeypot stayed empty, and the same-origin check passes any request
that simply omits `Origin`, so all 93 reached the inbox and buried the real
leads.

## How it was verified

- Unit check of the scorer against the two real patterns: a documented
  real-customer request scores 0 with no signals; the actual spam payload scores
  8 and is rejected.
- Live request against production after the change: the same spam payload with
  `cve-2026-63030/1.0` is blocked at the edge (HTTP 403) and the same payload
  with a browser user agent reaches PHP and returns `400 spam_detected`.
- Method contract preserved: `GET /send_inquiry.php` still returns `405` with
  `Allow: POST`, which `ops/verify-public-deployment.sh` asserts at deploy time.
- `npm run inquiry:verify` (2150 checks) and the PHP 8.2 / 8.3 runtime jobs in
  this workflow both pass.

## What did not change

SMTP configuration and credentials loading, attachment validation, the honeypot
check, the rate limiter, the same-origin check, the response contract, and the
`generate_lead` analytics handoff all behave exactly as before. A submission
that scores 0 or 1 is delivered unchanged.

## Known limit

A bot that supplies a plausible `Origin`, `Referer`, browser user agent and a
long message still scores below the reject threshold and will be delivered with
the `[Possible spam]` marker. The threshold is deliberately set to prefer a
marked false negative over a dropped real inquiry.
