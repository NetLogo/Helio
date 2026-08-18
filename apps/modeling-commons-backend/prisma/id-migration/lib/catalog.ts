export type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

/**
 * Every table whose primary key is a generated entity id. Listed explicitly
 * rather than sniffed from the catalog so that `_prisma_migrations`, whose
 * text `id` is a UUID owned by Prisma, can never be dragged in.
 *
 * Verified against prisma/schema.prisma: these are exactly the models
 * declaring `id String @id @default(nanoid())`. The four join tables
 * (ModelVersion, ModelVersionTag, ModelAuthor, ModelLike) carry composite
 * primary keys made of foreign keys and are migrated through the edge walk.
 */
export const MAPPED_TABLES = [
  'User',
  'Account',
  'Session',
  'Verification',
  'Passkey',
  'Model',
  'ModelAdditionalFile',
  'Tag',
  'NonMemberContributor',
  'ModelPermission',
  'ModelInteraction',
  'ModelDraft',
  'Event',
] as const;

/**
 * Mapped tables that are emptied instead of migrated. Their rows still have to
 * be gone before the swap, so they stay in MAPPED_TABLES and are only skipped
 * when the map is built.
 */
export const PURGED_TABLES: ReadonlySet<string> = new Set(['ModelDraft']);

export const MAP_TABLE = '_id_migration_map';

const SYSTEM_TABLES = new Set(['_prisma_migrations', MAP_TABLE]);

export function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export type ForeignKey = {
  name: string;
  table: string;
  parentTable: string;
  columns: Array<string>;
  parentColumns: Array<string>;
  definition: string;
};

export async function readForeignKeys(db: Db): Promise<Array<ForeignKey>> {
  return db.$queryRawUnsafe<Array<ForeignKey>>(`
    SELECT c.conname::text AS name,
           child.relname::text AS "table",
           parent.relname::text AS "parentTable",
           pg_get_constraintdef(c.oid) AS definition,
           (SELECT array_agg(a.attname::text ORDER BY k.ord)
              FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columns,
           (SELECT array_agg(a.attname::text ORDER BY k.ord)
              FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS "parentColumns"
      FROM pg_constraint c
      JOIN pg_class child ON child.oid = c.conrelid
      JOIN pg_class parent ON parent.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = child.relnamespace
     WHERE c.contype = 'f'
       AND n.nspname = current_schema()
     ORDER BY c.conname
  `);
}

export type IdColumn = { table: string; column: string; source: string };

/**
 * Walks the foreign-key graph to a fixpoint to find every column that holds a
 * mapped entity id, whether it names that entity's table directly or reaches
 * it through another table.
 *
 * The indirection is not hypothetical: `ModelVersionTag.modelId` is a Model id
 * but has no foreign key to Model. It references `ModelVersion(modelId,
 * versionNumber)`, and only `ModelVersion.modelId` points at `Model.id`.
 * Collecting one hop would miss it and leave a dangling join row.
 */
export function resolveIdColumns(
  foreignKeys: Array<ForeignKey>,
  mappedTables: ReadonlyArray<string> = MAPPED_TABLES,
): Array<IdColumn> {
  const source = new Map<string, string>();
  for (const table of mappedTables) source.set(`${table}.id`, table);

  let changed = true;
  while (changed) {
    changed = false;
    for (const fk of foreignKeys) {
      fk.parentColumns.forEach((parentColumn, index) => {
        const parentSource = source.get(`${fk.parentTable}.${parentColumn}`);
        if (parentSource === undefined) return;

        const childColumn = fk.columns[index];
        if (childColumn === undefined) return;

        const key = `${fk.table}.${childColumn}`;
        const existing = source.get(key);
        if (existing === undefined) {
          source.set(key, parentSource);
          changed = true;
          return;
        }
        if (existing !== parentSource) {
          throw new Error(
            `${key} reaches two id spaces (${existing} and ${parentSource}) via ${fk.name}`,
          );
        }
      });
    }
  }

  return [...source].map(([key, table]) => {
    const separator = key.lastIndexOf('.');
    return { table: key.slice(0, separator), column: key.slice(separator + 1), source: table };
  });
}

export type TextColumn = { table: string; column: string; dataType: string };

export function jsonCast(column: TextColumn): string {
  if (column.dataType === 'jsonb') return '::jsonb';
  if (column.dataType === 'json') return '::json';
  return '';
}

export function isJsonColumn(column: TextColumn): boolean {
  return column.dataType === 'json' || column.dataType === 'jsonb';
}

/**
 * Text and JSON columns that the foreign-key walk does not cover, which is
 * where every soft reference lives: `Event.resourceId`, `Event.payload`,
 * `ModelDraft.data`, `ModelInteraction.sessionId`, `User.image`, and the
 * `fileKey` columns whose storage paths embed an owner id.
 */
export async function readTextColumns(
  db: Db,
  structural: ReadonlySet<string>,
): Promise<Array<TextColumn>> {
  const rows = await db.$queryRawUnsafe<Array<{ table: string; column: string; type: string }>>(`
    SELECT c.table_name::text AS "table", c.column_name::text AS "column", c.data_type::text AS "type"
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = current_schema()
       AND t.table_type = 'BASE TABLE'
       AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
     ORDER BY c.table_name, c.ordinal_position
  `);

  return rows
    .filter((row) => !SYSTEM_TABLES.has(row.table))
    .filter((row) => !structural.has(`${row.table}.${row.column}`))
    .map((row) => ({ table: row.table, column: row.column, dataType: row.type }));
}

export async function assertMappedTables(db: Db): Promise<void> {
  const rows = await db.$queryRawUnsafe<Array<{ table: string; columns: Array<string> }>>(`
    SELECT t.relname::text AS "table",
           (SELECT array_agg(a.attname::text ORDER BY a.attname)
              FROM unnest(c.conkey) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columns
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE c.contype = 'p' AND n.nspname = current_schema()
  `);

  const byTable = new Map(rows.map((row) => [row.table, row.columns]));

  for (const table of MAPPED_TABLES) {
    const columns = byTable.get(table);
    if (columns === undefined) throw new Error(`mapped table ${table} is missing from the database`);
    if (columns.length !== 1 || columns[0] !== 'id') {
      throw new Error(`mapped table ${table} has primary key (${columns.join(', ')}), expected (id)`);
    }
  }
}

/**
 * Tables with a lone text `id` primary key that nobody declared as mapped.
 * A new model added to the schema without being listed here would otherwise
 * keep its old ids in silence.
 */
export async function findUnmappedIdTables(db: Db): Promise<Array<string>> {
  const rows = await db.$queryRawUnsafe<Array<{ table: string }>>(`
    SELECT t.relname::text AS "table"
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.contype = 'p'
       AND n.nspname = current_schema()
       AND array_length(c.conkey, 1) = 1
       AND a.attname = 'id'
       AND a.atttypid = 'text'::regtype
  `);

  const mapped = new Set<string>(MAPPED_TABLES);
  return rows
    .map((row) => row.table)
    .filter((table) => !mapped.has(table) && !SYSTEM_TABLES.has(table));
}
