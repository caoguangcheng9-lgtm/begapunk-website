#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_CONF="${1:-}"
NGINX_CONF="${BEGAPUNK_NGINX_CONF:-/www/server/panel/vhost/nginx/html_47.252.73.192.conf}"
MANAGED_CONF="${BEGAPUNK_MANAGED_REDIRECTS:-/www/begapunk/shared/nginx-managed-redirects.conf}"
INCLUDE_LINE="    include $MANAGED_CONF;"

if [[ "$EUID" -ne 0 ]]; then
  echo "Managed redirect installation must run as root." >&2
  exit 2
fi

[[ -f "$SOURCE_CONF" ]] || { echo "Redirect source file is missing." >&2; exit 3; }
[[ -f "$NGINX_CONF" ]] || { echo "Nginx site configuration is missing." >&2; exit 4; }

server_blocks="$(grep -Ec '^[[:space:]]*server([[:space:]]*\{)?[[:space:]]*$' "$NGINX_CONF" || true)"
if [[ "$server_blocks" -ne 1 ]]; then
  echo "Expected exactly one server block in $NGINX_CONF; found $server_blocks." >&2
  exit 5
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
nginx_backup="${NGINX_CONF}.pre-managed-redirects-${timestamp}"
managed_backup=""
cp -a "$NGINX_CONF" "$nginx_backup"

mkdir -p "$(dirname "$MANAGED_CONF")"
if [[ -f "$MANAGED_CONF" ]]; then
  managed_backup="${MANAGED_CONF}.pre-${timestamp}"
  cp -a "$MANAGED_CONF" "$managed_backup"
fi
install -o root -g root -m 0644 "$SOURCE_CONF" "$MANAGED_CONF"

restore() {
  cp -a "$nginx_backup" "$NGINX_CONF"
  if [[ -n "$managed_backup" ]]; then
    cp -a "$managed_backup" "$MANAGED_CONF"
  else
    rm -f "$MANAGED_CONF"
  fi
}

if ! grep -Fq "include $MANAGED_CONF;" "$NGINX_CONF"; then
  temp_conf="${NGINX_CONF}.managed-redirects-$$"
  awk -v include_line="$INCLUDE_LINE" '
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
    END { if (!inserted) exit 1 }
  ' "$NGINX_CONF" > "$temp_conf"
  mv -f "$temp_conf" "$NGINX_CONF"
fi

if ! nginx -t; then
  restore
  nginx -t
  echo "Nginx validation failed; managed redirect changes were rolled back." >&2
  exit 6
fi

nginx -s reload

status=""
for attempt in {1..10}; do
  status="$(curl --noproxy '*' --silent --show-error --output /dev/null --max-time 20 \
    --resolve www.begapunk.com:443:127.0.0.1 \
    --write-out '%{http_code}|%{redirect_url}' \
    'https://www.begapunk.com/3-in-3-out-Pneumatic-rotary-joint-P6776400.html' || true)"
  if [[ "$status" == "301|https://www.begapunk.com/BP-3P-0004.html" ]]; then
    break
  fi
  sleep 1
done

if [[ "$status" != "301|https://www.begapunk.com/BP-3P-0004.html" ]]; then
  restore
  nginx -t
  nginx -s reload
  echo "Redirect verification failed ($status); configuration was rolled back." >&2
  exit 7
fi

rm -f "$nginx_backup"
if [[ -n "$managed_backup" ]]; then rm -f "$managed_backup"; fi
echo "Managed Nginx redirects installed and verified."
