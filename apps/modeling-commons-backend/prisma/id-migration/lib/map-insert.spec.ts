import { describe, expect, it } from 'vitest';
import { MAX_BIND_PARAMS, mapInsertStatements, type MapRow } from './map-insert.ts';

function rows(n: number): MapRow[] {
  return Array.from({ length: n }, (_, i) => ({
    table_name: 'Model',
    old_id: `old-${i}`,
    new_id: `new-${i}`,
  }));
}

describe('mapInsertStatements', () => {
  it('emits nothing for no rows', () => {
    expect(mapInsertStatements('IdMap', [])).toEqual([]);
  });

  it('keeps every statement under the PostgreSQL bind-parameter limit', () => {
    // The id map for the real database holds ~6.2M rows. A single statement
    // would need ~18.5M parameters, which both overflows the argument spread
    // and exceeds what PostgreSQL will accept.
    for (const count of [1, 4999, 5000, 5001, 100_000]) {
      for (const { params } of mapInsertStatements('IdMap', rows(count))) {
        expect(params.length).toBeLessThanOrEqual(MAX_BIND_PARAMS);
      }
    }
  });

  it('covers every row exactly once and in order', () => {
    const input = rows(12_345);
    const emitted = mapInsertStatements('IdMap', input).flatMap(({ params }) => {
      const out: MapRow[] = [];
      for (let i = 0; i < params.length; i += 3) {
        out.push({
          table_name: params[i] as string,
          old_id: params[i + 1] as string,
          new_id: params[i + 2] as string,
        });
      }
      return out;
    });
    expect(emitted).toEqual(input);
  });

  it('restarts placeholder numbering in every statement', () => {
    // Carrying a running index across chunks is the obvious way to get this
    // wrong: the SQL would reference $15001 while only 15000 parameters are
    // bound, and the failure would only appear on a dataset large enough to
    // need a second statement.
    const statements = mapInsertStatements('IdMap', rows(7000));
    expect(statements.length).toBeGreaterThan(1);

    for (const { sql, params } of statements) {
      const placeholders = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
      expect(Math.min(...placeholders)).toBe(1);
      expect(Math.max(...placeholders)).toBe(params.length);
    }
  });

  it('preserves the conflict clause so a resumed run is idempotent', () => {
    const [statement] = mapInsertStatements('IdMap', rows(3));
    expect(statement?.sql).toContain('ON CONFLICT (table_name, old_id) DO NOTHING');
  });
});
