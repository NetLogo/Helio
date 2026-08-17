export type MapRow = { table_name: string; old_id: string; new_id: string };

export type Statement = { sql: string; params: string[] };

/** PostgreSQL refuses a statement carrying more bind parameters than this. */
export const MAX_BIND_PARAMS = 65_535;

const COLUMNS_PER_ROW = 3;

/**
 * Rows per statement. Three parameters each, so this sits an order of
 * magnitude below the PostgreSQL ceiling and keeps the argument spread at the
 * call site small enough not to overflow the stack.
 */
export const ROWS_PER_STATEMENT = 5_000;

/**
 * Batched INSERTs for the id map.
 *
 * The map for the production database holds ~6.2 million rows. Emitting one
 * statement for all of them needs ~18.5 million bind parameters, which
 * overflows the argument spread (`RangeError: Maximum call stack size
 * exceeded`) long before PostgreSQL gets a chance to reject it for exceeding
 * `MAX_BIND_PARAMS`. Neither limit is reachable on a development-sized
 * database, which is why this only failed against the real snapshot.
 *
 * Placeholder numbering restarts in every statement, because each is bound
 * separately.
 */
export function mapInsertStatements(mapTable: string, rows: readonly MapRow[]): Statement[] {
  const statements: Statement[] = [];

  for (let start = 0; start < rows.length; start += ROWS_PER_STATEMENT) {
    const batch = rows.slice(start, start + ROWS_PER_STATEMENT);

    const values = batch
      .map((_, index) => {
        const base = index * COLUMNS_PER_ROW;
        return `($${base + 1}, $${base + 2}, $${base + 3})`;
      })
      .join(', ');

    statements.push({
      sql: `INSERT INTO ${mapTable} (table_name, old_id, new_id) VALUES ${values}
       ON CONFLICT (table_name, old_id) DO NOTHING`,
      params: batch.flatMap((row) => [row.table_name, row.old_id, row.new_id]),
    });
  }

  return statements;
}
