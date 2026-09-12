#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../ops/activate-release.sh
source "$REPOSITORY_ROOT/ops/activate-release.sh"

fixture_root="$(mktemp -d)"
trap 'rm -rf -- "$fixture_root"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

expect_failure() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$label unexpectedly passed"
  fi
}

test_uid="$(id -u)"
test_gid="$(id -g)"
shared_dir="$fixture_root/shared"
mkdir -p "$shared_dir/.well-known/acme-challenge"
printf 'challenge\n' > "$shared_dir/.well-known/acme-challenge/token"
printf 'verification\n' > "$shared_dir/WW_verify_fixture.txt"
chmod 0755 "$shared_dir" "$shared_dir/.well-known" "$shared_dir/.well-known/acme-challenge"
chmod 0644 "$shared_dir/.well-known/acme-challenge/token" "$shared_dir/WW_verify_fixture.txt"

validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"

inquiry_env="$fixture_root/inquiry.env"
printf '%s\n' \
  'SMTP_HOST=smtp.example.test' \
  'SMTP_PORT=465' \
  'SMTP_USER=test-user' \
  'SMTP_PASS=test-password' \
  'SMTP_TO=test-inbox@example.test' > "$inquiry_env"
chmod 0640 "$inquiry_env"
validate_inquiry_environment_file "$inquiry_env" "$test_uid" "$test_gid"

chmod 0660 "$inquiry_env"
expect_failure 'group-writable inquiry environment' \
  validate_inquiry_environment_file "$inquiry_env" "$test_uid" "$test_gid"
chmod 0640 "$inquiry_env"

cp "$inquiry_env" "$fixture_root/inquiry-target.env"
rm -f -- "$inquiry_env"
ln -s "$fixture_root/inquiry-target.env" "$inquiry_env"
expect_failure 'linked inquiry environment' \
  validate_inquiry_environment_file "$inquiry_env" "$test_uid" "$test_gid"
rm -f -- "$inquiry_env"

printf '%s\n' \
  'SMTP_HOST=smtp.example.test' \
  'SMTP_PORT=465' \
  'SMTP_USER=test-user' \
  'SMTP_PASS=""' \
  'SMTP_TO=test-inbox@example.test' > "$inquiry_env"
chmod 0640 "$inquiry_env"
expect_failure 'empty required inquiry environment value' \
  validate_inquiry_environment_file "$inquiry_env" "$test_uid" "$test_gid"
rm -f -- "$inquiry_env"

printf '%s\n' \
  'SMTP_HOST=smtp.example.test' \
  'SMTP_PORT=465' \
  'SMTP_USER=test-user' \
  'SMTP_PASS="   "' \
  'SMTP_TO=test-inbox@example.test' > "$inquiry_env"
chmod 0640 "$inquiry_env"
expect_failure 'whitespace-only required inquiry environment value' \
  validate_inquiry_environment_file "$inquiry_env" "$test_uid" "$test_gid"
rm -f -- "$inquiry_env"

chmod 0664 "$shared_dir/.well-known/acme-challenge/token"
expect_failure 'group-writable .well-known file' \
  validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"
chmod 0644 "$shared_dir/.well-known/acme-challenge/token"

expect_failure 'wrong runtime owner contract' \
  validate_shared_runtime_bindings "$shared_dir" "$((test_uid + 1))" "$test_gid"

ln -s "$fixture_root" "$shared_dir/.well-known/acme-challenge/linked-outside"
expect_failure 'nested .well-known symlink' \
  validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"
rm -f -- "$shared_dir/.well-known/acme-challenge/linked-outside"

mkfifo "$shared_dir/.well-known/acme-challenge/special-node"
expect_failure 'nested .well-known special node' \
  validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"
rm -f -- "$shared_dir/.well-known/acme-challenge/special-node"

mv "$shared_dir/WW_verify_fixture.txt" "$fixture_root/verification-target.txt"
ln -s "$fixture_root/verification-target.txt" "$shared_dir/WW_verify_fixture.txt"
expect_failure 'linked verification file' \
  validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"
rm -f -- "$shared_dir/WW_verify_fixture.txt"
install -m 0644 "$fixture_root/verification-target.txt" "$shared_dir/WW_verify_fixture.txt"
validate_shared_runtime_bindings "$shared_dir" "$test_uid" "$test_gid"

release_dir="$fixture_root/release"
mkdir -p "$release_dir/nested"
printf '<!doctype html>\n' > "$release_dir/index.html"
printf 'asset\n' > "$release_dir/nested/asset.txt"
printf '<?php // legacy fixture\n' > "$release_dir/send_inquiry.php"
(
  cd "$release_dir"
  sha256sum index.html nested/asset.txt send_inquiry.php > manifest.sha256
)
verify_release_tree_exact "$release_dir"
manifest_identity="$(sha256sum -- "$release_dir/manifest.sha256" | awk '{print $1}')"
verify_release_manifest_identity "$release_dir" "$manifest_identity"
expect_failure 'manifest identity not externally bound' \
  verify_release_manifest_identity "$release_dir" "$(printf '0%.0s' {1..64})"
expect_failure 'malformed expected manifest identity' \
  verify_release_manifest_identity "$release_dir" 'not-a-sha256'

printf 'extra\n' > "$release_dir/unlisted.txt"
expect_failure 'unlisted regular file' verify_release_tree_exact "$release_dir"
rm -f -- "$release_dir/unlisted.txt"

mkdir "$release_dir/empty-extra-directory"
expect_failure 'unlisted empty directory' verify_release_tree_exact "$release_dir"
rmdir "$release_dir/empty-extra-directory"

ln -s "$fixture_root" "$release_dir/unlisted-link"
expect_failure 'release symlink' verify_release_tree_exact "$release_dir"
rm -f -- "$release_dir/unlisted-link"

mkfifo "$release_dir/unlisted-special-node"
expect_failure 'release special node' verify_release_tree_exact "$release_dir"
rm -f -- "$release_dir/unlisted-special-node"

printf 'tampered\n' > "$release_dir/nested/asset.txt"
expect_failure 'manifest digest mismatch' verify_release_tree_exact "$release_dir"
printf 'asset\n' > "$release_dir/nested/asset.txt"
verify_release_tree_exact "$release_dir"

printf 'secret\n' > "$shared_dir/.env"
chmod 0640 "$shared_dir/.env"
ln -s "$shared_dir/.env" "$release_dir/.env"
validate_legacy_seed_env_binding \
  "$release_dir" "$shared_dir" initial-20260905-120000 "$test_uid" "$test_gid"
verify_release_tree_exact "$release_dir" "$release_dir/.env"
expect_failure 'legacy env link in a non-bootstrap release' \
  validate_legacy_seed_env_binding \
  "$release_dir" "$shared_dir" deploy-20260905-120000 "$test_uid" "$test_gid"
expect_failure 'legacy env link without an explicit exact-verifier exception' \
  verify_release_tree_exact "$release_dir"
rm -f -- "$release_dir/.env" "$shared_dir/.env"

ln -s "$shared_dir/.well-known" "$release_dir/.well-known"
ln -s "$shared_dir/WW_verify_fixture.txt" "$release_dir/WW_verify_fixture.txt"
detach_managed_release_bindings "$release_dir" "$shared_dir"
[[ ! -e "$release_dir/.well-known" && ! -L "$release_dir/.well-known" ]] \
  || fail 'managed .well-known link was not detached'
[[ ! -e "$release_dir/WW_verify_fixture.txt" && ! -L "$release_dir/WW_verify_fixture.txt" ]] \
  || fail 'managed verification link was not detached'
verify_release_tree_exact "$release_dir"

ln -s "$fixture_root" "$release_dir/.well-known"
expect_failure 'unexpected managed-link target' \
  detach_managed_release_bindings "$release_dir" "$shared_dir"

echo 'Server release safety tests passed.'
