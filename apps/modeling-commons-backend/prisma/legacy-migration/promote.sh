#!/usr/bin/env bash
#
# One resumable entry point for the promotion of beta.modelingcommons.org onto
# the legacy domain. Takes the beta snapshot, the stale legacy dump the beta
# snapshot was built from, and the current legacy dump; leaves behind a patched,
# NanoID-migrated database plus matching object storage.
#
# Every step is guarded by a checkpoint under $WORK/<step>.done and logged to
# $WORK/logs/<step>.log. A failed step leaves its checkpoint absent, so a bare
# re-run resumes there. Nothing here drops the target database.
#
# Usage:
#   promote.sh [--dry-run] [--yes] [--from=<step>] [--only=<step>] [--force]
#              [--skip-storage] [--restore-target] [--list]
#
# --restore-target loads the beta snapshot over the target and is for rebuilding
# a local copy of production only. On cutover the target already IS the beta
# database, so the flag must stay off or every write since the snapshot is lost.
#
# Connection and input locations come from the environment, never from a path
# baked into this file:
#   DATABASE_URL         target (the beta database being promoted)
#   LEGACY_DATABASE_URL  legacy database holding schemas public + incoming
#   LEGACY_DB            legacy database name, for diffdb.sh and psql
#   BETA_DUMP            pg_dump -Fc of the beta database
#   BETA_CHECKSUM        checksum file to verify BETA_DUMP against
#   LEGACY_STALE_DUMP    pg_dump -Fc of the legacy database the beta was built from
#   LEGACY_CURRENT_DUMP  pg_dump -Fc of the legacy database as it stands now
#   WORK                 checkpoint, log and artifact directory
#   ARTIFACT_DIR         where step 11 writes the final dump and manifest
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"
cd "$APP"

# Values already exported win. Sourcing the file would instead overwrite them,
# which silently retargets the whole run at whatever the local .env names: an
# operator who exports a production DATABASE_URL would have it replaced by the
# development one and never be told. Only unset names are filled in.
ENV_FILE="${ENV_FILE:-$APP/.env}"
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    case "$key" in *[!A-Za-z0-9_]*|'') continue ;; esac
    # Strip one layer of surrounding quotes, as dotenv does.
    case "$value" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    if [ -z "${!key:-}" ]; then
      export "$key=$value"
    fi
  done < "$ENV_FILE"
fi

ONGOING="${ONGOING_DIR:-$APP/.ongoing/promote-to-prod}"

BETA_DUMP="${BETA_DUMP:-$ONGOING/modeling_commons_beta.pgc}"
BETA_CHECKSUM="${BETA_CHECKSUM:-$ONGOING/modeling_commons_beta.checksum}"
LEGACY_STALE_DUMP="${LEGACY_STALE_DUMP:-$ONGOING/nlcommons_production-db-STALE-JUL28}"
LEGACY_CURRENT_DUMP="${LEGACY_CURRENT_DUMP:-$ONGOING/nlcommons_production-db}"
WORK="${WORK:-$APP/.work/promote}"
ARTIFACT_DIR="${ARTIFACT_DIR:-$ONGOING/artifacts}"
DIFF_DIR="${DIFF_DIR:-$WORK/diff}"
LEGACY_DB="${LEGACY_DB:-nlcommons_promote}"
SCRATCH_DB="${SCRATCH_DB:-${LEGACY_DB}_scratch}"

STEPS=(verify-inputs restore migrate diff patch-plan patch-apply collaborators recompute ids verify dump)
DESTRUCTIVE_FROM=patch-apply

DRY_RUN=0
ASSUME_YES=0
FORCE=0
SKIP_STORAGE=0
RESTORE_TARGET=0
FROM=""
ONLY=""

for arg in "$@"; do
  case "$arg" in
    --dry-run)        DRY_RUN=1 ;;
    --yes)            ASSUME_YES=1 ;;
    --force)          FORCE=1 ;;
    --skip-storage)   SKIP_STORAGE=1 ;;
    --restore-target) RESTORE_TARGET=1 ;;
    --from=*)         FROM="${arg#--from=}" ;;
    --only=*)         ONLY="${arg#--only=}" ;;
    --list)           printf '%s\n' "${STEPS[@]}"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

# Loading the beta dump over the target is only ever right when rebuilding a
# local copy of production. On cutover the target IS the production beta
# database, and overwriting it with a snapshot would discard every write since
# the snapshot was taken. Opt in explicitly, and only together with --yes.
RESTORE_TARGET_NEEDS_YES="$RESTORE_TARGET"

mkdir -p "$WORK/logs" "$DIFF_DIR" "$ARTIFACT_DIR"

CURRENT_STEP=""

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
info() { printf '  %s\n' "$1"; }

# Names the step it died in and points at the log. The checkpoint is never
# written on this path, so a bare re-run resumes at the same step.
fail() {
  if [ -n "$CURRENT_STEP" ]; then
    printf '\033[31mFAIL\033[0m [%s] %s\n' "$CURRENT_STEP" "$1" >&2
    printf '      log: %s\n' "$WORK/logs/$CURRENT_STEP.log" >&2
    printf '      checkpoint not written; re-run to resume at this step\n' >&2
  else
    printf '\033[31mFAIL\033[0m %s\n' "$1" >&2
  fi
  exit 1
}

known_step() {
  local s
  for s in "${STEPS[@]}"; do [ "$s" = "$1" ] && return 0; done
  return 1
}
[ -n "$FROM" ] && { known_step "$FROM" || fail "--from=$FROM is not a step; see --list"; }
[ -n "$ONLY" ] && { known_step "$ONLY" || fail "--only=$ONLY is not a step; see --list"; }

# Steps at or past DESTRUCTIVE_FROM write to the target and refuse without --yes.
step_index() {
  local i=0 s
  for s in "${STEPS[@]}"; do [ "$s" = "$1" ] && { echo "$i"; return; }; i=$((i + 1)); done
  echo -1
}
DESTRUCTIVE_INDEX="$(step_index "$DESTRUCTIVE_FROM")"

should_run() {
  local step="$1"
  if [ -n "$ONLY" ]; then [ "$step" = "$ONLY" ] || return 1; fi
  if [ -n "$FROM" ] && [ "$(step_index "$step")" -lt "$(step_index "$FROM")" ]; then return 1; fi
  # --dry-run stops after patch-plan; it never reaches a writing step.
  if [ "$DRY_RUN" = 1 ] && [ "$(step_index "$step")" -gt "$(step_index patch-plan)" ]; then return 1; fi
  if [ "$FORCE" = 0 ] && [ -f "$WORK/$step.done" ]; then
    info "skip $step (checkpoint present; --force to re-run)"
    return 1
  fi
  if [ "$(step_index "$step")" -ge "$DESTRUCTIVE_INDEX" ] && [ "$ASSUME_YES" = 0 ]; then
    fail "$step writes to $(redact "${DATABASE_URL:-unset}") and needs --yes"
  fi
  return 0
}

redact() { printf '%s' "$1" | sed -E 's#(//[^:]+:)[^@]+@#\1***@#'; }

# Swaps the database name in a connection URL, keeping credentials and query
# string. Needed because pg_restore cannot rename a schema, so the current
# legacy dump has to pass through a scratch database.
url_with_db() {
  printf '%s' "$1" | sed -E "s#(//[^/]+/)[^?]*#\1$2#"
}

url_field() {
  printf '%s' "$1" | sed -nE "s#^[a-z]+://(([^:@]*)(:([^@]*))?@)?([^:/?]+)(:([0-9]+))?/([^?]*).*#\\$2#p"
}

# diffdb.sh and the bare psql/createdb/dropdb calls take their connection from
# PG* rather than from a URL, so derive those once from LEGACY_DATABASE_URL.
export_pg_env_from_url() {
  local url="$1"
  export PGUSER="${PGUSER:-$(url_field "$url" 2)}"
  export PGPASSWORD="${PGPASSWORD:-$(url_field "$url" 4)}"
  export PGHOST="${PGHOST:-$(url_field "$url" 5)}"
  export PGPORT="${PGPORT:-$(url_field "$url" 7)}"
  [ -n "${PGPORT:-}" ] || export PGPORT=5432
}

run_step() {
  local step="$1"
  shift
  should_run "$step" || return 0
  CURRENT_STEP="$step"
  bold "== $step =="
  if "$@" > >(tee -a "$WORK/logs/$step.log") 2> >(tee -a "$WORK/logs/$step.log" >&2); then
    touch "$WORK/$step.done"
  else
    fail "step exited non-zero"
  fi
  CURRENT_STEP=""
}

require_env() {
  local name="$1"
  [ -n "${!name:-}" ] || fail "$name is not set"
}

# ── 1. verify-inputs ────────────────────────────────────────────────────────
do_verify_inputs() {
  require_env DATABASE_URL
  require_env LEGACY_DATABASE_URL

  for f in "$BETA_DUMP" "$LEGACY_STALE_DUMP" "$LEGACY_CURRENT_DUMP"; do
    [ -f "$f" ] || fail "missing input: $f"
    # pg_dump custom format starts with the magic string PGDMP.
    head -c 5 "$f" | grep -q PGDMP || fail "$f is not a pg_dump custom-format archive"
    info "ok  $(basename "$f") ($(du -h "$f" | cut -f1))"
  done

  if [ -f "$BETA_CHECKSUM" ]; then
    local expected actual
    expected="$(grep -oE '[0-9a-f]{64}' "$BETA_CHECKSUM" | head -1 || true)"
    if [ -n "$expected" ]; then
      actual="$(shasum -a 256 "$BETA_DUMP" | cut -d' ' -f1)"
      [ "$expected" = "$actual" ] || fail "beta dump checksum mismatch: expected $expected, got $actual"
      info "ok  beta dump checksum matches"
    else
      info "warn $BETA_CHECKSUM holds no sha256; skipping verification"
    fi
  else
    info "warn no checksum file at $BETA_CHECKSUM"
  fi

  info "target   $(redact "$DATABASE_URL")"
  info "legacy   $(redact "$LEGACY_DATABASE_URL")"
  info "bucket   ${STORE_BUCKET:-unset} @ ${STORE_ENDPOINT:-unset}"
  info "work     $WORK"

  if [ "$SKIP_STORAGE" = 1 ]; then
    info "storage  SKIPPED (--skip-storage): objects are not uploaded and key"
    info "         rewrites are not verified. The run is not a valid rehearsal."
  else
    [ -n "${STORE_BUCKET:-}" ] || fail "STORE_BUCKET unset; pass --skip-storage to run without object storage"
  fi
}

# ── 2. restore ──────────────────────────────────────────────────────────────
# Prepares the legacy side: the stale dump lands in `public` and the current one
# in `incoming`, because diffdb.sh compares two schemas inside one database.
# pg_restore cannot rename a schema, so the current dump goes through a scratch
# database that is renamed and re-dumped. The target is only loaded from the
# beta snapshot under --restore-target; see the flag handling above for why.
do_restore() {
  local maint_url scratch_url
  maint_url="$(url_with_db "$LEGACY_DATABASE_URL" postgres)"
  scratch_url="$(url_with_db "$LEGACY_DATABASE_URL" "$SCRATCH_DB")"

  psql -qAt -d "$maint_url" -c "SELECT 1" >/dev/null \
    || fail "cannot reach $(redact "$maint_url")"

  local legacy_name
  legacy_name="$(url_field "$LEGACY_DATABASE_URL" 8)"
  psql -qAt -d "$maint_url" \
    -c "SELECT 1 FROM pg_database WHERE datname='$legacy_name'" | grep -q 1 \
    || psql -q -d "$maint_url" -c "CREATE DATABASE \"$legacy_name\""

  # The two legacy dumps come from PostgreSQL 9.3 and restore into 16 with
  # warnings (missing roles, absent extensions). Those are tolerated here and
  # the table-count assertions below are the actual gate, so a hard failure
  # cannot pass as a warning.
  if [ "$RESTORE_TARGET" = 1 ]; then
    info "restoring beta snapshot into the target (--restore-target)"
    pg_restore --no-owner --no-privileges --clean --if-exists \
      -d "$DATABASE_URL" "$BETA_DUMP" || info "pg_restore reported errors; asserted below"
  else
    info "target left untouched (pass --restore-target to load the beta snapshot)"
  fi

  info "restoring stale legacy dump into schema public"
  pg_restore --no-owner --no-privileges -d "$LEGACY_DATABASE_URL" "$LEGACY_STALE_DUMP" \
    || info "pg_restore reported errors; asserted below"

  info "restoring current legacy dump into schema incoming (via $SCRATCH_DB)"
  psql -q -v ON_ERROR_STOP=1 -d "$LEGACY_DATABASE_URL" -c "DROP SCHEMA IF EXISTS incoming CASCADE"
  psql -q -d "$maint_url" -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\""
  psql -q -v ON_ERROR_STOP=1 -d "$maint_url" -c "CREATE DATABASE \"$SCRATCH_DB\""
  pg_restore --no-owner --no-privileges -d "$scratch_url" "$LEGACY_CURRENT_DUMP" \
    || info "pg_restore reported errors; asserted below"
  psql -q -v ON_ERROR_STOP=1 -d "$scratch_url" -c "ALTER SCHEMA public RENAME TO incoming"
  pg_dump -Fc -d "$scratch_url" -n incoming -f "$WORK/incoming.pgc"
  pg_restore --no-owner --no-privileges -d "$LEGACY_DATABASE_URL" "$WORK/incoming.pgc" \
    || info "pg_restore reported errors; asserted below"
  psql -q -d "$maint_url" -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\""

  local schema n
  for schema in public incoming; do
    n="$(psql -qAt -d "$LEGACY_DATABASE_URL" \
      -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='$schema'" || echo "")"
    [ -n "$n" ] || fail "cannot count tables in schema $schema (psql failed)"
    [ "$n" -gt 0 ] 2>/dev/null || fail "schema $schema is empty after restore (got '$n')"
    info "schema $schema: $n tables"
  done

  if [ "$RESTORE_TARGET" = 1 ]; then
    n="$(psql -qAt -d "$DATABASE_URL" \
      -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" || echo "")"
    [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null || fail "target is empty after restore (got '$n')"
    info "target: $n tables"
  fi
}

# ── 3. migrate ──────────────────────────────────────────────────────────────
do_migrate() {
  npx prisma migrate deploy
}

# ── 4. diff ─────────────────────────────────────────────────────────────────
do_diff() {
  rm -rf "$DIFF_DIR"
  mkdir -p "$DIFF_DIR"
  LEGACY_DB="$LEGACY_DB" DIFF_DIR="$DIFF_DIR" "$HERE/diffdb.sh"
  info "diff CSVs: $(find "$DIFF_DIR" -name '*.csv' | wc -l | tr -d ' ')"
}

# ── 5. patch-plan ───────────────────────────────────────────────────────────
do_patch_plan() {
  DIFF_DIR="$DIFF_DIR" OUTPUT_DIR="$WORK/out-patch" LEGACY_SCHEMA=incoming \
    npx tsx "$HERE/apply-diff.ts"
}

# ── 6. patch-apply ──────────────────────────────────────────────────────────
do_patch_apply() {
  local flags=(--apply)
  [ "$SKIP_STORAGE" = 1 ] && flags+=(--skip-upload)
  DIFF_DIR="$DIFF_DIR" OUTPUT_DIR="$WORK/out-patch" LEGACY_SCHEMA=incoming \
    npx tsx "$HERE/apply-diff.ts" "${flags[@]}"
}

# ── 7. collaborators ────────────────────────────────────────────────────────
# Reads `incoming`, not the default `public`: collaborators must come from the
# current legacy state, the same source the patch was built from.
do_collaborators() {
  LEGACY_SCHEMA=incoming npx tsx "$HERE/backfill-collaborators.ts" --apply
}

# ── 8. recompute ────────────────────────────────────────────────────────────
do_recompute() {
  npx tsx "$APP/prisma/actions/recompute-interaction-counts.ts"
}

# ── 9. ids ──────────────────────────────────────────────────────────────────
# Last, because it rewrites every id and storage key in one pass. Running it
# before the patch would leave the patch inserting pre-migration id shapes.
do_ids() {
  local flags=()
  [ "$SKIP_STORAGE" = 1 ] && flags+=(--skip-storage)
  npx tsx "$APP/prisma/id-migration/migrate-ids.ts" --dry-run "${flags[@]}"
  npx tsx "$APP/prisma/id-migration/migrate-ids.ts" --yes "${flags[@]}"
}

# ── 10. verify ──────────────────────────────────────────────────────────────
do_verify() {
  local flags=()
  [ "$SKIP_STORAGE" = 1 ] && flags+=(--skip-storage)
  DIFF_DIR="$DIFF_DIR" OUTPUT_DIR="$WORK/out-patch" LEGACY_SCHEMA=incoming \
    npx tsx "$HERE/apply-diff.ts" --verify-only
  npx tsx "$APP/prisma/id-migration/migrate-ids.ts" --verify-only "${flags[@]}"
}

# ── 11. dump ────────────────────────────────────────────────────────────────
do_dump() {
  local stamp dump manifest
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="$ARTIFACT_DIR/promoted-$stamp.pgc"
  manifest="$ARTIFACT_DIR/storage-keys-$stamp.txt"

  pg_dump -Fc -d "$DATABASE_URL" -f "$dump"
  info "dump $dump ($(du -h "$dump" | cut -f1))"

  psql -Atd "$DATABASE_URL" -c "
    SELECT \"netlogoFileKey\" FROM \"ModelVersion\"
    UNION ALL SELECT \"previewImageFileKey\" FROM \"ModelVersion\" WHERE \"previewImageFileKey\" IS NOT NULL
    UNION ALL SELECT \"fileKey\" FROM \"ModelAdditionalFile\"
    ORDER BY 1" > "$manifest"
  info "manifest $manifest ($(wc -l < "$manifest" | tr -d ' ') keys)"

  (cd "$ARTIFACT_DIR" && shasum -a 256 "$(basename "$dump")" "$(basename "$manifest")" \
    > "checksums-$stamp.txt")
  info "checksums $ARTIFACT_DIR/checksums-$stamp.txt"
}

[ -n "${LEGACY_DATABASE_URL:-}" ] && export_pg_env_from_url "$LEGACY_DATABASE_URL"

if [ "$RESTORE_TARGET_NEEDS_YES" = 1 ] && [ "$ASSUME_YES" = 0 ]; then
  fail "--restore-target overwrites $(redact "${DATABASE_URL:-the target}") with the beta snapshot; pass --yes to confirm"
fi

bold "promotion $( [ "$DRY_RUN" = 1 ] && echo '(dry run: stops after patch-plan)' )"

run_step verify-inputs do_verify_inputs
run_step restore       do_restore
run_step migrate       do_migrate
run_step diff          do_diff
run_step patch-plan    do_patch_plan

if [ "$DRY_RUN" = 1 ]; then
  bold "dry run complete: the plan above was not applied. Re-run with --yes to write."
  exit 0
fi

run_step patch-apply   do_patch_apply
run_step collaborators do_collaborators
run_step recompute     do_recompute
run_step ids           do_ids
run_step verify        do_verify
run_step dump          do_dump

bold "promotion complete"
