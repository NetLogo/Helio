#!/usr/bin/env bash
# Full rehearsal:
#   archive(baseline) + patch(diff)   must equal   archive(incoming)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"
cd "$APP"

export PGHOST=127.0.0.1 PGPORT=5432 PGUSER=admin PGPASSWORD=test
export IP_HASH_SALT=rehearsal-salt
BASE="postgresql://admin:test@127.0.0.1:5432"
LEGACY_DB=rehearsal_legacy
PATCHED_DB=rehearsal_patched
FRESH_DB=rehearsal_fresh
DIFF_DIR="${DIFF_DIR:-$HERE/.work/diff}"
WORK="$HERE/.work"
mkdir -p "$WORK"

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

step "1. legacy database: baseline (public) + fresh dump (incoming)"
psql -d postgres -qc "DROP DATABASE IF EXISTS $LEGACY_DB" >/dev/null
psql -d postgres -qc "CREATE DATABASE $LEGACY_DB" >/dev/null
psql -d "$LEGACY_DB" -q -v ON_ERROR_STOP=1 -f "$HERE/01-baseline.sql"
psql -d "$LEGACY_DB" -q -v ON_ERROR_STOP=1 -f "$HERE/02-incoming.sql"

step "2. two empty target databases on the current schema"
for db in "$PATCHED_DB" "$FRESH_DB"; do
  psql -d postgres -qc "DROP DATABASE IF EXISTS $db" >/dev/null
  psql -d postgres -qc "CREATE DATABASE $db" >/dev/null
  DATABASE_URL="$BASE/$db" npx prisma migrate deploy >/dev/null
done

step "3. archive the baseline into the patch target (what production looks like today)"
rm -rf "$WORK/out-archive"
DATABASE_URL="$BASE/$PATCHED_DB" LEGACY_DATABASE_URL="$BASE/$LEGACY_DB" LEGACY_SCHEMA=public \
  OUTPUT_DIR="$WORK/out-archive" npx tsx prisma/archive.ts | tail -3

step "4. diff baseline against the fresh dump"
rm -rf "$DIFF_DIR"
LEGACY_DB="$LEGACY_DB" DIFF_DIR="$DIFF_DIR" ./prisma/diffdb.sh

step "5. dry run"
DATABASE_URL="$BASE/$PATCHED_DB" LEGACY_DATABASE_URL="$BASE/$LEGACY_DB" LEGACY_SCHEMA=incoming \
  DIFF_DIR="$DIFF_DIR" OUTPUT_DIR="$WORK/out-patch" npx tsx prisma/patch.ts

step "6. apply"
DATABASE_URL="$BASE/$PATCHED_DB" LEGACY_DATABASE_URL="$BASE/$LEGACY_DB" LEGACY_SCHEMA=incoming \
  DIFF_DIR="$DIFF_DIR" OUTPUT_DIR="$WORK/out-patch" npx tsx prisma/patch.ts --apply --skip-upload

step "7. archive the fresh dump into a second target, from scratch"
rm -rf "$WORK/out-fresh"
DATABASE_URL="$BASE/$FRESH_DB" LEGACY_DATABASE_URL="$BASE/$LEGACY_DB" LEGACY_SCHEMA=incoming \
  OUTPUT_DIR="$WORK/out-fresh" npx tsx prisma/archive.ts | tail -3

step "8. compare"
DATABASE_URL="$BASE/$PATCHED_DB" npx tsx prisma/rehearsal/dump.ts > "$WORK/patched.json"
DATABASE_URL="$BASE/$FRESH_DB"   npx tsx prisma/rehearsal/dump.ts > "$WORK/fresh.json"

# A soft-deleted model is by design absent from an archive of the new snapshot,
# so assert it separately and compare everything else.
soft=$(node -e "console.log(JSON.stringify(require('$WORK/patched.json').softDeletedModels))")
if [ "$soft" != "[13]" ]; then
  printf '\n\033[31mFAIL\033[0m expected model 13 soft deleted, got %s\n' "$soft"
  exit 1
fi
printf 'soft-deleted models: %s (node 13 was deleted in the legacy app)\n' "$soft"

for f in fresh patched; do
  node -e "const d=require('$WORK/$f.json'); delete d.softDeletedModels; console.log(JSON.stringify(d,null,2))" \
    > "$WORK/$f.cmp.json"
done

if diff -u "$WORK/fresh.cmp.json" "$WORK/patched.cmp.json"; then
  printf '\n\033[32mPASS\033[0m patched target is identical to a from-scratch archive of the new snapshot\n'
else
  printf '\n\033[31mFAIL\033[0m see the diff above (- fresh archive, + patched)\n'
  exit 1
fi
