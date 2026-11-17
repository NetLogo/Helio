import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';
import pg from 'pg';

const E2E_DATABASE = 'test_e2e';

function buildDatabaseUrl(database: string): string {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_URL } = process.env;
  return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_URL}/${database}?sslmode=disable`;
}

async function createDatabaseIfMissing(adminUrl: string, database: string): Promise<void> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    database,
  ]);
  if (rowCount === 0) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();
}

export async function useE2eDatabaseBeforeEnvImport(): Promise<void> {
  config({ quiet: true });
  await createDatabaseIfMissing(buildDatabaseUrl(process.env['POSTGRES_DB'] ?? ''), E2E_DATABASE);
  const e2eUrl = buildDatabaseUrl(E2E_DATABASE);
  execFileSync('yarn', ['run', '--silent', 'db:migrate'], {
    env: { ...process.env, DATABASE_URL: e2eUrl },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  process.env['POSTGRES_DB'] = E2E_DATABASE;
  process.env['DATABASE_URL'] = e2eUrl;
}
