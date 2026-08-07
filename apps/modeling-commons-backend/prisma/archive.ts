/**
 * NetLogo Commons → new schema migration.
 *
 * Source: nlcommons_production (Rails app, integer ids, tables: people, nodes,
 *         versions, tags, tagged_nodes, attachments, spam_warnings,
 *         permission_settings).
 * Target: new Prisma schema (UUIDs, Model/ModelVersion split, Better Auth users,
 *         file storage by key).
 *
 * Idempotent via legacyId columns on User/Model/Tag — with one exception:
 * migrateInteractions has no dedupe key (ModelInteraction carries no legacyId
 * and no unique constraint), so re-running it duplicates every row. It is the
 * last phase; re-running the script after it has produced rows needs a manual
 * DELETE first.
 *
 * Re-running skips already-migrated rows but does NOT pick up changes to them,
 * nor new versions/attachments/tags on an already-migrated node. Use
 * prisma/patch.ts for that.
 *
 * File extraction goes to local disk; an external uploader pushes to S3 later.
 *
 * Usage:
 *   DATABASE_URL=<targetDB> yarn run db:migrate:dev
 *   DATABASE_URL=<targetDB> PRISMA_SEED_FILE=archive.ts yarn run db:seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { copyFile as fsCopyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { buildAvatarFileKey } from './lib/file-keys.ts';
import {
  LegacyDatabase,
  NODE_COLUMNS,
  PERSON_COLUMNS,
  type LegacyNode,
  type LegacyPerson,
  type LegacyTag,
} from './lib/legacy.ts';
import { createModelFromNode } from './lib/node-migration.ts';
import {
  buildFullName,
  hashIp,
  normalizeEmail,
  normalizeTagName,
  pickLowestIdWinners,
  toUtcDateOnly,
} from './lib/normalize.ts';

const OLD_URL =
  process.env['LEGACY_DATABASE_URL'] ??
  'postgresql://admin:test@127.0.0.1:5432/nlcommons_production';
const OLD_SCHEMA = process.env['LEGACY_SCHEMA'] ?? 'public';
const NEW_URL = required('DATABASE_URL');
const AVATARS_DIR = path.join('.', 'prisma', 'avatars');
const OUTPUT_DIR = process.env['OUTPUT_DIR'] ?? './prisma/archive-output';
const FILES_DIR = path.join(OUTPUT_DIR, 'files');
const BATCH = parseInt(process.env['BATCH_SIZE'] ?? '500', 10);
const WIPE_TARGET = process.env['WIPE_TARGET'] === 'true';
const IP_HASH_SALT = required('IP_HASH_SALT');

type OldEvent = {
  logged_at: Date | null;
  ip_address: string | null;
  node_id: number | null;
  person_id: number | null;
};

const legacy = new LegacyDatabase(OLD_URL, OLD_SCHEMA);

const adapter = new PrismaPg({ connectionString: NEW_URL, max: 4 });
const prisma = new PrismaClient({ adapter });

const report = {
  users: { migrated: 0, skipped_existing: 0, deduped_email: 0, null_email: 0 },
  tags: { migrated: 0, skipped_existing: 0 },
  models: { migrated: 0, skipped_spam: 0, skipped_existing: 0, skipped_no_versions: 0 },
  versions: { migrated: 0 },
  authors: { owners: 0, contributors: 0 },
  attachments: { migrated: 0, skipped_orphan: 0, previews_attached: 0 },
  taggings: { migrated: 0, skipped_orphan: 0 },
  interactions: { views: 0, runs: 0, downloads: 0 },
  errors: [] as string[],
};

async function main() {
  console.log('→ Output dir:', path.resolve(OUTPUT_DIR));
  await mkdir(FILES_DIR, { recursive: true });

  if (WIPE_TARGET) {
    console.log('→ WIPE_TARGET=true: truncating target tables');
    await wipeTarget();
  }

  console.log('→ Loading spam-warned node ids (>=2 warnings)');
  const spamNodeIds = await legacy.spamNodeIds();
  console.log(`  ${spamNodeIds.size} nodes excluded as spam`);

  console.log('→ Migrating people → User');
  const userIdMap = await migrateUsers();

  console.log('→ Migrating tags → Tag');
  const tagIdMap = await migrateTags();

  console.log('→ Migrating nodes → Model (+ versions, authors, attachments, taggings)');
  const { modelIdMap } = await migrateNodes(spamNodeIds, userIdMap, tagIdMap);

  console.log('→ Migrating model_views/runs/downloads → ModelInteraction');
  await migrateInteractions(modelIdMap, userIdMap);

  console.log('→ Writing manifest + report');
  await writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n=== DONE ===');
  console.log(JSON.stringify(report, null, 2));

  await legacy.end();
  await prisma.$disconnect();
}

async function wipeTarget() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ModelVersionTag",
      "ModelAdditionalFile",
      "ModelVersion",
      "ModelAuthor",
      "ModelPermission",
      "ModelLike",
      "ModelInteraction",
      "ModelDraft",
      "Event",
      "Model",
      "Tag",
      "Verification",
      "Session",
      "Account",
      "Passkey",
      "User"
    RESTART IDENTITY CASCADE;
  `);

  await rm(FILES_DIR, { recursive: true });
}

async function migrateUsers(): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  const emailWinner = pickLowestIdWinners(await legacy.allPeopleEmails(), (r) =>
    normalizeEmail(r.email_address),
  );

  const existing = await prisma.user.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  for (const u of existing) {
    if (u.legacyId !== null) map.set(u.legacyId, u.id);
  }

  await legacy.streamRows<LegacyPerson>(
    `SELECT ${PERSON_COLUMNS} FROM ${legacy.table('people')} ORDER BY id ASC`,
    BATCH,
    async (batch) => {
      const toCreate: Prisma.UserCreateManyInput[] = [];
      for (const p of batch) {
        if (map.has(p.id)) {
          report.users.skipped_existing++;
          continue;
        }

        const id = randomUUID();
        const rawEmail = normalizeEmail(p.email_address);
        let email: string | null = null;
        if (rawEmail) {
          if (emailWinner.get(rawEmail)?.id === p.id) {
            email = rawEmail;
          } else {
            report.users.deduped_email++;
          }
        } else {
          report.users.null_email++;
        }

        let imageUrl: string | null = null;
        if (p.avatar_file_name) {
          const avatarKey = buildAvatarFileKey(
            id,
            p.avatar_updated_at ?? new Date(),
            randomUUID(),
            'avatar',
          );
          imageUrl = `cdn.modelingcommons.org/modeling-commons/${avatarKey}`;

          const fsAvatarPath = path.join(AVATARS_DIR, `${p.id}`, 'original', p.avatar_file_name);
          try {
            await copyFile(fsAvatarPath, path.join(FILES_DIR, avatarKey));
          } catch (err) {
            report.errors.push(
              `Failed to copy avatar for person id ${p.id} from ${fsAvatarPath}: ${(err as Error).message}`,
            );
            imageUrl = null;
          }
        }

        toCreate.push({
          id,
          legacyId: p.id,
          email,
          name: buildFullName(p.first_name, p.last_name),
          emailVerified: false,
          bio: p.biography?.trim() || null,
          dob: toUtcDateOnly(p.birthdate),
          image: imageUrl,
          socialLinks: [{ type: 'other', rawValue: p.url?.trim() || null }],
          systemRole: 'user', // all users → user, per spec
          userKind: 'other',
          createdAt: p.created_at ?? new Date(),
          updatedAt: p.updated_at ?? p.created_at ?? new Date(),
        });
        map.set(p.id, id);
        report.users.migrated++;
      }
      if (toCreate.length > 0) {
        await prisma.user.createMany({ data: toCreate, skipDuplicates: true });
      }
    },
  );

  return map;
}

async function migrateTags(): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  const existing = await prisma.tag.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  for (const t of existing) {
    if (t.legacyId !== null) map.set(t.legacyId, t.id);
  }

  // Old tag names are nullable + non-unique; new is unique. Dedupe by lowercased name.
  const rows = await legacy.allTags();
  const nameWinner = pickLowestIdWinners(rows, (t) => normalizeTagName(t.name));

  const toCreate: Prisma.TagCreateManyInput[] = [];
  for (const t of rows) {
    if (map.has(t.id)) {
      report.tags.skipped_existing++;
      continue;
    }
    const n = normalizeTagName(t.name);
    if (!n) continue;
    if (nameWinner.get(n)?.id !== t.id) continue;

    const id = randomUUID();
    toCreate.push({
      id,
      legacyId: t.id,
      name: n,
      displayName: (t.name ?? '').trim() || null,
      createdAt: t.created_at ?? new Date(),
    });
    map.set(t.id, id);
    report.tags.migrated++;
  }
  if (toCreate.length > 0) {
    await prisma.tag.createMany({ data: toCreate, skipDuplicates: true });
  }

  aliasDuplicateTagNames(rows, nameWinner, map);

  return map;
}

function aliasDuplicateTagNames(
  rows: readonly LegacyTag[],
  nameWinner: ReadonlyMap<string, LegacyTag>,
  map: Map<number, string>,
) {
  for (const t of rows) {
    if (map.has(t.id)) continue;
    const n = normalizeTagName(t.name);
    if (!n) continue;
    const winnerUuid = map.get(nameWinner.get(n)?.id ?? -1);
    if (winnerUuid) map.set(t.id, winnerUuid);
  }
}

async function migrateNodes(
  spamNodeIds: Set<number>,
  userIdMap: Map<number, string>,
  tagIdMap: Map<number, string>,
) {
  const existingModels = await prisma.model.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const modelIdMap = new Map<number, string>();
  for (const m of existingModels) {
    if (m.legacyId !== null) modelIdMap.set(m.legacyId, m.id);
  }

  // Node-by-node: each node spawns versions, authors, attachments and taggings
  // that all reference one another, so the whole tree shares one transaction.
  await legacy.streamRows<LegacyNode>(
    `SELECT ${NODE_COLUMNS} FROM ${legacy.table('nodes')} ORDER BY id ASC`,
    BATCH,
    async (batch) => {
      for (const node of batch) {
        if (spamNodeIds.has(node.id)) {
          report.models.skipped_spam++;
          continue;
        }
        if (modelIdMap.has(node.id)) {
          report.models.skipped_existing++;
          continue;
        }

        const versions = await legacy.versionsForNode(node.id);
        if (versions.length === 0) {
          report.models.skipped_no_versions++;
          continue;
        }

        const [attachments, taggings] = await Promise.all([
          legacy.attachmentsForNode(node.id),
          legacy.taggingsForNode(node.id),
        ]);

        const modelUuid = randomUUID();
        modelIdMap.set(node.id, modelUuid);

        await prisma.$transaction(
          async (tx) => {
            const counts = await createModelFromNode(
              tx,
              modelUuid,
              { node, versions, attachments, taggings },
              {
                writeFile: writeLocalFile,
                newUuid: randomUUID,
                now: () => new Date(),
                userIdByLegacyId: userIdMap,
                tagIdByLegacyId: tagIdMap,
              },
            );

            report.versions.migrated += counts.versions;
            report.authors.owners += counts.owners;
            report.authors.contributors += counts.contributors;
            report.attachments.migrated += counts.attachments;
            report.attachments.previews_attached += counts.previewsAttached;
            report.taggings.migrated += counts.taggings;
            report.taggings.skipped_orphan += counts.skippedOrphanTaggings;
          },
          { timeout: 60_000 },
        );

        report.models.migrated++;
        if (report.models.migrated % 50 === 0) {
          console.log(`  ...migrated ${report.models.migrated} models`);
        }
      }
    },
  );

  return { modelIdMap };
}

/**
 * NOT idempotent: ModelInteraction has no legacyId and no unique constraint, so
 * skipDuplicates cannot help and a second run duplicates every row.
 */
async function migrateInteractions(
  modelIdMap: Map<number, string>,
  userIdMap: Map<number, string>,
) {
  const sources: Array<{ table: string; kind: 'view' | 'run' | 'download' }> = [
    { table: 'model_views', kind: 'view' },
    { table: 'model_runs', kind: 'run' },
    { table: 'model_downloads', kind: 'download' },
  ];

  for (const { table, kind } of sources) {
    let count = 0;
    await legacy.streamRows<OldEvent>(
      `SELECT logged_at, ip_address, node_id, person_id FROM ${legacy.table(table)}`,
      BATCH,
      async (batch) => {
        const rows: Prisma.ModelInteractionCreateManyInput[] = [];
        for (const e of batch) {
          if (!e.node_id) continue;
          const modelUuid = modelIdMap.get(e.node_id);
          if (!modelUuid) continue; // node was spam-skipped or dropped
          rows.push({
            id: randomUUID(),
            modelId: modelUuid,
            kind,
            userId: e.person_id ? (userIdMap.get(e.person_id) ?? null) : null,
            ipHash: hashIp(e.ip_address, IP_HASH_SALT),
            createdAt: e.logged_at ?? new Date(),
          });
        }
        if (rows.length > 0) {
          await prisma.modelInteraction.createMany({ data: rows, skipDuplicates: true });
          count += rows.length;
        }
      },
    );
    console.log(`  ${table}: ${count} rows`);
  }
}

async function copyFile(src: string, dest: string) {
  await mkdir(path.dirname(dest), { recursive: true });
  await fsCopyFile(src, dest);
}

async function writeLocalFile(relKey: string, contents: Buffer) {
  const full = path.join(FILES_DIR, relKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

export default main;
