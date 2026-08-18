import pg from 'pg';
import Cursor from 'pg-cursor';

export type LegacyPerson = {
  id: number;
  email_address: string | null;
  first_name: string | null;
  last_name: string | null;
  administrator: boolean | null;
  birthdate: Date | null;
  country_name: string | null;
  url: string | null;
  avatar_file_name: string | null;
  avatar_updated_at: Date | null;
  biography: string | null;
  created_at: Date | null;
  updated_at: Date | null;
};

export type LegacyNode = {
  id: number;
  name: string;
  created_at: Date | null;
  updated_at: Date | null;
  visibility_id: number;
};

export type LegacyVersion = {
  id: number;
  node_id: number;
  person_id: number;
  description: string;
  contents: string;
  created_at: Date | null;
  updated_at: Date | null;
};

export type LegacyTag = {
  id: number;
  name: string | null;
  created_at: Date | null;
};

export type LegacyTagging = {
  id: number;
  node_id: number;
  tag_id: number;
  created_at: Date | null;
};

export type LegacyAttachment = {
  id: number;
  node_id: number;
  person_id: number;
  filename: string;
  content_type: string;
  contents: Buffer;
  created_at: Date | null;
};

export type LegacyCollaboration = {
  id: number;
  person_id: number | null;
  node_id: number | null;
  collaborator_type_id: number | null;
  created_at: Date | null;
};

export type LegacyNonMemberCollaboration = {
  id: number;
  non_member_collaborator_id: number | null;
  node_id: number | null;
  collaborator_type_id: number | null;
  person_id: number;
  email: string | null;
  name: string | null;
  created_at: Date | null;
};

export type LegacyCollaboratorType = {
  id: number;
  name: string | null;
};

export const PERSON_COLUMNS = `id, email_address, first_name, last_name, administrator,
       avatar_file_name, avatar_updated_at, birthdate, country_name, url, biography,
       created_at, updated_at`;
export const NODE_COLUMNS = `id, name, created_at, updated_at, visibility_id`;
export const VERSION_COLUMNS = `id, node_id, person_id, description, contents, created_at, updated_at`;
export const TAG_COLUMNS = `id, name, created_at`;
export const TAGGING_COLUMNS = `id, node_id, tag_id, created_at`;
export const ATTACHMENT_COLUMNS = `id, node_id, person_id, filename, content_type, contents, created_at`;

export function assertSchemaName(schema: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid legacy schema name: ${JSON.stringify(schema)}`);
  }
  return schema;
}

export class LegacyDatabase {
  private readonly pool: pg.Pool;
  readonly schema: string;

  constructor(connectionString: string, schema: string, max = 4) {
    this.pool = new pg.Pool({ connectionString, max });
    this.schema = assertSchemaName(schema);
  }

  table(name: string): string {
    return `${this.schema}.${name}`;
  }

  async allPeopleEmails(): Promise<Array<{ id: number; email_address: string | null }>> {
    const { rows } = await this.pool.query<{ id: number; email_address: string | null }>(
      `SELECT id, email_address FROM ${this.table('people')} ORDER BY id ASC`,
    );
    return rows;
  }

  async peopleByIds(ids: readonly number[]): Promise<LegacyPerson[]> {
    return this.byIds<LegacyPerson>('people', PERSON_COLUMNS, ids);
  }

  async nodesByIds(ids: readonly number[]): Promise<LegacyNode[]> {
    return this.byIds<LegacyNode>('nodes', NODE_COLUMNS, ids);
  }

  async versionsByIds(ids: readonly number[]): Promise<LegacyVersion[]> {
    return this.byIds<LegacyVersion>('versions', VERSION_COLUMNS, ids);
  }

  async tagsByIds(ids: readonly number[]): Promise<LegacyTag[]> {
    return this.byIds<LegacyTag>('tags', TAG_COLUMNS, ids);
  }

  async taggingsByIds(ids: readonly number[]): Promise<LegacyTagging[]> {
    return this.byIds<LegacyTagging>('tagged_nodes', TAGGING_COLUMNS, ids);
  }

  async attachmentsByIds(ids: readonly number[]): Promise<LegacyAttachment[]> {
    return this.byIds<LegacyAttachment>('attachments', ATTACHMENT_COLUMNS, ids);
  }

  async allTags(): Promise<LegacyTag[]> {
    const { rows } = await this.pool.query<LegacyTag>(
      `SELECT ${TAG_COLUMNS} FROM ${this.table('tags')} ORDER BY id ASC`,
    );
    return rows;
  }

  async allCollaboratorTypes(): Promise<LegacyCollaboratorType[]> {
    const { rows } = await this.pool.query<LegacyCollaboratorType>(
      `SELECT id, name FROM ${this.table('collaborator_types')} ORDER BY id ASC`,
    );
    return rows;
  }

  async allCollaborations(): Promise<LegacyCollaboration[]> {
    const { rows } = await this.pool.query<LegacyCollaboration>(
      `SELECT id, person_id, node_id, collaborator_type_id, created_at
       FROM ${this.table('collaborations')}
       ORDER BY id ASC`,
    );
    return rows;
  }

  /** Joined so a contributor's identity travels with the row that credits it. */
  async allNonMemberCollaborations(): Promise<LegacyNonMemberCollaboration[]> {
    const { rows } = await this.pool.query<LegacyNonMemberCollaboration>(
      `SELECT c.id, c.non_member_collaborator_id, c.node_id, c.collaborator_type_id,
              c.person_id, c.created_at, p.email, p.name
       FROM ${this.table('non_member_collaborations')} c
       LEFT JOIN ${this.table('non_member_collaborators')} p
              ON p.id = c.non_member_collaborator_id
       ORDER BY c.id ASC`,
    );
    return rows;
  }

  async versionsForNode(nodeId: number): Promise<LegacyVersion[]> {
    const { rows } = await this.pool.query<LegacyVersion>(
      `SELECT ${VERSION_COLUMNS} FROM ${this.table('versions')}
       WHERE node_id = $1
       ORDER BY created_at ASC NULLS LAST, id ASC`,
      [nodeId],
    );
    return rows;
  }

  async attachmentsForNode(nodeId: number): Promise<LegacyAttachment[]> {
    const { rows } = await this.pool.query<LegacyAttachment>(
      `SELECT ${ATTACHMENT_COLUMNS} FROM ${this.table('attachments')}
       WHERE node_id = $1
       ORDER BY id ASC`,
      [nodeId],
    );
    return rows;
  }

  async taggingsForNode(nodeId: number): Promise<LegacyTagging[]> {
    const { rows } = await this.pool.query<LegacyTagging>(
      `SELECT ${TAGGING_COLUMNS} FROM ${this.table('tagged_nodes')}
       WHERE node_id = $1
       ORDER BY id ASC`,
      [nodeId],
    );
    return rows;
  }

  async spamNodeIds(): Promise<Set<number>> {
    const { rows } = await this.pool.query<{ node_id: number }>(
      `SELECT node_id FROM ${this.table('spam_warnings')}
       WHERE node_id IS NOT NULL
       GROUP BY node_id
       HAVING COUNT(*) >= 2`,
    );
    return new Set(rows.map((r) => r.node_id));
  }

  async existingIds(table: string, ids: readonly number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const { rows } = await this.pool.query<{ id: number }>(
      `SELECT id FROM ${this.table(table)} WHERE id = ANY($1::int[])`,
      [[...ids]],
    );
    return new Set(rows.map((r) => r.id));
  }

  async streamRows<T extends pg.QueryResultRow>(
    sql: string,
    batchSize: number,
    onBatch: (rows: T[]) => Promise<void>,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      const cursor = client.query(new Cursor<T>(sql));
      for (;;) {
        const rows: T[] = await new Promise((resolve, reject) =>
          cursor.read(batchSize, (err, r) => (err ? reject(err) : resolve(r as T[]))),
        );
        if (rows.length === 0) break;
        await onBatch(rows);
      }
      await new Promise<void>((resolve) => cursor.close(() => resolve()));
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
  }

  private async byIds<T extends pg.QueryResultRow>(
    table: string,
    columns: string,
    ids: readonly number[],
  ): Promise<T[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query<T>(
      `SELECT ${columns} FROM ${this.table(table)} WHERE id = ANY($1::int[]) ORDER BY id ASC`,
      [[...ids]],
    );
    return rows;
  }
}
