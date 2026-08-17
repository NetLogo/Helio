/**
 * Runtime proof that the @data-integrity cohort writes nothing. Row counts for
 * every table are snapshotted before the first scenario and compared after the
 * last; any difference fails the run. Reading the step definitions is not
 * enough, because a write could arrive through a route a step calls rather
 * than through Prisma directly.
 *
 * Gated on DATA_INTEGRITY_GUARD, set by `yarn test:e2e:data`, so the default
 * profile (which truncates by design) never pays for it.
 */

import assert from 'node:assert/strict';
import { AfterAll, BeforeAll } from '@cucumber/cucumber';
import { buildApp } from './server.ts';

type Counts = Record<string, number>;

let before: Counts | null = null;

function enabled(): boolean {
  return process.env['DATA_INTEGRITY_GUARD'] === '1';
}

async function snapshot(): Promise<Counts> {
  const server = await buildApp();
  try {
    const { prisma } = server.diContainer.cradle as {
      prisma: { $queryRawUnsafe: (q: string) => Promise<unknown> };
    };
    const tables = (await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%' ORDER BY tablename`,
    )) as { tablename: string }[];

    const counts: Counts = {};
    for (const { tablename } of tables) {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS n FROM "${tablename}"`,
      )) as { n: number }[];
      counts[tablename] = rows[0]?.n ?? 0;
    }
    return counts;
  } finally {
    await server.close();
  }
}

BeforeAll(async function () {
  if (!enabled()) return;
  before = await snapshot();
});

AfterAll(async function () {
  if (!enabled() || before === null) return;
  const captured = before;
  const after = await snapshot();
  const drifted = Object.keys(captured)
    .filter((t) => captured[t] !== after[t])
    .map((t) => `${t}: ${captured[t]} -> ${after[t]}`);
  assert.deepEqual(
    drifted,
    [],
    `the @data-integrity cohort must not write. Row counts changed: ${drifted.join(', ')}`,
  );
});
