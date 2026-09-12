#!/usr/bin/env bash
set -Eeuo pipefail
repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
fixture_root="$(mktemp -d)"
trap 'rm -rf -- "$fixture_root"' EXIT
shared_dir="$fixture_root/shared"
tree_root="$shared_dir/.well-known"
mkdir -p "$tree_root/acme-challenge"
token="$tree_root/acme-challenge/ABCDEFGHIJKLMNOPQRSTUV0123456789_abcdefghijk"
printf 'public-challenge\n' > "$token"
printf 'public-verification\n' > "$shared_dir/WW_verify_fixture.txt"
chmod 755 "$shared_dir" "$tree_root" "$tree_root/acme-challenge"
chmod 644 "$token" "$shared_dir/WW_verify_fixture.txt"
# Remap only the literal production path into this isolated fixture. No real
# production files or ownership are changed; stat/id ownership is simulated.
source <(sed "s#/www/begapunk/shared/.well-known#$tree_root#g" "$repository_root/ops/activate-release.sh")
declare -A owners=()
writer_uid=1000
writer_gid=1000
id() {
  if [[ "$#" == 2 && "$2" == www ]]; then
    case "$1" in -u) printf '%s\n' "$writer_uid";; -g) printf '%s\n' "$writer_gid";; *) return 1;; esac
  else command id "$@"; fi
}
stat() {
  local node="${!#}"
  if [[ "$1" == -c && "$2" == '%u:%g:%a' && "$node" == "$fixture_root/"* ]]; then
    printf '%s:%s\n' "${owners[$node]:-0:0}" "$(command stat -c '%a' -- "$node")"
  else command stat "$@"; fi
}
reject() { if "$@" >/dev/null 2>&1; then echo 'Unexpected unsafe ACME acceptance' >&2; exit 1; fi; }
validate_shared_runtime_bindings "$shared_dir" 0 0
owners[$tree_root]=1000:1000
owners[$tree_root/acme-challenge]=1000:1000
owners[$token]=1000:1000
validate_shared_runtime_bindings "$shared_dir" 0 0
owners[$token]=0:0
validate_shared_runtime_bindings "$shared_dir" 0 0
owners[$token]=1000:1000
for metadata in 1002:1002 1000:0 0:1000; do
  owners[$token]="$metadata"
  reject validate_shared_runtime_bindings "$shared_dir" 0 0
done
owners[$token]=1000:1000
chmod 664 "$token"
reject validate_shared_runtime_bindings "$shared_dir" 0 0
chmod 644 "$token"
chmod 775 "$tree_root"
reject validate_shared_runtime_bindings "$shared_dir" 0 0
chmod 755 "$tree_root"
owners[$shared_dir]=1000:1000
reject validate_shared_runtime_bindings "$shared_dir" 0 0
owners[$shared_dir]=0:0
owners[$shared_dir/WW_verify_fixture.txt]=1000:1000
reject validate_shared_runtime_bindings "$shared_dir" 0 0
owners[$shared_dir/WW_verify_fixture.txt]=0:0
for name in short token.php .hidden; do
  bad="$tree_root/acme-challenge/$name"
  printf 'not-a-token\n' > "$bad"
  chmod 644 "$bad"
  owners[$bad]=1000:1000
  reject validate_shared_runtime_bindings "$shared_dir" 0 0
  rm -- "$bad"
done
bad="$tree_root/unrelated.txt"
printf 'unrelated\n' > "$bad"
chmod 644 "$bad"
owners[$bad]=1000:1000
reject validate_shared_runtime_bindings "$shared_dir" 0 0
rm -- "$bad"
bad="$tree_root/acme-challenge/ABCDEFGHIJKLMNOPQRSTUV_nested"
mkdir "$bad"
chmod 755 "$bad"
owners[$bad]=1000:1000
reject validate_shared_runtime_bindings "$shared_dir" 0 0
rmdir "$bad"
ln -s "$fixture_root" "$tree_root/acme-challenge/linked"
reject validate_shared_runtime_bindings "$shared_dir" 0 0
rm -- "$tree_root/acme-challenge/linked"
mkfifo "$tree_root/acme-challenge/fifo"
reject validate_shared_runtime_bindings "$shared_dir" 0 0
rm -- "$tree_root/acme-challenge/fifo"
writer_uid=0
reject validate_shared_runtime_bindings "$shared_dir" 0 0
writer_uid=1000
writer_gid=0
reject validate_shared_runtime_bindings "$shared_dir" 0 0
writer_gid=1000
reject validate_shared_runtime_bindings "$shared_dir" 1000 1000
validate_shared_runtime_bindings "$shared_dir" 0 0
echo 'ACME runtime fixture tests passed.'
