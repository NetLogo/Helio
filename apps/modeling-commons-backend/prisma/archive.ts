/**
 * NetLogo Commons → new schema migration.
 *
 * Source: nlcommons_production (Rails app, integer ids, tables: people, nodes,
 *         versions, tags, tagged_nodes, attachments, spam_warnings,
 *         permission_settings).
 * Target: new Prisma schema (UUIDs, Model/ModelVersion split, Better Auth users,
 *         file storage by key).
 *
 * Idempotent via legacyId columns on User/Model/Tag. Re-running skips already-
 * migrated rows. File extraction goes to local disk; an external uploader pushes
 * to S3 later.
 *
 * Usage:
 *   DATABASE_URL=<targetDB> yarn run db:migrate:dev
 *   DATABASE_URL=<targetDB> PRISMA_SEED_FILE=archive.ts yarn run db:seed
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import Cursor from 'pg-cursor';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

const OLD_URL = 'postgresql://admin:test@127.0.0.1:5432/nlcommons_production';
const NEW_URL = required('DATABASE_URL');
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './prisma/archive-output';
const FILES_DIR = path.join(OUTPUT_DIR, 'files');
const BATCH = parseInt(process.env.BATCH_SIZE ?? '500', 10);
const WIPE_TARGET = process.env.WIPE_TARGET === 'true';
const IP_HASH_SALT = required('IP_HASH_SALT');

// Type mappings

type OldPerson = {
  id: number;
  email_address: string | null;
  first_name: string | null;
  last_name: string | null;
  administrator: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
};

type OldNode = {
  id: number;
  name: string;
  created_at: Date | null;
  updated_at: Date | null;
  visibility_id: number;
};

type OldVersion = {
  id: number;
  node_id: number;
  person_id: number;
  description: string;
  contents: string; // the .nlogo file body, stored as text
  created_at: Date | null;
  updated_at: Date | null;
};

type OldTag = {
  id: number;
  name: string | null;
  created_at: Date | null;
};

type OldTaggedNode = {
  node_id: number;
  tag_id: number;
};

type OldAttachment = {
  id: number;
  node_id: number;
  person_id: number;
  filename: string;
  content_type: string;
  contents: Buffer; // bytea
  created_at: Date | null;
};

type OldEvent = {
  logged_at: Date | null;
  ip_address: string | null;
  node_id: number | null;
  person_id: number | null;
};

// Migration
const oldPool = new pg.Pool({ connectionString: OLD_URL, max: 4 });

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
  const spamNodeIds = await loadSpamNodeIds();
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

  await oldPool.end();
  await prisma.$disconnect();
}

// Clear target tables

async function wipeTarget() {
  // Order matters: leaf tables first, but TRUNCATE CASCADE handles it.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "ModelVersionTag",
      "ModelAdditionalFile",
      "ModelVersionFile",
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

async function loadSpamNodeIds(): Promise<Set<number>> {
  const { rows } = await oldPool.query<{ node_id: number }>(`
    SELECT node_id
    FROM spam_warnings
    WHERE node_id IS NOT NULL
    GROUP BY node_id
    HAVING COUNT(*) >= 2
  `);
  return new Set(rows.map((r) => r.node_id));
}

async function migrateUsers(): Promise<Map<number, string>> {
  const map = new Map<number, string>();

  // Build email dedupe map: lowest id wins per non-null lowercased email.
  const { rows: emailRows } = await oldPool.query<{
    id: number;
    email_address: string | null;
  }>(`SELECT id, email_address FROM people ORDER BY id ASC`);

  const emailWinner = new Map<string, number>();
  for (const r of emailRows) {
    const e = (r.email_address ?? '').trim().toLowerCase();
    if (!e) continue;
    if (!emailWinner.has(e)) emailWinner.set(e, r.id);
  }

  // Existing legacyIds in target (for idempotency)
  const existing = await prisma.user.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  for (const u of existing) {
    if (u.legacyId !== null) map.set(u.legacyId, u.id);
  }

  await streamRows<OldPerson>(
    `SELECT id, email_address, first_name, last_name, administrator,
            created_at, updated_at
     FROM people
     ORDER BY id ASC`,
    async (batch) => {
      const toCreate: Prisma.UserCreateManyInput[] = [];
      for (const p of batch) {
        if (map.has(p.id)) {
          report.users.skipped_existing++;
          continue;
        }

        const id = randomUUID();
        const rawEmail = (p.email_address ?? '').trim().toLowerCase();
        let email: string | null = null;
        if (rawEmail) {
          if (emailWinner.get(rawEmail) === p.id) {
            email = rawEmail;
          } else {
            report.users.deduped_email++;
          }
        } else {
          report.users.null_email++;
        }

        const name =
          [p.first_name, p.last_name]
            .map((s) => (s ?? '').trim())
            .filter(Boolean)
            .join(' ') || null;

        toCreate.push({
          id,
          legacyId: p.id,
          email,
          name,
          emailVerified: false,
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
  const { rows } = await oldPool.query<OldTag>(
    `SELECT id, name, created_at FROM tags ORDER BY id ASC`,
  );

  const nameWinner = new Map<string, OldTag>();
  for (const t of rows) {
    const n = (t.name ?? '').trim().toLowerCase();
    if (!n) continue;
    if (!nameWinner.has(n)) nameWinner.set(n, t);
  }

  const toCreate: Prisma.TagCreateManyInput[] = [];
  for (const t of rows) {
    if (map.has(t.id)) {
      report.tags.skipped_existing++;
      continue;
    }
    const n = (t.name ?? '').trim().toLowerCase();
    if (!n) continue;
    const winner = nameWinner.get(n)!;
    if (winner.id !== t.id) {
      // Alias old id to the winning tag's new uuid (set after first pass)
      // We resolve this in a second pass below.
      continue;
    }
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

  // Second pass: alias the duplicate-name old tag ids to the winning uuid
  for (const t of rows) {
    if (map.has(t.id)) continue;
    const n = (t.name ?? '').trim().toLowerCase();
    if (!n) continue;
    const winner = nameWinner.get(n);
    if (!winner) continue;
    const winnerUuid = map.get(winner.id);
    if (winnerUuid) map.set(t.id, winnerUuid);
  }

  return map;
}

async function migrateNodes(
  spamNodeIds: Set<number>,
  userIdMap: Map<number, string>,
  tagIdMap: Map<number, string>,
) {
  // Existing legacyIds (idempotency)
  const existingModels = await prisma.model.findMany({
    where: { legacyId: { not: null } },
    select: { id: true, legacyId: true },
  });
  const modelIdMap = new Map<number, string>();
  for (const m of existingModels) {
    if (m.legacyId !== null) modelIdMap.set(m.legacyId, m.id);
  }

  // Visibility lookup
  const visibilityMap: Record<number, 'public' | 'private'> = {
    1: 'public',
    2: 'private',
    3: 'private',
  };

  // Process node-by-node. We can't batch the whole pipeline cleanly because
  // each node spawns versions, authors, attachments, taggings — all interrelated.
  await streamRows<OldNode>(
    `SELECT id, name, created_at, updated_at, visibility_id
     FROM nodes
     ORDER BY id ASC`,
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

        const versions = await fetchVersionsForNode(node.id);
        if (versions.length === 0) {
          report.models.skipped_no_versions++;
          continue;
        }

        const modelUuid = randomUUID();
        modelIdMap.set(node.id, modelUuid);

        const visibility = visibilityMap[node.visibility_id] ?? 'public';

        // One transaction per node so partial failure rolls back cleanly.
        await prisma.$transaction(
          async (tx) => {
            // 1. Create Model with no latestVersionNumber yet (it points at a version row that doesn't exist)
            await tx.model.create({
              data: {
                id: modelUuid,
                legacyId: node.id,
                visibility,
                isEndorsed: false,
                createdAt: node.created_at ?? new Date(),
                updatedAt: node.updated_at ?? node.created_at ?? new Date(),
              },
            });

            // 2. Versions — assign versionNumbers 1..N by created_at ascending
            let versionNumber = 0;
            let latestVersionNumber = 0;
            let latestInfoTab: string | null = null;
            for (const v of versions) {
              versionNumber++;
              const versionFileUuid = randomUUID();
              const dateForPath = v.created_at ?? node.created_at ?? new Date();
              const format = getNlogoFileExtension(v.contents);
              const relKey = buildVersionFileKey(
                modelUuid,
                dateForPath,
                versionFileUuid,
                `${node.name}.${format}`,
              );

              await writeLocalFile(relKey, Buffer.from(v.contents, 'utf8'));

              const { netlogoVersion, infoTab } = format.startsWith('nlogox')
                ? parseNlogox(v.contents)
                : parseNlogo(v.contents);

              await tx.modelVersion.create({
                data: {
                  modelId: modelUuid,
                  versionNumber,
                  title: node.name,
                  description: v.description || null,
                  netlogoFileKey: relKey,
                  netlogoVersion,
                  infoTab,
                  createdAt: v.created_at ?? new Date(),
                  finalizedAt: v.created_at ?? null,
                },
              });

              latestVersionNumber = versionNumber;
              latestInfoTab = infoTab;
              report.versions.migrated++;
            }

            // 3. Update model with latestVersionNumber
            await tx.model.update({
              where: { id: modelUuid },
              data: { latestVersionNumber },
            });

            // 4. Authors: first version's person = owner; later distinct persons = contributors
            const seenAuthors = new Set<string>();
            const ownerLegacyId = versions[0].person_id;
            const ownerUuid = userIdMap.get(ownerLegacyId);
            if (ownerUuid) {
              await tx.modelAuthor.create({
                data: {
                  modelId: modelUuid,
                  userId: ownerUuid,
                  role: 'owner',
                  createdAt: versions[0].created_at ?? new Date(),
                },
              });
              seenAuthors.add(ownerUuid);
              report.authors.owners++;
            }
            for (let i = 1; i < versions.length; i++) {
              const v = versions[i];
              const uuid = userIdMap.get(v.person_id);
              if (!uuid || seenAuthors.has(uuid)) continue;
              await tx.modelAuthor.create({
                data: {
                  modelId: modelUuid,
                  userId: uuid,
                  role: 'contributor',
                  createdAt: v.created_at ?? new Date(),
                },
              });
              seenAuthors.add(uuid);
              report.authors.contributors++;
            }

            // 5. Attachments — tagged to the LATEST version
            const attachments = await fetchAttachmentsForNode(node.id);

            for (const a of attachments) {
              const fileUuid = randomUUID();
              const dateForPath = a.created_at ?? node.created_at ?? new Date();

              if (a.content_type === 'preview') {
                // Last preview wins (matches Rails behavior — latest upload).
                const relKey = buildPreviewFileKey(modelUuid, dateForPath, fileUuid, a.filename);
                await writeLocalFile(relKey, a.contents);

                await tx.modelVersion.update({
                  where: {
                    modelId_versionNumber: {
                      modelId: modelUuid,
                      versionNumber: latestVersionNumber,
                    },
                  },
                  data: { previewImageFileKey: relKey },
                });
                report.attachments.previews_attached =
                  (report.attachments.previews_attached ?? 0) + 1;
                continue;
              }

              const relKey = buildAttachmentFileKey(modelUuid, dateForPath, fileUuid, a.filename);
              await writeLocalFile(relKey, a.contents);

              const metadataRelKey = relKey + '.metadata.json';
              const metadata = JSON.stringify({
                contentType: a.content_type,
                originalFilename: a.filename,
                userId: a.person_id ? (userIdMap.get(a.person_id) ?? null) : null,
                createdAt: a.created_at?.toISOString() ?? new Date().toISOString(),
              });

              await writeLocalFile(metadataRelKey, Buffer.from(metadata, 'utf8'));

              await tx.modelAdditionalFile.create({
                data: {
                  id: fileUuid,
                  modelId: modelUuid,
                  taggedVersionNumber: latestVersionNumber,
                  fileKey: relKey,
                  createdAt: a.created_at ?? new Date(),
                },
              });
              report.attachments.migrated++;
            }

            // 6. Tags — attached to the LATEST version
            const taggings = await fetchTaggingsForNode(node.id);
            const seenTags = new Set<string>();
            for (const tg of taggings) {
              const tagUuid = tagIdMap.get(tg.tag_id);
              if (!tagUuid) {
                report.taggings.skipped_orphan++;
                continue;
              }
              if (seenTags.has(tagUuid)) continue;
              seenTags.add(tagUuid);

              await tx.modelVersionTag.create({
                data: {
                  modelId: modelUuid,
                  versionNumber: latestVersionNumber,
                  tagId: tagUuid,
                  createdAt: tg.created_at ?? new Date(),
                },
              });
              report.taggings.migrated++;
            }
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
    await streamRows<OldEvent>(
      `SELECT logged_at, ip_address, node_id, person_id FROM ${table}`,
      async (batch) => {
        const rows: Prisma.ModelInteractionCreateManyInput[] = [];
        for (const e of batch) {
          if (!e.node_id) continue;
          const modelUuid = modelIdMap.get(e.node_id);
          if (!modelUuid) continue; // node was spam-skipped or dropped
          const userUuid = e.person_id ? (userIdMap.get(e.person_id) ?? null) : null;
          rows.push({
            id: randomUUID(),
            modelId: modelUuid,
            kind,
            userId: userUuid,
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

async function fetchVersionsForNode(nodeId: number): Promise<OldVersion[]> {
  const { rows } = await oldPool.query<OldVersion>(
    `SELECT id, node_id, person_id, description, contents, created_at, updated_at
     FROM versions
     WHERE node_id = $1
     ORDER BY created_at ASC NULLS LAST, id ASC`,
    [nodeId],
  );
  return rows;
}

async function fetchAttachmentsForNode(nodeId: number): Promise<OldAttachment[]> {
  const { rows } = await oldPool.query<OldAttachment & { created_at: Date | null }>(
    `SELECT id, node_id, person_id, filename, content_type, contents, created_at
     FROM attachments
     WHERE node_id = $1
     ORDER BY id ASC`,
    [nodeId],
  );
  return rows;
}

async function fetchTaggingsForNode(
  nodeId: number,
): Promise<Array<OldTaggedNode & { created_at: Date | null }>> {
  const { rows } = await oldPool.query<OldTaggedNode & { created_at: Date | null }>(
    `SELECT node_id, tag_id, created_at
     FROM tagged_nodes
     WHERE node_id = $1
     ORDER BY id ASC`,
    [nodeId],
  );
  return rows;
}

function dateParts(d: Date) {
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return { y, m, day };
}

function sanitizeFilename(name: string): string {
  // Strip path separators and control chars; collapse whitespace.
  const cleaned = name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\/\\]/g, '_')
    .trim();
  return cleaned || 'file';
}

function getAccessPrefix(access: 'public-read' | 'private'): string {
  return access === 'public-read' ? 'files/public/uploads' : 'uploads';
}

function buildVersionFileKey(
  modelUuid: string,
  d: Date,
  fileUuid: string,
  _filename: string = 'file',
  accessPolicy: 'public-read' | 'private' = 'private',
): string {
  const { y, m, day } = dateParts(d);
  const filename = sanitizeFilename(_filename);
  return `${getAccessPrefix(accessPolicy)}/models/${modelUuid}/versions/${y}/${m}/${day}/${fileUuid}/${filename}`;
}

function buildPreviewFileKey(
  modelUuid: string,
  d: Date,
  fileUuid: string,
  _filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  const filename = sanitizeFilename(_filename);
  return `${getAccessPrefix('private')}/models/${modelUuid}/preview-images/${y}/${m}/${day}/${fileUuid}/${filename}`;
}

function buildAttachmentFileKey(
  modelUuid: string,
  d: Date,
  fileUuid: string,
  _filename: string = 'file',
): string {
  const { y, m, day } = dateParts(d);
  const filename = sanitizeFilename(_filename);
  return `${getAccessPrefix('private')}/models/${modelUuid}/additionalFiles/${y}/${m}/${day}/${fileUuid}/${filename}`;
}

async function writeLocalFile(relKey: string, contents: Buffer) {
  const full = path.join(FILES_DIR, relKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents);
}

/**
 * NetLogo .nlogo files are sectioned by `@#$#@#$#@` separators. The sections,
 * in order: code, interface, info, turtle shapes, version, preview commands,
 * system dynamics, behavior space, hub net client, link shapes, model settings,
 * delta tick.
 *
 * We extract:
 * - infoTab → section index 2 (the "Info" tab markdown)
 * - netlogoVersion → section index 4 (e.g. "NetLogo 5.0.4")
 *
 * If parsing fails, both return null. Worth noting: not all old models follow
 * the modern format, so silent fallback is fine.
 */
function parseNlogo(contents: string): {
  netlogoVersion: string | null;
  infoTab: string | null;
} {
  const SEP = '@#$#@#$#@';
  const parts = contents.split(SEP);
  if (parts.length < 5) return { netlogoVersion: null, infoTab: null };
  const infoTab = parts[2]?.trim() || null;
  const versionRaw = parts[4]?.trim() || null;
  const netlogoVersion = versionRaw && versionRaw.length < 100 ? versionRaw : null;
  return { netlogoVersion, infoTab };
}

function parseNlogox(contents: string): {
  netlogoVersion: string | null;
  infoTab: string | null;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contents, 'application/xml');
    const modelEl = doc.querySelector('model');
    if (!modelEl) return { netlogoVersion: null, infoTab: null };
    const versionRaw = modelEl.getAttribute('version') ?? null;
    const netlogoVersion = versionRaw
      ? versionRaw.trim().replace(/^NetLogo\s*(3D)?\s*/i, '')
      : null;
    const infoTabEl = doc.querySelector('info');
    const infoTab = infoTabEl ? infoTabEl.textContent?.trim() || null : null;
    return { netlogoVersion, infoTab };
  } catch {
    return { netlogoVersion: null, infoTab: null };
  }
}

function getNlogoFileExtension(contents: string): string {
  if (contents.includes('@#$#@#$#@')) return 'nlogo';
  if (contents.includes('<model version="NetLogo 3D')) return 'nlogox3d';
  if (contents.includes('<?xml')) return 'nlogox';
  if (contents.includes('setxyz')) return 'nlogo3d';
  return 'unknown';
}

async function streamRows<T extends pg.QueryResultRow>(
  sql: string,
  onBatch: (rows: T[]) => Promise<void>,
) {
  const client = await oldPool.connect();
  try {
    const cursor = client.query(new Cursor<T>(sql));
    while (true) {
      const rows: T[] = await new Promise((resolve, reject) =>
        cursor.read(BATCH, (err, r) => (err ? reject(err) : resolve(r as T[]))),
      );
      if (rows.length === 0) break;
      await onBatch(rows);
    }
    await new Promise<void>((resolve) => cursor.close(() => resolve()));
  } finally {
    client.release();
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function hashIp(ip: string | null, salt: string): string | null {
  if (!ip) return null;
  return createHash('sha256')
    .update(salt + ':' + ip)
    .digest('hex')
    .slice(0, 32);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

export default main;
