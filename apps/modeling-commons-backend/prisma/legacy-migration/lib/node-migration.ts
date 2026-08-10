import type { Prisma } from '../../../generated/prisma/client.js';
import { buildAttachmentFileKey, buildPreviewFileKey, buildVersionFileKey } from './file-keys.ts';
import type { LegacyAttachment, LegacyNode, LegacyTagging, LegacyVersion } from './legacy.ts';
import { getNlogoFileExtension, parseNetlogoContents } from './nlogo.ts';

export type ModelVisibility = 'public' | 'private';

export type ModelWriter = {
  model: {
    create(args: { data: Prisma.ModelUncheckedCreateInput }): Promise<unknown>;
    update(args: {
      where: { id: string };
      data: { latestVersionNumber: number };
    }): Promise<unknown>;
  };
  modelVersion: {
    create(args: { data: Prisma.ModelVersionUncheckedCreateInput }): Promise<unknown>;
    update(args: {
      where: { modelId_versionNumber: { modelId: string; versionNumber: number } };
      data: { previewImageFileKey: string };
    }): Promise<unknown>;
  };
  modelAuthor: { create(args: { data: Prisma.ModelAuthorUncheckedCreateInput }): Promise<unknown> };
  modelAdditionalFile: {
    create(args: { data: Prisma.ModelAdditionalFileUncheckedCreateInput }): Promise<unknown>;
  };
  modelVersionTag: {
    create(args: { data: Prisma.ModelVersionTagUncheckedCreateInput }): Promise<unknown>;
  };
};

export type NodeTree = {
  node: LegacyNode;
  /** Ordered created_at ASC NULLS LAST, id ASC — this order defines versionNumber. */
  versions: LegacyVersion[];
  /** Ordered id ASC — this order decides which preview wins. */
  attachments: LegacyAttachment[];
  taggings: LegacyTagging[];
};

export type NodeMigrationDeps = {
  writeFile: (relKey: string, contents: Buffer) => Promise<void>;
  newUuid: () => string;
  now: () => Date;
  userIdByLegacyId: ReadonlyMap<number, string>;
  tagIdByLegacyId: ReadonlyMap<number, string>;
};

export type NodeMigrationResult = {
  latestVersionNumber: number;
  versions: number;
  owners: number;
  contributors: number;
  attachments: number;
  previewsAttached: number;
  taggings: number;
  skippedOrphanTaggings: number;
};

const VISIBILITY_BY_LEGACY_ID: Record<number, ModelVisibility> = {
  1: 'public',
  2: 'private',
  3: 'private',
};

export function mapVisibility(visibilityId: number): ModelVisibility {
  return VISIBILITY_BY_LEGACY_ID[visibilityId] ?? 'public';
}

export function buildVersionFilename(nodeName: string, contents: string): string {
  return `${nodeName}.${getNlogoFileExtension(contents)}`;
}

export function buildAttachmentMetadata(
  attachment: LegacyAttachment,
  userIdByLegacyId: ReadonlyMap<number, string>,
  now: Date,
): Buffer {
  return Buffer.from(
    JSON.stringify({
      contentType: attachment.content_type,
      originalFilename: attachment.filename,
      userId: attachment.person_id ? (userIdByLegacyId.get(attachment.person_id) ?? null) : null,
      createdAt: attachment.created_at?.toISOString() ?? now.toISOString(),
    }),
    'utf8',
  );
}

export async function createModelFromNode(
  tx: ModelWriter,
  modelUuid: string,
  tree: NodeTree,
  deps: NodeMigrationDeps,
): Promise<NodeMigrationResult> {
  const { node, versions, attachments, taggings } = tree;
  const [firstVersion] = versions;
  if (!firstVersion) {
    throw new Error(`Legacy node ${node.id} has no versions and cannot become a Model`);
  }

  const result: NodeMigrationResult = {
    latestVersionNumber: 0,
    versions: 0,
    owners: 0,
    contributors: 0,
    attachments: 0,
    previewsAttached: 0,
    taggings: 0,
    skippedOrphanTaggings: 0,
  };

  await tx.model.create({
    data: {
      id: modelUuid,
      legacyId: node.id,
      visibility: mapVisibility(node.visibility_id),
      isEndorsed: false,
      createdAt: node.created_at ?? deps.now(),
      updatedAt: node.updated_at ?? node.created_at ?? deps.now(),
    },
  });

  let versionNumber = 0;
  for (const v of versions) {
    versionNumber++;
    await writeVersion(tx, modelUuid, node, v, versionNumber, deps);
    result.versions++;
  }
  const latestVersionNumber = versionNumber;
  result.latestVersionNumber = latestVersionNumber;

  await tx.model.update({ where: { id: modelUuid }, data: { latestVersionNumber } });

  const seenAuthors = new Set<string>();
  const ownerUuid = deps.userIdByLegacyId.get(firstVersion.person_id);
  if (ownerUuid) {
    await tx.modelAuthor.create({
      data: {
        modelId: modelUuid,
        userId: ownerUuid,
        role: 'owner',
        createdAt: firstVersion.created_at ?? deps.now(),
      },
    });
    seenAuthors.add(ownerUuid);
    result.owners++;
  }
  for (const v of versions.slice(1)) {
    const uuid = deps.userIdByLegacyId.get(v.person_id);
    if (!uuid || seenAuthors.has(uuid)) continue;
    await tx.modelAuthor.create({
      data: {
        modelId: modelUuid,
        userId: uuid,
        role: 'contributor',
        createdAt: v.created_at ?? deps.now(),
      },
    });
    seenAuthors.add(uuid);
    result.contributors++;
  }

  for (const a of attachments) {
    const fileUuid = deps.newUuid();
    const dateForPath = a.created_at ?? node.created_at ?? deps.now();

    if (a.content_type === 'preview') {
      const relKey = buildPreviewFileKey(modelUuid, dateForPath, fileUuid, a.filename);
      await deps.writeFile(relKey, a.contents);
      await tx.modelVersion.update({
        where: {
          modelId_versionNumber: { modelId: modelUuid, versionNumber: latestVersionNumber },
        },
        data: { previewImageFileKey: relKey },
      });
      result.previewsAttached++;
      continue;
    }

    const relKey = buildAttachmentFileKey(modelUuid, dateForPath, fileUuid, a.filename);
    await deps.writeFile(relKey, a.contents);
    await deps.writeFile(
      `${relKey}.metadata.json`,
      buildAttachmentMetadata(a, deps.userIdByLegacyId, deps.now()),
    );
    await tx.modelAdditionalFile.create({
      data: {
        id: fileUuid,
        modelId: modelUuid,
        taggedVersionNumber: latestVersionNumber,
        fileKey: relKey,
        kind: 'additional',
        createdAt: a.created_at ?? deps.now(),
      },
    });
    result.attachments++;
  }

  const seenTags = new Set<string>();
  for (const tg of taggings) {
    const tagUuid = deps.tagIdByLegacyId.get(tg.tag_id);
    if (!tagUuid) {
      result.skippedOrphanTaggings++;
      continue;
    }
    if (seenTags.has(tagUuid)) continue;
    seenTags.add(tagUuid);

    await tx.modelVersionTag.create({
      data: {
        modelId: modelUuid,
        versionNumber: latestVersionNumber,
        tagId: tagUuid,
        createdAt: tg.created_at ?? deps.now(),
      },
    });
    result.taggings++;
  }

  return result;
}

async function writeVersion(
  tx: ModelWriter,
  modelUuid: string,
  node: LegacyNode,
  v: LegacyVersion,
  versionNumber: number,
  deps: NodeMigrationDeps,
): Promise<void> {
  const dateForPath = v.created_at ?? node.created_at ?? deps.now();
  const format = getNlogoFileExtension(v.contents);
  const relKey = buildVersionFileKey(
    modelUuid,
    dateForPath,
    deps.newUuid(),
    `${node.name}.${format}`,
  );

  await deps.writeFile(relKey, Buffer.from(v.contents, 'utf8'));

  const { netlogoVersion, infoTab } = parseNetlogoContents(v.contents, format);

  await tx.modelVersion.create({
    data: {
      modelId: modelUuid,
      versionNumber,
      title: node.name,
      description: v.description || null,
      netlogoFileKey: relKey,
      netlogoVersion,
      infoTab,
      createdAt: v.created_at ?? deps.now(),
      finalizedAt: v.created_at ?? null,
    },
  });
}
