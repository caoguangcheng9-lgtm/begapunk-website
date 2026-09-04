#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_LINK="$BASE_DIR/current"
HEALTH_URL="${BEGAPUNK_HEALTH_URL:-https://www.begapunk.com/}"
KEEP_RELEASES="${BEGAPUNK_KEEP_RELEASES:-5}"

release_id="${1:-}"
if [[ ! "$release_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{5,100}$ ]]; then
  echo "Invalid release id." >&2
  exit 2
fi

release_dir="$RELEASES_DIR/$release_id"
if [[ ! -d "$release_dir" || ! -f "$release_dir/index.html" || ! -f "$release_dir/manifest.sha256" ]]; then
  echo "Release is incomplete: $release_dir" >&2
  exit 3
fi

if [[ ! -f "$BASE_DIR/.bootstrap-complete" ]]; then
  echo "Atomic deployment bootstrap is not complete." >&2
  exit 7
fi

mkdir -p "$BASE_DIR" "$RELEASES_DIR"
if [[ ! -d "$SHARED_DIR" || "$(stat -c '%U' "$SHARED_DIR")" != 'root' ]]; then
  echo "Shared runtime directory is missing or is not root-owned." >&2
  exit 8
fi
exec 9>"$BASE_DIR/deploy.lock"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 4
fi

(
  cd "$release_dir"
  sha256sum -c manifest.sha256 >/dev/null
)

if [[ -L "$release_dir/.env" ]]; then
  legacy_env_target="$(readlink -f "$release_dir/.env" 2>/dev/null || true)"
  if [[ "$legacy_env_target" != "$SHARED_DIR/.env" ]]; then
    echo "Release contains an unexpected .env symlink." >&2
    exit 5
  fi
  if grep -Fq "'/www/begapunk/shared/.env'" "$release_dir/send_inquiry.php"; then
    # New releases read outside the web root and must not retain the legacy link.
    rm -f -- "$release_dir/.env"
  else
    # A legacy rollback still needs its historical path. The managed Nginx
    # policy blocks every dotfile before content handling.
    echo "Warning: retaining the protected .env link for a legacy rollback release." >&2
  fi
elif [[ -e "$release_dir/.env" ]]; then
  echo "Release contains a forbidden public .env path." >&2
  exit 5
fi

if [[ -d "$SHARED_DIR/.well-known" ]]; then
  rm -rf "$release_dir/.well-known"
  ln -s "$SHARED_DIR/.well-known" "$release_dir/.well-known"
fi

shopt -s nullglob
for verification_file in "$SHARED_DIR"/WW_verify_*.txt; do
  target="$release_dir/$(basename "$verification_file")"
  rm -f "$target"
  ln -s "$verification_file" "$target"
done
shopt -u nullglob

previous_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
next_link="$BASE_DIR/.current-${release_id}-$$"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$CURRENT_LINK"

health_check() {
  local response
  response="$(curl --fail --silent --show-error --max-time 20 \
    --resolve www.begapunk.com:443:127.0.0.1 \
    "${HEALTH_URL}?deployment_health=${release_id}")" || return 1
  grep -Eiq '<html|<!doctype html|BEGAPUNK' <<<"$response"
}

healthy=false
for _ in 1 2 3; do
  if health_check; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  echo "Health check failed; restoring previous release." >&2
  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    rollback_link="$BASE_DIR/.rollback-$$"
    ln -s "$previous_target" "$rollback_link"
    mv -Tf "$rollback_link" "$CURRENT_LINK"
  else
    rm -f "$CURRENT_LINK"
  fi
  exit 6
fi

printf '%s\t%s\t%s\n' "$(date -Is)" "$release_id" "$previous_target" >> "$BASE_DIR/deployments.log"

current_target="$(readlink -f "$CURRENT_LINK")"
kept=0
while IFS= read -r candidate; do
  [[ -n "$candidate" ]] || continue
  candidate_target="$(readlink -f "$candidate")"
  if [[ "$candidate_target" == "$current_target" || "$candidate_target" == "$previous_target" ]]; then
    continue
  fi
  if (( kept < KEEP_RELEASES - 1 )); then
    kept=$((kept + 1))
    continue
  fi
  rm -rf -- "$candidate"
done < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -print | sort -r)

echo "Deployment active: $release_id"
