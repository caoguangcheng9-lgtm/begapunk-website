#!/usr/bin/env bash
set -Eeuo pipefail
repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
fixture_root="$(mktemp -d)"
trap 'rm -rf -- "$fixture_root"' EXIT
fixture_file="$fixture_root/inquiry.env"
fixture_owner="$(id -un):$(id -gn):640"

# Exercise the exact production function with only its constant path/owner
# mapped to an isolated fixture. No production .env is read by these tests.
source <(sed -n '/^run_smtp_check() {/,/^}/p' "$repository_root/ops/install-nginx-managed-redirects.sh" \
  | sed "s|/www/begapunk/shared/.env|$fixture_file|g;s|root:www:640|$fixture_owner|g")

valid_fixture() {
  printf '%s\n' 'SMTP_HOST=smtp.example.test' 'SMTP_PORT=465' \
    'SMTP_USER=fixture-user' 'SMTP_PASS="SECRET_SENTINEL=a$b"' \
    "SMTP_TO='fixture@example.test'" > "$fixture_file"
  chmod 0640 "$fixture_file"
}
expect_failure() {
  local result
  if result="$(run_smtp_check 2>&1)"; then
    echo "FAIL: $1 unexpectedly passed" >&2
    exit 1
  fi
  [[ "$result" != *SECRET_SENTINEL* && "$result" != *fixture-user* ]] || exit 1
}
valid_fixture
[[ "$(run_smtp_check 2>&1)" == 'begapunk-smtp-check-ok:v1' ]]
for key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_TO; do
  valid_fixture
  sed -i "/^$key=/d" "$fixture_file"
  expect_failure "missing $key"
done
for empty in '' '""' "''" '"   "'; do
  valid_fixture
  sed -i '/^SMTP_PASS=/d' "$fixture_file"
  printf 'SMTP_PASS=%s\n' "$empty" >> "$fixture_file"
  expect_failure 'empty value'
done
valid_fixture
sed -i '1iSMTP_PASS=' "$fixture_file"
expect_failure 'empty first duplicate value'
valid_fixture
printf '\n# SMTP_PASS=\nUNKNOWN=$(touch SHOULD_NOT_EXIST)\n' >> "$fixture_file"
[[ "$(run_smtp_check 2>&1)" == 'begapunk-smtp-check-ok:v1' ]]
chmod 0660 "$fixture_file"
expect_failure 'group writable'
chmod 0640 "$fixture_file"
mv "$fixture_file" "$fixture_root/target.env"
ln -s "$fixture_root/target.env" "$fixture_file"
expect_failure 'symlink'
rm -- "$fixture_file"
expect_failure 'missing file'
mkdir "$fixture_file"
expect_failure 'directory'
# Test unreadable-path delegation without reading credentials or real sudo.
(
  source "$repository_root/ops/activate-release.sh"
  validate_managed_runtime_file() { return 0; }
  sudo() {
    [[ "$*" == '-n /usr/local/sbin/begapunk-nginx-config smtp-check' ]] || return 99
    printf '%s\n' 'begapunk-smtp-check-ok:v1'
  }
  # On CI this fixed path is absent; on the production fixture runner it is
  # deliberately unreadable to codexdeploy. Metadata is mocked only here.
  [[ ! -r /www/begapunk/shared/.env ]]
  validate_inquiry_environment_file /www/begapunk/shared/.env 0 0
  if validate_inquiry_environment_file "$fixture_root/absent.env" 0 0 2>/dev/null; then exit 1; fi
  if validate_inquiry_environment_file /www/begapunk/shared/.env 1 0 2>/dev/null; then exit 1; fi
  sudo() { printf '%s\n' 'wrong-marker'; }
  if validate_inquiry_environment_file /www/begapunk/shared/.env 0 0 2>/dev/null; then exit 1; fi
  sudo() { printf '%s\n' 'begapunk-smtp-check-ok:v1'; return 1; }
  if validate_inquiry_environment_file /www/begapunk/shared/.env 0 0 2>/dev/null; then exit 1; fi
)
echo 'SMTP helper fixture tests passed'
