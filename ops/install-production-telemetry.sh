#!/usr/bin/env bash
set -Eeuo pipefail

# Owner-only provisioning. This is NOT a sudo-authorized deployment command.
# Inputs must come from a reviewed, root-controlled staging directory.
[[ "$EUID" -eq 0 && "$#" -eq 3 && "$1" =~ ^--(check|apply)$ \
  && "$2" =~ ^[0-9a-f]{64}$ && "$3" =~ ^[0-9a-f]{64}$ ]] || {
  echo 'Usage (root): install-production-telemetry.sh --check|--apply <helper-sha256> <observer-sha256>' >&2
  exit 2
}
mode="$1"
helper_digest="$2"
observer_digest="$3"
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
helper='/usr/local/sbin/begapunk-nginx-config'
observer='/usr/local/libexec/begapunk-production-telemetry.py'
transactions='/www/begapunk/shared/nginx-transactions'

safe_directory() {
  local directory="$1" metadata
  [[ -d "$directory" && ! -L "$directory" && "$(realpath -e -- "$directory")" == "$directory" ]] || return 1
  metadata="$(stat -c '%u:%a' "$directory")"
  [[ "${metadata%%:*}" == 0 ]] && (( (8#${metadata#*:} & 8#22) == 0 ))
}
safe_file() {
  [[ -f "$1" && ! -L "$1" && "$(realpath -e -- "$1")" == "$1" \
    && "$(stat -c '%u' "$1")" == 0 ]] || return 1
  local permissions
  permissions="$(stat -c '%a' "$1")"
  (( (8#$permissions & 8#22) == 0 ))
}

safe_directory "$source_dir"
for file in install-nginx-managed-redirects.sh production-telemetry.py; do
  safe_file "$source_dir/$file"
done
test "$(sha256sum "$source_dir/install-nginx-managed-redirects.sh" | awk '{print $1}')" = "$helper_digest"
test "$(sha256sum "$source_dir/production-telemetry.py" | awk '{print $1}')" = "$observer_digest"
bash -n "$source_dir/install-nginx-managed-redirects.sh"
/usr/bin/python3 -I -c 'import sys; compile(open(sys.argv[1], "rb").read(), sys.argv[1], "exec")' "$source_dir/production-telemetry.py"
safe_directory /usr/local/sbin
safe_directory /usr/local/libexec
safe_directory /var/backups
safe_file "$helper"
if [[ -e "$observer" || -L "$observer" ]]; then safe_file "$observer"; fi
test "$(stat -c '%U:%G:%a' /www/begapunk/maintenance.lock)" = 'root:codexdeploy:660'
[[ ! -L /www/begapunk/maintenance.lock ]]
exec 8<>/www/begapunk/maintenance.lock
flock -n 8
exec 9>/run/lock/begapunk-nginx-config.lock
flock -n 9
if [[ -e "$transactions" || -L "$transactions" ]]; then
  safe_directory "$transactions"
  shopt -s nullglob
  for transaction in "$transactions"/*; do
    [[ -d "$transaction" && ! -L "$transaction" && -f "$transaction/committed" && ! -L "$transaction/committed" ]] || {
      echo 'Uncommitted or unsafe transaction: recover it before installing.' >&2
      exit 3
    }
  done
  shopt -u nullglob
fi
if [[ "$mode" == '--check' ]]; then
  echo 'Telemetry provisioning preflight PASS; no installed files changed.'
  exit 0
fi

backup="$(mktemp -d /var/backups/begapunk-telemetry.XXXXXX)"
chmod 0700 "$backup"
cp -a -- "$helper" "$backup/helper"
observer_existed=false
if [[ -f "$observer" ]]; then
  cp -a -- "$observer" "$backup/observer"
  observer_existed=true
fi
helper_candidate=""
observer_candidate=""
changed=false
recover() {
  local status="$?"
  trap - EXIT
  if [[ "$status" -ne 0 && "$changed" == true ]]; then
    cp -a -- "$backup/helper" "$helper"
    if [[ "$observer_existed" == true ]]; then
      cp -a -- "$backup/observer" "$observer"
    else
      rm -f -- /usr/local/libexec/begapunk-production-telemetry.py
    fi
    echo "Installation failed; previous files restored. Backup: $backup" >&2
  fi
  [[ -z "$helper_candidate" ]] || rm -f -- "$helper_candidate"
  [[ -z "$observer_candidate" ]] || rm -f -- "$observer_candidate"
  exit "$status"
}
trap recover EXIT
observer_candidate="$(mktemp /usr/local/libexec/.begapunk-telemetry.XXXXXX)"
helper_candidate="$(mktemp /usr/local/sbin/.begapunk-helper.XXXXXX)"
install -o root -g root -m 0644 "$source_dir/production-telemetry.py" "$observer_candidate"
install -o root -g root -m 0755 "$source_dir/install-nginx-managed-redirects.sh" "$helper_candidate"
changed=true
mv -Tf -- "$observer_candidate" "$observer"
observer_candidate=""
mv -Tf -- "$helper_candidate" "$helper"
helper_candidate=""
test "$("$helper" telemetry-version)" = "$observer_digest"
test "$("$helper" version)" = 'begapunk-nginx-config-v3'
"$helper" doctor
echo "Telemetry provisioning PASS. Retained backup: $backup"
