#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_LINK="$BASE_DIR/current"

if [[ ! -L "$CURRENT_LINK" ]]; then
  echo "Production current link is missing or is not a symbolic link: $CURRENT_LINK" >&2
  exit 10
fi

current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
if [[ -z "$current_target" ]]; then
  echo "Production current link cannot be resolved: $CURRENT_LINK" >&2
  exit 11
fi

case "$current_target" in
  "$RELEASES_DIR"/*) ;;
  *)
    echo "Production current link resolves outside the managed releases directory: $current_target" >&2
    exit 12
    ;;
esac

if [[ ! -d "$current_target" || ! -f "$current_target/index.html" || ! -f "$current_target/manifest.sha256" ]]; then
  echo "Production rollback release is incomplete: $current_target" >&2
  exit 13
fi

(
  cd "$current_target"
  sha256sum -c manifest.sha256 >/dev/null
)

release_id="$(basename "$current_target")"
if [[ ! "$release_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{5,100}$ ]]; then
  echo "Production rollback release id is invalid: $release_id" >&2
  exit 14
fi

printf '%s\n' "$release_id"
