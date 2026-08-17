import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '#prisma/client';
import { newId } from '#src/shared/utils/id.ts';
import { createInterface } from 'node:readline/promises';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import {
  assertMappedTables,
  findUnmappedIdTables,
  isJsonColumn,
  jsonCast,
  MAPPED_TABLES,
  MAP_TABLE,
  PURGED_TABLES,
  quote,
  readForeignKeys,
  readTextColumns,
  resolveIdColumns,
  type Db,
  type ForeignKey,
  type IdColumn,
  type TextColumn,
} from './lib/catalog.ts';
import { mapJsonChunks } from './lib/map-file.ts';
import { mapInsertStatements } from './lib/map-insert.ts';
import { isCurrentId, remapJson, remapString } from './lib/rewrite.ts';
import {
  copyObjects,
  createStorageClient,
  deleteKeys,
  isStagingKey,
  listAllKeys,
  planStorageMoves,
} from './lib/storage.ts';

const TRANSACTION_TIMEOUT_MS = 30 * 60 * 1000;
const OUTPUT_DIR = path.join(import.meta.dirname, 'output');

type Options = {
  dryRun: boolean;
  assumeYes: boolean;
  skipStorage: boolean;
  verifyOnly: boolean;
  dropMap: boolean;
};

function parseOptions(argv: ReadonlyArray<string>): Options {
  const known = new Set(['--dry-run', '--yes', '--skip-storage', '--verify-only', '--drop-map']);
  for (const arg of argv) {
    if (!known.has(arg)) {
      throw new Error(`unknown flag ${arg}. Known flags: ${[...known].join(', ')}`);
    }
  }
  return {
    dryRun: argv.includes('--dry-run'),
    assumeYes: argv.includes('--yes'),
    skipStorage: argv.includes('--skip-storage'),
    verifyOnly: argv.includes('--verify-only'),
    dropMap: argv.includes('--drop-map'),
  };
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [type "migrate" to continue] `);
  rl.close();
  return answer.trim() === 'migrate';
}

async function createMapTable(db: Db): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${quote(MAP_TABLE)} (
      table_name text NOT NULL,
      old_id     text NOT NULL,
      new_id     text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (table_name, old_id)
    )
  `);
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${quote(`${MAP_TABLE}_new_id_key`)} ON ${quote(MAP_TABLE)} (new_id)`,
  );
}

type MapRow = { table_name: string; old_id: string; new_id: string };

/**
 * Enrols every id that is not already in the current format and returns the
 * whole map, previously stored rows included.
 *
 * Reusing stored rows is what makes a second run safe after a partial failure:
 * a row that already carries its new id no longer matches `old_id`, so its
 * update is a no-op instead of a second reassignment.
 */
async function buildMap(
  db: Db,
  persist: boolean,
): Promise<{ map: Map<string, string>; pending: number }> {
  const stored: Array<MapRow> = persist
    ? await db.$queryRawUnsafe<Array<MapRow>>(
        `SELECT table_name, old_id, new_id FROM ${quote(MAP_TABLE)}`,
      )
    : [];

  const map = new Map<string, string>(stored.map((row) => [row.old_id, row.new_id]));
  const owner = new Map<string, string>(stored.map((row) => [row.old_id, row.table_name]));
  const fresh: Array<MapRow> = [];
  let pending = 0;

  for (const table of MAPPED_TABLES) {
    if (PURGED_TABLES.has(table)) continue;
    const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM ${quote(table)} ORDER BY id`,
    );
    for (const { id } of rows) {
      if (isCurrentId(id)) continue;
      pending += 1;

      const existingOwner = owner.get(id);
      if (existingOwner !== undefined) {
        if (existingOwner !== table) {
          throw new Error(`id ${id} exists in both ${existingOwner} and ${table}`);
        }
        continue;
      }

      owner.set(id, table);
      const replacement = newId();
      map.set(id, replacement);
      fresh.push({ table_name: table, old_id: id, new_id: replacement });
    }
  }

  if (persist && fresh.length > 0) {
    for (const { sql, params } of mapInsertStatements(quote(MAP_TABLE), fresh)) {
      await db.$executeRawUnsafe(sql, ...params);
    }
  }

  return { map, pending };
}

async function swapIds(
  tx: Db,
  foreignKeys: ReadonlyArray<ForeignKey>,
  idColumns: ReadonlyArray<IdColumn>,
  textColumns: ReadonlyArray<TextColumn>,
  map: ReadonlyMap<string, string>,
): Promise<{ idUpdates: number; softUpdates: number; purgedDrafts: number }> {
  const purgedDrafts = await purgeDrafts(tx);

  for (const fk of foreignKeys) {
    await tx.$executeRawUnsafe(
      `ALTER TABLE ${quote(fk.table)} DROP CONSTRAINT ${quote(fk.name)}`,
    );
  }

  let idUpdates = 0;
  for (const column of idColumns) {
    idUpdates += await tx.$executeRawUnsafe(
      `UPDATE ${quote(column.table)} AS t
          SET ${quote(column.column)} = m.new_id
         FROM ${quote(MAP_TABLE)} AS m
        WHERE m.table_name = $1
          AND t.${quote(column.column)} = m.old_id`,
      column.source,
    );
  }

  const softUpdates = await remapTextColumns(tx, textColumns, map);

  for (const fk of foreignKeys) {
    await tx.$executeRawUnsafe(
      `ALTER TABLE ${quote(fk.table)} ADD CONSTRAINT ${quote(fk.name)} ${fk.definition}`,
    );
  }

  return { idUpdates, softUpdates, purgedDrafts };
}

/**
 * Rewrites soft references by reading every candidate row once and writing all
 * of its changed columns in a single statement.
 *
 * Rows are addressed by `ctid` because four of the tables here have composite
 * primary keys and two have none worth joining on. An update moves a row to a
 * new `ctid`, so touching a row twice would address a tuple that no longer
 * exists. Batching the columns per row is what keeps that from happening.
 */
async function remapTextColumns(
  tx: Db,
  textColumns: ReadonlyArray<TextColumn>,
  map: ReadonlyMap<string, string>,
): Promise<number> {
  const byTable = new Map<string, Array<TextColumn>>();
  for (const column of textColumns) {
    const columns = byTable.get(column.table) ?? [];
    columns.push(column);
    byTable.set(column.table, columns);
  }

  let updated = 0;

  for (const [table, columns] of byTable) {
    const selected = columns.map((column) => quote(column.column)).join(', ');
    const filter = columns.map((column) => `${quote(column.column)} IS NOT NULL`).join(' OR ');
    const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ctid::text AS __ctid, ${selected} FROM ${quote(table)} WHERE ${filter}`,
    );

    for (const row of rows) {
      const assignments: Array<string> = [];
      const values: Array<unknown> = [];

      for (const column of columns) {
        const current = row[column.column];
        if (current === null || current === undefined) continue;

        if (isJsonColumn(column)) {
          const next = remapJson(current, map);
          const encoded = JSON.stringify(next);
          if (encoded === JSON.stringify(current)) continue;
          values.push(encoded);
          assignments.push(`${quote(column.column)} = $${values.length}${jsonCast(column)}`);
          continue;
        }

        if (typeof current !== 'string') continue;
        const next = remapString(current, map);
        if (next === current) continue;
        values.push(next);
        assignments.push(`${quote(column.column)} = $${values.length}`);
      }

      if (assignments.length === 0) continue;

      values.push(row['__ctid']);
      await tx.$executeRawUnsafe(
        `UPDATE ${quote(table)} SET ${assignments.join(', ')} WHERE ctid = $${values.length}::tid`,
        ...values,
      );
      updated += 1;
    }
  }

  return updated;
}

/**
 * Drafts are discarded rather than migrated.
 *
 * Their `data` blob is the least structured thing in the database: it holds
 * storage keys, a `seededFrom` snapshot, and attachment ids that `newId()`
 * generates inside the blob itself, referenced by no table and so unreachable
 * from the map. Publishing already hard-deletes the draft it came from, so an
 * abandoned draft is unfinished work rather than a record of anything.
 *
 * Nothing has a foreign key to ModelDraft, so this is a plain delete.
 */
async function purgeDrafts(db: Db): Promise<number> {
  return db.$executeRawUnsafe(`DELETE FROM ${quote('ModelDraft')}`);
}

type Leftover = { location: string; value: string };

async function findLeftovers(
  db: Db,
  idColumns: ReadonlyArray<IdColumn>,
  textColumns: ReadonlyArray<TextColumn>,
  map: ReadonlyMap<string, string>,
): Promise<Array<Leftover>> {
  const leftovers: Array<Leftover> = [];
  const all = [
    ...idColumns.map((column) => ({ table: column.table, column: column.column, json: false })),
    ...textColumns.map((column) => ({
      table: column.table,
      column: column.column,
      json: isJsonColumn(column),
    })),
  ];

  for (const target of all) {
    const rows = await db.$queryRawUnsafe<Array<{ value: unknown }>>(
      `SELECT ${quote(target.column)} AS value FROM ${quote(target.table)}
        WHERE ${quote(target.column)} IS NOT NULL`,
    );
    for (const { value } of rows) {
      const changed = target.json
        ? JSON.stringify(remapJson(value, map)) !== JSON.stringify(value)
        : typeof value === 'string' && remapString(value, map) !== value;
      if (!changed) continue;
      leftovers.push({
        location: `${target.table}.${target.column}`,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      });
    }
  }

  return leftovers;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('missing env DATABASE_URL');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 4 }) });
  const db = prisma as unknown as Db;

  try {
    await assertMappedTables(db);

    const unmapped = await findUnmappedIdTables(db);
    if (unmapped.length > 0) {
      throw new Error(
        `tables with a text id primary key are missing from MAPPED_TABLES: ${unmapped.join(', ')}. ` +
          'Add them to prisma/id-migration/lib/catalog.ts or their ids will not be migrated.',
      );
    }

    const foreignKeys = await readForeignKeys(db);
    const idColumns = resolveIdColumns(foreignKeys);
    const structural = new Set(idColumns.map((column) => `${column.table}.${column.column}`));
    const textColumns = await readTextColumns(db, structural);

    if (!options.dryRun && !options.verifyOnly) await createMapTable(db);
    const { map, pending } = await buildMap(db, !options.dryRun && !options.verifyOnly);

    console.log(`Foreign keys to drop and recreate: ${foreignKeys.length}`);
    console.log(`Id-bearing columns: ${idColumns.length}`);
    console.log(`Soft-reference columns to scan: ${textColumns.length}`);
    const draftRows = await db.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT count(*)::int AS count FROM ${quote('ModelDraft')}`,
    );
    const draftCount = draftRows[0]?.count ?? 0;

    console.log(`Ids in the map: ${map.size}, rows still carrying an old id: ${pending}`);
    console.log(`Drafts to purge: ${draftCount}`);

    if (options.verifyOnly) {
      await report(db, idColumns, textColumns, map, options);
      return;
    }

    const storage = options.skipStorage ? null : createStorageClient();
    const keys = storage ? await listAllKeys(storage.client, storage.bucket) : [];
    const stagingKeys = keys.filter(isStagingKey);
    const moves = planStorageMoves(
      keys.filter((key) => !isStagingKey(key)),
      map,
    );
    if (storage) {
      console.log(
        `Storage objects: ${keys.length}, of which ${moves.length} move and ` +
          `${stagingKeys.length} are draft uploads to delete`,
      );
    }

    // A previous run that committed the swap but died before the delete phase
    // leaves nothing pending in the database and superseded objects in the
    // bucket, so both have to be clear before there is nothing left to do.
    if (pending === 0 && moves.length === 0 && stagingKeys.length === 0 && draftCount === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    if (options.dryRun) {
      console.log('\nDry run, nothing written.');
      await writeMapFile(map, 'dry-run');
      return;
    }

    if (!options.assumeYes) {
      console.log(
        `\nThis rewrites every primary key in the database, moves storage objects, and\n` +
          `deletes all ${draftCount} unpublished drafts along with their uploads.\n` +
          'Take a full backup first and make sure the application is not serving traffic.',
      );
      if (!(await confirm('Continue?'))) {
        console.log('Aborted.');
        return;
      }
    }

    if (storage && moves.length > 0) {
      console.log('Copying storage objects to their new keys...');
      await copyObjects(storage.client, storage.bucket, moves, map, (done, total) => {
        if (done % 100 === 0 || done === total) console.log(`  ${done}/${total}`);
      });
    }

    console.log('Swapping ids...');
    const result = await prisma.$transaction(
      async (tx) =>
        swapIds(tx as unknown as Db, foreignKeys, idColumns, textColumns, map),
      { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 60_000 },
    );
    console.log(
      `  ${result.idUpdates} id values, ${result.softUpdates} rows with soft references, ` +
        `${result.purgedDrafts} drafts purged`,
    );

    const toDelete = [...moves.map((move) => move.from), ...stagingKeys];
    if (storage && toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} superseded and draft objects...`);
      await deleteKeys(storage.client, storage.bucket, toDelete);
    }

    await writeMapFile(map, 'applied');
    await report(db, idColumns, textColumns, map, options);

    if (options.dropMap) {
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS ${quote(MAP_TABLE)}`);
      console.log(`Dropped ${MAP_TABLE}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function report(
  db: Db,
  idColumns: ReadonlyArray<IdColumn>,
  textColumns: ReadonlyArray<TextColumn>,
  map: ReadonlyMap<string, string>,
  options: Options,
): Promise<void> {
  const leftovers = await findLeftovers(db, idColumns, textColumns, map);

  let storageLeftovers = 0;
  if (!options.skipStorage) {
    const storage = createStorageClient();
    const keys = await listAllKeys(storage.client, storage.bucket);
    storageLeftovers = planStorageMoves(keys, map).length;
  }

  if (leftovers.length === 0 && storageLeftovers === 0) {
    const scope = options.skipStorage ? 'the database (storage not checked)' : 'the database or in storage';
    console.log(`\nVerified: no mapped id survives in ${scope}.`);
    return;
  }

  console.log(`\nFAILED VERIFICATION: ${leftovers.length} database values, ${storageLeftovers} objects`);
  for (const leftover of leftovers.slice(0, 20)) {
    console.log(`  ${leftover.location}: ${leftover.value}`);
  }
  if (leftovers.length > 20) console.log(`  ... and ${leftovers.length - 20} more`);
  process.exitCode = 1;
}

async function writeMapFile(map: ReadonlyMap<string, string>, label: string): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const file = path.join(OUTPUT_DIR, `id-map-${label}-${Date.now()}.json`);
  await pipeline(Readable.from(mapJsonChunks(map)), createWriteStream(file));
  console.log(`Map written to ${path.relative(process.cwd(), file)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
