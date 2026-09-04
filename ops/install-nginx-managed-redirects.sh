#!/usr/bin/env bash
set -Eeuo pipefail

# This is a privileged, root-owned helper. The deployment account may invoke it
# through sudo, but must never be able to replace this installed copy.
if [[ -n "${SUDO_USER:-}" ]]; then
  # Never allow caller-controlled environment variables to expand the scope of
  # the sudo-authorized helper.
  NGINX_CONF="/www/server/panel/vhost/nginx/html_47.252.73.192.conf"
  MANAGED_CONF="/www/begapunk/shared/nginx-managed-policy.conf"
  STAGING_DIR="/www/begapunk/staging"
  TRANSACTION_ROOT="/www/begapunk/shared/nginx-transactions"
  INQUIRY_ENV_FILE="/www/begapunk/shared/.env"
  LEGACY_MANAGED_CONF="/www/begapunk/shared/nginx-managed-redirects.conf"
  LEGACY_REWRITE_CONF="/www/server/panel/vhost/rewrite/begapunk_legacy_redirects.conf"
else
  NGINX_CONF="${BEGAPUNK_NGINX_CONF:-/www/server/panel/vhost/nginx/html_47.252.73.192.conf}"
  MANAGED_CONF="${BEGAPUNK_MANAGED_POLICY:-/www/begapunk/shared/nginx-managed-policy.conf}"
  STAGING_DIR="${BEGAPUNK_NGINX_STAGING:-/www/begapunk/staging}"
  TRANSACTION_ROOT="${BEGAPUNK_NGINX_TRANSACTIONS:-/www/begapunk/shared/nginx-transactions}"
  INQUIRY_ENV_FILE="${BEGAPUNK_INQUIRY_ENV_FILE:-/www/begapunk/shared/.env}"
  LEGACY_MANAGED_CONF="${BEGAPUNK_LEGACY_MANAGED_REDIRECTS:-/www/begapunk/shared/nginx-managed-redirects.conf}"
  LEGACY_REWRITE_CONF="${BEGAPUNK_LEGACY_REWRITE_CONF:-/www/server/panel/vhost/rewrite/begapunk_legacy_redirects.conf}"
fi
PRIVILEGED_HELPER="/usr/local/sbin/begapunk-nginx-config"
SUDOERS_FILE="/etc/sudoers.d/begapunk-nginx-config"
LEGACY_SUDOERS_FILE="/etc/sudoers.d/codexdeploy"
EXPECTED_HELPER_VERSION="begapunk-nginx-config-v3"
EXPECTED_SUDOERS_RULE="codexdeploy ALL=(root) NOPASSWD: $PRIVILEGED_HELPER"
INCLUDE_LINE="    include $MANAGED_CONF;"

usage() {
  echo "Usage: begapunk-nginx-config version" >&2
  echo "Usage: begapunk-nginx-config doctor" >&2
  echo "Usage: begapunk-nginx-config validate <candidate>" >&2
  echo "Usage: begapunk-nginx-config stage <candidate> <transaction-id>" >&2
  echo "       begapunk-nginx-config commit <transaction-id>" >&2
  echo "       begapunk-nginx-config rollback <transaction-id>" >&2
}

action="${1:-}"
transaction_id=""
candidate=""
case "$action" in
  version)
    [[ "$#" -eq 1 ]] || { usage; exit 2; }
    printf '%s\n' 'begapunk-nginx-config-v3'
    exit 0
    ;;
  doctor)
    [[ "$#" -eq 1 ]] || { usage; exit 2; }
    ;;
  validate)
    candidate="${2:-}"
    [[ "$#" -eq 2 ]] || { usage; exit 2; }
    if [[ -n "${SUDO_USER:-}" ]]; then
      echo "The read-only validate action must not be invoked through sudo." >&2
      exit 2
    fi
    ;;
  stage)
    candidate="${2:-}"
    transaction_id="${3:-}"
    [[ "$#" -eq 3 ]] || { usage; exit 2; }
    ;;
  commit|rollback)
    transaction_id="${2:-}"
    [[ "$#" -eq 2 ]] || { usage; exit 2; }
    ;;
  *)
    usage
    exit 2
    ;;
esac

if [[ "$action" != 'validate' && "$EUID" -ne 0 ]]; then
  echo "Begapunk Nginx policy changes must run as root." >&2
  exit 2
fi

if [[ "$action" =~ ^(stage|commit|rollback)$ && ! "$transaction_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{5,100}$ ]]; then
  echo "Invalid Nginx transaction id." >&2
  exit 3
fi

transaction_dir="$TRANSACTION_ROOT/$transaction_id"
if [[ "$action" =~ ^(stage|commit|rollback)$ ]]; then
  exec 9>/run/lock/begapunk-nginx-config.lock
  if ! flock -n 9; then
    echo "Another Begapunk Nginx policy operation is running." >&2
    exit 4
  fi
fi

trim_line() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

doctor_failures=0

doctor_fail() {
  printf 'ERROR: %s\n' "$1" >&2
  doctor_failures=$((doctor_failures + 1))
}

run_doctor() {
  local actual_sudoers=""
  local helper_metadata=""
  local sudoers_metadata=""

  doctor_failures=0

  if [[ "${BASH_SOURCE[0]}" != "$PRIVILEGED_HELPER" ]]; then
    doctor_fail "doctor must run from $PRIVILEGED_HELPER."
  fi
  if [[ ! -f "$PRIVILEGED_HELPER" || -L "$PRIVILEGED_HELPER" ]]; then
    doctor_fail "$PRIVILEGED_HELPER must be a regular, non-symlink file."
  else
    helper_metadata="$(stat -c '%U:%G:%a' "$PRIVILEGED_HELPER" 2>/dev/null || true)"
    if [[ "$helper_metadata" != 'root:root:755' ]]; then
      doctor_fail "$PRIVILEGED_HELPER must be owned by root:root with mode 0755; found ${helper_metadata:-unreadable}."
    fi
  fi

  if [[ ! -f "$SUDOERS_FILE" || -L "$SUDOERS_FILE" ]]; then
    doctor_fail "$SUDOERS_FILE must be a regular, non-symlink file."
  else
    sudoers_metadata="$(stat -c '%U:%G:%a' "$SUDOERS_FILE" 2>/dev/null || true)"
    if [[ "$sudoers_metadata" != 'root:root:440' ]]; then
      doctor_fail "$SUDOERS_FILE must be owned by root:root with mode 0440; found ${sudoers_metadata:-unreadable}."
    fi

    actual_sudoers="$(sed '/^[[:space:]]*$/d' "$SUDOERS_FILE" 2>/dev/null || true)"
    if [[ "$actual_sudoers" != "$EXPECTED_SUDOERS_RULE" ]]; then
      doctor_fail "$SUDOERS_FILE must contain only the expected codexdeploy helper rule."
    elif ! command -v visudo >/dev/null 2>&1; then
      doctor_fail "visudo is unavailable; the sudoers rule cannot be validated."
    elif ! visudo -cf "$SUDOERS_FILE" >/dev/null 2>&1; then
      doctor_fail "$SUDOERS_FILE does not pass visudo validation."
    fi
  fi

  if [[ -e "$LEGACY_SUDOERS_FILE" || -L "$LEGACY_SUDOERS_FILE" ]]; then
    doctor_fail "$LEGACY_SUDOERS_FILE must be absent."
  fi

  if (( doctor_failures > 0 )); then
    printf 'Doctor check failed: %d prerequisite(s) require attention.\n' "$doctor_failures" >&2
    return 1
  fi

  printf '%s\n' 'begapunk-nginx-config-doctor-ok:v3'
}

is_allowed_directive() {
  local directive="$1"
  case "$directive" in
    'expires -1;') ;;
    'etag on;') ;;
    'if_modified_since exact;') ;;
    'client_max_body_size 12m;') ;;
    'client_body_timeout 30s;') ;;
    'error_page 404 /404.html;') ;;
    'add_header X-Content-Type-Options "nosniff" always;') ;;
    'add_header X-Frame-Options "SAMEORIGIN" always;') ;;
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;') ;;
    'add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;') ;;
    'add_header Content-Security-Policy "frame-ancestors '\''self'\''; base-uri '\''self'\''; form-action '\''self'\''; object-src '\''none'\''" always;') ;;
    'add_header Strict-Transport-Security "max-age=31536000" always;') ;;
    'fastcgi_hide_header X-Powered-By;') ;;
    'server_tokens off;') ;;
    'if ($host = begapunk.com) { return 301 https://www.begapunk.com$request_uri; }') ;;
    'if ($scheme = http) { return 301 https://www.begapunk.com$request_uri; }') ;;
    'if ($uri ~ "(^|/)[.](?!well-known(?:/|$))") { return 404; }') ;;
    'if ($uri ~* ^/(PHPMailer|audit|catalog-project|i18n|scripts|ops|tests|tmp|node_modules)(/|$)) { return 404; }') ;;
    'if ($uri ~* ^/(manifest[.]sha256|package(-lock)?[.]json|DEPLOYMENT[.]md|PROJECT_HANDOFF[.]md|AGENTS[.]md)$) { return 404; }') ;;
    'rewrite (?i)^/3-in-3-out-Pneumatic-rotary-joint-P6776400[.]html$ https://www.begapunk.com/BP-3P-0004.html permanent;') ;;
    'rewrite (?i)^/Pneumatic-rotary-joint-c[0-9]+(?:/.*)?$ https://www.begapunk.com/products.html permanent;') ;;
    'rewrite (?i)^/Pneumatic-Fittings-c[0-9]+(?:/.*)?$ https://www.begapunk.com/products.html permanent;') ;;
    'rewrite (?i)^/hydraulic-rotary-joint-c[0-9]+(?:/.*)?$ https://www.begapunk.com/custom-hydraulic-rotary-unions.html permanent;') ;;
    'rewrite (?i)^/(?:inquiry|register)/?$ https://www.begapunk.com/contact.html permanent;') ;;
    'rewrite (?i)^/pages/faq[.]html$ https://www.begapunk.com/faq.html permanent;') ;;
    'rewrite (?i)^/pages/about-us(?:-[0-9]+)?[.]html$ https://www.begapunk.com/about.html permanent;') ;;
    'rewrite (?i)^/pages/privacy-policy[.]html$ https://www.begapunk.com/privacy.html permanent;') ;;
    'rewrite (?i)^/pages/(?:payment-methods|warranty-and-return)[.]html$ https://www.begapunk.com/terms.html permanent;') ;;
    'rewrite (?i)^/blog-123-13355/About-Begapunk-.*$ https://www.begapunk.com/about.html permanent;') ;;
    'rewrite (?i)^/blog-123-13355/.*Laser-Pipe-Cutting.*$ https://www.begapunk.com/application-laser-tube-cutting.html permanent;') ;;
    'rewrite (?i)^/blog-123-13355/.*Stainless-Steel.*$ https://www.begapunk.com/blog-rotary-joint-materials.html permanent;') ;;
    'rewrite (?i)^/blog-123-13355/.*$ https://www.begapunk.com/blog.html permanent;') ;;
    'rewrite (?i)^/tags/Stainless-Steel-Rotary-Joint[.]html$ https://www.begapunk.com/blog-rotary-joint-materials.html permanent;') ;;
    'rewrite (?i)^/tags/Low-speed-rotary-joint[.]html$ https://www.begapunk.com/products.html permanent;') ;;
    'rewrite (?i)^/tags/SMC-Rotary-Joints[.]html$ https://www.begapunk.com/blog.html permanent;') ;;
    'rewrite (?i)^/tags/.*$ https://www.begapunk.com/blog.html permanent;') ;;
    'if ($uri ~* ^/(?:locales/en[.]json|cgi-sys/suspendedpage[.]cgi)$) { return 410; }') ;;
    'rewrite ^/BP-2P-95-0001[.]html$ https://www.begapunk.com/BP-2P-95-0005.html permanent;') ;;
    'rewrite ^/(de|fr|ja|ru)/BP-2P-95-0001[.]html$ https://www.begapunk.com/$1/BP-2P-95-0005.html permanent;') ;;
    'rewrite ^/products-p2[.]html$ https://www.begapunk.com/products.html permanent;') ;;
    'rewrite ^/(de|fr|ja|ru)/products-p2[.]html$ https://www.begapunk.com/$1/products.html permanent;') ;;
    'if ($request_uri ~ "^/index[.]html(?:[?].*)?$") { return 301 https://www.begapunk.com/$is_args$args; }') ;;
    'if ($request_uri ~ "^/(de|fr|ja|ru)/index[.]html(?:[?].*)?$") { return 301 https://www.begapunk.com/$1/$is_args$args; }') ;;
    *)
      return 1
      ;;
  esac
  return 0
}

validate_candidate() {
  local source_file="$1"
  local raw=""
  local line=""
  local directive_count=0
  declare -A seen=()

  while IFS= read -r raw || [[ -n "$raw" ]]; do
    raw="${raw%$'\r'}"
    line="$(trim_line "$raw")"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if ! is_allowed_directive "$line"; then
      echo "Managed Nginx policy contains a forbidden directive: $line" >&2
      return 1
    fi
    if [[ -n "${seen[$line]:-}" ]]; then
      echo "Managed Nginx policy contains a duplicate directive: $line" >&2
      return 1
    fi
    seen[$line]=1
    directive_count=$((directive_count + 1))
  done < "$source_file"

  if [[ "$directive_count" -ne 43 ]]; then
    echo "Managed Nginx policy must contain exactly 43 approved directives; found $directive_count." >&2
    return 1
  fi
}

count_exact_include() {
  local config_file="$1"
  local include_path="$2"
  awk -v expected="include ${include_path};" '
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      if (line == expected) count++
    }
    END { print count + 0 }
  ' "$config_file"
}

count_exact_directive() {
  local config_file="$1"
  local expected_directive="$2"
  awk -v expected="$expected_directive" '
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      if (line == expected) count++
    }
    END { print count + 0 }
  ' "$config_file"
}

count_named_add_header() {
  local config_file="$1"
  local expected_name="$2"
  awk -v expected_name="$expected_name" '
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      prefix="add_header " expected_name " "
      if (index(tolower(line), tolower(prefix)) == 1) count++
    }
    END { print count + 0 }
  ' "$config_file"
}

extract_named_add_header() {
  local config_file="$1"
  local expected_name="$2"
  awk -v expected_name="$expected_name" '
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      prefix="add_header " expected_name " "
      if (index(tolower(line), tolower(prefix)) == 1) print line
    }
  ' "$config_file"
}

html_cache_state() {
  local config_file="$1"
  awk '
    {
      line=$0
      sub(/^[[:space:]]+/, "", line)
      sub(/[[:space:]]+$/, "", line)
      if (line == "location ~* \\.(?:html|xml|txt)$ {") {
        blocks++
        in_html_cache=1
        next
      }
      if (in_html_cache && line == "expires 10m;") old_value++
      if (in_html_cache && line == "expires -1;") new_value++
      if (in_html_cache && line == "}") in_html_cache=0
    }
    END { print (blocks + 0) "|" (old_value + 0) "|" (new_value + 0) }
  ' "$config_file"
}

ensure_include() {
  local alt_svc_after=""
  local alt_svc_before=""
  local exact_header_count=""
  local header_index=0
  local header_name_count=""
  local html_state=""
  local legacy_include_count=""
  local legacy_rewrite_include_count=""
  local managed_include_count=""
  local server_blocks=""
  local temp_conf=""
  local -a legacy_header_names=(
    'Strict-Transport-Security'
    'X-Content-Type-Options'
    'X-Frame-Options'
    'Referrer-Policy'
    'Permissions-Policy'
    'Content-Security-Policy'
  )
  local -a legacy_header_lines=(
    'add_header Strict-Transport-Security "max-age=31536000" always;'
    'add_header X-Content-Type-Options "nosniff" always;'
    'add_header X-Frame-Options "SAMEORIGIN" always;'
    'add_header Referrer-Policy "strict-origin-when-cross-origin" always;'
    'add_header Permissions-Policy "camera=(), geolocation=(), microphone=(), payment=(), usb=()" always;'
    'add_header Content-Security-Policy "base-uri '\''self'\''; form-action '\''self'\''; frame-ancestors '\''self'\''; object-src '\''none'\''" always;'
  )

  managed_include_count="$(count_exact_include "$NGINX_CONF" "$MANAGED_CONF")"
  legacy_include_count="$(count_exact_include "$NGINX_CONF" "$LEGACY_MANAGED_CONF")"
  legacy_rewrite_include_count="$(count_exact_include "$NGINX_CONF" "$LEGACY_REWRITE_CONF")"
  if [[ "$managed_include_count" -gt 1 || "$legacy_include_count" -gt 1 || "$legacy_rewrite_include_count" -gt 1 ]]; then
    echo "The Nginx vhost contains duplicate managed or legacy policy includes." >&2
    return 1
  fi

  for header_index in "${!legacy_header_names[@]}"; do
    exact_header_count="$(count_exact_directive "$NGINX_CONF" "${legacy_header_lines[$header_index]}")"
    header_name_count="$(count_named_add_header "$NGINX_CONF" "${legacy_header_names[$header_index]}")"
    if [[ "$exact_header_count" -gt 1 || "$header_name_count" != "$exact_header_count" ]]; then
      echo "Refusing to replace an unexpected ${legacy_header_names[$header_index]} directive in $NGINX_CONF." >&2
      return 1
    fi
  done

  if [[ "$(count_named_add_header "$NGINX_CONF" 'Alt-Svc')" != '1' ]]; then
    echo "Expected exactly one existing Alt-Svc directive in $NGINX_CONF." >&2
    return 1
  fi
  alt_svc_before="$(extract_named_add_header "$NGINX_CONF" 'Alt-Svc')"

  html_state="$(html_cache_state "$NGINX_CONF")"
  if [[ "$html_state" != '1|1|0' && "$html_state" != '1|0|1' ]]; then
    echo "Expected one Begapunk HTML cache location with exactly one supported expires value; found $html_state." >&2
    return 1
  fi

  server_blocks="$(grep -Ec '^[[:space:]]*server([[:space:]]*\{)?[[:space:]]*$' "$NGINX_CONF" || true)"
  if [[ "$server_blocks" -ne 1 ]]; then
    echo "Expected exactly one server block in $NGINX_CONF; found $server_blocks." >&2
    return 1
  fi

  temp_conf="${NGINX_CONF}.begapunk-$$"
  stage_temp_conf="$temp_conf"
  if ! awk \
    -v include_line="$INCLUDE_LINE" \
    -v managed_include="include ${MANAGED_CONF};" \
    -v legacy_include="include ${LEGACY_MANAGED_CONF};" \
    -v legacy_rewrite_include="include ${LEGACY_REWRITE_CONF};" \
    -v header_1="${legacy_header_lines[0]}" \
    -v header_2="${legacy_header_lines[1]}" \
    -v header_3="${legacy_header_lines[2]}" \
    -v header_4="${legacy_header_lines[3]}" \
    -v header_5="${legacy_header_lines[4]}" \
    -v header_6="${legacy_header_lines[5]}" '
    {
      normalized=$0
      sub(/^[[:space:]]+/, "", normalized)
      sub(/[[:space:]]+$/, "", normalized)
      if (normalized == managed_include || normalized == legacy_include || normalized == legacy_rewrite_include) next
      if (normalized == header_1 || normalized == header_2 || normalized == header_3 ||
          normalized == header_4 || normalized == header_5 || normalized == header_6) next
      if (normalized == "location ~* \\.(?:html|xml|txt)$ {") {
        html_cache_blocks++
        in_html_cache=1
      } else if (in_html_cache && (normalized == "expires 10m;" || normalized == "expires -1;")) {
        indentation=$0
        sub(/[^[:space:]].*$/, "", indentation)
        print indentation "expires -1;"
        html_cache_expiries++
        next
      } else if (in_html_cache && normalized == "}") {
        in_html_cache=0
      }
    }
    !inserted && /^[[:space:]]*server[[:space:]]*\{/ {
      print
      print include_line
      inserted=1
      next
    }
    !inserted && /^[[:space:]]*server[[:space:]]*$/ {
      print
      awaiting_server_brace=1
      next
    }
    awaiting_server_brace && /^[[:space:]]*\{/ {
      print
      print include_line
      inserted=1
      awaiting_server_brace=0
      next
    }
    { print }
    END {
      if (!inserted || html_cache_blocks != 1 || html_cache_expiries != 1) exit 1
    }
  ' "$NGINX_CONF" > "$temp_conf"; then
    rm -f -- "$temp_conf" || true
    stage_temp_conf=""
    return 1
  fi

  managed_include_count="$(count_exact_include "$temp_conf" "$MANAGED_CONF")"
  legacy_include_count="$(count_exact_include "$temp_conf" "$LEGACY_MANAGED_CONF")"
  legacy_rewrite_include_count="$(count_exact_include "$temp_conf" "$LEGACY_REWRITE_CONF")"
  html_state="$(html_cache_state "$temp_conf")"
  alt_svc_after="$(extract_named_add_header "$temp_conf" 'Alt-Svc')"
  if [[ "$managed_include_count" != '1' || "$legacy_include_count" != '0' \
    || "$legacy_rewrite_include_count" != '0' || "$html_state" != '1|0|1' \
    || "$alt_svc_after" != "$alt_svc_before" ]]; then
    echo "The generated Nginx vhost did not satisfy the exact migration contract." >&2
    rm -f -- "$temp_conf" || true
    stage_temp_conf=""
    return 1
  fi
  for header_index in "${!legacy_header_names[@]}"; do
    if [[ "$(count_named_add_header "$temp_conf" "${legacy_header_names[$header_index]}")" != '0' ]]; then
      echo "The generated Nginx vhost retained a superseded ${legacy_header_names[$header_index]} directive." >&2
      rm -f -- "$temp_conf" || true
      stage_temp_conf=""
      return 1
    fi
  done

  if ! chown --reference="$NGINX_CONF" "$temp_conf" \
    || ! chmod --reference="$NGINX_CONF" "$temp_conf" \
    || ! mv -f -- "$temp_conf" "$NGINX_CONF"; then
    rm -f -- "$temp_conf" || true
    stage_temp_conf=""
    return 1
  fi
  stage_temp_conf=""

  managed_include_count="$(count_exact_include "$NGINX_CONF" "$MANAGED_CONF")"
  legacy_include_count="$(count_exact_include "$NGINX_CONF" "$LEGACY_MANAGED_CONF")"
  legacy_rewrite_include_count="$(count_exact_include "$NGINX_CONF" "$LEGACY_REWRITE_CONF")"
  if [[ "$managed_include_count" != '1' || "$legacy_include_count" != '0' || "$legacy_rewrite_include_count" != '0' ]]; then
    echo "The Nginx vhost must contain exactly one active managed-policy include and no active legacy includes." >&2
    return 1
  fi
}

verify_effective_include() {
  local expanded_config=""
  local legacy_include_count=""
  local legacy_rewrite_include_count=""
  local managed_include_count=""

  if ! expanded_config="$(nginx -T 2>&1)"; then
    echo "Nginx could not expand the effective configuration." >&2
    return 1
  fi
  managed_include_count="$(grep -Fc "# configuration file $MANAGED_CONF:" <<<"$expanded_config" || true)"
  legacy_include_count="$(grep -Fc "# configuration file $LEGACY_MANAGED_CONF:" <<<"$expanded_config" || true)"
  legacy_rewrite_include_count="$(grep -Fc "# configuration file $LEGACY_REWRITE_CONF:" <<<"$expanded_config" || true)"
  if [[ "$managed_include_count" != '1' || "$legacy_include_count" != '0' || "$legacy_rewrite_include_count" != '0' ]]; then
    echo "The effective Nginx configuration must load the managed policy exactly once and must not load either legacy policy." >&2
    return 1
  fi
}

local_curl() {
  curl --noproxy '*' --silent --show-error --max-time 20 \
    --resolve www.begapunk.com:80:127.0.0.1 \
    --resolve www.begapunk.com:443:127.0.0.1 \
    --resolve begapunk.com:80:127.0.0.1 \
    --resolve begapunk.com:443:127.0.0.1 "$@"
}

verify_redirect() {
  local source_url="$1"
  local expected_url="$2"
  local status=""

  for _ in {1..10}; do
    status="$(local_curl --path-as-is --output /dev/null --max-redirs 0 \
      --write-out '%{http_code}|%{redirect_url}' "$source_url" || true)"
    [[ "$status" == "301|$expected_url" ]] && return 0
    sleep 1
  done

  echo "Redirect verification failed for $source_url ($status)." >&2
  return 1
}

verify_status() {
  local source_url="$1"
  local expected_status="$2"
  local status=""
  status="$(local_curl --path-as-is --output /dev/null --write-out '%{http_code}' "$source_url" || true)"
  if [[ "$status" != "$expected_status" ]]; then
    echo "Expected HTTP $expected_status from $source_url; received ${status:-no response}." >&2
    return 1
  fi
}

verify_single_header_value() {
  local headers="$1"
  local expected_name="$2"
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
  local expected_name="$2"
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

verify_live_policy() {
  verify_status 'https://www.begapunk.com/' 200 || return 1
  verify_redirect 'http://www.begapunk.com/?utm_source=nginx-install-http' 'https://www.begapunk.com/?utm_source=nginx-install-http' || return 1
  verify_redirect 'http://begapunk.com/?utm_source=nginx-install-apex-http' 'https://www.begapunk.com/?utm_source=nginx-install-apex-http' || return 1
  verify_redirect 'https://begapunk.com/?utm_source=nginx-install-apex' 'https://www.begapunk.com/?utm_source=nginx-install-apex' || return 1
  verify_redirect 'https://www.begapunk.com/index.html' 'https://www.begapunk.com/' || return 1
  verify_redirect 'https://www.begapunk.com/de/index.html' 'https://www.begapunk.com/de/' || return 1
  verify_redirect 'https://www.begapunk.com/fr/index.html' 'https://www.begapunk.com/fr/' || return 1
  verify_redirect 'https://www.begapunk.com/ja/index.html' 'https://www.begapunk.com/ja/' || return 1
  verify_redirect 'https://www.begapunk.com/ru/index.html' 'https://www.begapunk.com/ru/' || return 1
  verify_redirect 'https://www.begapunk.com/BP-2P-95-0001.html' 'https://www.begapunk.com/BP-2P-95-0005.html' || return 1
  verify_redirect 'https://www.begapunk.com/fr/BP-2P-95-0001.html' 'https://www.begapunk.com/fr/BP-2P-95-0005.html' || return 1
  verify_redirect 'https://www.begapunk.com/products-p2.html' 'https://www.begapunk.com/products.html' || return 1
  verify_redirect 'https://www.begapunk.com/fr/products-p2.html' 'https://www.begapunk.com/fr/products.html' || return 1
  verify_redirect 'https://www.begapunk.com/3-in-3-out-Pneumatic-rotary-joint-P6776400.html' 'https://www.begapunk.com/BP-3P-0004.html' || return 1
  verify_redirect 'https://www.begapunk.com/Pneumatic-rotary-joint-c123/' 'https://www.begapunk.com/products.html' || return 1
  verify_redirect 'https://www.begapunk.com/inquiry/' 'https://www.begapunk.com/contact.html' || return 1
  verify_redirect 'https://www.begapunk.com/pages/faq.html' 'https://www.begapunk.com/faq.html' || return 1
  verify_redirect 'https://www.begapunk.com/blog-123-13355/About-Begapunk-History.html' 'https://www.begapunk.com/about.html' || return 1
  verify_redirect 'https://www.begapunk.com/tags/Stainless-Steel-Rotary-Joint.html' 'https://www.begapunk.com/blog-rotary-joint-materials.html' || return 1
  verify_redirect \
    'https://www.begapunk.com/index.html?gclid=redirect-gate&utm_source=nginx-install' \
    'https://www.begapunk.com/?gclid=redirect-gate&utm_source=nginx-install' || return 1

  verify_status 'https://www.begapunk.com/.env' 404 || return 1
  verify_status 'https://www.begapunk.com/.git/config' 404 || return 1
  verify_status 'https://www.begapunk.com/manifest.sha256' 404 || return 1
  verify_status 'https://www.begapunk.com/PHPMailer/PHPMailer.php' 404 || return 1
  verify_redirect 'https://www.begapunk.com/hydraulic-rotary-joint-c123/retired.html' 'https://www.begapunk.com/custom-hydraulic-rotary-unions.html' || return 1
  verify_status 'https://www.begapunk.com/locales/en.json' 410 || return 1
  verify_status 'https://www.begapunk.com/cgi-sys/suspendedpage.cgi' 410 || return 1

  local not_found_body=""
  local headers=""
  not_found_body="$(local_curl --path-as-is 'https://www.begapunk.com/__begapunk_missing_policy_probe__' || true)"
  grep -Fq 'Page Not Found' <<<"$not_found_body" || {
    echo "The branded 404 document was not rendered." >&2
    return 1
  }
  verify_status 'https://www.begapunk.com/__begapunk_missing_policy_probe__' 404 || return 1

  headers="$(local_curl --head 'https://www.begapunk.com/' || true)"
  verify_single_header_value "$headers" 'X-Content-Type-Options' 'nosniff' || return 1
  verify_single_header_value "$headers" 'X-Frame-Options' 'SAMEORIGIN' || return 1
  verify_single_header_value "$headers" 'Referrer-Policy' 'strict-origin-when-cross-origin' || return 1
  verify_single_header_value "$headers" 'Permissions-Policy' 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' || return 1
  verify_single_header_value "$headers" 'Content-Security-Policy' "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" || return 1
  verify_single_header_value "$headers" 'Strict-Transport-Security' 'max-age=31536000' || return 1
  verify_single_header_value "$headers" 'Cache-Control' 'no-cache' || return 1
  verify_single_header_present "$headers" 'Alt-Svc' || return 1
}

restore_transaction() {
  local tx_dir="$1"
  [[ "$tx_dir" == "$TRANSACTION_ROOT/"* && -d "$tx_dir" && ! -L "$tx_dir" ]] || {
    echo "Nginx transaction backup is missing or unsafe: $tx_dir" >&2
    return 1
  }
  [[ -f "$tx_dir/backup-ready" && ! -L "$tx_dir/backup-ready" ]] || {
    echo "Nginx transaction backup is incomplete: $tx_dir" >&2
    return 1
  }
  [[ -f "$tx_dir/site.conf" && ! -L "$tx_dir/site.conf" ]] || {
    echo "Nginx site backup is missing or unsafe: $tx_dir/site.conf" >&2
    return 1
  }
  [[ -f "$NGINX_CONF" && ! -L "$NGINX_CONF" ]] || {
    echo "Refusing to restore over an unsafe Nginx site configuration path." >&2
    return 1
  }
  if [[ -e "$MANAGED_CONF" || -L "$MANAGED_CONF" ]]; then
    [[ -f "$MANAGED_CONF" && ! -L "$MANAGED_CONF" ]] || {
      echo "Refusing to restore over an unsafe managed-policy path." >&2
      return 1
    }
  fi

  if [[ -e "$tx_dir/managed-present" || -L "$tx_dir/managed-present" ]]; then
    [[ -f "$tx_dir/managed-present" && ! -L "$tx_dir/managed-present" \
      && -f "$tx_dir/managed.conf" && ! -L "$tx_dir/managed.conf" ]] || {
      echo "Managed-policy transaction backup is incomplete or unsafe." >&2
      return 1
    }
  elif [[ -e "$tx_dir/managed.conf" || -L "$tx_dir/managed.conf" ]]; then
    echo "Managed-policy transaction state is inconsistent." >&2
    return 1
  fi

  if ! cp -a -- "$tx_dir/site.conf" "$NGINX_CONF"; then
    echo "Failed to restore the Nginx site configuration; transaction backup retained." >&2
    return 1
  fi
  if [[ -f "$tx_dir/managed-present" ]]; then
    if ! cp -a -- "$tx_dir/managed.conf" "$MANAGED_CONF"; then
      echo "Failed to restore the managed Nginx policy; transaction backup retained." >&2
      return 1
    fi
  else
    if ! rm -f -- "$MANAGED_CONF"; then
      echo "Failed to remove the newly introduced managed policy; transaction backup retained." >&2
      return 1
    fi
  fi

  if ! nginx -t; then
    echo "Restored Nginx configuration does not validate; transaction backup retained." >&2
    return 1
  fi
  if ! nginx -s reload; then
    echo "Restored Nginx configuration could not be reloaded; transaction backup retained." >&2
    return 1
  fi
  if ! rm -rf -- "$tx_dir"; then
    echo "Nginx was restored, but its transaction record could not be removed." >&2
    return 1
  fi
}

stage_transaction_created=0
stage_backup_ready=0
stage_configuration_may_be_changed=0
stage_temp_conf=""

stage_failure_handler() {
  local original_status="${1:-1}"
  local recovery_failed=0

  trap - ERR HUP INT TERM
  [[ "$original_status" -ne 0 ]] || original_status=1

  if [[ -n "$stage_temp_conf" ]]; then
    if [[ "$stage_temp_conf" == "${NGINX_CONF}.begapunk-$$" ]]; then
      rm -f -- "$stage_temp_conf" || recovery_failed=1
    else
      echo "CRITICAL: refusing to remove an unexpected Nginx temporary path." >&2
      recovery_failed=1
    fi
    stage_temp_conf=""
  fi

  if [[ "$stage_configuration_may_be_changed" -eq 1 ]]; then
    echo "Managed Nginx policy staging failed; restoring the previous configuration." >&2
    if [[ "$stage_backup_ready" -ne 1 ]] || ! restore_transaction "$transaction_dir"; then
      recovery_failed=1
    fi
  elif [[ "$stage_transaction_created" -eq 1 || ( -d "$transaction_dir" && ! -L "$transaction_dir" ) ]]; then
    if ! rm -rf -- "$transaction_dir"; then
      echo "Failed to remove the incomplete Nginx transaction record." >&2
      recovery_failed=1
    fi
  fi

  if [[ "$recovery_failed" -ne 0 ]]; then
    echo "CRITICAL: automatic Nginx transaction recovery failed; manual recovery is required." >&2
    exit 9
  fi
  exit "$original_status"
}

stage_transaction() {
  local candidate_size=""
  local managed_parent=""

  [[ -f "$NGINX_CONF" && ! -L "$NGINX_CONF" ]] || { echo "Nginx site configuration is missing or is a symlink." >&2; return 1; }
  [[ -f "$INQUIRY_ENV_FILE" && ! -L "$INQUIRY_ENV_FILE" ]] || {
    echo "The external inquiry environment file is missing or is a symlink." >&2
    return 1
  }
  [[ "$(stat -c '%U:%G' "$INQUIRY_ENV_FILE")" == 'root:www' ]] || {
    echo "The inquiry environment file must be owned by root:www." >&2
    return 1
  }
  [[ "$(stat -c '%a' "$INQUIRY_ENV_FILE")" == '640' ]] || {
    echo "The inquiry environment file must use mode 0640." >&2
    return 1
  }
  [[ -d "$STAGING_DIR" && ! -L "$STAGING_DIR" ]] || { echo "Nginx staging directory is missing or is a symlink." >&2; return 1; }
  managed_parent="$(dirname "$MANAGED_CONF")"
  [[ -d "$managed_parent" && ! -L "$managed_parent" ]] || { echo "Managed-policy parent directory is missing or is a symlink." >&2; return 1; }
  if [[ -e "$TRANSACTION_ROOT" || -L "$TRANSACTION_ROOT" ]]; then
    [[ -d "$TRANSACTION_ROOT" && ! -L "$TRANSACTION_ROOT" ]] || {
      echo "Nginx transaction root is not a safe directory." >&2
      return 1
    }
  fi
  if [[ -e "$MANAGED_CONF" || -L "$MANAGED_CONF" ]]; then
    [[ -f "$MANAGED_CONF" && ! -L "$MANAGED_CONF" ]] || {
      echo "Managed Nginx policy path is not a regular file." >&2
      return 1
    }
  fi
  shopt -s nullglob
  for active_transaction in "$TRANSACTION_ROOT"/*; do
    if [[ -d "$active_transaction" && ! -f "$active_transaction/committed" ]]; then
      echo "An uncommitted Nginx policy transaction already exists: $(basename "$active_transaction")" >&2
      shopt -u nullglob
      return 1
    fi
  done
  shopt -u nullglob
  [[ "$candidate" == "$STAGING_DIR/nginx-managed-${transaction_id}.conf" ]] || {
    echo "Candidate must use the transaction-bound staging path." >&2
    return 1
  }
  [[ -f "$candidate" && ! -L "$candidate" ]] || { echo "Nginx policy candidate is missing or is a symlink." >&2; return 1; }
  candidate_size="$(stat -c '%s' "$candidate" 2>/dev/null || true)"
  [[ "$candidate_size" =~ ^[0-9]+$ && "$candidate_size" -le 32768 ]] || { echo "Nginx policy candidate is unexpectedly large or unreadable." >&2; return 1; }
  [[ ! -e "$transaction_dir" && ! -L "$transaction_dir" ]] || { echo "Nginx transaction already exists or is unsafe." >&2; return 1; }

  install -d -o root -g root -m 0700 "$TRANSACTION_ROOT"
  trap 'stage_failure_handler $?' ERR
  trap 'stage_failure_handler 129' HUP
  trap 'stage_failure_handler 130' INT
  trap 'stage_failure_handler 143' TERM
  install -d -o root -g root -m 0700 "$transaction_dir"
  stage_transaction_created=1
  install -o root -g root -m 0600 "$candidate" "$transaction_dir/candidate.conf"
  validate_candidate "$transaction_dir/candidate.conf"

  cp -a -- "$NGINX_CONF" "$transaction_dir/site.conf"
  if [[ -f "$MANAGED_CONF" ]]; then
    cp -a -- "$MANAGED_CONF" "$transaction_dir/managed.conf"
    touch "$transaction_dir/managed-present"
  fi
  touch "$transaction_dir/backup-ready"
  stage_backup_ready=1

  # Mark the configuration as potentially changed before opening the
  # destination, because a failed copy can still truncate an existing file.
  stage_configuration_may_be_changed=1
  install -o root -g root -m 0644 "$transaction_dir/candidate.conf" "$MANAGED_CONF"
  ensure_include
  nginx -t
  verify_effective_include
  nginx -s reload
  verify_live_policy
  echo "Managed Nginx policy staged and locally verified: $transaction_id"
  trap - ERR HUP INT TERM
}

rollback_transaction() {
  local active_transaction=""

  if [[ -e "$TRANSACTION_ROOT" || -L "$TRANSACTION_ROOT" ]]; then
    [[ -d "$TRANSACTION_ROOT" && ! -L "$TRANSACTION_ROOT" ]] || {
      echo "Nginx transaction root is not a safe directory." >&2
      return 1
    }
  fi
  if [[ -e "$transaction_dir" || -L "$transaction_dir" ]]; then
    [[ -d "$transaction_dir" && ! -L "$transaction_dir" ]] || {
      echo "Requested Nginx transaction path is not a safe directory." >&2
      return 1
    }
    restore_transaction "$transaction_dir"
    echo "Managed Nginx policy rolled back: $transaction_id"
    return 0
  fi

  if [[ -d "$TRANSACTION_ROOT" ]]; then
    shopt -s nullglob
    for active_transaction in "$TRANSACTION_ROOT"/*; do
      if [[ -L "$active_transaction" || ! -d "$active_transaction" ]]; then
        echo "Unexpected unsafe entry in the Nginx transaction root: $(basename "$active_transaction")" >&2
        shopt -u nullglob
        return 1
      fi
      if [[ ! -f "$active_transaction/committed" ]]; then
        echo "Requested transaction $transaction_id is absent, but a different uncommitted transaction exists: $(basename "$active_transaction")" >&2
        shopt -u nullglob
        return 1
      fi
    done
    shopt -u nullglob
  fi

  echo "Managed Nginx transaction is already absent; rollback is complete: $transaction_id"
}

case "$action" in
  doctor)
    run_doctor
    ;;
  validate)
    [[ -f "$candidate" && ! -L "$candidate" ]] || { echo "Nginx policy candidate is missing or is a symlink." >&2; exit 4; }
    validate_candidate "$candidate"
    echo "Managed Nginx policy candidate is allowlisted."
    ;;
  stage)
    stage_transaction
    ;;
  commit)
    [[ -d "$transaction_dir" && ! -L "$transaction_dir" \
      && -f "$transaction_dir/backup-ready" && ! -L "$transaction_dir/backup-ready" ]] || {
      echo "Nginx transaction does not exist or is incomplete." >&2
      exit 4
    }
    touch "$transaction_dir/committed"
    # Retain the latest committed backup so an interrupted SSH response can
    # still be rolled back safely. Remove older, root-created committed records.
    shopt -s nullglob
    for old_transaction in "$TRANSACTION_ROOT"/*; do
      [[ "$old_transaction" == "$transaction_dir" ]] && continue
      [[ "$old_transaction" == "$TRANSACTION_ROOT/"* && -f "$old_transaction/committed" ]] || continue
      rm -rf -- "$old_transaction"
    done
    shopt -u nullglob
    echo "Managed Nginx policy committed: $transaction_id"
    ;;
  rollback)
    rollback_transaction
    ;;
esac
