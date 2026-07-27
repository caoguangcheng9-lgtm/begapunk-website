#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:---check}"
LIVE_ROOT="${BEGAPUNK_LIVE_ROOT:-/www/wwwroot/47.252.73.192}"
BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
DEPLOY_USER="${BEGAPUNK_DEPLOY_USER:-codexdeploy}"
NGINX_CONF="${BEGAPUNK_NGINX_CONF:-/www/server/panel/vhost/nginx/html_47.252.73.192.conf}"
CURRENT_LINK="$BASE_DIR/current"

echo "Live root: $LIVE_ROOT"
echo "Deployment base: $BASE_DIR"
echo "Nginx config: $NGINX_CONF"
echo "Deploy user: $DEPLOY_USER"
echo "rsync: $(command -v rsync || echo missing)"
echo "Current link: $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo not-configured)"

if [[ "$MODE" == "--check" ]]; then
  grep -nE '^[[:space:]]*root[[:space:]]+' "$NGINX_CONF" || true
  echo "Check complete. No server files were changed."
  exit 0
fi

if [[ "$MODE" != "--apply" ]]; then
  echo "Usage: bootstrap-server.sh [--check|--apply]" >&2
  exit 2
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "Bootstrap must run as root." >&2
  exit 3
fi

[[ -d "$LIVE_ROOT" && -f "$LIVE_ROOT/index.html" ]] || { echo "Live root is invalid." >&2; exit 4; }
[[ -f "$NGINX_CONF" ]] || { echo "Nginx config is missing." >&2; exit 5; }
id "$DEPLOY_USER" >/dev/null 2>&1 || { echo "Deploy user does not exist." >&2; exit 6; }

if ! command -v rsync >/dev/null 2>&1; then
  dnf install -y rsync
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
seed_id="initial-${timestamp}"
seed_dir="$BASE_DIR/releases/$seed_id"
config_backup="${NGINX_CONF}.pre-atomic-deploy-${timestamp}"

mkdir -p "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin"
chown "$DEPLOY_USER:$DEPLOY_USER" "$BASE_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$BASE_DIR/releases" "$BASE_DIR/bin"

if [[ -f "$LIVE_ROOT/.env" && ! -e "$BASE_DIR/shared/.env" ]]; then
  install -o root -g www -m 0640 "$LIVE_ROOT/.env" "$BASE_DIR/shared/.env"
fi

if [[ -d "$LIVE_ROOT/.well-known" && ! -e "$BASE_DIR/shared/.well-known" ]]; then
  cp -a "$LIVE_ROOT/.well-known" "$BASE_DIR/shared/.well-known"
fi

shopt -s nullglob
for verification_file in "$LIVE_ROOT"/WW_verify_*.txt; do
  if [[ ! -e "$BASE_DIR/shared/$(basename "$verification_file")" ]]; then
    cp -a "$verification_file" "$BASE_DIR/shared/"
  fi
done
shopt -u nullglob

mkdir -p "$seed_dir"
rsync -a --delete \
  --exclude='.env' \
  --exclude='.well-known' \
  --exclude='WW_verify_*.txt' \
  "$LIVE_ROOT/" "$seed_dir/"

ln -s "$BASE_DIR/shared/.env" "$seed_dir/.env"
if [[ -d "$BASE_DIR/shared/.well-known" ]]; then
  ln -s "$BASE_DIR/shared/.well-known" "$seed_dir/.well-known"
fi
shopt -s nullglob
for verification_file in "$BASE_DIR/shared"/WW_verify_*.txt; do
  ln -s "$verification_file" "$seed_dir/$(basename "$verification_file")"
done
shopt -u nullglob

(
  cd "$seed_dir"
  find . -type f ! -name manifest.sha256 -print0 | sort -z | xargs -0 sha256sum > manifest.sha256
)
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$seed_dir"

next_link="$BASE_DIR/.current-bootstrap-$$"
ln -s "$seed_dir" "$next_link"
mv -Tf "$next_link" "$CURRENT_LINK"

cp -a "$NGINX_CONF" "$config_backup"
sed -i "s#root[[:space:]]\+$LIVE_ROOT;#root $CURRENT_LINK;#" "$NGINX_CONF"

if ! nginx -t; then
  cp -a "$config_backup" "$NGINX_CONF"
  nginx -t
  echo "Nginx validation failed; configuration restored." >&2
  exit 7
fi

nginx -s reload
if ! curl --fail --silent --show-error --max-time 20 \
  --resolve www.begapunk.com:443:127.0.0.1 \
  https://www.begapunk.com/ | grep -Eiq '<html|<!doctype html|BEGAPUNK'; then
  cp -a "$config_backup" "$NGINX_CONF"
  nginx -t
  nginx -s reload
  echo "Health check failed; Nginx configuration restored." >&2
  exit 8
fi

printf 'completed=%s\nnginx_root=%s\ninitial_release=%s\n' \
  "$(date -Is)" "$CURRENT_LINK" "$seed_id" > "$BASE_DIR/.bootstrap-complete"
chown "$DEPLOY_USER:$DEPLOY_USER" "$BASE_DIR/.bootstrap-complete"

echo "Atomic deployment layout initialized."
echo "Initial release: $seed_id"
echo "Nginx backup: $config_backup"
