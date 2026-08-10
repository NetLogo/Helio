/**
 * Members fold into ModelAuthor as role=contributor, which grants write access
 * because canWrite treats any contributor as a writer. Non-members are archival.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import { PrismaClient } from '../../generated/prisma/client.js';
import {
  authorKey,
  buildTypeNameById,
  planCollaborators,
  type CollaboratorPlan,
  type ExistingAuthor,
} from './lib/collaborators.ts';
import { LegacyDatabase } from './lib/legacy.ts';

const APPLY = process.argv.includes('--apply');
const LEGACY_SCHEMA = process.env['LEGACY_SCHEMA'] ?? 'public';
const TXN_TIMEOUT_MS = parseInt(process.env['BACKFILL_TXN_TIMEOUT_MS'] ?? '300000', 10);

const legacy = new LegacyDatabase(
  process.env['LEGACY_DATABASE_URL'] ??
    'postgresql://admin:test@127.0.0.1:5432/nlcommons_production',
  LEGACY_SCHEMA,
);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: required('DATABASE_URL'), max: 4 }),
});

async function main() {
  console.log(`→ Mode: ${APPLY ? 'APPLY' : 'dry run (pass --apply to write)'}`);

  const [types, collaborations, nonMembers] = await Promise.all([
    legacy.allCollaboratorTypes(),
    legacy.allCollaborations(),
    legacy.allNonMemberCollaborations(),
  ]);
  console.log(
    `→ Legacy: ${collaborations.length} collaborations, ${nonMembers.length} non-member collaborations`,
  );

  const plan = planCollaborators(collaborations, nonMembers, {
    userIdByLegacyId: await legacyIdMap('user'),
    modelIdByLegacyId: await legacyIdMap('model'),
    typeNameById: buildTypeNameById(types),
    existingAuthors: await loadExistingAuthors(),
    existingNonMemberLegacyIds: await loadExistingNonMemberIds(),
  });

  print(plan);

  const writes =
    plan.authorInserts.length + plan.authorTypeUpdates.length + plan.nonMemberInserts.length;
  if (writes === 0) {
    console.log('\n(nothing to do)');
    return;
  }
  if (!APPLY) {
    console.log('\nDry run: nothing written. Re-run with --apply.');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      if (plan.authorInserts.length > 0) {
        await tx.modelAuthor.createMany({
          data: plan.authorInserts.map((a) => ({
            modelId: a.modelId,
            userId: a.userId,
            role: a.role,
            collaboratorType: a.collaboratorType,
            ...(a.createdAt ? { createdAt: a.createdAt } : {}),
          })),
          skipDuplicates: true,
        });
      }
      for (const u of plan.authorTypeUpdates) {
        await tx.modelAuthor.update({
          where: { modelId_userId: { modelId: u.modelId, userId: u.userId } },
          data: { collaboratorType: u.collaboratorType },
        });
      }
      if (plan.nonMemberInserts.length > 0) {
        await tx.nonMemberContributor.createMany({
          data: plan.nonMemberInserts.map((n) => ({
            legacyId: n.legacyId,
            modelId: n.modelId,
            email: n.email,
            name: n.name,
            collaboratorType: n.collaboratorType,
            addedByUserId: n.addedByUserId,
            ...(n.createdAt ? { createdAt: n.createdAt } : {}),
          })),
          skipDuplicates: true,
        });
      }
    },
    { timeout: TXN_TIMEOUT_MS },
  );

  console.log(`\n✓ Applied ${writes} write(s)`);
  await verify(plan);
}

function print(plan: CollaboratorPlan) {
  console.log('\n=== PLAN ===');
  console.log(`  ModelAuthor inserts (role=contributor, gains write access): ${plan.authorInserts.length}`);
  console.log(`  ModelAuthor collaboratorType backfills:                     ${plan.authorTypeUpdates.length}`);
  console.log(`  NonMemberContributor inserts:                               ${plan.nonMemberInserts.length}`);
  console.log('  Skipped:');
  console.log(`    node not in target (spam/versionless/deleted): ${plan.skipped.orphanModel}`);
  console.log(`    person not in target (email dedupe):           ${plan.skipped.orphanUser}`);
  console.log(`    author row already typed:                      ${plan.skipped.alreadyTyped}`);
  console.log(`    non-member already backfilled:                 ${plan.skipped.alreadyPresent}`);
  console.log(`    duplicate (model, person) pair:                ${plan.skipped.duplicatePair}`);

  const byType = new Map<string, number>();
  for (const a of [...plan.authorInserts, ...plan.authorTypeUpdates]) {
    const t = a.collaboratorType ?? '(none)';
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }
  if (byType.size > 0) {
    console.log('  Member collaborator types:');
    for (const [name, count] of [...byType].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${name}: ${count}`);
    }
  }
}

async function verify(plan: CollaboratorPlan) {
  const nonMemberCount = await prisma.nonMemberContributor.count({
    where: { legacyId: { in: plan.nonMemberInserts.map((n) => n.legacyId) } },
  });
  const missingNonMembers = plan.nonMemberInserts.length - nonMemberCount;

  let missingAuthors = 0;
  for (const a of [...plan.authorInserts, ...plan.authorTypeUpdates]) {
    const row = await prisma.modelAuthor.findUnique({
      where: { modelId_userId: { modelId: a.modelId, userId: a.userId } },
      select: { collaboratorType: true },
    });
    if (!row) missingAuthors++;
  }

  if (missingAuthors > 0 || missingNonMembers > 0) {
    throw new Error(
      `Verification failed: ${missingAuthors} author row(s) and ${missingNonMembers} non-member row(s) missing`,
    );
  }
  console.log('✓ Verified every planned row is present');
}

async function legacyIdMap(model: 'user' | 'model'): Promise<Map<number, string>> {
  const rows =
    model === 'user'
      ? await prisma.user.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true },
        })
      : await prisma.model.findMany({
          where: { legacyId: { not: null } },
          select: { id: true, legacyId: true },
        });

  const map = new Map<number, string>();
  for (const r of rows) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  return map;
}

async function loadExistingAuthors(): Promise<Map<string, ExistingAuthor>> {
  const rows = await prisma.modelAuthor.findMany({
    select: { modelId: true, userId: true, role: true, collaboratorType: true },
  });
  const map = new Map<string, ExistingAuthor>();
  for (const r of rows) {
    map.set(authorKey(r.modelId, r.userId), {
      role: r.role,
      collaboratorType: r.collaboratorType,
    });
  }
  return map;
}

async function loadExistingNonMemberIds(): Promise<Set<number>> {
  const rows = await prisma.nonMemberContributor.findMany({ select: { legacyId: true } });
  return new Set(rows.map((r) => r.legacyId));
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

main()
  .catch((err) => {
    console.error('FATAL:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await legacy.end();
    await prisma.$disconnect();
  });
