/**
 * Sets ModelVersion.netlogoVersion where it is null by reading each version's
 * stored NetLogo file and parsing it with the upload parser. Objects are read
 * through the app's storage client rather than fileService.download, because
 * legacy-imported objects carry no file metadata and that call rejects them.
 *
 * Usage:
 *   yarn db:backfill:netlogo-versions [--dry-run] [--batch-size=N]
 */

import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import { PrismaClient } from '#prisma/index';
import env from '#src/config/env.ts';
import storage, { bucket } from '#src/lib/storage.ts';
import { GetObjectCommand } from '#src/shared/storage/index.ts';
import {
  countBackfillOutcomes,
  describeBackfillOutcome,
  describeBackfillSummary,
  parseBackfillOptions,
  planBackfillOutcome,
  type BackfillOutcome,
  type BackfillRow,
  type BackfillSummary,
} from './lib/netlogo-version-backfill.ts';

const options = parseBackfillOptions(process.argv.slice(2));
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.db.url, max: 4 }),
});

async function readObject(key: string): Promise<Buffer | null> {
  return storage
    .send(new GetObjectCommand({ Bucket: bucket.Name, Key: key }))
    .then((res) => res.Body?.transformToByteArray())
    .then((bytes) => (bytes ? Buffer.from(bytes) : null))
    .catch(() => null);
}

async function findBatchAfter(last: BackfillRow | null): Promise<BackfillRow[]> {
  return prisma.modelVersion.findMany({
    where: {
      netlogoVersion: null,
      ...(last && {
        OR: [
          { modelId: { gt: last.modelId } },
          { modelId: last.modelId, versionNumber: { gt: last.versionNumber } },
        ],
      }),
    },
    orderBy: [{ modelId: 'asc' }, { versionNumber: 'asc' }],
    select: { modelId: true, versionNumber: true, netlogoFileKey: true },
    take: options.batchSize,
  });
}

async function applyOutcome(outcome: BackfillOutcome): Promise<void> {
  if (outcome.kind !== 'update') return;
  await prisma.modelVersion.updateMany({
    where: {
      modelId: outcome.row.modelId,
      versionNumber: outcome.row.versionNumber,
      netlogoVersion: null,
    },
    data: { netlogoVersion: outcome.netlogoVersion },
  });
}

async function main() {
  console.log(`Mode: ${options.dryRun ? 'dry run' : 'apply'}, batch size ${options.batchSize}`);
  let summary: BackfillSummary = { scanned: 0, updated: 0, unreadable: 0, unparseable: 0 };

  for (let batch = await findBatchAfter(null); batch.length > 0; ) {
    const outcomes = await Promise.all(
      batch.map(async (row) => planBackfillOutcome(row, await readObject(row.netlogoFileKey))),
    );
    for (const outcome of outcomes) console.log(`  ${describeBackfillOutcome(outcome)}`);
    if (!options.dryRun) await Promise.all(outcomes.map(applyOutcome));
    summary = countBackfillOutcomes(summary, outcomes);
    batch = await findBatchAfter(batch.at(-1) ?? null);
  }

  console.log(describeBackfillSummary(summary, options.dryRun));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    storage.destroy();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
