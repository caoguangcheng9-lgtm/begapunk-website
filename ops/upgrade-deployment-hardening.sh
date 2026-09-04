#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:---check}"
BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
DEPLOY_USER="${BEGAPUNK_DEPLOY_USER:-codexdeploy}"
CURRENT_LINK="$BASE_DIR/current"
SHARED_DIR="$BASE_DIR/shared"
TRANSACTION_ROOT="$SHARED_DIR/nginx-transactions"
MAINTENANCE_LOCK="$BASE_DIR/maintenance.lock"
HARDENING_MARKER="$BASE_DIR/.hardening-complete"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PRIVILEGED_NGINX_HELPER="/usr/local/sbin/begapunk-nginx-config"
SUDOERS_FILE="/etc/sudoers.d/begapunk-nginx-config"
LEGACY_SUDOERS_FILE="/etc/sudoers.d/codexdeploy"
BACKUP_ROOT="/var/backups"
EXPECTED_HELPER_VERSION="begapunk-nginx-config-v3"
EXPECTED_MARKER_VERSION="v3"
EXPECTED_DOCTOR_RESULT="begapunk-nginx-config-doctor-ok:v3"

echo "Deployment base: $BASE_DIR"
echo "Current release: $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo missing)"
echo "Shared inquiry configuration: $SHARED_DIR/.env"
echo "Privileged helper: $PRIVILEGED_NGINX_HELPER"
echo "Deployment maintenance lock: $MAINTENANCE_LOCK"

if [[ "$MODE" != '--check' && "$MODE" != '--apply' ]]; then
  echo "Usage: upgrade-deployment-hardening.sh [--check|--apply]" >&2
  exit 2
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "Deployment hardening check/upgrade must run as root so ownership and sudoers can be verified." >&2
  exit 3
fi

check_failures=0

fail_check() {
  printf 'ERROR: %s\n' "$1" >&2
  check_failures=$((check_failures + 1))
}

run_hardening_checks() {
  local require_marker="${1:-true}"
  local require_doctor="${2:-true}"
  local active_release=""
  local deploy_group=""
  local env_metadata=""
  local helper_metadata=""
  local helper_version=""
  local sudoers_metadata=""
  local expected_sudoers=""
  local actual_sudoers=""
  local lock_metadata=""
  local marker_metadata=""
  local doctor_output=""
  local doctor_last_line=""

  check_failures=0

  if [[ ! -L "$CURRENT_LINK" ]]; then
    fail_check "$CURRENT_LINK must be a symbolic link to an initialized release."
  else
    active_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
    if [[ -z "$active_release" || "$active_release" != "$BASE_DIR/releases/"* || ! -d "$active_release" || ! -f "$active_release/index.html" ]]; then
      fail_check "$CURRENT_LINK must resolve inside $BASE_DIR/releases and contain index.html."
    else
      printf 'OK: active release %s\n' "$active_release"
    fi
  fi

  if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
    fail_check "deployment user $DEPLOY_USER does not exist."
  else
    deploy_group="$(id -gn "$DEPLOY_USER")"
    printf 'OK: deployment identity %s:%s\n' "$DEPLOY_USER" "$deploy_group"
  fi

  if [[ -n "$deploy_group" ]]; then
    if [[ ! -f "$MAINTENANCE_LOCK" || -L "$MAINTENANCE_LOCK" ]]; then
      fail_check "$MAINTENANCE_LOCK must be a regular, non-symlink file."
    else
      lock_metadata="$(stat -c '%U:%G:%a' "$MAINTENANCE_LOCK" 2>/dev/null || true)"
      if [[ "$lock_metadata" != "root:$deploy_group:660" ]]; then
        fail_check "$MAINTENANCE_LOCK must be owned by root:$deploy_group with mode 0660; found ${lock_metadata:-unreadable}."
      else
        printf 'OK: deployment maintenance lock ownership and mode %s\n' "$lock_metadata"
      fi
    fi
  fi

  if [[ ! -f "$SHARED_DIR/.env" || -L "$SHARED_DIR/.env" ]]; then
    fail_check "$SHARED_DIR/.env must be a regular, non-symlink file."
  else
    env_metadata="$(stat -c '%U:%G:%a' "$SHARED_DIR/.env" 2>/dev/null || true)"
    if [[ "$env_metadata" != 'root:www:640' ]]; then
      fail_check "$SHARED_DIR/.env must be owned by root:www with mode 0640; found ${env_metadata:-unreadable}."
    else
      printf 'OK: inquiry environment ownership and mode %s\n' "$env_metadata"
    fi
  fi

  if [[ ! -f "$PRIVILEGED_NGINX_HELPER" || -L "$PRIVILEGED_NGINX_HELPER" || ! -x "$PRIVILEGED_NGINX_HELPER" ]]; then
    fail_check "$PRIVILEGED_NGINX_HELPER must be a regular, non-symlink executable."
  else
    helper_metadata="$(stat -c '%U:%G:%a' "$PRIVILEGED_NGINX_HELPER" 2>/dev/null || true)"
    if [[ "$helper_metadata" != 'root:root:755' ]]; then
      fail_check "$PRIVILEGED_NGINX_HELPER must be owned by root:root with mode 0755; found ${helper_metadata:-unreadable}."
    else
      printf 'OK: privileged helper ownership and mode %s\n' "$helper_metadata"
    fi

    if helper_version="$("$PRIVILEGED_NGINX_HELPER" version 2>/dev/null)"; then
      if [[ "$helper_version" != "$EXPECTED_HELPER_VERSION" ]]; then
        fail_check "privileged helper version mismatch; expected $EXPECTED_HELPER_VERSION, found ${helper_version:-empty}."
      else
        printf 'OK: privileged helper version %s\n' "$helper_version"
      fi
    else
      fail_check "$PRIVILEGED_NGINX_HELPER version failed."
    fi
  fi

  expected_sudoers="$DEPLOY_USER ALL=(root) NOPASSWD: $PRIVILEGED_NGINX_HELPER"
  if [[ ! -f "$SUDOERS_FILE" || -L "$SUDOERS_FILE" ]]; then
    fail_check "$SUDOERS_FILE must be a regular, non-symlink file."
  else
    sudoers_metadata="$(stat -c '%U:%G:%a' "$SUDOERS_FILE" 2>/dev/null || true)"
    if [[ "$sudoers_metadata" != 'root:root:440' ]]; then
      fail_check "$SUDOERS_FILE must be owned by root:root with mode 0440; found ${sudoers_metadata:-unreadable}."
    else
      printf 'OK: sudoers ownership and mode %s\n' "$sudoers_metadata"
    fi

    actual_sudoers="$(sed '/^[[:space:]]*$/d' "$SUDOERS_FILE" 2>/dev/null || true)"
    if [[ "$actual_sudoers" != "$expected_sudoers" ]]; then
      fail_check "$SUDOERS_FILE must contain only the expected least-privilege helper rule."
    elif ! visudo -cf "$SUDOERS_FILE" >/dev/null 2>&1; then
      fail_check "$SUDOERS_FILE does not pass visudo validation."
    else
      echo "OK: least-privilege sudoers rule is valid."
    fi
  fi

  if [[ -e "$LEGACY_SUDOERS_FILE" || -L "$LEGACY_SUDOERS_FILE" ]]; then
    fail_check "$LEGACY_SUDOERS_FILE still exists; review and remove the older broad deployment rule before release."
  else
    echo "OK: legacy deployment sudoers rule is absent."
  fi

  if [[ -n "$deploy_group" && -f "$PRIVILEGED_NGINX_HELPER" && ! -L "$PRIVILEGED_NGINX_HELPER" ]]; then
    if helper_version="$(sudo -u "$DEPLOY_USER" sudo -n "$PRIVILEGED_NGINX_HELPER" version 2>/dev/null)"; then
      if [[ "$helper_version" != "$EXPECTED_HELPER_VERSION" ]]; then
        fail_check "deployment-user sudo helper version mismatch; expected $EXPECTED_HELPER_VERSION, found ${helper_version:-empty}."
      else
        printf 'OK: %s can invoke the expected helper version non-interactively.\n' "$DEPLOY_USER"
      fi
    else
      fail_check "$DEPLOY_USER cannot run sudo -n $PRIVILEGED_NGINX_HELPER version."
    fi

    if [[ "$require_doctor" == true ]]; then
      if doctor_output="$(sudo -u "$DEPLOY_USER" sudo -n "$PRIVILEGED_NGINX_HELPER" doctor 2>/dev/null)"; then
        doctor_last_line="${doctor_output##*$'\n'}"
        if [[ "$doctor_last_line" != "$EXPECTED_DOCTOR_RESULT" ]]; then
          fail_check "helper doctor result mismatch; expected $EXPECTED_DOCTOR_RESULT, found ${doctor_last_line:-empty}."
        else
          printf 'OK: privileged helper doctor %s\n' "$doctor_last_line"
        fi
      else
        fail_check "$DEPLOY_USER cannot complete the privileged helper doctor check."
      fi
    fi
  fi

  if [[ "$require_marker" == true ]]; then
    if [[ ! -f "$HARDENING_MARKER" || -L "$HARDENING_MARKER" ]]; then
      fail_check "$HARDENING_MARKER must be a regular, non-symlink file."
    else
      marker_metadata="$(stat -c '%U:%G:%a' "$HARDENING_MARKER" 2>/dev/null || true)"
      if [[ "$marker_metadata" != 'root:root:644' ]]; then
        fail_check "$HARDENING_MARKER must be owned by root:root with mode 0644; found ${marker_metadata:-unreadable}."
      elif [[ "$(grep -Fxc "helper_version=$EXPECTED_MARKER_VERSION" "$HARDENING_MARKER" 2>/dev/null || true)" != '1' ]]; then
        fail_check "$HARDENING_MARKER must attest helper_version=$EXPECTED_MARKER_VERSION exactly once."
      else
        printf 'OK: hardening marker ownership, mode and version %s\n' "$EXPECTED_MARKER_VERSION"
      fi
    fi
  fi

  if (( check_failures > 0 )); then
    printf 'Hardening check failed: %d prerequisite(s) require attention.\n' "$check_failures" >&2
    return 1
  fi

  echo "Hardening check passed."
}

if [[ "$MODE" == '--check' ]]; then
  run_hardening_checks true true
  echo "No server files were changed."
  exit 0
fi

active_release="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
[[ -L "$CURRENT_LINK" && -n "$active_release" && "$active_release" == "$BASE_DIR/releases/"* && -d "$active_release" && -f "$active_release/index.html" ]] || {
  echo "An initialized current release inside $BASE_DIR/releases is required; run bootstrap-server.sh instead." >&2
  exit 4
}
id "$DEPLOY_USER" >/dev/null 2>&1 || { echo "Deployment user does not exist." >&2; exit 5; }
getent group www >/dev/null 2>&1 || { echo "The PHP-FPM group www does not exist." >&2; exit 5; }
[[ -d "$BASE_DIR" && ! -L "$BASE_DIR" ]] || { echo "Deployment base must be a real directory." >&2; exit 5; }
[[ -f "$SCRIPT_DIR/install-nginx-managed-redirects.sh" && ! -L "$SCRIPT_DIR/install-nginx-managed-redirects.sh" ]] || { echo "Privileged helper source is missing or unsafe." >&2; exit 6; }
[[ -f "$SCRIPT_DIR/nginx-managed-redirects.conf" && ! -L "$SCRIPT_DIR/nginx-managed-redirects.conf" ]] || { echo "Managed Nginx policy source is missing or unsafe." >&2; exit 6; }
if [[ -e "$HARDENING_MARKER" || -L "$HARDENING_MARKER" ]]; then
  [[ -f "$HARDENING_MARKER" && ! -L "$HARDENING_MARKER" ]] || {
    echo "The hardening marker path must not be a symlink or special file." >&2
    exit 6
  }
fi
if [[ -e "$LEGACY_SUDOERS_FILE" || -L "$LEGACY_SUDOERS_FILE" ]]; then
  echo "$LEGACY_SUDOERS_FILE still exists." >&2
  echo "Review and remove that older broad rule before rerunning --apply; no hardening files were changed." >&2
  exit 8
fi

for source_file in "$SCRIPT_DIR/install-nginx-managed-redirects.sh" "$SCRIPT_DIR/nginx-managed-redirects.conf"; do
  source_owner="$(stat -c '%U' "$source_file")"
  source_mode="$(stat -c '%a' "$source_file")"
  if [[ "$source_owner" != root || $((8#$source_mode & 8#22)) -ne 0 ]]; then
    echo "Hardening source must be root-owned and not group/world writable: $source_file ($source_owner:$source_mode)." >&2
    exit 6
  fi
done

if source_helper_version="$(env -u SUDO_USER -u SUDO_UID -u SUDO_GID bash "$SCRIPT_DIR/install-nginx-managed-redirects.sh" version 2>/dev/null)"; then
  [[ "$source_helper_version" == "$EXPECTED_HELPER_VERSION" ]] || {
    echo "Privileged helper source version mismatch; expected $EXPECTED_HELPER_VERSION, found ${source_helper_version:-empty}." >&2
    exit 6
  }
else
  echo "Privileged helper source does not support the required version action." >&2
  exit 6
fi
env -u SUDO_USER -u SUDO_UID -u SUDO_GID \
  bash "$SCRIPT_DIR/install-nginx-managed-redirects.sh" validate "$SCRIPT_DIR/nginx-managed-redirects.conf"

# Some minimal server images omit /var/backups. Create only that conventional
# root-owned container, and fail closed if an existing path is unsafe.
if [[ -e "$BACKUP_ROOT" || -L "$BACKUP_ROOT" ]]; then
  [[ -d "$BACKUP_ROOT" && ! -L "$BACKUP_ROOT" ]] || {
    echo "Hardening backup root must be a real directory: $BACKUP_ROOT" >&2
    exit 6
  }
else
  install -d -o root -g root -m 0755 "$BACKUP_ROOT"
fi
backup_root_owner="$(stat -c '%U' "$BACKUP_ROOT")"
backup_root_mode="$(stat -c '%a' "$BACKUP_ROOT")"
if [[ "$backup_root_owner" != root || $((8#$backup_root_mode & 8#22)) -ne 0 ]]; then
  echo "Hardening backup root must be root-owned and not group/world writable: $BACKUP_ROOT ($backup_root_owner:$backup_root_mode)." >&2
  exit 6
fi

deploy_group="$(id -gn "$DEPLOY_USER")"

# Secure the group-writable base before creating a root-owned lock inside it.
chown "root:$deploy_group" "$BASE_DIR"
chmod 1775 "$BASE_DIR"

maintenance_candidate=""
if [[ -e "$MAINTENANCE_LOCK" || -L "$MAINTENANCE_LOCK" ]]; then
  [[ -f "$MAINTENANCE_LOCK" && ! -L "$MAINTENANCE_LOCK" ]] || {
    echo "Deployment maintenance lock path is unsafe." >&2
    exit 9
  }
else
  maintenance_candidate="$(mktemp "$BASE_DIR/.maintenance-lock.XXXXXX")"
  chown "root:$deploy_group" "$maintenance_candidate"
  chmod 0660 "$maintenance_candidate"
  mv -Tf -- "$maintenance_candidate" "$MAINTENANCE_LOCK"
  maintenance_candidate=""
fi
chown "root:$deploy_group" "$MAINTENANCE_LOCK"
chmod 0660 "$MAINTENANCE_LOCK"
exec 8<>"$MAINTENANCE_LOCK"
if ! flock -n 8; then
  echo "A deployment or another hardening upgrade currently holds $MAINTENANCE_LOCK." >&2
  exit 9
fi

# Never replace the helper while a workflow-owned transaction is unfinished.
if [[ -e "$TRANSACTION_ROOT" || -L "$TRANSACTION_ROOT" ]]; then
  [[ -d "$TRANSACTION_ROOT" && ! -L "$TRANSACTION_ROOT" ]] || {
    echo "Nginx transaction root is unsafe: $TRANSACTION_ROOT" >&2
    exit 9
  }
  shopt -s nullglob
  for active_transaction in "$TRANSACTION_ROOT"/*; do
    if [[ -d "$active_transaction" && ! -f "$active_transaction/committed" ]]; then
      echo "An uncommitted Nginx transaction must be recovered before hardening: $(basename "$active_transaction")" >&2
      shopt -u nullglob
      exit 9
    fi
  done
  shopt -u nullglob
fi

for managed_dir in "$BASE_DIR/releases" "$SHARED_DIR" "$BASE_DIR/bin" "$BASE_DIR/staging"; do
  if [[ -e "$managed_dir" || -L "$managed_dir" ]]; then
    [[ -d "$managed_dir" && ! -L "$managed_dir" ]] || {
      echo "Managed deployment path must be a real directory: $managed_dir" >&2
      exit 9
    }
  fi
done

mkdir -p "$BASE_DIR/releases" "$SHARED_DIR" "$BASE_DIR/bin" "$BASE_DIR/staging"
chown root:root "$SHARED_DIR"
chmod 0755 "$SHARED_DIR"
chown "$DEPLOY_USER:$deploy_group" "$BASE_DIR/releases" "$BASE_DIR/bin" "$BASE_DIR/staging"
chmod 0755 "$BASE_DIR/releases"
chmod 0750 "$BASE_DIR/bin" "$BASE_DIR/staging"
chown -h "$DEPLOY_USER:$deploy_group" "$CURRENT_LINK"

if [[ -L "$SHARED_DIR/.env" ]]; then
  echo "The shared inquiry environment path must not be a symlink." >&2
  exit 7
elif [[ ! -e "$SHARED_DIR/.env" ]]; then
  [[ -f "$CURRENT_LINK/.env" ]] || {
    echo "No existing inquiry environment file is available for migration." >&2
    exit 7
  }
  install -o root -g www -m 0640 "$CURRENT_LINK/.env" "$SHARED_DIR/.env"
else
  [[ -f "$SHARED_DIR/.env" && ! -L "$SHARED_DIR/.env" ]] || {
    echo "The shared inquiry environment path must be a regular file." >&2
    exit 7
  }
  chown root:www "$SHARED_DIR/.env"
  chmod 0640 "$SHARED_DIR/.env"
fi

backup_dir="$(mktemp -d "$BACKUP_ROOT/begapunk-hardening.XXXXXX")"
chown root:root "$backup_dir"
chmod 0700 "$backup_dir"
helper_had_previous=false
sudoers_had_previous=false
marker_had_previous=false
helper_changed=false
sudoers_changed=false
marker_changed=false
policy_attempted=false
upgrade_succeeded=false
helper_candidate=""
sudoers_candidate=""
policy_candidate_tmp=""
marker_candidate=""
policy_transaction="hardening-$(date +%Y%m%d-%H%M%S)-$$"
policy_candidate="$BASE_DIR/staging/nginx-managed-${policy_transaction}.conf"

if [[ -e "$PRIVILEGED_NGINX_HELPER" || -L "$PRIVILEGED_NGINX_HELPER" ]]; then
  [[ -f "$PRIVILEGED_NGINX_HELPER" && ! -L "$PRIVILEGED_NGINX_HELPER" ]] || { echo "Existing privileged helper path is unsafe." >&2; exit 10; }
  cp -a -- "$PRIVILEGED_NGINX_HELPER" "$backup_dir/helper"
  helper_had_previous=true
fi
if [[ -e "$SUDOERS_FILE" || -L "$SUDOERS_FILE" ]]; then
  [[ -f "$SUDOERS_FILE" && ! -L "$SUDOERS_FILE" ]] || { echo "Existing sudoers path is unsafe." >&2; exit 10; }
  cp -a -- "$SUDOERS_FILE" "$backup_dir/sudoers"
  sudoers_had_previous=true
fi
if [[ -e "$HARDENING_MARKER" ]]; then
  cp -a -- "$HARDENING_MARKER" "$backup_dir/hardening-marker"
  marker_had_previous=true
fi

cleanup_upgrade() {
  local status="${1:-1}"
  local policy_rollback_ok=true
  local recovery_failed=0
  local marker_restore_candidate=""
  local helper_restore_candidate=""
  local sudoers_restore_candidate=""
  trap - EXIT INT TERM
  set +e

  if ! rm -f -- "$maintenance_candidate" "$helper_candidate" "$sudoers_candidate" "$policy_candidate_tmp" "$marker_candidate"; then
    echo "CRITICAL: failed to remove one or more interrupted-upgrade temporary files." >&2
    recovery_failed=1
  fi

  if [[ "$upgrade_succeeded" != true ]]; then
    if [[ "$policy_attempted" == true ]]; then
      if [[ -x "$PRIVILEGED_NGINX_HELPER" ]] && "$PRIVILEGED_NGINX_HELPER" rollback "$policy_transaction"; then
        echo "Rolled back the interrupted hardening policy transaction." >&2
      else
        echo "CRITICAL: hardening policy rollback failed; retaining the new helper and backups for manual recovery." >&2
        policy_rollback_ok=false
      fi
    fi

    if [[ "$policy_rollback_ok" == true ]]; then
      if [[ "$marker_changed" == true ]]; then
        if [[ "$marker_had_previous" == true ]]; then
          if marker_restore_candidate="$(mktemp "$SHARED_DIR/.hardening-restore.XXXXXX")" \
            && cp -a -- "$backup_dir/hardening-marker" "$marker_restore_candidate" \
            && mv -Tf -- "$marker_restore_candidate" "$HARDENING_MARKER"; then
            marker_restore_candidate=""
          else
            echo "CRITICAL: failed to restore the previous hardening marker." >&2
            recovery_failed=1
          fi
        elif ! rm -f -- "$HARDENING_MARKER"; then
          echo "CRITICAL: failed to remove the newly installed hardening marker." >&2
          recovery_failed=1
        fi
      fi

      if [[ "$helper_changed" == true ]]; then
        if [[ "$helper_had_previous" == true ]]; then
          if helper_restore_candidate="$(mktemp /usr/local/sbin/.begapunk-nginx-config.restore.XXXXXX)" \
            && cp -a -- "$backup_dir/helper" "$helper_restore_candidate" \
            && mv -Tf -- "$helper_restore_candidate" "$PRIVILEGED_NGINX_HELPER"; then
            helper_restore_candidate=""
          else
            echo "CRITICAL: failed to restore the previous privileged helper." >&2
            recovery_failed=1
          fi
        elif ! rm -f -- "$PRIVILEGED_NGINX_HELPER"; then
          echo "CRITICAL: failed to remove the newly installed privileged helper." >&2
          recovery_failed=1
        fi
      fi
      if [[ "$sudoers_changed" == true ]]; then
        if [[ "$sudoers_had_previous" == true ]]; then
          if sudoers_restore_candidate="$(mktemp /etc/sudoers.d/.begapunk-nginx-config.restore.XXXXXX)" \
            && cp -a -- "$backup_dir/sudoers" "$sudoers_restore_candidate" \
            && visudo -cf "$sudoers_restore_candidate" >/dev/null 2>&1 \
            && mv -Tf -- "$sudoers_restore_candidate" "$SUDOERS_FILE"; then
            sudoers_restore_candidate=""
          else
            echo "CRITICAL: failed to restore and validate the previous sudoers rule." >&2
            recovery_failed=1
          fi
        elif ! rm -f -- "$SUDOERS_FILE"; then
          echo "CRITICAL: failed to remove the newly installed sudoers rule." >&2
          recovery_failed=1
        fi
      fi
    fi
  fi

  if ! rm -f -- "$marker_restore_candidate" "$helper_restore_candidate" "$sudoers_restore_candidate"; then
    echo "CRITICAL: failed to remove one or more recovery temporary files." >&2
    recovery_failed=1
  fi
  if ! rm -f -- "$policy_candidate"; then
    echo "CRITICAL: failed to remove the hardening policy candidate." >&2
    recovery_failed=1
  fi
  if [[ "$upgrade_succeeded" == true || ( "$policy_rollback_ok" == true && "$recovery_failed" -eq 0 ) ]]; then
    if [[ "$backup_dir" == "$BACKUP_ROOT"/begapunk-hardening.* && -d "$backup_dir" && ! -L "$backup_dir" ]]; then
      if ! rm -rf -- "$backup_dir"; then
        echo "CRITICAL: upgrade completed or recovered, but recovery backups could not be removed: $backup_dir" >&2
        recovery_failed=1
      fi
    fi
  else
    echo "Recovery backups retained at $backup_dir" >&2
  fi
  if [[ "$recovery_failed" -ne 0 ]]; then
    echo "CRITICAL: deployment hardening recovery was incomplete; manual recovery is required." >&2
    [[ "$status" -ne 0 ]] || status=90
  fi
  exit "$status"
}
trap 'cleanup_upgrade "$?"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

helper_candidate="$(mktemp /usr/local/sbin/.begapunk-nginx-config.XXXXXX)"
install -o root -g root -m 0755 "$SCRIPT_DIR/install-nginx-managed-redirects.sh" "$helper_candidate"
[[ "$(env -u SUDO_USER -u SUDO_UID -u SUDO_GID "$helper_candidate" version)" == "$EXPECTED_HELPER_VERSION" ]]
env -u SUDO_USER -u SUDO_UID -u SUDO_GID "$helper_candidate" validate "$SCRIPT_DIR/nginx-managed-redirects.conf"
helper_changed=true
mv -Tf -- "$helper_candidate" "$PRIVILEGED_NGINX_HELPER"
helper_candidate=""

sudoers_candidate="$(mktemp /etc/sudoers.d/.begapunk-nginx-config.XXXXXX)"
printf '%s ALL=(root) NOPASSWD: %s\n' "$DEPLOY_USER" "$PRIVILEGED_NGINX_HELPER" > "$sudoers_candidate"
chown root:root "$sudoers_candidate"
chmod 0440 "$sudoers_candidate"
visudo -cf "$sudoers_candidate"
sudoers_changed=true
mv -Tf -- "$sudoers_candidate" "$SUDOERS_FILE"
sudoers_candidate=""
visudo -cf "$SUDOERS_FILE"

rm -f -- "$BASE_DIR/bin/install-nginx-managed-redirects.sh" "$BASE_DIR/bin/nginx-managed-redirects.conf"

policy_candidate_tmp="$(mktemp "$BASE_DIR/staging/.nginx-managed-hardening.XXXXXX")"
install -o "$DEPLOY_USER" -g "$deploy_group" -m 0640 "$SCRIPT_DIR/nginx-managed-redirects.conf" "$policy_candidate_tmp"
mv -Tf -- "$policy_candidate_tmp" "$policy_candidate"
policy_candidate_tmp=""

policy_attempted=true
"$PRIVILEGED_NGINX_HELPER" stage "$policy_candidate" "$policy_transaction"
run_hardening_checks false false
"$PRIVILEGED_NGINX_HELPER" commit "$policy_transaction"
run_hardening_checks false true

marker_candidate="$(mktemp "$SHARED_DIR/.hardening-complete.XXXXXX")"
printf 'completed=%s\npolicy_transaction=%s\nhelper_version=%s\nhelper_binary_version=%s\n' \
  "$(date -Is)" "$policy_transaction" "$EXPECTED_MARKER_VERSION" "$EXPECTED_HELPER_VERSION" > "$marker_candidate"
chown root:root "$marker_candidate"
chmod 0644 "$marker_candidate"
marker_changed=true
mv -Tf -- "$marker_candidate" "$HARDENING_MARKER"
marker_candidate=""

run_hardening_checks true true

rm -f -- "$policy_candidate"
upgrade_succeeded=true
policy_attempted=false
echo "Deployment hardening upgrade completed."
