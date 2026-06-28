import { createHash } from 'node:crypto';
import { prisma } from './providers.js';
import { seedId, seededRandom } from './id.js';
import { AssetUploader, loadNlogox, fakeNlogox, textAsset, type NlogoxAsset } from './assets.js';
import {
  isRealFile,
  type DraftSeed,
  type ModelFileSeed,
  type ModelSeed,
  type TagSeed,
  type UserSeed,
  type VersionSeed,
} from './manifest/index.js';

const DAY = 86_400_000;
const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * DAY);

export type IdMap = Map<string, string>;

const GEO_POOL = [
  { country: 'US', region: 'IL', city: 'Chicago' },
  { country: 'GB', region: 'ENG', city: 'London' },
  { country: 'JP', region: '13', city: 'Tokyo' },
  { country: 'IN', region: 'KA', city: 'Bangalore' },
  { country: 'DE', region: 'BE', city: 'Berlin' },
  { country: 'BR', region: 'SP', city: 'São Paulo' },
  { country: 'NG', region: 'LA', city: 'Lagos' },
  { country: 'AU', region: 'NSW', city: 'Sydney' },
];

const UA_POOL = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1',
];

const REFERER_POOL = ['https://www.google.com/', 'https://modelingcommons.org/browse', null, null];

function mustGet(map: IdMap, key: string, kind: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`Seed manifest references unknown ${kind}: "${key}"`);
  return id;
}

const pick = <T>(rng: () => number, pool: readonly T[]): T =>
  pool[Math.floor(rng() * pool.length)]!;

// ── Users ───────────────────────────────────────────────────────────────────

export async function loadUsers(users: UserSeed[]): Promise<IdMap> {
  const map: IdMap = new Map();

  for (const u of users) {
    const id = seedId('user', u.key);
    map.set(u.key, id);
    const createdAt = daysAgo(u.createdDaysAgo ?? 365);
    const systemRole = u.systemRole ?? 'user';

    // Reconcile mutable profile fields on every run so manifest edits propagate
    // to an already-seeded database; createdAt is fixed on first insert only.
    const profile = {
      legacyId: u.legacyId ?? null,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified ?? true,
      systemRole,
      role: systemRole === 'user' ? null : systemRole,
      userKind: u.userKind ?? 'researcher',
      isProfilePublic: u.isProfilePublic ?? false,
      bio: u.bio ?? null,
      country: u.country ?? null,
      affiliation: u.affiliation ?? null,
      socialLinks: (u.socialLinks ?? undefined) as never,
      dob: u.dob ? new Date(u.dob) : null,
      onboardedAt: (u.onboarded ?? true) ? createdAt : null,
    };

    await prisma.user.upsert({
      where: { id },
      update: profile,
      create: { id, createdAt, ...profile },
    });

    const accountId = seedId('account', u.key);
    await prisma.account.upsert({
      where: { id: accountId },
      update: {},
      create: { id: accountId, userId: id, accountId: id, providerId: 'credential' },
    });

    if (u.devSession) {
      const sessionId = seedId('session', u.key);
      await prisma.session.upsert({
        where: { id: sessionId },
        update: {},
        create: {
          id: sessionId,
          userId: id,
          token: `dev-session-${u.key}`,
          expiresAt: new Date(NOW + 30 * DAY),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (seed)',
        },
      });
    }
  }

  return map;
}

export async function loadTags(tags: TagSeed[]): Promise<IdMap> {
  const map: IdMap = new Map();

  for (const t of tags) {
    const id = seedId('tag', t.name);
    map.set(t.name, id);
    await prisma.tag.upsert({
      where: { name: t.name },
      update: { displayName: t.displayName },
      create: { id, name: t.name, displayName: t.displayName, legacyId: t.legacyId ?? null },
    });
  }

  return map;
}

export interface LoadedModel {
  key: string;
  id: string;
  latestVersionNumber: number;
  createdAt: Date;
  deletedAt: Date | null;
  owner: string;
  popularity: ModelSeed['popularity'];
  isFork: boolean;
  parentModelId?: string;
  parentVersionNumber?: number;
  versionTitles: string[];
  visibility: NonNullable<ModelSeed['visibility']>;
}

function resolveAsset(model: ModelSeed, version: VersionSeed, versionNumber: number): NlogoxAsset {
  const file: ModelFileSeed = version.file;
  if (isRealFile(file)) return loadNlogox(file.file, file.preview);
  return fakeNlogox(`${model.key}-v${versionNumber}`, version.title, file.preview);
}

function ownerKey(model: ModelSeed): string {
  return (model.authors.find((a) => a.role === 'owner') ?? model.authors[0]!).user;
}

export async function loadModels(
  models: ModelSeed[],
  users: IdMap,
  tags: IdMap,
  uploader: AssetUploader,
): Promise<LoadedModel[]> {
  const modelIds: IdMap = new Map(models.map((m) => [m.key, seedId('model', m.key)]));
  const loaded: LoadedModel[] = [];

  for (const m of models) {
    const id = modelIds.get(m.key)!;
    const createdAt = daysAgo(m.createdDaysAgo ?? 365);
    const deletedAt = m.deleted ? daysAgo(Math.max((m.createdDaysAgo ?? 365) - 1, 0)) : null;
    const parentModelId = m.parent ? mustGet(modelIds, m.parent, 'parent model') : null;
    const parentVersionNumber = m.parent ? (m.parentVersionNumber ?? 1) : null;

    await prisma.model.upsert({
      where: { id },
      update: {},
      create: {
        id,
        legacyId: m.legacyId ?? null,
        visibility: m.visibility ?? 'public',
        isEndorsed: m.isEndorsed ?? false,
        isLibraryModel: m.isLibraryModel ?? false,
        parentModelId,
        parentVersionNumber,
        viewCount: m.popularity?.views ?? 0,
        runCount: m.popularity?.runs ?? 0,
        downloadCount: m.popularity?.downloads ?? 0,
        shareCount: m.popularity?.shares ?? 0,
        createdAt,
        deletedAt,
      },
    });

    let versionNumber = 0;
    for (const v of m.versions) {
      versionNumber += 1;
      const asset = resolveAsset(m, v, versionNumber);
      await uploader.putNlogox(asset);

      const versionCreatedAt = daysAgo(v.createdDaysAgo ?? m.createdDaysAgo ?? 365);

      await prisma.modelVersion.upsert({
        where: { modelId_versionNumber: { modelId: id, versionNumber } },
        update: {},
        create: {
          modelId: id,
          versionNumber,
          title: v.title,
          description: v.description ?? null,
          netlogoFileKey: asset.key,
          previewImageFileKey: asset.preview?.key ?? null,
          netlogoVersion: v.netlogoVersion ?? null,
          infoTab: v.infoTab ?? asset.infoTab ?? null,
          createdAt: versionCreatedAt,
          finalizedAt: versionCreatedAt,
        },
      });

      for (const tagName of v.tags ?? []) {
        const tagId = mustGet(tags, tagName, 'tag');
        await prisma.modelVersionTag.upsert({
          where: { modelId_versionNumber_tagId: { modelId: id, versionNumber, tagId } },
          update: {},
          create: { modelId: id, versionNumber, tagId },
        });
      }

      for (const sf of v.supplementaryFiles ?? []) {
        const fileAsset = textAsset(sf.filename, sf.content, `uploads/models/${m.key}`);
        await uploader.putSupplementary(fileAsset);
        const fileId = seedId('mvfile', m.key, versionNumber, sf.filename);
        await prisma.modelAdditionalFile.upsert({
          where: { id: fileId },
          update: {},
          create: {
            id: fileId,
            modelId: id,
            taggedVersionNumber: versionNumber,
            fileKey: fileAsset.key,
            kind: 'model',
          },
        });
      }
    }

    await prisma.model.update({ where: { id }, data: { latestVersionNumber: versionNumber } });

    for (const af of m.additionalFiles ?? []) {
      const fileAsset = textAsset(af.filename, af.content, `uploads/models/${m.key}/additional`);
      await uploader.putSupplementary(fileAsset);
      const fileId = seedId('addfile', m.key, af.filename);
      await prisma.modelAdditionalFile.upsert({
        where: { id: fileId },
        update: {},
        create: {
          id: fileId,
          modelId: id,
          taggedVersionNumber: af.taggedVersionNumber,
          fileKey: fileAsset.key,
        },
      });
    }

    for (const a of m.authors) {
      const userId = mustGet(users, a.user, 'author');
      await prisma.modelAuthor.upsert({
        where: { modelId_userId: { modelId: id, userId } },
        update: {},
        create: { modelId: id, userId, role: a.role ?? 'contributor' },
      });
    }

    for (const p of m.permissions ?? []) {
      const granteeUserId = p.grantee ? mustGet(users, p.grantee, 'permission grantee') : null;
      const permissionLevel = p.level ?? 'read';
      // The (modelId, granteeUserId) unique can't be expressed in Prisma's
      // compound-unique `where` when granteeUserId is null, so reconcile by hand
      // - idempotent regardless of the existing row's id.
      const existing = await prisma.modelPermission.findFirst({
        where: { modelId: id, granteeUserId },
        select: { id: true },
      });
      if (existing) {
        await prisma.modelPermission.update({
          where: { id: existing.id },
          data: { permissionLevel },
        });
      } else {
        await prisma.modelPermission.create({
          data: { id: seedId('perm', m.key, p.grantee ?? 'public'), modelId: id, granteeUserId, permissionLevel },
        });
      }
    }

    loaded.push({
      key: m.key,
      id,
      latestVersionNumber: versionNumber,
      createdAt,
      deletedAt,
      owner: ownerKey(m),
      popularity: m.popularity,
      isFork: Boolean(m.parent),
      parentModelId: parentModelId ?? undefined,
      parentVersionNumber: parentVersionNumber ?? undefined,
      versionTitles: m.versions.map((v) => v.title),
      visibility: m.visibility ?? 'public',
    });
  }

  return loaded;
}

export async function loadEngagement(
  models: LoadedModel[],
  users: IdMap,
): Promise<{ likes: number; interactions: number; events: number }> {
  const userIds = [...users.values()];

  const likeRows: Array<{ modelId: string; userId: string; createdAt: Date }> = [];
  const interactionRows: Array<Record<string, unknown>> = [];

  for (const m of models) {
    if (!m.popularity) continue;
    const spanMs = Math.max(NOW - m.createdAt.getTime(), DAY);

    const likeRng = seededRandom(`likes:${m.key}`);
    for (const userKey of m.popularity.likedBy ?? []) {
      likeRows.push({
        modelId: m.id,
        userId: mustGet(users, userKey, 'like author'),
        createdAt: new Date(m.createdAt.getTime() + Math.floor(likeRng() * spanMs)),
      });
    }

    const rng = seededRandom(`interactions:${m.key}`);
    const kinds = [
      ['view', m.popularity.views],
      ['run', m.popularity.runs],
      ['download', m.popularity.downloads],
      ['share', m.popularity.shares],
    ] as const;

    for (const [kind, count] of kinds) {
      for (let i = 0; i < count; i++) {
        const attributed = rng() < 0.35 && userIds.length > 0;
        const userId = attributed ? pick(rng, userIds) : null;
        interactionRows.push({
          id: seedId('interaction', m.key, kind, i),
          modelId: m.id,
          versionNumber: m.latestVersionNumber,
          kind,
          userId,
          sessionId: null,
          ipHash: userId
            ? null
            : createHash('sha256').update(`${m.key}:${kind}:${i}`).digest('hex').slice(0, 32),
          userAgent: pick(rng, UA_POOL),
          referer: pick(rng, REFERER_POOL),
          geo: pick(rng, GEO_POOL),
          createdAt: new Date(m.createdAt.getTime() + Math.floor(rng() * spanMs)),
        });
      }
    }
  }

  if (likeRows.length) {
    await prisma.modelLike.createMany({ data: likeRows, skipDuplicates: true });
  }

  for (let i = 0; i < interactionRows.length; i += 1000) {
    const chunk = interactionRows.slice(i, i + 1000);
    await prisma.modelInteraction.createMany({ data: chunk as never, skipDuplicates: true });
  }

  const events = buildEvents(models, users);
  if (events.length) {
    await prisma.event.createMany({ data: events as never, skipDuplicates: true });
  }

  return { likes: likeRows.length, interactions: interactionRows.length, events: events.length };
}

function buildEvents(models: LoadedModel[], users: IdMap) {
  const events: Array<Record<string, unknown>> = [];

  for (const m of models) {
    const actorId = mustGet(users, m.owner, 'event actor');

    events.push({
      id: seedId('event', 'model.created', m.id),
      type: 'model.created',
      actorId,
      resourceType: 'model',
      resourceId: m.id,
      payload: { title: m.versionTitles[0] ?? m.key, visibility: m.visibility },
      createdAt: m.createdAt,
      processedAt: m.createdAt,
    });

    if (m.isFork && m.parentModelId) {
      events.push({
        id: seedId('event', 'model.forked', m.id),
        type: 'model.forked',
        actorId,
        resourceType: 'model',
        resourceId: m.id,
        payload: { parentModelId: m.parentModelId, parentVersionNumber: m.parentVersionNumber },
        createdAt: m.createdAt,
        processedAt: m.createdAt,
      });
    }

    for (let n = 1; n <= m.latestVersionNumber; n++) {
      events.push({
        id: seedId('event', 'model_version.created', m.id, n),
        type: 'model_version.created',
        actorId,
        resourceType: 'model_version',
        resourceId: `${m.id}:${n}`,
        payload: { modelId: m.id, versionNumber: n },
        createdAt: m.createdAt,
        processedAt: m.createdAt,
      });
    }

    if (m.deletedAt) {
      events.push({
        id: seedId('event', 'model.deleted', m.id),
        type: 'model.deleted',
        actorId,
        resourceType: 'model',
        resourceId: m.id,
        payload: { title: m.versionTitles[0] ?? m.key },
        createdAt: m.deletedAt,
      });
    }
  }

  return events;
}

export async function loadDrafts(
  drafts: DraftSeed[],
  users: IdMap,
  modelIds: IdMap,
  uploader: AssetUploader,
): Promise<number> {
  for (const d of drafts) {
    const userId = mustGet(users, d.user, 'draft user');
    const modelId = d.basedOnModel ? mustGet(modelIds, d.basedOnModel, 'draft model') : null;
    const createdAt = daysAgo(d.createdDaysAgo ?? 7);

    const data: Record<string, unknown> = {};
    if (d.title) data['title'] = d.title;
    if (d.description) data['description'] = d.description;
    if (d.visibility) data['visibility'] = d.visibility;
    if (d.tags) data['tags'] = d.tags;

    if (d.primaryFile) {
      const asset = isRealFile(d.primaryFile)
        ? loadNlogox(d.primaryFile.file, d.primaryFile.preview)
        : fakeNlogox(`draft-${d.key}`, d.title ?? 'Untitled Draft', d.primaryFile.preview);
      await uploader.putNlogox(asset);
      data['primaryFile'] = {
        s3Key: asset.key,
        filename: asset.filename,
        sizeBytes: Number(asset.sizeBytes),
        mimeType: asset.contentType,
      };
      if (asset.preview) {
        data['previewImage'] = {
          s3Key: asset.preview.key,
          filename: asset.preview.filename,
          sizeBytes: asset.preview.blob.byteLength,
          mimeType: asset.preview.contentType,
        };
      }
    }

    const id = seedId('draft', d.key);
    await prisma.modelDraft.upsert({
      where: { id },
      update: {},
      create: { id, userId, modelId, schemaVersion: 1, data: data as never, createdAt },
    });
  }

  return drafts.length;
}
