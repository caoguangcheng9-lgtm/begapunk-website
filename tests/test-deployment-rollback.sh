#!/usr/bin/env bash
set -Eeuo pipefail

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    echo 'Deployment rollback behavior test skipped locally: Windows Git Bash does not provide the Linux symbolic-link semantics used by production. Linux CI must run this test.'
    exit 0
    ;;
esac

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

base="$test_root/begapunk"
releases="$base/releases"
old_release="$releases/20260801-000000-oldcommit000"
new_release="$releases/20260801-000001-newcommit000"
mkdir -p "$old_release" "$new_release" "$base/bin" "$base/shared" "$test_root/fake-bin"

printf '<html>old BEGAPUNK</html>\n' > "$old_release/index.html"
(cd "$old_release" && sha256sum index.html > manifest.sha256)
printf '<html>new BEGAPUNK</html>\n' > "$new_release/index.html"
(cd "$new_release" && sha256sum index.html > manifest.sha256)

touch "$base/.bootstrap-complete" "$base/shared/.env"
cp "$repo_root/ops/verify-current-release.sh" "$base/bin/verify-current-release.sh"
chmod 750 "$base/bin/verify-current-release.sh"
ln -s "$old_release" "$base/current"

verified="$(BEGAPUNK_DEPLOY_BASE="$base" bash "$repo_root/ops/verify-current-release.sh")"
[[ "$verified" == "$(basename "$old_release")" ]]

outside="$test_root/outside-release"
mkdir -p "$outside"
printf '<html>outside</html>\n' > "$outside/index.html"
(cd "$outside" && sha256sum index.html > manifest.sha256)
ln -sfn "$outside" "$base/current"
if BEGAPUNK_DEPLOY_BASE="$base" bash "$repo_root/ops/verify-current-release.sh" >/dev/null 2>&1; then
  echo 'Verifier accepted a current target outside the managed releases directory.' >&2
  exit 1
fi
ln -sfn "$old_release" "$base/current"

cat > "$test_root/fake-bin/curl" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
cat > "$test_root/fake-bin/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod 750 "$test_root/fake-bin/curl" "$test_root/fake-bin/sleep"

set +e
PATH="$test_root/fake-bin:$PATH" \
  BEGAPUNK_DEPLOY_BASE="$base" \
  BEGAPUNK_HEALTH_URL='https://www.begapunk.com/' \
  "$repo_root/ops/activate-release.sh" "$(basename "$new_release")"
activation_status=$?
set -e

[[ "$activation_status" -eq 6 ]]
[[ "$(readlink -f "$base/current")" == "$old_release" ]]
BEGAPUNK_DEPLOY_BASE="$base" bash "$repo_root/ops/verify-current-release.sh" >/dev/null

echo 'Deployment rollback regression passed: invalid baselines are rejected and a failed health check restores the verified release.'
