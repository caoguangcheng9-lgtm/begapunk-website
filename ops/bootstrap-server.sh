#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:---check}"
LIVE_ROOT="${BEGAPUNK_LIVE_ROOT:-/www/wwwroot/47.252.73.192}"
BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
DEPLOY_USER="${BEGAPUNK_DEPLOY_USER:-codexdeploy}"
NGINX_CONF="${BEGAPUNK_NGINX_CONF:-/www/server/panel/vhost/nginx/html_47.252.73.192.conf}"
CURRENT_LINK="$BASE_DIR/current"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PRIVILEGED_NGINX_HELPER="/usr/local/sbin/begapunk-nginx-config"
SUDOERS_FILE="/etc/sudoers.d/begapunk-nginx-config"

echo "Live root: $LIVE_ROOT"
echo "Deployment base: $BASE_DIR"
echo "Nginx config: $NGINX_CONF"
echo "Deploy user: $DEPLOY_USER"
echo "rsync: $(command -v rsync || echo missing)"
echo "Current link: $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo not-configured)"
echo "Privileged Nginx helper: $PRIVILEGED_NGINX_HELPER"

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

if [[ -e "$BASE_DIR/.bootstrap-complete" ]]; then
  echo "Bootstrap was already completed; refusing to replace the active release layout." >&2
  exit 11
fi

[[ -d "$LIVE_ROOT" && -f "$LIVE_ROOT/index.html" ]] || { echo "Live root is invalid." >&2; exit 4; }
[[ -f "$NGINX_CONF" ]] || { echo "Nginx config is missing." >&2; exit 5; }
id "$DEPLOY_USER" >/dev/null 2>&1 || { echo "Deploy user does not exist." >&2; exit 6; }
[[ -f "$SCRIPT_DIR/install-nginx-managed-redirects.sh" ]] || { echo "Privileged Nginx helper source is missing." >&2; exit 9; }
[[ -f "$SCRIPT_DIR/nginx-managed-redirects.conf" ]] || { echo "Managed Nginx policy source is missing." >&2; exit 9; }

if ! command -v rsync >/dev/null 2>&1; then
  dnf install -y rsync
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
seed_id="initial-${timestamp}"
seed_dir="$BASE_DIR/releases/$seed_id"
config_backup="${NGINX_CONF}.pre-atomic-deploy-${timestamp}"

deploy_group="$(id -gn "$DEPLOY_USER")"
mkdir -p "$BASE_DIR/releases" "$BASE_DIR/shared" "$BASE_DIR/bin" "$BASE_DIR/staging"
# The sticky deployment root lets the deployment account switch its own
# `current` symlink without allowing it to rename the root-owned shared folder.
chown "root:$deploy_group" "$BASE_DIR"
chmod 1775 "$BASE_DIR"
chown root:root "$BASE_DIR/shared"
chmod 0755 "$BASE_DIR/shared"
chown -R "$DEPLOY_USER:$deploy_group" "$BASE_DIR/releases" "$BASE_DIR/bin" "$BASE_DIR/staging"
chmod 0750 "$BASE_DIR/bin" "$BASE_DIR/staging"

install -o root -g root -m 0755 \
  "$SCRIPT_DIR/install-nginx-managed-redirects.sh" \
  "$PRIVILEGED_NGINX_HELPER"

sudoers_candidate="${SUDOERS_FILE}.tmp-$$"
trap 'rm -f -- "$sudoers_candidate"' EXIT
printf '%s ALL=(root) NOPASSWD: %s\n' "$DEPLOY_USER" "$PRIVILEGED_NGINX_HELPER" > "$sudoers_candidate"
chmod 0440 "$sudoers_candidate"
if ! visudo -cf "$sudoers_candidate"; then
  echo "Generated sudoers rule is invalid; no site migration was attempted." >&2
  exit 10
fi

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

if [[ -d "$BASE_DIR/shared/.well-known" ]]; then
  ln -s "$BASE_DIR/shared/.well-known" "$seed_dir/.well-known"
fi

# The initial snapshot can contain the pre-hardening inquiry handler, which
# still reads __DIR__/.env. Keep that legacy rollback functional, but only
# behind the managed Nginx dotfile denial installed before this release is
# exposed. New releases read the shared path directly and never get this link.
if [[ -f "$seed_dir/send_inquiry.php" ]] \
  && ! grep -Eq '/www/begapunk/shared/[.]env|BEGAPUNK_ENV_FILE' "$seed_dir/send_inquiry.php"; then
  ln -s "$BASE_DIR/shared/.env" "$seed_dir/.env"
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
chown -R "$DEPLOY_USER:$deploy_group" "$seed_dir"

bootstrap_transaction="bootstrap-${timestamp}"
bootstrap_candidate="$BASE_DIR/staging/nginx-managed-${bootstrap_transaction}.conf"
install -o "$DEPLOY_USER" -g "$deploy_group" -m 0640 \
  "$SCRIPT_DIR/nginx-managed-redirects.conf" \
  "$bootstrap_candidate"
cp -a "$NGINX_CONF" "$config_backup"

# Stage and verify the sensitive-path policy against the existing site before
# changing the document root. This closes the window in which a legacy seed
# release could expose its compatibility .env link.
if ! "$PRIVILEGED_NGINX_HELPER" stage "$bootstrap_candidate" "$bootstrap_transaction"; then
  rm -f -- "$bootstrap_candidate"
  echo "Managed Nginx policy bootstrap failed before the site switch." >&2
  exit 9
fi
bootstrap_policy_staged=true
sudoers_installed=false
bootstrap_marker="$BASE_DIR/.bootstrap-complete"
bootstrap_marker_candidate="$BASE_DIR/.bootstrap-complete.$$"
rollback_bootstrap_on_exit() {
  local status="$?"
  rm -f -- "$sudoers_candidate" "$bootstrap_candidate" "$bootstrap_marker_candidate"
  if [[ "$bootstrap_policy_staged" == true ]]; then
    rm -f -- "$bootstrap_marker"
    if [[ "$sudoers_installed" == true ]]; then
      rm -f -- "$SUDOERS_FILE"
    fi
    if ! "$PRIVILEGED_NGINX_HELPER" rollback "$bootstrap_transaction"; then
      echo "CRITICAL: privileged rollback failed; restoring the original site configuration directly." >&2
      cp -a "$config_backup" "$NGINX_CONF"
      nginx -t && nginx -s reload || true
    fi
  fi
  exit "$status"
}
trap rollback_bootstrap_on_exit EXIT

next_link="$BASE_DIR/.current-bootstrap-$$"
ln -s "$seed_dir" "$next_link"
mv -Tf "$next_link" "$CURRENT_LINK"
chown -h "$DEPLOY_USER:$deploy_group" "$CURRENT_LINK"

sed -i "s#root[[:space:]]\+$LIVE_ROOT;#root $CURRENT_LINK;#" "$NGINX_CONF"

if ! grep -Fq "root $CURRENT_LINK;" "$NGINX_CONF"; then
  echo "Nginx document root was not updated; the staged policy was rolled back." >&2
  exit 7
fi

if ! nginx -t; then
  echo "Nginx validation failed; the staged policy and site configuration were restored." >&2
  exit 7
fi

if ! nginx -s reload; then
  echo "Nginx reload failed; the staged policy was rolled back." >&2
  exit 9
fi

if ! curl --fail --silent --show-error --max-time 20 \
  --resolve www.begapunk.com:443:127.0.0.1 \
  https://www.begapunk.com/ | grep -Eiq '<html|<!doctype html|BEGAPUNK'; then
  echo "Health check failed; the previous Nginx configuration was restored." >&2
  exit 8
fi

if ! mv -f -- "$sudoers_candidate" "$SUDOERS_FILE"; then
  echo "The least-privilege sudoers rule could not be installed; bootstrap was rolled back." >&2
  exit 10
fi
sudoers_installed=true
if ! "$PRIVILEGED_NGINX_HELPER" commit "$bootstrap_transaction"; then
  echo "The Nginx transaction could not be committed; bootstrap was rolled back." >&2
  exit 9
fi

printf 'completed=%s\nnginx_root=%s\ninitial_release=%s\n' \
  "$(date -Is)" "$CURRENT_LINK" "$seed_id" > "$bootstrap_marker_candidate"
chown "$DEPLOY_USER:$deploy_group" "$bootstrap_marker_candidate"
chmod 0644 "$bootstrap_marker_candidate"
mv -f -- "$bootstrap_marker_candidate" "$bootstrap_marker"

# The marker is the final commit point. Until it exists atomically, the EXIT
# trap can still use the retained transaction backup to restore both Nginx and
# the original document root.
bootstrap_policy_staged=false
sudoers_installed=false
rm -f -- "$bootstrap_candidate"
trap - EXIT

echo "Atomic deployment layout initialized."
echo "Initial release: $seed_id"
echo "Nginx backup: $config_backup"
