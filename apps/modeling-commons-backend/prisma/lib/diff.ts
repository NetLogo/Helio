import { parseCsv } from './csv.ts';

/**
 * Reads the CSVs produced by prisma/diffdb.sh. Each file is `side,id,detail`
 * where `detail` is row_to_json for new/deleted rows and a human-readable
 * `col: [old] -> [new]` summary for modified rows.
 *
 * Only `side` and `id` are trusted for new/modified rows — the authoritative
 * values are re-read from the legacy snapshot, because diffdb.sh replaces the
 * `contents` columns with an md5 digest. Deleted rows are the exception: the
 * row is gone from the snapshot, so its json is the only remaining copy.
 */

export const PATCHABLE_TABLES = [
  'people',
  'nodes',
  'versions',
  'tags',
  'tagged_nodes',
  'attachments',
] as const;

export type PatchableTable = (typeof PATCHABLE_TABLES)[number];

export const DIFF_SIDES = ['new', 'modified', 'deleted'] as const;
export type DiffSide = (typeof DIFF_SIDES)[number];

export type DiffRow = {
  side: DiffSide;
  id: number;
  /** row_to_json of the deleted row; null for new/modified rows. */
  deletedRow: Record<string, unknown> | null;
};

export type TableDiff = {
  table: string;
  rows: DiffRow[];
  problems: string[];
};

export function isPatchableTable(table: string): table is PatchableTable {
  return (PATCHABLE_TABLES as readonly string[]).includes(table);
}

export function parseTableDiff(table: string, contents: string): TableDiff {
  const records = parseCsv(contents);
  const problems: string[] = [];
  const rows: DiffRow[] = [];

  const [header, ...body] = records;
  if (!header) return { table, rows, problems: [`${table}.csv is empty`] };
  if (header.join(',') !== 'side,id,detail') {
    return {
      table,
      rows,
      problems: [
        `${table}.csv has header [${header.join(',')}], expected [side,id,detail]. ` +
          `Tables without an id column cannot be patched.`,
      ],
    };
  }

  for (const [index, record] of body.entries()) {
    const line = index + 2;
    const [side, rawId, detail] = record;

    if (!side || !isDiffSide(side)) {
      problems.push(`${table}.csv:${line}: unknown side ${JSON.stringify(side ?? '')}`);
      continue;
    }
    if (!rawId || !/^\d+$/.test(rawId)) {
      problems.push(`${table}.csv:${line}: unusable id ${JSON.stringify(rawId ?? '')}`);
      continue;
    }

    let deletedRow: Record<string, unknown> | null = null;
    if (side === 'deleted') {
      try {
        const parsed: unknown = JSON.parse(detail ?? '');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('not a json object');
        }
        deletedRow = parsed as Record<string, unknown>;
      } catch (err) {
        problems.push(
          `${table}.csv:${line}: deleted row ${rawId} has unreadable json (${(err as Error).message})`,
        );
        continue;
      }
    }

    rows.push({ side, id: Number(rawId), deletedRow });
  }

  return { table, rows, problems };
}

export function rowsBySide(diff: TableDiff, side: DiffSide): DiffRow[] {
  return diff.rows.filter((r) => r.side === side);
}

export function idsBySide(diff: TableDiff, side: DiffSide): number[] {
  return rowsBySide(diff, side).map((r) => r.id);
}

export function requireNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number') {
    throw new Error(`Deleted row is missing a numeric ${key}`);
  }
  return value;
}

export function optionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Legacy timestamps are `timestamp without time zone`, which node-postgres reads
 * as local time. Parse json copies the same way, or deleted rows would land in a
 * different instant than the rows archive.ts wrote from the same source.
 */
export function optionalDate(row: Record<string, unknown>, key: string): Date | null {
  const value = row[key];
  if (typeof value !== 'string') return null;
  const parsed = new Date(value.replace(/(\.\d{3})\d+$/, '$1'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDiffSide(value: string): value is DiffSide {
  return (DIFF_SIDES as readonly string[]).includes(value);
}
