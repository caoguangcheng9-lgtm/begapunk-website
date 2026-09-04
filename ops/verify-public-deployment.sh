#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BEGAPUNK_PUBLIC_BASE_URL:-https://www.begapunk.com}"
if [[ "$BASE_URL" != 'https://www.begapunk.com' ]]; then
  echo "Refusing to verify an unapproved public deployment host: $BASE_URL" >&2
  exit 2
fi

request_status() {
  curl --silent --show-error --path-as-is --output /dev/null --max-time 30 \
    --write-out '%{http_code}' "$1"
}

verify_status() {
  local path="$1"
  local expected="$2"
  local actual=""
  actual="$(request_status "$BASE_URL$path" || true)"
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected HTTP $expected from $path; received ${actual:-no response}." >&2
    return 1
  fi
}

trim_line() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

verify_single_header_value() {
  local headers="$1"
  local expected_name="${2%:}"
  local expected_value="$3"
  local actual_value=""
  local header_name=""
  local header_value=""
  local line=""
  local match_count=0

  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ "$line" == *:* ]] || continue
    header_name="$(trim_line "${line%%:*}")"
    if [[ "${header_name,,}" == "${expected_name,,}" ]]; then
      header_value="$(trim_line "${line#*:}")"
      actual_value="$header_value"
      match_count=$((match_count + 1))
    fi
  done <<<"$headers"

  if [[ "$match_count" -ne 1 || "$actual_value" != "$expected_value" ]]; then
    echo "Expected exactly one $expected_name header with value '$expected_value'; found $match_count matching header(s)." >&2
    return 1
  fi
}

verify_single_header_present() {
  local headers="$1"
  local expected_name="${2%:}"
  local header_name=""
  local header_value=""
  local line=""
  local match_count=0

  while IFS= read -r line; do
    line="${line%$'\r'}"
    [[ "$line" == *:* ]] || continue
    header_name="$(trim_line "${line%%:*}")"
    if [[ "${header_name,,}" == "${expected_name,,}" ]]; then
      header_value="$(trim_line "${line#*:}")"
      [[ -n "$header_value" ]] || {
        echo "The $expected_name header was present but empty." >&2
        return 1
      }
      match_count=$((match_count + 1))
    fi
  done <<<"$headers"

  if [[ "$match_count" -ne 1 ]]; then
    echo "Expected exactly one non-empty $expected_name header; found $match_count." >&2
    return 1
  fi
}

verify_absolute_single_hop_redirect() {
  local source_url="$1"
  local expected_url="$2"
  local direct_result=""
  local journey_result=""

  direct_result="$(curl --silent --show-error --path-as-is --output /dev/null \
    --max-redirs 0 --max-time 30 --write-out '%{http_code}|%{redirect_url}' \
    "$source_url" || true)"
  if [[ "$direct_result" != "301|$expected_url" ]]; then
    echo "Expected one exact 301 from $source_url to $expected_url; received ${direct_result:-no response}." >&2
    return 1
  fi

  journey_result="$(curl --silent --show-error --path-as-is --output /dev/null \
    --location --max-redirs 1 --max-time 30 \
    --write-out '%{http_code}|%{url_effective}|%{num_redirects}' \
    "$source_url" || true)"
  if [[ "$journey_result" != "200|$expected_url|1" ]]; then
    echo "Expected one redirect followed by HTTP 200 for $source_url; received ${journey_result:-no response}." >&2
    return 1
  fi
}

verify_single_hop_redirect() {
  local source_path="$1"
  local expected_url="$2"
  verify_absolute_single_hop_redirect "$BASE_URL$source_path" "$expected_url"
}

homepage="$(curl --fail --silent --show-error --max-time 30 "$BASE_URL/")"
verify_status '/' 200
grep -Eiq '<html|<!doctype html|BEGAPUNK' <<<"$homepage" || {
  echo "The public homepage did not contain the expected HTML marker." >&2
  exit 1
}

# The public edge must canonicalize scheme and host in one hop while retaining
# the request path and campaign parameters.
verify_absolute_single_hop_redirect \
  'http://www.begapunk.com/?utm_source=post-deploy-http' \
  "$BASE_URL/?utm_source=post-deploy-http"
verify_absolute_single_hop_redirect \
  'http://begapunk.com/?utm_source=post-deploy-apex-http' \
  "$BASE_URL/?utm_source=post-deploy-apex-http"
verify_absolute_single_hop_redirect \
  'https://begapunk.com/?utm_source=post-deploy-host' \
  "$BASE_URL/?utm_source=post-deploy-host"

verify_single_hop_redirect '/index.html' "$BASE_URL/"
for language in de fr ja ru; do
  verify_single_hop_redirect "/$language/index.html" "$BASE_URL/$language/"
done

# Representative previous-platform URLs cover category, functional, content
# and tag patterns. Exact destinations prevent broad redirects from passing.
verify_single_hop_redirect '/Pneumatic-rotary-joint-c123/' "$BASE_URL/products.html"
verify_single_hop_redirect '/Pneumatic-Fittings-c456/obsolete-item.html' "$BASE_URL/products.html"
verify_single_hop_redirect \
  '/hydraulic-rotary-joint-c123/retired.html' \
  "$BASE_URL/custom-hydraulic-rotary-unions.html"
verify_single_hop_redirect \
  '/inquiry/?utm_source=legacy-gate' \
  "$BASE_URL/contact.html?utm_source=legacy-gate"
verify_single_hop_redirect '/pages/about-us-2.html' "$BASE_URL/about.html"
verify_single_hop_redirect \
  '/blog-123-13355/Industrial-Laser-Pipe-Cutting-Guide.html' \
  "$BASE_URL/application-laser-tube-cutting.html"
verify_single_hop_redirect '/tags/Low-speed-rotary-joint.html' "$BASE_URL/products.html"

for gone_path in \
  '/locales/en.json' \
  '/cgi-sys/suspendedpage.cgi'; do
  verify_status "$gone_path" 410
done
verify_single_hop_redirect \
  '/index.html?gclid=redirect-gate&utm_source=post-deploy' \
  "$BASE_URL/?gclid=redirect-gate&utm_source=post-deploy"

verify_single_hop_redirect \
  '/3-in-3-out-Pneumatic-rotary-joint-P6776400.html' \
  "$BASE_URL/BP-3P-0004.html"
verify_single_hop_redirect '/BP-2P-95-0001.html' "$BASE_URL/BP-2P-95-0005.html"
verify_single_hop_redirect '/products-p2.html' "$BASE_URL/products.html"
for language in de fr ja ru; do
  verify_single_hop_redirect \
    "/$language/BP-2P-95-0001.html" \
    "$BASE_URL/$language/BP-2P-95-0005.html"
  verify_single_hop_redirect "/$language/products-p2.html" "$BASE_URL/$language/products.html"
done

for sensitive_path in \
  '/.env' \
  '/.git/config' \
  '/manifest.sha256' \
  '/PHPMailer/PHPMailer.php' \
  '/package.json' \
  '/ops/activate-release.sh'; do
  verify_status "$sensitive_path" 404
done

missing_path='/__begapunk_missing_policy_probe__'
missing_response="$(curl --silent --show-error --path-as-is --max-time 30 "$BASE_URL$missing_path" || true)"
verify_status "$missing_path" 404
grep -Fq 'Page Not Found' <<<"$missing_response" || {
  echo "The branded 404 document was not rendered for a missing path." >&2
  exit 1
}

endpoint_headers="$(curl --silent --show-error --head --max-time 30 "$BASE_URL/send_inquiry.php")"
grep -Eq '^HTTP/[^ ]+ 405([[:space:]]|\r?$)' <<<"$endpoint_headers" || {
  echo "The inquiry endpoint did not return HTTP 405 for a non-POST request." >&2
  exit 1
}
grep -Eiq '^allow:[[:space:]]*POST\r?$' <<<"$endpoint_headers" || {
  echo "The inquiry endpoint did not advertise POST as its allowed method." >&2
  exit 1
}

homepage_headers="$(curl --silent --show-error --head --max-time 30 "$BASE_URL/")"
verify_single_header_value "$homepage_headers" 'x-content-type-options:' 'nosniff'
verify_single_header_value "$homepage_headers" 'X-Frame-Options' 'SAMEORIGIN'
verify_single_header_value "$homepage_headers" 'Referrer-Policy' 'strict-origin-when-cross-origin'
verify_single_header_value "$homepage_headers" 'Permissions-Policy' 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
verify_single_header_value "$homepage_headers" 'Content-Security-Policy' "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
verify_single_header_value "$homepage_headers" 'Strict-Transport-Security' 'max-age=31536000'
verify_single_header_value "$homepage_headers" 'cache-control:' 'no-cache'
verify_single_header_present "$homepage_headers" 'Alt-Svc'
if grep -Eiq '^x-powered-by:' <<<"$homepage_headers$endpoint_headers"; then
  echo "A public response exposed the X-Powered-By header." >&2
  exit 1
fi

echo "Public deployment verification passed: homepage, canonical scheme/host, 27 site redirects, 2 retired URLs, sensitive paths, branded 404, inquiry method, cache policy, security headers, and preserved Alt-Svc."
