#!/usr/bin/env bash
# Diffs the migrated legacy snapshot (schema `public`) against a fresh dump of
# the same database (schema `incoming`) and writes one CSV per changed table.
#
# Each CSV is `side,id,detail` where side is new | modified | deleted. `detail`
# is row_to_json for new/deleted rows and a `col: [old] -> [new]` summary for
# modified ones. The `contents` columns of versions and attachments are replaced
# with an md5 digest so the diff stays small; prisma/legacy-migration/apply-diff.ts re-reads the real
# bytes from the `incoming` schema.
#
# Tables in SKIP feed ModelInteraction. initial-import.ts does populate it — over
# six million rows on the production snapshot — but the table has no dedupe key,
# so their diffs are not actionable and interaction drift stays invisible here.
#
# Connection comes from the standard PG* env vars (PGHOST, PGPORT, PGUSER, ...).
#
# Usage: LEGACY_DB=nlcommons_current DIFF_DIR=~/dbdiff ./prisma/legacy-migration/diffdb.sh
set -euo pipefail

DB="${LEGACY_DB:-nlcommons_current}"
OUT="${DIFF_DIR:-$HOME/dbdiff}"
SKIP="logged_actions model_views model_view_counts model_downloads"
mkdir -p "$OUT"

hash_cols_for() {
  case "$1" in
    versions|attachments) echo "'contents'" ;;
    *)                    echo "''" ;;
  esac
}
in_list() { for x in $2; do [ "$x" = "$1" ] && return 0; done; return 1; }

tables=$(psql -d "$DB" -Atc "
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
    AND EXISTS (SELECT 1 FROM pg_class c2 JOIN pg_namespace n2 ON n2.oid=c2.relnamespace
                WHERE n2.nspname='incoming' AND c2.relname=c.relname)
  ORDER BY 1")

for t in $tables; do
  in_list "$t" "$SKIP" && { echo "SKIP $t"; continue; }
  f="$OUT/$t.csv"; e="$OUT/$t.err"
  hc=$(hash_cols_for "$t")

  proj=$(psql -d "$DB" -Atc "
    SELECT string_agg(
      CASE WHEN column_name = ANY(ARRAY[$hc])
           THEN format('md5(%I::text) AS %I', column_name, column_name)
           ELSE format('%I', column_name) END,
      ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='$t'")

  has_id=$(psql -d "$DB" -Atc "
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='$t' AND column_name='id'")

  if [ "$has_id" = "1" ]; then
    q="
    WITH a AS (SELECT $proj FROM public.\"$t\"),
         b AS (SELECT $proj FROM incoming.\"$t\"),
         oc AS (SELECT * FROM a EXCEPT ALL SELECT * FROM b),
         oi AS (SELECT * FROM b EXCEPT ALL SELECT * FROM a),
         m  AS (
           SELECT oc.id,
                  string_agg(ka.key || ': [' || coalesce(ka.value,'NULL') ||
                             '] -> [' || coalesce(kb.value,'NULL') || ']',
                             ' | ' ORDER BY ka.key) AS detail
           FROM oc JOIN oi ON oi.id = oc.id,
                LATERAL json_each_text(row_to_json(oc)) ka,
                LATERAL json_each_text(row_to_json(oi)) kb
           WHERE kb.key = ka.key AND ka.value IS DISTINCT FROM kb.value
           GROUP BY oc.id)
    SELECT 'deleted' AS side, oc.id, row_to_json(oc)::text AS detail
      FROM oc WHERE NOT EXISTS (SELECT 1 FROM m WHERE m.id = oc.id)
    UNION ALL
    SELECT 'new', oi.id, row_to_json(oi)::text
      FROM oi WHERE NOT EXISTS (SELECT 1 FROM m WHERE m.id = oi.id)
    UNION ALL
    SELECT 'modified', m.id, m.detail FROM m
    ORDER BY 2"
  else
    q="
    WITH a AS (SELECT $proj FROM public.\"$t\"),
         b AS (SELECT $proj FROM incoming.\"$t\")
    SELECT 'deleted' AS side, row_to_json(x)::text AS detail
      FROM (SELECT * FROM a EXCEPT ALL SELECT * FROM b) x
    UNION ALL
    SELECT 'new', row_to_json(y)::text
      FROM (SELECT * FROM b EXCEPT ALL SELECT * FROM a) y"
  fi

  psql -d "$DB" --csv -o "$f" -c "$q" 2>"$e" || { echo "FAIL $t -> $e"; continue; }

  if [ "$(wc -l < "$f")" -le 1 ]; then rm -f "$f" "$e"
  else rm -f "$e"; echo "DIFF $t ($(( $(wc -l < "$f") - 1 )) rows)"; fi
done
