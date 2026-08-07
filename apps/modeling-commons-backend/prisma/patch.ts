/**
 * In-place patch of an already-archived target DB.
 *
 * archive.ts is a one-shot import: re-running it skips anything that already
 * carries a legacyId, so it cannot see edits, deletions, or new children of an
 * already-migrated node. This script closes that gap from the diff that
 * prisma/diffdb.sh produces between the migrated snapshot and a fresh dump.
 *
 * It never reads or writes the `id` column of an existing row. Everything is
 * addressed by legacyId (User/Model/Tag) or derived from it.
 *
 * The whole change set is materialised as a plan before anything is written, so
 * the dry run and the real run compute the same thing. Applying writes an
 * expectations manifest that --verify-only replays against the database.
 *
 * Usage:
 *   ./prisma/diffdb.sh                 # writes ~/dbdiff/*.csv
 *   yarn run db:patch                  # dry run: plan only, no writes
 *   yarn run db:patch --apply          # stage files, upload, apply, verify
 *   yarn run db:patch --verify-only    # re-check the last applied patch
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import {
  isPatchableTable,
  optionalDate,
  optionalString,
  parseTableDiff,
  requireNumber,
  rowsBySide,
  type DiffRow,
  type PatchableTable,
  type TableDiff,
} from './lib/diff.ts';
import {
  buildAttachmentFileKey,
  buildAvatarFileKey,
  buildPreviewFileKey,
  buildVersionFileKey,
  derivedUuid,
  sanitizeFilename,
} from './lib/file-keys.ts';
import {
  LegacyDatabase,
  type LegacyNode,
  type LegacyPerson,
  type LegacyVersion,
} from './lib/legacy.ts';
import {
  buildAttachmentMetadata,
  createModelFromNode,
  mapVisibility,
  type ModelWriter,
  type NodeTree,
} from './lib/node-migration.ts';
import { getNlogoFileExtension, parseNetlogoContents } from './lib/nlogo.ts';
import {
  buildFullName,
  normalizeEmail,
  normalizeTagName,
  pickLowestIdWinners,
  toUtcDateOnly,
} from './lib/normalize.ts';

const APPLY = process.argv.includes('--apply');
const VERIFY_ONLY = process.argv.includes('--verify-only');
const SKIP_UPLOAD = process.argv.includes('--skip-upload');

const DIFF_DIR = process.env['DIFF_DIR'] ?? path.join(homedir(), 'dbdiff');
const OUTPUT_DIR = process.env['OUTPUT_DIR'] ?? './prisma/patch-output';
const FILES_DIR = path.join(OUTPUT_DIR, 'files');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'patch-manifest.json');
const AVATARS_DIR = path.join('.', 'prisma', 'avatars');
const LEGACY_SCHEMA = process.env['LEGACY_SCHEMA'] ?? 'incoming';
const TXN_TIMEOUT_MS = parseInt(process.env['PATCH_TXN_TIMEOUT_MS'] ?? '300000', 10);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: required('DATABASE_URL'), max: 4 }),
});

type StagedFile = { key: string; body: Buffer };

/** Captured from createModelFromNode at plan time, replayed inside the txn. */
type RecordedOp = { model: keyof ModelWriter; op: 'create' | 'update'; args: unknown };

type Plan = {
  tags: {
    create: Prisma.TagUncheckedCreateInput[];
    alias: Array<{ legacyId: number; name: string; tagId: string }>;
    update: Array<{ tagId: string; legacyId: number; data: Prisma.TagUncheckedUpdateInput }>;
    remove: Array<{ tagId: string; legacyId: number; name: string }>;
  };
  users: {
    create: Prisma.UserUncheckedCreateInput[];
    update: Array<{ legacyId: number; userId: string; data: Record<string, unknown> }>;
    softDelete: Array<{ legacyId: number; userId: string }>;
  };
  models: {
    create: Array<{ modelId: string; node: LegacyNode; versionCount: number; ops: RecordedOp[] }>;
    update: Array<{
      legacyId: number;
      modelId: string;
      data: Record<string, unknown>;
      retitleVersionsTo: string | null;
    }>;
    softDelete: Array<{ legacyId: number; modelId: string }>;
  };
  versions: {
    append: Array<{
      nodeLegacyId: number;
      modelId: string;
      versionNumber: number;
      legacyVersionId: number;
      data: Prisma.ModelVersionUncheckedCreateInput;
      contributorUserId: string | null;
      carryTagIds: string[];
      carryPreviewImageFileKey: string | null;
      /** Version that stops being latest; archive.ts keeps tags and the preview
       *  on the latest version only, so they move rather than being copied. */
      vacatedVersionNumber: number | null;
    }>;
    update: Array<{
      legacyVersionId: number;
      modelId: string;
      versionNumber: number;
      data: Prisma.ModelVersionUncheckedUpdateInput;
    }>;
  };
  additionalFiles: {
    add: Array<{
      legacyAttachmentId: number;
      nodeLegacyId: number;
      data: Prisma.ModelAdditionalFileUncheckedCreateInput;
    }>;
    remove: Array<{ legacyAttachmentId: number; modelId: string; additionalFileId: string }>;
  };
  previews: Array<{
    nodeLegacyId: number;
    modelId: string;
    versionNumber: number;
    previewImageFileKey: string | null;
    sourceAttachmentId: number | null;
  }>;
  taggings: {
    add: Array<{
      nodeLegacyId: number;
      tagLegacyId: number;
      data: Prisma.ModelVersionTagUncheckedCreateInput;
    }>;
    remove: Array<{ nodeLegacyId: number; modelId: string; tagId: string; tagLegacyId: number }>;
  };
  files: StagedFile[];
  notes: string[];
  blockers: string[];
};

/** JSON-safe assertions, persisted so --verify-only needs no replanning. */
type Expectation =
  | { kind: 'tag'; legacyId: number; name: string }
  | { kind: 'user'; legacyId: number }
  | {
      kind: 'fields';
      entity: 'user' | 'model';
      id: string;
      legacyId: number;
      fields: Record<string, unknown>;
    }
  | { kind: 'model'; legacyId: number; versionCount: number; title: string }
  | { kind: 'versionTitles'; modelId: string; legacyId: number; title: string }
  | { kind: 'softDeleted'; entity: 'user' | 'model'; id: string; legacyId: number }
  | { kind: 'version'; modelId: string; versionNumber: number; netlogoFileKey: string }
  | { kind: 'latestIsMax'; modelId: string }
  | {
      kind: 'preview';
      modelId: string;
      versionNumber: number;
      key: string | null;
      nodeLegacyId: number;
    }
  | { kind: 'additionalFile'; id: string; fileKey: string }
  | { kind: 'absentAdditionalFile'; id: string; legacyAttachmentId: number }
  | { kind: 'tagging'; modelId: string; versionNumber: number; tagId: string; nodeLegacyId: number }
  | { kind: 'absentTagging'; modelId: string; tagId: string; nodeLegacyId: number }
  | { kind: 'noTaggings'; modelId: string; versionNumber: number; nodeLegacyId: number }
  | { kind: 'object'; key: string; bytes: number };

type Manifest = { generatedAt: string; legacySchema: string; expectations: Expectation[] };

// main

async function main() {
  if (VERIFY_ONLY) {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as Manifest;
    console.log(`→ verifying manifest from ${MANIFEST_PATH} (applied ${manifest.generatedAt})\n`);
    await verify(manifest.expectations);
    return;
  }

  console.log(`→ diff dir     ${path.resolve(DIFF_DIR)}`);
  console.log(`→ legacy       "${LEGACY_SCHEMA}" schema of LEGACY_DATABASE_URL`);
  console.log(`→ mode         ${APPLY ? 'APPLY' : 'dry run'}\n`);

  const legacy = new LegacyDatabase(required('LEGACY_DATABASE_URL'), LEGACY_SCHEMA);
  let plan: Plan;
  try {
    plan = await buildPlan(await loadDiffs(), legacy);
  } finally {
    await legacy.end();
  }

  printPlan(plan);

  if (plan.blockers.length > 0) {
    console.error(
      '\nRefusing to continue — the diff contains changes this script will not guess at:',
    );
    for (const b of plan.blockers) console.error(`  ✗ ${b}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to stage files and write these changes.');
    return;
  }

  const expectations = buildExpectations(plan);
  await stageFiles(plan);
  await applyPlan(plan);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        legacySchema: LEGACY_SCHEMA,
        expectations,
      } satisfies Manifest,
      null,
      2,
    ),
  );
  console.log(`  manifest written to ${MANIFEST_PATH}`);
  await verify(expectations);
}

// --diff intake

async function loadDiffs(): Promise<Map<PatchableTable, TableDiff>> {
  const files = (await readdir(DIFF_DIR)).filter((f) => f.endsWith('.csv')).sort();
  const diffs = new Map<PatchableTable, TableDiff>();
  const ignored: string[] = [];

  for (const file of files) {
    const table = file.replace(/\.csv$/, '');
    const diff = parseTableDiff(table, await readFile(path.join(DIFF_DIR, file), 'utf8'));

    if (!isPatchableTable(table)) {
      ignored.push(`${table} (${diff.rows.length} rows)`);
      continue;
    }
    if (diff.problems.length > 0) {
      throw new Error(`Unusable diff for ${table}:\n  ${diff.problems.join('\n  ')}`);
    }
    diffs.set(table, diff);
  }

  if (ignored.length > 0) {
    console.log('→ Ignored, because archive.ts never mapped these tables into the new schema:');
    console.log(`    ${ignored.join(', ')}\n`);
  }
  return diffs;
}

function rows(diffs: Map<PatchableTable, TableDiff>, table: PatchableTable, side: DiffRow['side']) {
  const diff = diffs.get(table);
  return diff ? rowsBySide(diff, side) : [];
}

// planning

type PlanContext = {
  legacy: LegacyDatabase;
  userIdByLegacyId: Map<number, string>;
  tagIdByLegacyId: Map<number, string>;
  tagIdByName: Map<string, string>;
  modelIdByLegacyId: Map<number, string>;
  createdNodeIds: Set<number>;
};

async function buildPlan(
  diffs: Map<PatchableTable, TableDiff>,
  legacy: LegacyDatabase,
): Promise<Plan> {
  const plan: Plan = {
    tags: { create: [], alias: [], update: [], remove: [] },
    users: { create: [], update: [], softDelete: [] },
    models: { create: [], update: [], softDelete: [] },
    versions: { append: [], update: [] },
    additionalFiles: { add: [], remove: [] },
    previews: [],
    taggings: { add: [], remove: [] },
    files: [],
    notes: [],
    blockers: [],
  };

  const [targetUsers, targetTags, targetModels] = await Promise.all([
    prisma.user.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true },
    }),
    prisma.tag.findMany({ select: { id: true, legacyId: true, name: true } }),
    prisma.model.findMany({
      where: { legacyId: { not: null } },
      select: { id: true, legacyId: true },
    }),
  ]);

  const ctx: PlanContext = {
    legacy,
    userIdByLegacyId: indexByLegacyId(targetUsers),
    tagIdByLegacyId: indexByLegacyId(targetTags),
    tagIdByName: new Map(targetTags.map((t) => [t.name, t.id] as const)),
    modelIdByLegacyId: indexByLegacyId(targetModels),
    createdNodeIds: new Set(),
  };

  await planTags(diffs, plan, ctx);
  await planUsers(diffs, plan, ctx);
  await planNewModels(diffs, plan, ctx);
  await planVersions(diffs, plan, ctx);
  await planAdditionalFilesAndPreviews(diffs, plan, ctx);
  await planTaggings(diffs, plan, ctx);
  await planModelUpdates(diffs, plan, ctx);
  await planDeletions(diffs, plan, ctx);

  return plan;
}

async function planTags(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  const newTags = await ctx.legacy.tagsByIds(rows(diffs, 'tags', 'new').map((r) => r.id));
  const modifiedTags = await ctx.legacy.tagsByIds(rows(diffs, 'tags', 'modified').map((r) => r.id));

  for (const t of newTags) {
    if (ctx.tagIdByLegacyId.has(t.id)) {
      plan.notes.push(`tag ${t.id} already present in target; nothing to do`);
      continue;
    }
    const name = normalizeTagName(t.name);
    if (!name) {
      plan.notes.push(`tag ${t.id} has a blank name; skipped, as archive.ts does`);
      continue;
    }
    const existingId = ctx.tagIdByName.get(name);
    if (existingId) {
      // Tag.name and Tag.legacyId are both unique, so the newcomer cannot claim
      // a second legacyId on that row. Point its taggings at the incumbent.
      plan.tags.alias.push({ legacyId: t.id, name, tagId: existingId });
      plan.notes.push(
        `tag ${t.id} "${name}" resolves to the existing tag that already owns that name`,
      );
      ctx.tagIdByLegacyId.set(t.id, existingId);
      continue;
    }
    const id = randomUUID();
    plan.tags.create.push({
      id,
      legacyId: t.id,
      name,
      displayName: (t.name ?? '').trim() || null,
      createdAt: t.created_at ?? new Date(),
    });
    ctx.tagIdByLegacyId.set(t.id, id);
    ctx.tagIdByName.set(name, id);
  }

  for (const t of modifiedTags) {
    const tagId = ctx.tagIdByLegacyId.get(t.id);
    if (!tagId) {
      plan.notes.push(`tag ${t.id} was modified but is not in the target; skipped`);
      continue;
    }
    const name = normalizeTagName(t.name);
    if (!name) {
      plan.notes.push(`tag ${t.id} was renamed to a blank name; left unchanged`);
      continue;
    }
    const holder = ctx.tagIdByName.get(name);
    if (holder && holder !== tagId) {
      plan.notes.push(
        `tag ${t.id} was renamed to "${name}", which another tag owns; left unchanged`,
      );
      continue;
    }
    const current = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { name: true, displayName: true },
    });
    const data = changedFields(current ?? {}, {
      name,
      displayName: (t.name ?? '').trim() || null,
    });
    if (Object.keys(data).length > 0) plan.tags.update.push({ tagId, legacyId: t.id, data });
  }

  for (const row of rows(diffs, 'tags', 'deleted')) {
    const tagId = ctx.tagIdByLegacyId.get(row.id);
    if (!tagId) continue;
    plan.tags.remove.push({
      tagId,
      legacyId: row.id,
      name: optionalString(row.deletedRow ?? {}, 'name') ?? '?',
    });
    // Stop it resolving, or a tagging in the same diff would be created and then
    // cascade-deleted, and verification would report a misleading failure.
    ctx.tagIdByLegacyId.delete(row.id);
  }
}

async function planUsers(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  const newPeople = await ctx.legacy.peopleByIds(rows(diffs, 'people', 'new').map((r) => r.id));
  const modifiedPeople = await ctx.legacy.peopleByIds(
    rows(diffs, 'people', 'modified').map((r) => r.id),
  );

  // Within the diff itself the lowest legacy id still claims a shared email.
  const emailWinner = pickLowestIdWinners(newPeople, (p) => normalizeEmail(p.email_address));

  for (const p of newPeople) {
    if (ctx.userIdByLegacyId.has(p.id)) {
      plan.notes.push(`person ${p.id} already present in target; nothing to do`);
      continue;
    }
    const id = randomUUID();
    plan.users.create.push({
      id,
      legacyId: p.id,
      email: await claimEmail(p, emailWinner, plan),
      name: buildFullName(p.first_name, p.last_name),
      emailVerified: false,
      bio: p.biography?.trim() || null,
      dob: toUtcDateOnly(p.birthdate),
      image: await stageAvatar(p, id, plan),
      socialLinks: [{ type: 'other', rawValue: p.url?.trim() || null }],
      systemRole: 'user',
      userKind: 'other',
      createdAt: p.created_at ?? new Date(),
      updatedAt: p.updated_at ?? p.created_at ?? new Date(),
    });
    ctx.userIdByLegacyId.set(p.id, id);
  }

  let avatarsSkipped = 0;
  for (const p of modifiedPeople) {
    const userId = ctx.userIdByLegacyId.get(p.id);
    if (!userId) {
      plan.notes.push(`person ${p.id} was modified but is not in the target; skipped`);
      continue;
    }
    if (p.avatar_file_name) avatarsSkipped++;

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        bio: true,
        dob: true,
        socialLinks: true,
        createdAt: true,
      },
    });
    if (!current) continue;

    const desired: Record<string, unknown> = {
      name: buildFullName(p.first_name, p.last_name),
      bio: p.biography?.trim() || null,
      dob: toUtcDateOnly(p.birthdate),
      socialLinks: [{ type: 'other', rawValue: p.url?.trim() || null }],
      createdAt: p.created_at ?? current.createdAt,
    };

    const email = normalizeEmail(p.email_address);
    if (email && email !== current.email) {
      const holder = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (holder && holder.id !== userId) {
        plan.notes.push(`person ${p.id} now uses an email another user owns; email left unchanged`);
      } else {
        desired['email'] = email;
      }
    }

    const data = changedFields(current, desired);
    if (Object.keys(data).length > 0) plan.users.update.push({ legacyId: p.id, userId, data });
  }

  if (avatarsSkipped > 0) {
    plan.notes.push(
      `${avatarsSkipped} modified people have avatars; avatar images are a filesystem snapshot rather than ` +
        `part of the diff, so User.image was left unchanged`,
    );
  }
}

async function claimEmail(
  p: LegacyPerson,
  emailWinner: Map<string, LegacyPerson>,
  plan: Plan,
): Promise<string | null> {
  const email = normalizeEmail(p.email_address);
  if (!email) return null;
  if (emailWinner.get(email)?.id !== p.id) {
    plan.notes.push(
      `person ${p.id} shares an email with a lower legacy id in this diff; email dropped`,
    );
    return null;
  }
  const holder = await prisma.user.findUnique({ where: { email }, select: { legacyId: true } });
  if (holder) {
    plan.notes.push(
      `person ${p.id} reuses the email of migrated person ${holder.legacyId}; email dropped`,
    );
    return null;
  }
  return email;
}

async function stageAvatar(p: LegacyPerson, userId: string, plan: Plan): Promise<string | null> {
  if (!p.avatar_file_name) return null;
  const key = buildAvatarFileKey(userId, p.avatar_updated_at ?? new Date(), randomUUID(), 'avatar');
  const source = path.join(AVATARS_DIR, `${p.id}`, 'original', p.avatar_file_name);
  try {
    plan.files.push({ key, body: await readFile(source) });
    return `cdn.modelingcommons.org/modeling-commons/${key}`;
  } catch {
    plan.notes.push(`person ${p.id} has an avatar but ${source} is missing; image left null`);
    return null;
  }
}

async function planNewModels(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  const newNodes = await ctx.legacy.nodesByIds(rows(diffs, 'nodes', 'new').map((r) => r.id));
  if (newNodes.length === 0) return;

  const spamNodeIds = await ctx.legacy.spamNodeIds();

  for (const node of newNodes) {
    if (ctx.modelIdByLegacyId.has(node.id)) {
      plan.notes.push(`node ${node.id} already present in target; nothing to do`);
      continue;
    }
    if (spamNodeIds.has(node.id)) {
      plan.notes.push(`node ${node.id} has >=2 spam warnings; skipped, as archive.ts does`);
      continue;
    }

    const [versions, attachments, taggings] = await Promise.all([
      ctx.legacy.versionsForNode(node.id),
      ctx.legacy.attachmentsForNode(node.id),
      ctx.legacy.taggingsForNode(node.id),
    ]);
    if (versions.length === 0) {
      plan.notes.push(`node ${node.id} has no versions; skipped, as archive.ts does`);
      continue;
    }

    const modelId = randomUUID();
    const tree: NodeTree = { node, versions, attachments, taggings };
    const ops: RecordedOp[] = [];

    // Run the real archive routine now so the plan holds every write and every
    // file. Applying just replays these ops inside the transaction.
    await createModelFromNode(recordingWriter(ops), modelId, tree, {
      writeFile: async (key, body) => {
        plan.files.push({ key, body });
      },
      newUuid: randomUUID,
      now: () => new Date(),
      userIdByLegacyId: ctx.userIdByLegacyId,
      tagIdByLegacyId: ctx.tagIdByLegacyId,
    });

    plan.models.create.push({ modelId, node, versionCount: versions.length, ops });
    ctx.modelIdByLegacyId.set(node.id, modelId);
    ctx.createdNodeIds.add(node.id);
  }
}

function recordingWriter(ops: RecordedOp[]): ModelWriter {
  const record =
    (model: keyof ModelWriter, op: 'create' | 'update') =>
    (args: unknown): Promise<unknown> => {
      ops.push({ model, op, args });
      return Promise.resolve({});
    };
  return {
    model: { create: record('model', 'create'), update: record('model', 'update') },
    modelVersion: {
      create: record('modelVersion', 'create'),
      update: record('modelVersion', 'update'),
    },
    modelAuthor: { create: record('modelAuthor', 'create') },
    modelAdditionalFile: { create: record('modelAdditionalFile', 'create') },
    modelVersionTag: { create: record('modelVersionTag', 'create') },
  };
}

async function planVersions(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  for (const row of rows(diffs, 'versions', 'deleted')) {
    const nodeId = requireNumber(row.deletedRow ?? {}, 'node_id');
    if (rows(diffs, 'nodes', 'deleted').some((n) => n.id === nodeId)) {
      plan.notes.push(
        `version ${row.id} went with its deleted node ${nodeId}; covered by the model soft delete`,
      );
      continue;
    }
    if (!ctx.modelIdByLegacyId.has(nodeId)) continue;
    plan.blockers.push(
      `version ${row.id} was deleted from surviving node ${nodeId}. versionNumber is a positional counter ` +
        `referenced by Model.latestVersionNumber, Model.parentVersionNumber, ModelVersionTag and ` +
        `ModelAdditionalFile, so removing one mid-sequence needs a hand-written renumbering.`,
    );
  }

  const newVersions = await ctx.legacy.versionsByIds(
    rows(diffs, 'versions', 'new').map((r) => r.id),
  );
  const byNode = new Map<number, LegacyVersion[]>();
  for (const v of newVersions) {
    if (ctx.createdNodeIds.has(v.node_id)) continue; // written by createModelFromNode
    byNode.set(v.node_id, [...(byNode.get(v.node_id) ?? []), v]);
  }

  for (const [nodeId, appended] of byNode) {
    const modelId = ctx.modelIdByLegacyId.get(nodeId);
    if (!modelId) {
      plan.notes.push(
        `${appended.length} new version(s) belong to node ${nodeId}, not in the target; skipped`,
      );
      continue;
    }

    const legacyOrder = await ctx.legacy.versionsForNode(nodeId);
    const existing = await prisma.modelVersion.findMany({
      where: { modelId },
      orderBy: { versionNumber: 'asc' },
      select: { versionNumber: true, previewImageFileKey: true },
    });

    const appendedIds = new Set(appended.map((v) => v.id));
    const missing = legacyOrder.length - existing.length;

    if (missing === 0) {
      plan.notes.push(
        `node ${nodeId}: version(s) ${[...appendedIds].join(', ')} are already in the target; nothing to append`,
      );
      continue;
    }

    const tail = missing > 0 ? legacyOrder.slice(legacyOrder.length - missing) : [];
    if (missing < 0 || !tail.every((v) => appendedIds.has(v.id))) {
      plan.blockers.push(
        `node ${nodeId}: cannot append version(s) ${[...appendedIds].join(', ')}. The target holds ` +
          `${existing.length} version(s) against ${legacyOrder.length} in the legacy snapshot, and the ` +
          `${missing} missing one(s) are not exactly the chronologically newest. Appending would break the ` +
          `created_at ordering that versionNumber encodes.`,
      );
      continue;
    }

    const node = (await ctx.legacy.nodesByIds([nodeId]))[0];
    if (!node) continue;

    const previousLatest = existing.at(-1);
    const carryTagIds = previousLatest
      ? (
          await prisma.modelVersionTag.findMany({
            where: { modelId, versionNumber: previousLatest.versionNumber },
            select: { tagId: true },
          })
        ).map((t) => t.tagId)
      : [];

    let versionNumber = previousLatest?.versionNumber ?? 0;
    for (const [index, v] of tail.entries()) {
      versionNumber++;
      const isLast = index === tail.length - 1;
      plan.versions.append.push({
        nodeLegacyId: nodeId,
        modelId,
        versionNumber,
        legacyVersionId: v.id,
        data: stageVersion(plan, buildVersionCreate(modelId, node, v, versionNumber), v),
        contributorUserId: ctx.userIdByLegacyId.get(v.person_id) ?? null,
        // archive.ts keeps a node's tags and preview on its latest version
        // only, and the app reads them from there. Move them onto the new
        // latest so the result matches a fresh archive of the same snapshot.
        carryTagIds: isLast ? carryTagIds : [],
        carryPreviewImageFileKey: isLast ? (previousLatest?.previewImageFileKey ?? null) : null,
        vacatedVersionNumber: isLast ? (previousLatest?.versionNumber ?? null) : null,
      });
    }
  }

  const changedVersions = await ctx.legacy.versionsByIds(
    rows(diffs, 'versions', 'modified').map((r) => r.id),
  );
  for (const v of changedVersions) {
    if (ctx.createdNodeIds.has(v.node_id)) continue;
    const modelId = ctx.modelIdByLegacyId.get(v.node_id);
    if (!modelId) continue;

    const legacyOrder = await ctx.legacy.versionsForNode(v.node_id);
    const count = await prisma.modelVersion.count({ where: { modelId } });
    const position = legacyOrder.findIndex((x) => x.id === v.id);

    if (count !== legacyOrder.length || position < 0) {
      plan.blockers.push(
        `version ${v.id} on node ${v.node_id} was modified, but the target holds ${count} version(s) against ` +
          `${legacyOrder.length} in the legacy snapshot, so its versionNumber cannot be derived.`,
      );
      continue;
    }

    const node = (await ctx.legacy.nodesByIds([v.node_id]))[0];
    if (!node) continue;
    const versionNumber = position + 1;
    const created = buildVersionCreate(modelId, node, v, versionNumber);

    const current = await prisma.modelVersion.findUnique({
      where: { modelId_versionNumber: { modelId, versionNumber } },
      select: { description: true, netlogoFileKey: true, netlogoVersion: true, infoTab: true },
    });
    const data = changedFields(current ?? {}, {
      description: created.description,
      netlogoFileKey: created.netlogoFileKey,
      netlogoVersion: created.netlogoVersion,
      infoTab: created.infoTab,
    });

    if (Object.keys(data).length === 0) {
      plan.notes.push(`version ${v.id} is already up to date in the target; nothing to do`);
      continue;
    }

    stageVersion(plan, created, v);
    plan.versions.update.push({ legacyVersionId: v.id, modelId, versionNumber, data });
  }
}

/**
 * Derives the object key from the legacy version id rather than a fresh random
 * one, so re-running lands on the same object instead of uploading a duplicate
 * and repointing the row at it.
 */
function buildVersionCreate(
  modelId: string,
  node: LegacyNode,
  v: LegacyVersion,
  versionNumber: number,
): Prisma.ModelVersionUncheckedCreateInput {
  const format = getNlogoFileExtension(v.contents);
  const key = buildVersionFileKey(
    modelId,
    v.created_at ?? node.created_at ?? new Date(),
    derivedUuid('version', v.id),
    `${node.name}.${format}`,
  );

  const { netlogoVersion, infoTab } = parseNetlogoContents(v.contents, format);
  return {
    modelId,
    versionNumber,
    title: node.name,
    description: v.description || null,
    netlogoFileKey: key,
    netlogoVersion,
    infoTab,
    createdAt: v.created_at ?? new Date(),
    finalizedAt: v.created_at ?? null,
  };
}

function stageVersion(
  plan: Plan,
  data: Prisma.ModelVersionUncheckedCreateInput,
  v: LegacyVersion,
): Prisma.ModelVersionUncheckedCreateInput {
  plan.files.push({ key: data.netlogoFileKey, body: Buffer.from(v.contents, 'utf8') });
  return data;
}

async function planAdditionalFilesAndPreviews(
  diffs: Map<PatchableTable, TableDiff>,
  plan: Plan,
  ctx: PlanContext,
) {
  const added = await ctx.legacy.attachmentsByIds(
    rows(diffs, 'attachments', 'new').map((r) => r.id),
  );
  const changed = await ctx.legacy.attachmentsByIds(
    rows(diffs, 'attachments', 'modified').map((r) => r.id),
  );
  const removed = rows(diffs, 'attachments', 'deleted');
  const changedIds = new Set(changed.map((a) => a.id));

  const previewNodeIds = new Set<number>();
  const seenNodeIds = new Set<number>();

  const touch = (nodeId: number, isPreview: boolean) => {
    if (ctx.createdNodeIds.has(nodeId)) return;
    if (!ctx.modelIdByLegacyId.has(nodeId)) {
      if (!seenNodeIds.has(nodeId)) {
        plan.notes.push(`attachment changes reference node ${nodeId}, not in the target; skipped`);
      }
      seenNodeIds.add(nodeId);
      return;
    }
    seenNodeIds.add(nodeId);
    if (isPreview) previewNodeIds.add(nodeId);
  };

  for (const a of added) touch(a.node_id, a.content_type === 'preview');
  for (const a of changed) touch(a.node_id, a.content_type === 'preview');
  for (const row of removed) {
    const deleted = row.deletedRow ?? {};
    touch(requireNumber(deleted, 'node_id'), optionalString(deleted, 'content_type') === 'preview');
  }

  // A non-preview attachment whose bytes or filename changed maps onto a
  // ModelAdditionalFile row that carries no legacy id, so there is no reliable
  // way to tell which row to rewrite. Stop rather than guess.
  const changedFiles = changed.filter((a) => a.content_type !== 'preview');
  if (changedFiles.length > 0) {
    plan.blockers.push(
      `attachment(s) ${changedFiles.map((a) => a.id).join(', ')} were modified in place. ` +
        `ModelAdditionalFile carries no legacyId, so the matching row cannot be identified with ` +
        `confidence. Handle these by hand, or re-upload them in the legacy app so they arrive as new rows.`,
    );
  }

  for (const a of added) {
    if (a.content_type === 'preview') continue; // the resync below owns previews
    if (ctx.createdNodeIds.has(a.node_id)) continue;
    const modelId = ctx.modelIdByLegacyId.get(a.node_id);
    if (!modelId) continue;

    const existing = await findAdditionalFile(modelId, a.filename, a.created_at);
    if (existing === 'ambiguous') {
      plan.notes.push(
        `attachment ${a.id} (${a.filename}) matches more than one existing row; assuming already present`,
      );
      continue;
    }
    if (existing) {
      plan.notes.push(`attachment ${a.id} already present as ${existing.id}; nothing to do`);
      continue;
    }

    const fileUuid = randomUUID();
    const key = buildAttachmentFileKey(modelId, a.created_at ?? new Date(), fileUuid, a.filename);
    plan.files.push({ key, body: a.contents });
    plan.files.push({
      key: `${key}.metadata.json`,
      body: buildAttachmentMetadata(a, ctx.userIdByLegacyId, new Date()),
    });

    plan.additionalFiles.add.push({
      legacyAttachmentId: a.id,
      nodeLegacyId: a.node_id,
      data: {
        id: fileUuid,
        modelId,
        taggedVersionNumber: await latestVersionNumberAfterAppends(plan, modelId),
        fileKey: key,
        createdAt: a.created_at ?? new Date(),
      },
    });
  }

  for (const row of removed) {
    const deleted = row.deletedRow ?? {};
    if (optionalString(deleted, 'content_type') === 'preview') continue;
    const nodeId = requireNumber(deleted, 'node_id');
    if (ctx.createdNodeIds.has(nodeId)) continue;
    const modelId = ctx.modelIdByLegacyId.get(nodeId);
    if (!modelId) continue;

    const filename = optionalString(deleted, 'filename');
    if (!filename) {
      plan.notes.push(
        `deleted attachment ${row.id} has no filename in the diff; cannot locate its row`,
      );
      continue;
    }
    const match = await findAdditionalFile(modelId, filename, optionalDate(deleted, 'created_at'));
    if (match === 'ambiguous') {
      plan.blockers.push(
        `deleted attachment ${row.id} (${filename}) on node ${nodeId} matches more than one ` +
          `ModelAdditionalFile row. That table carries no legacyId, so deleting one would be a guess.`,
      );
      continue;
    }
    if (!match) {
      plan.notes.push(
        `deleted attachment ${row.id} (${filename}) has no row in the target; already gone`,
      );
      continue;
    }
    plan.additionalFiles.remove.push({
      legacyAttachmentId: row.id,
      modelId,
      additionalFileId: match.id,
    });
  }

  // A preview is a single column on the latest version, and the highest legacy
  // attachment id wins it. Individual adds/removes cannot be applied to that;
  // recompute it from the whole attachment set instead.
  for (const nodeId of previewNodeIds) {
    const modelId = ctx.modelIdByLegacyId.get(nodeId);
    if (!modelId) continue;

    const previews = (await ctx.legacy.attachmentsForNode(nodeId)).filter(
      (a) => a.content_type === 'preview',
    );
    const winner = previews.at(-1) ?? null;
    const versionNumber = await latestVersionNumberAfterAppends(plan, modelId);

    // Derive the object key from the legacy attachment id so re-running lands on
    // the same object instead of uploading a fresh copy every time.
    const key = winner
      ? buildPreviewFileKey(
          modelId,
          winner.created_at ?? new Date(),
          derivedUuid('preview', winner.id),
          winner.filename,
        )
      : null;

    // When a version is being appended, the version this resync targets does not
    // exist in the database yet; what it will hold is whatever the append
    // carries forward. Comparing against the database would read null and wrongly
    // conclude a cleared preview is already applied.
    const append = plan.versions.append.filter((a) => a.modelId === modelId).at(-1);
    const currentKey = append
      ? append.carryPreviewImageFileKey
      : ((
          await prisma.modelVersion.findUnique({
            where: { modelId_versionNumber: { modelId, versionNumber } },
            select: { previewImageFileKey: true },
          })
        )?.previewImageFileKey ?? null);
    const alreadyPointsThere = samePreviewObject(currentKey, key);

    if (alreadyPointsThere && !(winner && changedIds.has(winner.id))) {
      plan.notes.push(
        `preview for node ${nodeId} already points at ` +
          `${winner ? `attachment ${winner.id}` : 'nothing'}; nothing to do`,
      );
      continue;
    }

    if (winner && key) plan.files.push({ key, body: winner.contents });
    if (alreadyPointsThere) continue; // bytes restaged, but the row is already right

    if (append) append.carryPreviewImageFileKey = null; // this resync supersedes it
    plan.previews.push({
      nodeLegacyId: nodeId,
      modelId,
      versionNumber,
      previewImageFileKey: key,
      sourceAttachmentId: winner?.id ?? null,
    });
  }
}

/**
 * The uuid segment of a file key is a nonce; what identifies a preview object is
 * its model, date partition and filename. createModelFromNode mints a random
 * nonce while the resync derives one from the legacy attachment id, so compare
 * the two without it.
 */
function samePreviewObject(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  const strip = (key: string) => key.replace(/\/[0-9a-f-]{36}\//gi, '/');
  return strip(a) === strip(b);
}

/**
 * ModelAdditionalFile carries no legacy id, so a row is located by its filename
 * and creation time. Returns 'ambiguous' rather than picking one when that pair
 * does not single a row out — deleting the wrong attachment is unrecoverable.
 */
async function findAdditionalFile(
  modelId: string,
  filename: string,
  createdAt: Date | null,
): Promise<{ id: string; fileKey: string } | 'ambiguous' | null> {
  const candidates = await prisma.modelAdditionalFile.findMany({
    where: { modelId },
    select: { id: true, fileKey: true, createdAt: true },
  });
  const suffix = `/${sanitizeFilename(filename)}`;
  const matches = candidates.filter(
    (c) =>
      c.fileKey.endsWith(suffix) &&
      (createdAt === null || c.createdAt.getTime() === createdAt.getTime()),
  );
  if (matches.length === 0) return null;
  if (matches.length > 1) return 'ambiguous';
  return matches[0]!;
}

async function latestVersionNumberAfterAppends(plan: Plan, modelId: string): Promise<number> {
  const appended = plan.versions.append.filter((a) => a.modelId === modelId).at(-1);
  if (appended) return appended.versionNumber;
  const latest = await prisma.modelVersion.findFirst({
    where: { modelId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });
  return latest?.versionNumber ?? 1;
}

async function planTaggings(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  const added = await ctx.legacy.taggingsByIds(rows(diffs, 'tagged_nodes', 'new').map((r) => r.id));

  for (const tg of added) {
    if (ctx.createdNodeIds.has(tg.node_id)) continue;
    const modelId = ctx.modelIdByLegacyId.get(tg.node_id);
    const tagId = ctx.tagIdByLegacyId.get(tg.tag_id);
    if (!modelId) {
      plan.notes.push(`tagging ${tg.id} references node ${tg.node_id}, not in the target; skipped`);
      continue;
    }
    if (!tagId) {
      plan.notes.push(`tagging ${tg.id} references tag ${tg.tag_id}, not in the target; skipped`);
      continue;
    }

    const versionNumber = await latestVersionNumberAfterAppends(plan, modelId);
    const already = await prisma.modelVersionTag.findFirst({
      where: { modelId, versionNumber, tagId },
    });
    if (already) {
      plan.notes.push(
        `tagging ${tg.id} already present on version ${versionNumber}; nothing to do`,
      );
      continue;
    }
    if (plan.taggings.add.some((t) => t.data.modelId === modelId && t.data.tagId === tagId))
      continue;

    plan.taggings.add.push({
      nodeLegacyId: tg.node_id,
      tagLegacyId: tg.tag_id,
      data: { modelId, versionNumber, tagId, createdAt: tg.created_at ?? new Date() },
    });
  }

  for (const row of rows(diffs, 'tagged_nodes', 'deleted')) {
    const deleted = row.deletedRow ?? {};
    const nodeId = requireNumber(deleted, 'node_id');
    const tagLegacyId = requireNumber(deleted, 'tag_id');
    if (ctx.createdNodeIds.has(nodeId)) continue;

    const modelId = ctx.modelIdByLegacyId.get(nodeId);
    const tagId = ctx.tagIdByLegacyId.get(tagLegacyId);
    if (!modelId || !tagId) continue;
    plan.taggings.remove.push({ nodeLegacyId: nodeId, modelId, tagId, tagLegacyId });
  }
}

/**
 * `updatedAt` is carried by Prisma's @updatedAt, which overrides any value
 * supplied on create — so archive.ts stamped every migrated row with the
 * migration time and legacy `updated_at` was never preserved. Writing it here
 * would leave a handful of rows inconsistent with the rest, so it is left alone.
 */
async function planModelUpdates(
  diffs: Map<PatchableTable, TableDiff>,
  plan: Plan,
  ctx: PlanContext,
) {
  const changed = await ctx.legacy.nodesByIds(rows(diffs, 'nodes', 'modified').map((r) => r.id));

  for (const node of changed) {
    const modelId = ctx.modelIdByLegacyId.get(node.id);
    if (!modelId) {
      plan.notes.push(`node ${node.id} was modified but is not in the target; skipped`);
      continue;
    }
    const current = await prisma.model.findUnique({
      where: { id: modelId },
      select: { visibility: true, createdAt: true },
    });
    if (!current) continue;

    const data = changedFields(current, {
      visibility: mapVisibility(node.visibility_id),
      createdAt: node.created_at ?? current.createdAt,
    });

    // archive.ts titles every version with the node name, so a rename fans out.
    const staleTitles = await prisma.modelVersion.count({
      where: { modelId, title: { not: node.name } },
    });
    const retitleVersionsTo = staleTitles > 0 ? node.name : null;

    if (Object.keys(data).length > 0 || retitleVersionsTo) {
      plan.models.update.push({ legacyId: node.id, modelId, data, retitleVersionsTo });
    }
  }
}

async function planDeletions(diffs: Map<PatchableTable, TableDiff>, plan: Plan, ctx: PlanContext) {
  for (const row of rows(diffs, 'nodes', 'deleted')) {
    const modelId = ctx.modelIdByLegacyId.get(row.id);
    if (!modelId) {
      plan.notes.push(`node ${row.id} was deleted but is not in the target; nothing to do`);
      continue;
    }
    const current = await prisma.model.findUnique({
      where: { id: modelId },
      select: { deletedAt: true },
    });
    if (current?.deletedAt) continue;
    plan.models.softDelete.push({ legacyId: row.id, modelId });
  }

  for (const row of rows(diffs, 'people', 'deleted')) {
    const userId = ctx.userIdByLegacyId.get(row.id);
    if (!userId) continue;
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });
    if (current?.deletedAt) continue;
    plan.users.softDelete.push({ legacyId: row.id, userId });
  }
}

// -output

function printPlan(plan: Plan) {
  const counts: Array<[number, string]> = [
    [plan.tags.create.length, 'Tag rows created'],
    [plan.tags.update.length, 'Tag rows renamed'],
    [plan.tags.remove.length, 'Tag rows deleted (cascades to ModelVersionTag)'],
    [plan.users.create.length, 'User rows created'],
    [plan.users.update.length, 'User rows updated'],
    [plan.users.softDelete.length, 'User rows soft deleted'],
    [plan.models.create.length, 'Models created with their full version/author/file/tag tree'],
    [plan.models.update.length, 'Models updated'],
    [plan.models.softDelete.length, 'Models soft deleted'],
    [plan.versions.append.length, 'ModelVersion rows appended to existing models'],
    [plan.versions.update.length, 'ModelVersion rows updated in place'],
    [plan.additionalFiles.add.length, 'ModelAdditionalFile rows added'],
    [plan.additionalFiles.remove.length, 'ModelAdditionalFile rows removed'],
    [plan.previews.length, 'preview images recomputed from the full attachment set'],
    [plan.taggings.add.length, 'ModelVersionTag rows added'],
    [plan.taggings.remove.length, 'ModelVersionTag rows removed'],
    [plan.files.length, 'files staged for object storage'],
  ];

  console.log('=== PLAN ===');
  const lines = counts
    .filter(([n]) => n > 0)
    .map(([n, what]) => `  ${String(n).padStart(4)}  ${what}`);
  console.log(lines.length > 0 ? lines.join('\n') : '  (nothing to do)');

  console.log('');
  for (const m of plan.models.create) {
    console.log(`    + model legacyId=${m.node.id} "${m.node.name}" (${m.versionCount} versions)`);
  }
  for (const t of plan.tags.create) console.log(`    + tag legacyId=${t.legacyId} "${t.name}"`);
  for (const u of plan.users.create)
    console.log(`    + user legacyId=${u.legacyId} "${u.name ?? ''}"`);
  for (const u of plan.users.update)
    console.log(`    ~ user legacyId=${u.legacyId} ${fieldList(u.data)}`);
  for (const u of plan.models.update) {
    console.log(
      `    ~ model legacyId=${u.legacyId} ${fieldList(u.data)}${u.retitleVersionsTo ? ' +retitle versions' : ''}`,
    );
  }
  for (const d of plan.models.softDelete)
    console.log(`    - model legacyId=${d.legacyId} soft deleted`);
  for (const d of plan.users.softDelete)
    console.log(`    - user legacyId=${d.legacyId} soft deleted`);
  for (const a of plan.versions.append) {
    console.log(
      `    + version #${a.versionNumber} on node ${a.nodeLegacyId} from legacy version ${a.legacyVersionId}`,
    );
  }
  for (const u of plan.versions.update) {
    console.log(`    ~ version #${u.versionNumber} from legacy version ${u.legacyVersionId}`);
  }
  for (const a of plan.additionalFiles.add) {
    console.log(
      `    + additional file on node ${a.nodeLegacyId} from attachment ${a.legacyAttachmentId}`,
    );
  }
  for (const r of plan.additionalFiles.remove) {
    console.log(`    - additional file from attachment ${r.legacyAttachmentId}`);
  }
  for (const p of plan.previews) {
    console.log(
      `    ~ preview node=${p.nodeLegacyId} version ${p.versionNumber} → ` +
        `${p.sourceAttachmentId ? `attachment ${p.sourceAttachmentId}` : 'none (cleared)'}`,
    );
  }
  for (const t of plan.taggings.add)
    console.log(`    + tagging node=${t.nodeLegacyId} tag=${t.tagLegacyId}`);
  for (const t of plan.taggings.remove)
    console.log(`    - tagging node=${t.nodeLegacyId} tag=${t.tagLegacyId}`);

  if (plan.notes.length > 0) {
    console.log('\n--- notes ---');
    for (const n of plan.notes) console.log(`  · ${n}`);
  }
}

function fieldList(data: Record<string, unknown>): string {
  return `[${Object.keys(data).join(', ')}]`;
}

// --files

async function stageFiles(plan: Plan) {
  if (plan.files.length === 0) return;
  console.log(`\n→ Staging ${plan.files.length} files under ${path.resolve(FILES_DIR)}`);

  for (const file of plan.files) {
    const full = path.join(FILES_DIR, file.key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, file.body);
  }

  if (SKIP_UPLOAD) {
    console.log('  --skip-upload: nothing sent to object storage');
    return;
  }

  const storage = createStorage();
  for (const file of plan.files) {
    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: file.key,
        Body: file.body,
        ACL: 'public-read',
      }),
    );
  }
  console.log(`  uploaded ${plan.files.length} objects to ${storage.bucket}`);
}

function createStorage() {
  return {
    client: new S3Client({
      region: process.env['STORE_REGION'],
      credentials: {
        accessKeyId: required('STORE_ACCESS_KEY'),
        secretAccessKey: required('STORE_SECRET_KEY'),
      },
      endpoint: process.env['STORE_ENDPOINT'],
      forcePathStyle: true,
    }),
    bucket: required('STORE_BUCKET'),
  };
}

// --apply

async function applyPlan(plan: Plan) {
  console.log('\n→ Applying (one transaction; rolls back entirely on error)');

  await prisma.$transaction(
    async (tx) => {
      for (const data of plan.tags.create) await tx.tag.create({ data });
      for (const u of plan.tags.update)
        await tx.tag.update({ where: { id: u.tagId }, data: u.data });

      for (const data of plan.users.create) await tx.user.create({ data });
      for (const u of plan.users.update) {
        await tx.user.update({ where: { id: u.userId }, data: u.data });
      }

      for (const m of plan.models.create) await replay(tx, m.ops);

      for (const a of plan.versions.append) {
        if (a.vacatedVersionNumber !== null) {
          await tx.modelVersionTag.deleteMany({
            where: { modelId: a.modelId, versionNumber: a.vacatedVersionNumber },
          });
          await tx.modelVersion.update({
            where: {
              modelId_versionNumber: { modelId: a.modelId, versionNumber: a.vacatedVersionNumber },
            },
            data: { previewImageFileKey: null },
          });
        }
        await tx.modelVersion.create({ data: a.data });
        await tx.model.update({
          where: { id: a.modelId },
          data: { latestVersionNumber: a.versionNumber },
        });
        if (a.carryPreviewImageFileKey) {
          await tx.modelVersion.update({
            where: {
              modelId_versionNumber: { modelId: a.modelId, versionNumber: a.versionNumber },
            },
            data: { previewImageFileKey: a.carryPreviewImageFileKey },
          });
        }
        for (const tagId of a.carryTagIds) {
          await tx.modelVersionTag.create({
            data: { modelId: a.modelId, versionNumber: a.versionNumber, tagId },
          });
        }
        await tx.modelAdditionalFile.updateMany({
          where: { modelId: a.modelId },
          data: { taggedVersionNumber: a.versionNumber },
        });
        if (a.contributorUserId) {
          await tx.modelAuthor.upsert({
            where: { modelId_userId: { modelId: a.modelId, userId: a.contributorUserId } },
            update: {},
            create: { modelId: a.modelId, userId: a.contributorUserId, role: 'contributor' },
          });
        }
      }

      for (const u of plan.versions.update) {
        await tx.modelVersion.update({
          where: { modelId_versionNumber: { modelId: u.modelId, versionNumber: u.versionNumber } },
          data: u.data,
        });
      }

      for (const a of plan.additionalFiles.add)
        await tx.modelAdditionalFile.create({ data: a.data });
      for (const r of plan.additionalFiles.remove) {
        await tx.modelAdditionalFile.delete({ where: { id: r.additionalFileId } });
      }

      for (const p of plan.previews) {
        await tx.modelVersion.update({
          where: { modelId_versionNumber: { modelId: p.modelId, versionNumber: p.versionNumber } },
          data: { previewImageFileKey: p.previewImageFileKey },
        });
      }

      for (const t of plan.taggings.add) await tx.modelVersionTag.create({ data: t.data });
      for (const t of plan.taggings.remove) {
        await tx.modelVersionTag.deleteMany({ where: { modelId: t.modelId, tagId: t.tagId } });
      }

      for (const u of plan.models.update) {
        if (Object.keys(u.data).length > 0) {
          await tx.model.update({ where: { id: u.modelId }, data: u.data });
        }
        if (u.retitleVersionsTo) {
          await tx.modelVersion.updateMany({
            where: { modelId: u.modelId },
            data: { title: u.retitleVersionsTo },
          });
        }
      }

      const now = new Date();
      for (const d of plan.models.softDelete) {
        await tx.model.update({ where: { id: d.modelId }, data: { deletedAt: now } });
      }
      for (const d of plan.users.softDelete) {
        await tx.user.update({ where: { id: d.userId }, data: { deletedAt: now } });
      }
      for (const r of plan.tags.remove) await tx.tag.delete({ where: { id: r.tagId } });
    },
    { timeout: TXN_TIMEOUT_MS, maxWait: 30_000 },
  );

  console.log('  committed');
}

async function replay(tx: Prisma.TransactionClient, ops: readonly RecordedOp[]) {
  for (const { model, op, args } of ops) {
    const delegate = tx[model] as unknown as Record<string, (a: unknown) => Promise<unknown>>;
    await delegate[op]!(args);
  }
}

// expectations

function buildExpectations(plan: Plan): Expectation[] {
  const out: Expectation[] = [];

  for (const t of plan.tags.create) out.push({ kind: 'tag', legacyId: t.legacyId!, name: t.name });
  for (const u of plan.users.create) out.push({ kind: 'user', legacyId: u.legacyId! });
  for (const u of plan.users.update) {
    out.push({
      kind: 'fields',
      entity: 'user',
      id: u.userId,
      legacyId: u.legacyId,
      fields: jsonSafe(u.data),
    });
  }

  for (const m of plan.models.create) {
    out.push({
      kind: 'model',
      legacyId: m.node.id,
      versionCount: m.versionCount,
      title: m.node.name,
    });
    out.push({ kind: 'latestIsMax', modelId: m.modelId });
  }
  for (const u of plan.models.update) {
    if (Object.keys(u.data).length > 0) {
      out.push({
        kind: 'fields',
        entity: 'model',
        id: u.modelId,
        legacyId: u.legacyId,
        fields: jsonSafe(u.data),
      });
    }
    if (u.retitleVersionsTo) {
      out.push({
        kind: 'versionTitles',
        modelId: u.modelId,
        legacyId: u.legacyId,
        title: u.retitleVersionsTo,
      });
    }
  }
  for (const d of plan.models.softDelete) {
    out.push({ kind: 'softDeleted', entity: 'model', id: d.modelId, legacyId: d.legacyId });
  }
  for (const d of plan.users.softDelete) {
    out.push({ kind: 'softDeleted', entity: 'user', id: d.userId, legacyId: d.legacyId });
  }

  for (const a of plan.versions.append) {
    out.push({
      kind: 'version',
      modelId: a.modelId,
      versionNumber: a.versionNumber,
      netlogoFileKey: a.data.netlogoFileKey,
    });
    out.push({ kind: 'latestIsMax', modelId: a.modelId });
    if (a.vacatedVersionNumber !== null) {
      out.push({
        kind: 'preview',
        modelId: a.modelId,
        versionNumber: a.vacatedVersionNumber,
        key: null,
        nodeLegacyId: a.nodeLegacyId,
      });
      out.push({
        kind: 'noTaggings',
        modelId: a.modelId,
        versionNumber: a.vacatedVersionNumber,
        nodeLegacyId: a.nodeLegacyId,
      });
    }
    for (const tagId of a.carryTagIds) {
      out.push({
        kind: 'tagging',
        modelId: a.modelId,
        versionNumber: a.versionNumber,
        tagId,
        nodeLegacyId: a.nodeLegacyId,
      });
    }
    // Only assert the carried preview when no resync supersedes it, or the two
    // expectations would contradict each other.
    if (
      !plan.previews.some((p) => p.modelId === a.modelId && p.versionNumber === a.versionNumber)
    ) {
      out.push({
        kind: 'preview',
        modelId: a.modelId,
        versionNumber: a.versionNumber,
        key: a.carryPreviewImageFileKey,
        nodeLegacyId: a.nodeLegacyId,
      });
    }
  }
  for (const u of plan.versions.update) {
    out.push({
      kind: 'version',
      modelId: u.modelId,
      versionNumber: u.versionNumber,
      netlogoFileKey: u.data.netlogoFileKey as string,
    });
  }

  for (const a of plan.additionalFiles.add) {
    out.push({ kind: 'additionalFile', id: a.data.id!, fileKey: a.data.fileKey });
  }
  for (const r of plan.additionalFiles.remove) {
    out.push({
      kind: 'absentAdditionalFile',
      id: r.additionalFileId,
      legacyAttachmentId: r.legacyAttachmentId,
    });
  }
  for (const p of plan.previews) {
    out.push({
      kind: 'preview',
      modelId: p.modelId,
      versionNumber: p.versionNumber,
      key: p.previewImageFileKey,
      nodeLegacyId: p.nodeLegacyId,
    });
  }
  for (const t of plan.taggings.add) {
    out.push({
      kind: 'tagging',
      modelId: t.data.modelId,
      versionNumber: t.data.versionNumber,
      tagId: t.data.tagId,
      nodeLegacyId: t.nodeLegacyId,
    });
  }
  for (const t of plan.taggings.remove) {
    out.push({
      kind: 'absentTagging',
      modelId: t.modelId,
      tagId: t.tagId,
      nodeLegacyId: t.nodeLegacyId,
    });
  }
  for (const f of plan.files) out.push({ kind: 'object', key: f.key, bytes: f.body.byteLength });

  return out;
}

// verify

async function verify(expectations: readonly Expectation[]) {
  console.log('\n→ Verifying');
  const failures: string[] = [];
  const storage = SKIP_UPLOAD ? null : createStorage();

  for (const e of expectations) {
    const failure = await checkExpectation(e, storage);
    if (failure) failures.push(failure);
  }

  const total = expectations.length;
  console.log(`  ${total - failures.length}/${total} checks passed`);
  if (failures.length > 0) {
    console.error('\nVERIFICATION FAILED:');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log('  ✓ patch verified');
}

async function checkExpectation(
  e: Expectation,
  storage: ReturnType<typeof createStorage> | null,
): Promise<string | null> {
  switch (e.kind) {
    case 'tag': {
      const tag = await prisma.tag.findUnique({ where: { legacyId: e.legacyId } });
      return tag?.name === e.name ? null : `tag legacyId=${e.legacyId} is missing or misnamed`;
    }
    case 'user': {
      const user = await prisma.user.findUnique({ where: { legacyId: e.legacyId } });
      return user ? null : `user legacyId=${e.legacyId} was not created`;
    }
    case 'fields': {
      const record =
        e.entity === 'user'
          ? await prisma.user.findUnique({ where: { id: e.id } })
          : await prisma.model.findUnique({ where: { id: e.id } });
      if (!record) return `${e.entity} legacyId=${e.legacyId} disappeared`;
      const actual = jsonSafe(record as unknown as Record<string, unknown>);
      const stale = Object.keys(e.fields).filter(
        (k) => JSON.stringify(actual[k] ?? null) !== JSON.stringify(e.fields[k] ?? null),
      );
      return stale.length === 0
        ? null
        : `${e.entity} legacyId=${e.legacyId} did not take field(s) ${stale.join(', ')}`;
    }
    case 'model': {
      const model = await prisma.model.findUnique({
        where: { legacyId: e.legacyId },
        include: { versions: { select: { title: true } } },
      });
      if (!model) return `model legacyId=${e.legacyId} was not created`;
      if (model.versions.length !== e.versionCount) {
        return `model legacyId=${e.legacyId} has ${model.versions.length} versions, expected ${e.versionCount}`;
      }
      return model.versions.every((v) => v.title === e.title)
        ? null
        : `model legacyId=${e.legacyId} has versions titled differently from its node name`;
    }
    case 'versionTitles': {
      const stale = await prisma.modelVersion.count({
        where: { modelId: e.modelId, title: { not: e.title } },
      });
      return stale === 0
        ? null
        : `model legacyId=${e.legacyId} still has ${stale} stale version title(s)`;
    }
    case 'softDeleted': {
      const record =
        e.entity === 'user'
          ? await prisma.user.findUnique({ where: { id: e.id }, select: { deletedAt: true } })
          : await prisma.model.findUnique({ where: { id: e.id }, select: { deletedAt: true } });
      return record?.deletedAt ? null : `${e.entity} legacyId=${e.legacyId} is not soft deleted`;
    }
    case 'version': {
      const version = await prisma.modelVersion.findUnique({
        where: { modelId_versionNumber: { modelId: e.modelId, versionNumber: e.versionNumber } },
        select: { netlogoFileKey: true },
      });
      return version?.netlogoFileKey === e.netlogoFileKey
        ? null
        : `version ${e.modelId}#${e.versionNumber} is missing or points at the wrong file`;
    }
    case 'latestIsMax': {
      const [model, max] = await Promise.all([
        prisma.model.findUnique({
          where: { id: e.modelId },
          select: { latestVersionNumber: true },
        }),
        prisma.modelVersion.aggregate({
          where: { modelId: e.modelId },
          _max: { versionNumber: true },
        }),
      ]);
      return model?.latestVersionNumber === max._max.versionNumber
        ? null
        : `model ${e.modelId} latestVersionNumber=${model?.latestVersionNumber} is not the highest version (${max._max.versionNumber})`;
    }
    case 'preview': {
      const version = await prisma.modelVersion.findUnique({
        where: { modelId_versionNumber: { modelId: e.modelId, versionNumber: e.versionNumber } },
        select: { previewImageFileKey: true },
      });
      return (version?.previewImageFileKey ?? null) === e.key
        ? null
        : `preview for node ${e.nodeLegacyId} is ${version?.previewImageFileKey ?? 'null'}, expected ${e.key ?? 'null'}`;
    }
    case 'additionalFile': {
      const file = await prisma.modelAdditionalFile.findUnique({ where: { id: e.id } });
      return file?.fileKey === e.fileKey ? null : `additional file ${e.id} is missing`;
    }
    case 'absentAdditionalFile': {
      const file = await prisma.modelAdditionalFile.findUnique({ where: { id: e.id } });
      return file === null
        ? null
        : `additional file from attachment ${e.legacyAttachmentId} is still present`;
    }
    case 'tagging': {
      const tag = await prisma.modelVersionTag.findFirst({
        where: { modelId: e.modelId, versionNumber: e.versionNumber, tagId: e.tagId },
      });
      return tag ? null : `tagging on node ${e.nodeLegacyId} is missing`;
    }
    case 'absentTagging': {
      const tag = await prisma.modelVersionTag.findFirst({
        where: { modelId: e.modelId, tagId: e.tagId },
      });
      return tag === null ? null : `tagging on node ${e.nodeLegacyId} is still present`;
    }
    case 'noTaggings': {
      const count = await prisma.modelVersionTag.count({
        where: { modelId: e.modelId, versionNumber: e.versionNumber },
      });
      return count === 0
        ? null
        : `version ${e.versionNumber} of node ${e.nodeLegacyId} still carries ${count} tag(s) after being superseded`;
    }
    case 'object': {
      if (!storage) return null;
      try {
        const head = await storage.client.send(
          new HeadObjectCommand({ Bucket: storage.bucket, Key: e.key }),
        );
        return head.ContentLength === e.bytes
          ? null
          : `object ${e.key} is ${head.ContentLength} bytes, expected ${e.bytes}`;
      } catch {
        return `object ${e.key} is not in the bucket`;
      }
    }
  }
}

// shared

function indexByLegacyId<T extends { id: string; legacyId: number | null }>(
  records: readonly T[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of records) {
    if (r.legacyId !== null) map.set(r.legacyId, r.id);
  }
  return map;
}

function changedFields(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
): Record<string, unknown> {
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(desired)) {
    if (!sameValue(current[key], value)) changed[key] = value;
  }
  return changed;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return a === b;
}

function jsonSafe(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
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
    await prisma.$disconnect();
  });
