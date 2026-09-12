#!/usr/bin/env bash
set -Eeuo pipefail

TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$TEST_DIR/.." && pwd)"
test_count=0

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

expect_pass() {
  local label="$1"
  shift
  if ! "$@" >/dev/null 2>&1; then
    fail "$label was expected to pass"
  fi
  test_count=$((test_count + 1))
}

expect_fail() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$label was expected to fail"
  fi
  test_count=$((test_count + 1))
}

# If the sourced production verifier regresses and performs a request, the test
# fails locally without ever reaching the network.
curl() {
  fail 'sourcing the verifier attempted to invoke curl'
}

# shellcheck source=../ops/verify-public-deployment.sh
source "$REPO_ROOT/ops/verify-public-deployment.sh"

crlf_headers=$'HTTP/2 405\r\nContent-Type: text/html; charset=UTF-8\r\nAllow: POST\r\nCache-Control: no-store\r\n\r\n'
lf_headers=$'HTTP/1.1 405 Method Not Allowed\nContent-Type: text/html\nAllow: POST\n\n'
mixed_case_headers=$'HTTP/1.1 405 Method Not Allowed\r\naLlOw:\t POST \r\n\r\n'
duplicate_allow_headers=$'HTTP/1.1 405 Method Not Allowed\r\nAllow: POST\r\nallow: POST\r\n\r\n'
wrong_allow_headers=$'HTTP/1.1 405 Method Not Allowed\r\nAllow: GET\r\n\r\n'
missing_allow_headers=$'HTTP/1.1 405 Method Not Allowed\r\nContent-Type: text/plain\r\n\r\n'
proxy_headers=$'HTTP/1.1 200 Connection established\r\nAllow: CONNECT\r\nProxy-Agent: fixture\r\n\r\nHTTP/2 405\r\naLlOw: POST\r\nAlt-Svc: h3=":443"; ma=86400\r\n\r\n'
proxy_final_wrong_headers=$'HTTP/1.1 200 Connection established\r\nAllow: POST\r\n\r\nHTTP/2 405\r\nAllow: GET\r\n\r\n'
proxy_final_duplicate_headers=$'HTTP/1.1 200 Connection established\r\nAllow: CONNECT\r\n\r\nHTTP/2 405\r\nAllow: POST\r\nallow: POST\r\n\r\n'
empty_alt_svc_headers=$'HTTP/2 200\r\nAlt-Svc:   \r\n\r\n'
duplicate_alt_svc_headers=$'HTTP/2 200\r\nAlt-Svc: h3=":443"\r\nalt-svc: h3=":8443"\r\n\r\n'
missing_status_headers=$'Allow: POST\r\n\r\n'
digest_fixture="$(mktemp)"
trap 'rm -f -- "$digest_fixture"' EXIT
printf 'audited artifact\n' > "$digest_fixture"
digest_fixture_sha256="$(sha256sum "$digest_fixture" | awk '{print $1}')"

expect_pass 'standard CRLF status' verify_final_http_status "$crlf_headers" 405
expect_pass 'standard CRLF Allow' verify_single_header_value "$crlf_headers" Allow POST
expect_pass 'LF-only status' verify_final_http_status "$lf_headers" 405
expect_pass 'LF-only Allow' verify_single_header_value "$lf_headers" Allow POST
expect_pass 'case-insensitive name and HTTP whitespace' verify_single_header_value "$mixed_case_headers" allow POST
expect_fail 'duplicate Allow' verify_single_header_value "$duplicate_allow_headers" Allow POST
expect_fail 'wrong Allow' verify_single_header_value "$wrong_allow_headers" Allow POST
expect_fail 'missing Allow' verify_single_header_value "$missing_allow_headers" Allow POST
expect_pass 'proxy final status' verify_final_http_status "$proxy_headers" 405
expect_pass 'proxy ignores earlier Allow' verify_single_header_value "$proxy_headers" Allow POST
expect_pass 'proxy final non-empty Alt-Svc' verify_single_header_present "$proxy_headers" Alt-Svc
expect_fail 'proxy earlier Allow cannot hide wrong final Allow' verify_single_header_value "$proxy_final_wrong_headers" Allow POST
expect_fail 'proxy final duplicate Allow' verify_single_header_value "$proxy_final_duplicate_headers" Allow POST
expect_fail 'empty header value' verify_single_header_present "$empty_alt_svc_headers" Alt-Svc
expect_fail 'duplicate present-only header' verify_single_header_present "$duplicate_alt_svc_headers" Alt-Svc
expect_fail 'missing HTTP status line' verify_single_header_value "$missing_status_headers" Allow POST
expect_fail 'wrong final status' verify_final_http_status "$proxy_headers" 200
expect_pass 'matching artifact digest' verify_file_sha256 "$digest_fixture" "$digest_fixture_sha256" 'fixture'
expect_fail 'mismatched artifact digest' verify_file_sha256 "$digest_fixture" '0000000000000000000000000000000000000000000000000000000000000000' 'fixture'

echo "Public deployment header fixture tests passed: $test_count cases; no network access."
