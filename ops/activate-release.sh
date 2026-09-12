#!/usr/bin/env bash
set -Eeuo pipefail

release_safety_error() {
  echo "Release safety check failed: $*" >&2
  return 1
}

release_manifest_path_is_safe() {
  local candidate="$1"
  local remaining
  local segment

  if [[ -z "$candidate" || "$candidate" == /* || "$candidate" == *\\* ]]; then
    release_safety_error "manifest path is not a normalized relative POSIX path (${candidate:-empty})."
    return 1
  fi
  if [[ "$candidate" =~ [[:cntrl:]] ]]; then
    release_safety_error "manifest path contains a control character."
    return 1
  fi

  remaining="$candidate"
  while :; do
    segment="${remaining%%/*}"
    if [[ -z "$segment" || "$segment" == '.' || "$segment" == '..' ]]; then
      release_safety_error "manifest path contains an empty, current-directory, or parent-directory segment ($candidate)."
      return 1
    fi
    [[ "$remaining" == */* ]] || break
    remaining="${remaining#*/}"
  done
}

validate_plain_directory_tree() (
  local tree_root="$1"
  local canonical_root
  local inventory_file
  local node
  local canonical_node

  if [[ ! -d "$tree_root" || -L "$tree_root" ]]; then
    release_safety_error "expected a real directory, not a link or special node ($tree_root)."
    return 1
  fi
  canonical_root="$(realpath -e -- "$tree_root" 2>/dev/null)" || {
    release_safety_error "cannot resolve directory realpath ($tree_root)."
    return 1
  }
  if [[ "$canonical_root" != "$tree_root" ]]; then
    release_safety_error "directory path is not canonical ($tree_root -> $canonical_root)."
    return 1
  fi

  inventory_file="$(mktemp)" || return 1
  trap 'rm -f -- "$inventory_file"' EXIT
  if ! find "$tree_root" -mindepth 1 -print0 > "$inventory_file"; then
    release_safety_error "cannot inventory directory tree ($tree_root)."
    return 1
  fi
  while IFS= read -r -d '' node; do
    if [[ -L "$node" ]]; then
      release_safety_error "symbolic links are forbidden inside runtime trees ($node)."
      return 1
    fi
    if [[ ! -d "$node" && ! -f "$node" ]]; then
      release_safety_error "special nodes are forbidden inside runtime trees ($node)."
      return 1
    fi
    canonical_node="$(realpath -e -- "$node" 2>/dev/null)" || {
      release_safety_error "cannot resolve runtime node realpath ($node)."
      return 1
    }
    if [[ "$canonical_node" != "$node" ]]; then
      release_safety_error "runtime node crosses a non-canonical path ($node -> $canonical_node)."
      return 1
    fi
  done < "$inventory_file"
)

validate_runtime_node_metadata() {
  local node="$1"
  local expected_uid="$2"
  local expected_gid="$3"
  local expected_mode="$4"
  local actual_metadata

  actual_metadata="$(stat -c '%u:%g:%a' -- "$node" 2>/dev/null)" || {
    release_safety_error "cannot read runtime-node metadata ($node)."
    return 1
  }
  if [[ "$actual_metadata" != "$expected_uid:$expected_gid:$expected_mode" ]]; then
    release_safety_error "runtime-node owner/mode mismatch ($node is $actual_metadata; expected $expected_uid:$expected_gid:$expected_mode)."
    return 1
  fi
}

validate_plain_runtime_file() {
  local file_path="$1"
  local canonical_file

  if [[ ! -f "$file_path" || -L "$file_path" ]]; then
    release_safety_error "expected a regular runtime file, not a link or special node ($file_path)."
    return 1
  fi
  canonical_file="$(realpath -e -- "$file_path" 2>/dev/null)" || {
    release_safety_error "cannot resolve runtime-file realpath ($file_path)."
    return 1
  }
  if [[ "$canonical_file" != "$file_path" ]]; then
    release_safety_error "runtime file path is not canonical ($file_path -> $canonical_file)."
    return 1
  fi
}

validate_managed_runtime_tree() (
  local tree_root="$1"
  local expected_uid="$2"
  local expected_gid="$3"
  local inventory_file
  local node

  validate_plain_directory_tree "$tree_root" || return 1
  validate_runtime_node_metadata "$tree_root" "$expected_uid" "$expected_gid" 755 || return 1

  inventory_file="$(mktemp)" || return 1
  trap 'rm -f -- "$inventory_file"' EXIT
  if ! find "$tree_root" -mindepth 1 -print0 > "$inventory_file"; then
    release_safety_error "cannot inventory managed runtime tree ($tree_root)."
    return 1
  fi
  while IFS= read -r -d '' node; do
    if [[ -d "$node" ]]; then
      validate_runtime_node_metadata "$node" "$expected_uid" "$expected_gid" 755 || return 1
    else
      validate_runtime_node_metadata "$node" "$expected_uid" "$expected_gid" 644 || return 1
    fi
  done < "$inventory_file"
)

validate_managed_runtime_file() {
  local file_path="$1"
  local expected_uid="$2"
  local expected_gid="$3"
  local expected_mode="$4"
  validate_plain_runtime_file "$file_path" || return 1
  validate_runtime_node_metadata "$file_path" "$expected_uid" "$expected_gid" "$expected_mode"
}

validate_inquiry_environment_file() {
  local file_path="$1"
  local expected_uid="$2"
  local expected_gid="$3"
  local required_key

  validate_managed_runtime_file "$file_path" "$expected_uid" "$expected_gid" 640 || return 1
  # The deploy account deliberately cannot read production SMTP credentials.
  # Delegate only the fixed production path, never arbitrary caller paths.
  if [[ ! -r "$file_path" ]]; then
    if [[ "$file_path" != '/www/begapunk/shared/.env' || "$expected_uid" != '0' ]]; then
      release_safety_error 'unreadable inquiry environment is outside the privileged check contract.'
      return 1
    fi
    local smtp_result
    if ! smtp_result="$(sudo -n /usr/local/sbin/begapunk-nginx-config smtp-check)" \
      || [[ "$smtp_result" != 'begapunk-smtp-check-ok:v1' ]]; then
      release_safety_error 'privileged SMTP configuration check failed.'
      return 1
    fi
    return 0
  fi
  for required_key in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_TO; do
    if ! awk -v wanted="$required_key" '
      function trim(value) {
        sub(/^[[:space:]]+/, "", value)
        sub(/[[:space:]]+$/, "", value)
        return value
      }
      /^[[:space:]]*#/ { next }
      index($0, "=") > 0 && !seen {
        separator = index($0, "=")
        key = trim(substr($0, 1, separator - 1))
        if (key != wanted) next
        seen = 1
        value = trim(substr($0, separator + 1))
        if (length(value) >= 2) {
          first = substr(value, 1, 1)
          last = substr(value, length(value), 1)
          if ((first == "\"" && last == "\"") || (first == "\047" && last == "\047")) {
            value = substr(value, 2, length(value) - 2)
          }
        }
        value = trim(value)
        valid = length(value) > 0
      }
      END { exit !(seen && valid) }
    ' "$file_path"; then
      release_safety_error "inquiry environment is missing a non-empty $required_key setting ($file_path)."
      return 1
    fi
  done
}

validate_shared_runtime_bindings() {
  local shared_dir="$1"
  local expected_uid="${2:-0}"
  local expected_gid="${3:-0}"
  local well_known="$shared_dir/.well-known"
  local verification_file
  local canonical_shared

  if [[ ! -d "$shared_dir" || -L "$shared_dir" ]]; then
    release_safety_error "shared runtime directory is missing, linked, or not a directory ($shared_dir)."
    return 1
  fi
  canonical_shared="$(realpath -e -- "$shared_dir" 2>/dev/null)" || {
    release_safety_error "cannot resolve shared runtime directory ($shared_dir)."
    return 1
  }
  if [[ "$canonical_shared" != "$shared_dir" ]]; then
    release_safety_error "shared runtime path is not canonical ($shared_dir -> $canonical_shared)."
    return 1
  fi
  validate_runtime_node_metadata "$shared_dir" "$expected_uid" "$expected_gid" 755 || return 1

  if [[ -e "$well_known" || -L "$well_known" ]]; then
    validate_managed_runtime_tree "$well_known" "$expected_uid" "$expected_gid" || return 1
  fi

  shopt -s nullglob
  for verification_file in "$shared_dir"/WW_verify_*.txt; do
    validate_managed_runtime_file "$verification_file" "$expected_uid" "$expected_gid" 644 || {
      shopt -u nullglob
      return 1
    }
  done
  shopt -u nullglob
}

validate_legacy_seed_env_binding() {
  local release_dir="$1"
  local shared_dir="$2"
  local release_id="$3"
  local expected_uid="$4"
  local expected_gid="$5"
  local release_binding="$release_dir/.env"
  local expected_target="$shared_dir/.env"
  local raw_target
  local resolved_target

  if [[ ! "$release_id" =~ ^initial-[0-9]{8}-[0-9]{6}$ || ! -L "$release_binding" ]]; then
    release_safety_error "only a one-time initial bootstrap release may retain the legacy .env runtime binding."
    return 1
  fi
  if [[ ! -f "$release_dir/send_inquiry.php" || -L "$release_dir/send_inquiry.php" ]]; then
    release_safety_error "legacy .env binding requires a regular inquiry handler."
    return 1
  fi
  if grep -Eq '/www/begapunk/shared/[.]env|BEGAPUNK_ENV_FILE' "$release_dir/send_inquiry.php"; then
    release_safety_error "a shared-path-aware inquiry handler must not retain a public .env binding."
    return 1
  fi
  validate_managed_runtime_file "$expected_target" "$expected_uid" "$expected_gid" 640 || return 1
  raw_target="$(readlink -- "$release_binding")" || return 1
  resolved_target="$(realpath -e -- "$release_binding" 2>/dev/null)" || {
    release_safety_error "legacy .env runtime binding is dangling ($release_binding)."
    return 1
  }
  if [[ "$raw_target" != "$expected_target" || "$resolved_target" != "$expected_target" ]]; then
    release_safety_error "legacy .env runtime binding has an unexpected target ($release_binding)."
    return 1
  fi
}

detach_managed_release_bindings() {
  local release_dir="$1"
  local shared_dir="$2"
  local release_binding
  local expected_target
  local raw_target
  local resolved_target

  release_binding="$release_dir/.well-known"
  if [[ -L "$release_binding" ]]; then
    expected_target="$shared_dir/.well-known"
    raw_target="$(readlink -- "$release_binding")" || return 1
    resolved_target="$(realpath -e -- "$release_binding" 2>/dev/null)" || {
      release_safety_error "managed .well-known release binding is dangling ($release_binding)."
      return 1
    }
    if [[ "$raw_target" != "$expected_target" || "$resolved_target" != "$expected_target" ]]; then
      release_safety_error "managed .well-known release binding has an unexpected target ($release_binding)."
      return 1
    fi
    rm -f -- "$release_binding"
  fi

  shopt -s nullglob
  for release_binding in "$release_dir"/WW_verify_*.txt; do
    [[ -L "$release_binding" ]] || continue
    expected_target="$shared_dir/$(basename -- "$release_binding")"
    raw_target="$(readlink -- "$release_binding")" || return 1
    resolved_target="$(realpath -e -- "$release_binding" 2>/dev/null)" || {
      shopt -u nullglob
      release_safety_error "managed verification-file release binding is dangling ($release_binding)."
      return 1
    }
    if [[ "$raw_target" != "$expected_target" || "$resolved_target" != "$expected_target" ]]; then
      shopt -u nullglob
      release_safety_error "managed verification-file release binding has an unexpected target ($release_binding)."
      return 1
    fi
    rm -f -- "$release_binding"
  done
  shopt -u nullglob
}

verify_release_tree_exact() (
  local release_dir="$1"
  local allowed_legacy_binding="${2:-}"
  local manifest_file="$release_dir/manifest.sha256"
  local canonical_release
  local scratch_dir
  local nodes_file
  local expected_files
  local expected_files_sorted
  local expected_directories
  local expected_directories_sorted
  local actual_files
  local actual_files_sorted
  local actual_directories
  local actual_directories_sorted
  local node
  local relative_path
  local canonical_node
  local line
  local line_number=0
  local parent
  local duplicate
  local final_byte

  if [[ ! -d "$release_dir" || -L "$release_dir" ]]; then
    release_safety_error "release root must be a real directory ($release_dir)."
    return 1
  fi
  if [[ -n "$allowed_legacy_binding" \
    && ( "$allowed_legacy_binding" != "$release_dir/.env" || ! -L "$allowed_legacy_binding" ) ]]; then
    release_safety_error "exact verifier received an invalid legacy runtime-link exception."
    return 1
  fi
  canonical_release="$(realpath -e -- "$release_dir" 2>/dev/null)" || {
    release_safety_error "cannot resolve release realpath ($release_dir)."
    return 1
  }
  if [[ "$canonical_release" != "$release_dir" ]]; then
    release_safety_error "release path is not canonical ($release_dir -> $canonical_release)."
    return 1
  fi
  if [[ ! -f "$manifest_file" || -L "$manifest_file" ]]; then
    release_safety_error "manifest must be a regular, non-linked file ($manifest_file)."
    return 1
  fi
  if [[ ! -f "$release_dir/index.html" || -L "$release_dir/index.html" ]]; then
    release_safety_error "homepage must be a regular, non-linked file ($release_dir/index.html)."
    return 1
  fi
  if [[ ! -s "$manifest_file" ]]; then
    release_safety_error "manifest is empty ($manifest_file)."
    return 1
  fi
  final_byte="$(tail -c 1 -- "$manifest_file" | od -An -t u1 | tr -d '[:space:]')" || return 1
  if [[ "$final_byte" != 10 ]]; then
    release_safety_error "manifest must end with an LF newline ($manifest_file)."
    return 1
  fi
  if ! cmp -s -- "$manifest_file" <(tr -d '\000' < "$manifest_file"); then
    release_safety_error "manifest contains a NUL byte ($manifest_file)."
    return 1
  fi

  scratch_dir="$(mktemp -d)" || return 1
  trap 'rm -rf -- "$scratch_dir"' EXIT
  nodes_file="$scratch_dir/nodes"
  expected_files="$scratch_dir/expected-files"
  expected_files_sorted="$scratch_dir/expected-files.sorted"
  expected_directories="$scratch_dir/expected-directories"
  expected_directories_sorted="$scratch_dir/expected-directories.sorted"
  actual_files="$scratch_dir/actual-files"
  actual_files_sorted="$scratch_dir/actual-files.sorted"
  actual_directories="$scratch_dir/actual-directories"
  actual_directories_sorted="$scratch_dir/actual-directories.sorted"
  : > "$expected_files"
  : > "$expected_directories"
  : > "$actual_files"
  : > "$actual_directories"

  while IFS= read -r line || [[ -n "$line" ]]; do
    line_number=$((line_number + 1))
    if [[ ! "$line" =~ ^([0-9a-f]{64})\ \ (.+)$ ]]; then
      release_safety_error "manifest line $line_number is not a canonical sha256sum record."
      return 1
    fi
    relative_path="${BASH_REMATCH[2]}"
    release_manifest_path_is_safe "$relative_path" || return 1
    if [[ "$relative_path" == 'manifest.sha256' ]]; then
      release_safety_error "manifest cannot contain a self-referential record."
      return 1
    fi
    printf '%s\n' "$relative_path" >> "$expected_files"
    parent="$relative_path"
    while [[ "$parent" == */* ]]; do
      parent="${parent%/*}"
      printf '%s\n' "$parent" >> "$expected_directories"
    done
  done < "$manifest_file"
  if (( line_number == 0 )); then
    release_safety_error "manifest contains no records."
    return 1
  fi

  duplicate="$(LC_ALL=C sort "$expected_files" | uniq -d | head -n 1)"
  if [[ -n "$duplicate" ]]; then
    release_safety_error "manifest contains a duplicate path ($duplicate)."
    return 1
  fi

  if ! find "$release_dir" -mindepth 1 -print0 > "$nodes_file"; then
    release_safety_error "cannot inventory release tree ($release_dir)."
    return 1
  fi
  while IFS= read -r -d '' node; do
    relative_path="${node#"$release_dir"/}"
    release_manifest_path_is_safe "$relative_path" || return 1
    if [[ -L "$node" ]]; then
      if [[ -n "$allowed_legacy_binding" && "$node" == "$allowed_legacy_binding" ]]; then
        continue
      fi
      release_safety_error "release contains a symbolic link ($relative_path)."
      return 1
    fi
    if [[ ! -d "$node" && ! -f "$node" ]]; then
      release_safety_error "release contains a special node ($relative_path)."
      return 1
    fi
    canonical_node="$(realpath -e -- "$node" 2>/dev/null)" || {
      release_safety_error "cannot resolve release-node realpath ($relative_path)."
      return 1
    }
    if [[ "$canonical_node" != "$node" ]]; then
      release_safety_error "release node crosses a non-canonical path ($relative_path)."
      return 1
    fi
    if [[ -d "$node" ]]; then
      printf '%s\n' "$relative_path" >> "$actual_directories"
    elif [[ "$relative_path" != 'manifest.sha256' ]]; then
      printf '%s\n' "$relative_path" >> "$actual_files"
    fi
  done < "$nodes_file"

  LC_ALL=C sort -u "$expected_files" > "$expected_files_sorted" || return 1
  LC_ALL=C sort -u "$expected_directories" > "$expected_directories_sorted" || return 1
  LC_ALL=C sort -u "$actual_files" > "$actual_files_sorted" || return 1
  LC_ALL=C sort -u "$actual_directories" > "$actual_directories_sorted" || return 1

  if ! cmp -s -- "$expected_files_sorted" "$actual_files_sorted"; then
    echo 'Release regular-file set differs from manifest:' >&2
    LC_ALL=C comm -23 "$actual_files_sorted" "$expected_files_sorted" | sed 's/^/  unexpected: /' >&2
    LC_ALL=C comm -13 "$actual_files_sorted" "$expected_files_sorted" | sed 's/^/  missing: /' >&2
    return 1
  fi
  if ! cmp -s -- "$expected_directories_sorted" "$actual_directories_sorted"; then
    echo 'Release directory set differs from manifest-derived ancestors:' >&2
    LC_ALL=C comm -23 "$actual_directories_sorted" "$expected_directories_sorted" | sed 's/^/  unexpected: /' >&2
    LC_ALL=C comm -13 "$actual_directories_sorted" "$expected_directories_sorted" | sed 's/^/  missing: /' >&2
    return 1
  fi
  if ! (cd "$release_dir" && sha256sum --strict --quiet -c manifest.sha256); then
    release_safety_error "one or more release bytes differ from the manifest."
    return 1
  fi
)

verify_release_manifest_identity() {
  local release_dir="$1"
  local expected_manifest_sha256="$2"
  local manifest_file="$release_dir/manifest.sha256"
  local actual_manifest_sha256

  if [[ ! "$expected_manifest_sha256" =~ ^[0-9a-f]{64}$ ]]; then
    release_safety_error "expected manifest identity is not a lowercase SHA-256 digest."
    return 1
  fi
  if [[ ! -f "$manifest_file" || -L "$manifest_file" ]]; then
    release_safety_error "manifest identity cannot be read from a regular file."
    return 1
  fi
  actual_manifest_sha256="$(sha256sum -- "$manifest_file" | awk '{print $1}')"
  if [[ "$actual_manifest_sha256" != "$expected_manifest_sha256" ]]; then
    release_safety_error "manifest identity differs from the externally approved artifact (expected $expected_manifest_sha256, received $actual_manifest_sha256)."
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  return 0
fi

BASE_DIR="${BEGAPUNK_DEPLOY_BASE:-/www/begapunk}"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_LINK="$BASE_DIR/current"
HEALTH_URL="${BEGAPUNK_HEALTH_URL:-https://www.begapunk.com/}"
KEEP_RELEASES="${BEGAPUNK_KEEP_RELEASES:-5}"

release_id="${1:-}"
expected_manifest_sha256="${2:-}"
if [[ "$#" -ne 2 || ! "$release_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{5,100}$ ]]; then
  echo "Usage: activate-release.sh <release-id> <expected-manifest-sha256>" >&2
  exit 2
fi
if [[ ! "$expected_manifest_sha256" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Invalid expected release manifest SHA-256." >&2
  exit 2
fi

release_dir="$RELEASES_DIR/$release_id"
if [[ ! -d "$release_dir" || -L "$release_dir" \
  || ! -f "$release_dir/index.html" || -L "$release_dir/index.html" \
  || ! -f "$release_dir/manifest.sha256" || -L "$release_dir/manifest.sha256" ]]; then
  echo "Release is incomplete: $release_dir" >&2
  exit 3
fi

if [[ ! -f "$BASE_DIR/.bootstrap-complete" || -L "$BASE_DIR/.bootstrap-complete" ]]; then
  echo "Atomic deployment bootstrap is not complete." >&2
  exit 7
fi

mkdir -p "$BASE_DIR" "$RELEASES_DIR"
exec 9>"$BASE_DIR/deploy.lock"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 4
fi

www_gid="$(getent group www | awk -F: 'NR == 1 { print $3 }')"
if [[ ! "$www_gid" =~ ^[0-9]+$ ]] \
  || ! validate_inquiry_environment_file "$SHARED_DIR/.env" 0 "$www_gid"; then
  exit 8
fi
if ! validate_shared_runtime_bindings "$SHARED_DIR" 0 0; then
  exit 8
fi
legacy_env_binding=''
if [[ -e "$release_dir/.env" || -L "$release_dir/.env" ]]; then
  if ! validate_legacy_seed_env_binding "$release_dir" "$SHARED_DIR" "$release_id" 0 "$www_gid"; then
    echo "Release contains a forbidden public .env path." >&2
    exit 5
  fi
  legacy_env_binding="$release_dir/.env"
fi
detach_managed_release_bindings "$release_dir" "$SHARED_DIR" || exit 5
verify_release_manifest_identity "$release_dir" "$expected_manifest_sha256" || exit 3
verify_release_tree_exact "$release_dir" "$legacy_env_binding" || exit 3

if [[ -d "$SHARED_DIR/.well-known" ]]; then
  ln -s -- "$SHARED_DIR/.well-known" "$release_dir/.well-known"
fi

shopt -s nullglob
for verification_file in "$SHARED_DIR"/WW_verify_*.txt; do
  target="$release_dir/$(basename "$verification_file")"
  ln -s -- "$verification_file" "$target"
done
shopt -u nullglob

previous_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
next_link="$BASE_DIR/.current-${release_id}-$$"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$CURRENT_LINK"
expected_homepage_sha256="$(sha256sum "$release_dir/index.html" | awk '{print $1}')"

health_check() {
  local response_file
  local actual_homepage_sha256
  response_file="$(mktemp)"
  if ! curl --fail --silent --show-error --max-time 20 --output "$response_file" \
    --resolve www.begapunk.com:443:127.0.0.1 \
    "${HEALTH_URL}?deployment_health=${release_id}"; then
    rm -f -- "$response_file"
    return 1
  fi
  actual_homepage_sha256="$(sha256sum "$response_file" | awk '{print $1}')"
  if [[ "$actual_homepage_sha256" != "$expected_homepage_sha256" ]]; then
    echo "Origin served a different homepage artifact (expected $expected_homepage_sha256, received $actual_homepage_sha256)." >&2
    rm -f -- "$response_file"
    return 1
  fi
  if ! grep -Eiq '<html|<!doctype html|BEGAPUNK' "$response_file"; then
    rm -f -- "$response_file"
    return 1
  fi
  rm -f -- "$response_file"
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
