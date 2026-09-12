#!/usr/bin/env bash
set -Eeuo pipefail

redirect_check_count=0

trim_line() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

extract_final_http_header_block() {
  local headers="$1"
  local raw_line=""
  local line=""
  local final_block=""
  local capturing=false
  local found=false

  # curl can emit multiple response blocks (for example, a proxy CONNECT
  # response followed by the origin response). Assertions must inspect only
  # the final HTTP response, never a matching header from an earlier block.
  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"
    if [[ "$line" =~ ^HTTP/[^[:space:]]+[[:space:]]+[0-9]{3}([[:space:]]|$) ]]; then
      final_block="$line"
      capturing=true
      found=true
      continue
    fi

    if [[ "$capturing" == true ]]; then
      if [[ -z "$line" ]]; then
        capturing=false
      else
        final_block+=$'\n'"$line"
      fi
    fi
  done <<<"$headers"

  if [[ "$found" != true ]]; then
    echo 'No HTTP response status line was present in the captured headers.' >&2
    return 1
  fi

  printf '%s' "$final_block"
}

verify_final_http_status() {
  local headers="$1"
  local expected_status="$2"
  local final_block=""
  local status_line=""
  local actual_status=""

  final_block="$(extract_final_http_header_block "$headers")" || return 1
  IFS= read -r status_line <<<"$final_block"
  if [[ "$status_line" =~ ^HTTP/[^[:space:]]+[[:space:]]+([0-9]{3})([[:space:]]|$) ]]; then
    actual_status="${BASH_REMATCH[1]}"
  fi

  if [[ "$actual_status" != "$expected_status" ]]; then
    echo "Expected final HTTP status $expected_status; received ${actual_status:-unparseable status}." >&2
    return 1
  fi
}

verify_single_header_value() {
  local headers="$1"
  local expected_name="${2%:}"
  local expected_value="$3"
  local final_block=""
  local actual_value=""
  local header_name=""
  local header_value=""
  local line=""
  local match_count=0
  local first_line=true

  final_block="$(extract_final_http_header_block "$headers")" || return 1

  while IFS= read -r line; do
    if [[ "$first_line" == true ]]; then
      first_line=false
      continue
    fi
    [[ "$line" == *:* ]] || continue
    header_name="$(trim_line "${line%%:*}")"
    if [[ "${header_name,,}" == "${expected_name,,}" ]]; then
      header_value="$(trim_line "${line#*:}")"
      actual_value="$header_value"
      match_count=$((match_count + 1))
    fi
  done <<<"$final_block"

  if [[ "$match_count" -ne 1 || "$actual_value" != "$expected_value" ]]; then
    echo "Expected exactly one $expected_name header with value '$expected_value' in the final response; found $match_count matching header(s)." >&2
    return 1
  fi
}

verify_single_header_present() {
  local headers="$1"
  local expected_name="${2%:}"
  local final_block=""
  local header_name=""
  local header_value=""
  local line=""
  local match_count=0
  local first_line=true

  final_block="$(extract_final_http_header_block "$headers")" || return 1

  while IFS= read -r line; do
    if [[ "$first_line" == true ]]; then
      first_line=false
      continue
    fi
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
  done <<<"$final_block"

  if [[ "$match_count" -ne 1 ]]; then
    echo "Expected exactly one non-empty $expected_name header in the final response; found $match_count." >&2
    return 1
  fi
}

verify_file_sha256() {
  local file_path="$1"
  local expected_sha256="$2"
  local label="${3:-file}"
  local actual_sha256=""
  actual_sha256="$(sha256sum "$file_path" | awk '{print $1}')" || return 1
  if [[ "$actual_sha256" != "$expected_sha256" ]]; then
    echo "$label SHA-256 mismatch (expected $expected_sha256, received $actual_sha256)." >&2
    return 1
  fi
}

verify_public_path_sha256() {
  local public_path="$1"
  local expected_sha256="$2"
  local label="$3"
  local response_file=""
  response_file="$(mktemp)"
  if ! curl --fail --silent --show-error --max-time 30 --output "$response_file" \
    "$BASE_URL$public_path?deployment_artifact=${expected_sha256:0:16}"; then
    rm -f -- "$response_file"
    return 1
  fi
  if ! verify_file_sha256 "$response_file" "$expected_sha256" "$label"; then
    rm -f -- "$response_file"
    return 1
  fi
  rm -f -- "$response_file"
}

# Sourcing this file exposes the protocol parsing/assertion functions above and
# deliberately performs no network requests. Direct execution continues with
# the production-only public deployment checks below.
if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

BASE_URL="${BEGAPUNK_PUBLIC_BASE_URL:-https://www.begapunk.com}"
EXPECTED_HOMEPAGE_SHA256="${BEGAPUNK_EXPECTED_HOMEPAGE_SHA256:-}"
EXPECTED_ROBOTS_SHA256="${BEGAPUNK_EXPECTED_ROBOTS_SHA256:-}"
EXPECTED_SITEMAP_SHA256="${BEGAPUNK_EXPECTED_SITEMAP_SHA256:-}"
EXPECTED_I18N_SITEMAP_SHA256="${BEGAPUNK_EXPECTED_I18N_SITEMAP_SHA256:-}"
if [[ "$BASE_URL" != 'https://www.begapunk.com' ]]; then
  echo "Refusing to verify an unapproved public deployment host: $BASE_URL" >&2
  exit 2
fi
for digest_variable in \
  EXPECTED_HOMEPAGE_SHA256 \
  EXPECTED_ROBOTS_SHA256 \
  EXPECTED_SITEMAP_SHA256 \
  EXPECTED_I18N_SITEMAP_SHA256; do
  digest_value="${!digest_variable}"
  if [[ -n "$digest_value" && ! "$digest_value" =~ ^[0-9a-f]{64}$ ]]; then
    echo "$digest_variable must be a lowercase SHA-256 digest." >&2
    exit 2
  fi
done

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
  redirect_check_count=$((redirect_check_count + 1))
}

verify_single_hop_redirect() {
  local source_path="$1"
  local expected_url="$2"
  verify_absolute_single_hop_redirect "$BASE_URL$source_path" "$expected_url"
}

homepage_probe="$BASE_URL/"
if [[ -n "$EXPECTED_HOMEPAGE_SHA256" ]]; then
  homepage_probe="$BASE_URL/?deployment_artifact=${EXPECTED_HOMEPAGE_SHA256:0:16}"
fi
homepage_file="$(mktemp)"
trap 'rm -f -- "$homepage_file"' EXIT
curl --fail --silent --show-error --max-time 30 --output "$homepage_file" "$homepage_probe"
homepage="$(<"$homepage_file")"
verify_status '/' 200
grep -Eiq '<html|<!doctype html|BEGAPUNK' <<<"$homepage" || {
  echo "The public homepage did not contain the expected HTML marker." >&2
  exit 1
}
if [[ -n "$EXPECTED_HOMEPAGE_SHA256" ]]; then
  verify_file_sha256 "$homepage_file" "$EXPECTED_HOMEPAGE_SHA256" 'Public homepage artifact'
  homepage_evidence='exact audited homepage bytes'
else
  homepage_evidence='homepage marker (no expected digest supplied)'
fi

# Confirm the public edge exposes the critical multilingual and crawler
# surfaces, not merely a healthy English homepage.
critical_paths=(
  '/de/' '/fr/' '/ja/' '/ru/'
  '/products.html' '/contact.html' '/BP-2P-95-0005.html'
  '/de/contact.html' '/fr/contact.html' '/ja/contact.html' '/ru/contact.html'
  '/robots.txt' '/sitemap.xml' '/sitemap-i18n.xml'
)
for critical_path in "${critical_paths[@]}"; do
  verify_status "$critical_path" 200
done

robots_body="$(curl --fail --silent --show-error --max-time 30 "$BASE_URL/robots.txt")"
robots_body="${robots_body//$'\r'/}"
if [[ "$(grep -Eic '^[[:space:]]*Sitemap:' <<<"$robots_body")" != '2' ]]; then
  echo 'The public robots.txt must contain exactly two Sitemap declarations.' >&2
  exit 1
fi
grep -Fqx 'Sitemap: https://www.begapunk.com/sitemap.xml' <<<"$robots_body" || {
  echo 'The public robots.txt does not declare the canonical sitemap.' >&2
  exit 1
}
grep -Fqx 'Sitemap: https://www.begapunk.com/sitemap-i18n.xml' <<<"$robots_body" || {
  echo 'The public robots.txt does not declare the multilingual sitemap.' >&2
  exit 1
}
for sitemap_path in sitemap.xml sitemap-i18n.xml; do
  sitemap_body="$(curl --fail --silent --show-error --max-time 30 "$BASE_URL/$sitemap_path")"
  if ! grep -Fq '<urlset' <<<"$sitemap_body" || ! grep -Fq 'https://www.begapunk.com/' <<<"$sitemap_body"; then
    echo "The public $sitemap_path is empty or does not use the canonical origin." >&2
    exit 1
  fi
done
if [[ -n "$EXPECTED_ROBOTS_SHA256" ]]; then
  verify_public_path_sha256 '/robots.txt' "$EXPECTED_ROBOTS_SHA256" 'Public robots.txt artifact'
fi
if [[ -n "$EXPECTED_SITEMAP_SHA256" ]]; then
  verify_public_path_sha256 '/sitemap.xml' "$EXPECTED_SITEMAP_SHA256" 'Public sitemap.xml artifact'
fi
if [[ -n "$EXPECTED_I18N_SITEMAP_SHA256" ]]; then
  verify_public_path_sha256 '/sitemap-i18n.xml' "$EXPECTED_I18N_SITEMAP_SHA256" 'Public sitemap-i18n.xml artifact'
fi
if [[ -n "$EXPECTED_ROBOTS_SHA256" && -n "$EXPECTED_SITEMAP_SHA256" && -n "$EXPECTED_I18N_SITEMAP_SHA256" ]]; then
  crawler_evidence='exact robots and sitemap bytes'
else
  crawler_evidence='robots and sitemap structure (not all expected digests supplied)'
fi

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

gone_paths=(
  '/locales/en.json'
  '/cgi-sys/suspendedpage.cgi'
)
for gone_path in "${gone_paths[@]}"; do
  verify_status "$gone_path" 410
done
verify_single_hop_redirect \
  '/index.html?gclid=redirect-gate&utm_source=post-deploy' \
  "$BASE_URL/?gclid=redirect-gate&utm_source=post-deploy"

verify_single_hop_redirect \
  '/3-in-3-out-Pneumatic-rotary-joint-P6776400.html' \
  "$BASE_URL/BP-3P-0004.html"
verify_single_hop_redirect '/BP-2P-95-0001.html' "$BASE_URL/BP-2P-95-0005.html"
# The separate legacy-PDF redirect change is not in this release's Nginx policy.
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
verify_final_http_status "$endpoint_headers" 405
verify_single_header_value "$endpoint_headers" 'Allow' 'POST'

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

echo "Public deployment verification passed: $homepage_evidence, $crawler_evidence, ${#critical_paths[@]} critical multilingual/crawler surfaces, $redirect_check_count site redirects, ${#gone_paths[@]} retired URLs, sensitive paths, branded 404, inquiry method, cache policy, security headers, and preserved Alt-Svc."
