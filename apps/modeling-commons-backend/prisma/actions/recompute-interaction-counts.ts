/**
 * Recomputes the denormalized interaction counters on Model from the
 * append-only ModelInteraction log. Use this to recover from drift if a
 * write path ever fails to bump a counter (the log stays the source of truth).
 *
 * Usage:
 *   DATABASE_URL=<targetDB> tsx ./prisma/actions/recompute-interaction-counts.ts
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '#prisma/index';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

type Counts = { view: number; run: number; download: number; share: number };

async function main() {
  console.log('Recomputing interaction counts from ModelInteraction...');

  const grouped = await prisma.modelInteraction.groupBy({
    by: ['modelId', 'kind'],
    _count: { _all: true },
  });

  const byModel = new Map<string, Counts>();
  for (const row of grouped) {
    const counts = byModel.get(row.modelId) ?? { view: 0, run: 0, download: 0, share: 0 };
    counts[row.kind] = row._count._all;
    byModel.set(row.modelId, counts);
  }

  const modelsWithInteractions = [...byModel.keys()];
  console.log(`  ${modelsWithInteractions.length} models have logged interactions`);

  let updated = 0;
  for (const [modelId, counts] of byModel) {
    await prisma.model.update({
      where: { id: modelId },
      data: {
        viewCount: counts.view,
        runCount: counts.run,
        downloadCount: counts.download,
        shareCount: counts.share,
      },
    });
    updated++;
    if (updated % 100 === 0) console.log(`  ...recomputed ${updated} models`);
  }
  console.log(`  ✓ recomputed counts for ${updated} models`);

  const reset = await prisma.model.updateMany({
    where: { id: { notIn: modelsWithInteractions } },
    data: { viewCount: 0, runCount: 0, downloadCount: 0, shareCount: 0 },
  });
  console.log(`  ✓ zeroed counts for ${reset.count} models with no interactions`);

  console.log('\nRecompute completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
