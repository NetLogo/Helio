import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '#src/shared/storage/index.ts';
import {
  ModelDraftFileNotFoundError,
  ModelDraftNotFoundError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type {
  CreateDraftRequestDto,
  DraftFileRole,
  DraftFileUploadResponseDto,
  PatchDraftRequestDto,
  PublishDraftResponseDto,
} from '#src/modules/model-draft/dtos/model-draft.dto.ts';
import {
  assertPublishable,
  emptyDraftData,
  LATEST_DRAFT_SCHEMA_VERSION,
  upcast,
  type DraftData,
  type DraftFileV1,
} from '#src/modules/model-draft/schemas/index.ts';
import { sanitizeFilename } from '#src/shared/storage/utils.ts';
import { loadModelAccessContext } from '#src/shared/permissions/model-access.viewer.ts';
import { UserNotFoundError } from '../user/domain/user.errors.ts';
import { ModelNotFoundError } from '../model/domain/model.errors.ts';
import { canWrite } from '#src/shared/permissions/model-access.policy.ts';
import { UnauthorizedException } from '#src/shared/exceptions/exceptions.ts';

function stagingPrefix(userId: string, draftId: string): string {
  return `staging/${userId}/${draftId}/`;
}

function stagingKey(userId: string, draftId: string, filename: string): string {
  return `${stagingPrefix(userId, draftId)}${randomUUID()}-${sanitizeFilename(filename)}`;
}

export default function makeModelDraftService({
  transactionManager,
  modelDraftRepository,
  modelDraftDomain,
  modelRepository,
  modelDomain,
  modelVersionRepository,
  modelVersionDomain,
  modelVersionTagDomain,
  modelVersionTagRepository,
  modelAuthorRepository,
  modelAuthorDomain,
  modelAdditionalFileRepository,
  modelAdditionalFileDomain,
  tagService,
  eventRepository,
  storage,
  bucket,
  db,
}: Dependencies) {
  async function requireWritableModel(userId: string, modelId?: string | null) {
    if (!modelId) return; // No associated model, so no need to check permissions

    const ctx = await loadModelAccessContext(db, userId, modelId);
    if (!ctx.viewer) throw new UserNotFoundError(userId);
    if (!ctx.model) throw new ModelNotFoundError(modelId);
    if (!canWrite(ctx))
      throw new UnauthorizedException('User does not have write access to the associated model');
    return;
  }

  function currentData(draft: ModelDraftEntity): DraftData {
    return upcast(draft.data, draft.schemaVersion);
  }

  async function persistData(draft: ModelDraftEntity, next: DraftData): Promise<void> {
    await transactionManager.run(async (ctx) => {
      await modelDraftRepository.updateDataTx(ctx, draft.id, LATEST_DRAFT_SCHEMA_VERSION, next);
    });
  }

  async function copyStagedToPermanent(params: {
    stagingKey: string;
    modelId: string;
    filename: string;
    contentType: string;
    pathPrefix: string;
  }): Promise<string> {
    const destKey = `${params.pathPrefix}/${params.modelId}/${randomUUID()}-${sanitizeFilename(params.filename)}`;
    await storage.send(
      new CopyObjectCommand({
        Bucket: bucket.Name,
        Key: destKey,
        CopySource: `${bucket.Name}/${params.stagingKey}`,
        ContentType: params.contentType,
        MetadataDirective: 'REPLACE',
        Metadata: {
          filename: sanitizeFilename(params.filename),
          createdat: new Date().toISOString(),
        },
      }),
    );
    return destKey;
  }

  async function deleteStagingPrefix(userId: string, draftId: string): Promise<void> {
    const prefix = stagingPrefix(userId, draftId);
    let continuationToken: string | undefined;
    do {
      const listed = await storage.send(
        new ListObjectsV2Command({
          Bucket: bucket.Name,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (listed.Contents ?? []).map((o) => o.Key).filter((k): k is string => Boolean(k));
      if (keys.length > 0) {
        await storage.send(
          new DeleteObjectsCommand({
            Bucket: bucket.Name,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
          }),
        );
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  return {
    async create(userId: string, input: CreateDraftRequestDto): Promise<{ id: string }> {
      await requireWritableModel(userId, input.modelId);

      const entity = modelDraftDomain.createDraft({
        userId,
        modelId: input.modelId ?? null,
        schemaVersion: LATEST_DRAFT_SCHEMA_VERSION,
        data: emptyDraftData(),
      });

      await transactionManager.run(async (ctx) => {
        await modelDraftRepository.insertTx(ctx, entity);
      });

      return { id: entity.id };
    },

    async patch(draft: ModelDraftEntity, input: PatchDraftRequestDto): Promise<void> {
      const data = currentData(draft);

      const next: DraftData = { ...data };
      if (input.title !== undefined) next.title = input.title;
      if (input.description !== undefined) next.description = input.description;
      if (input.visibility !== undefined) next.visibility = input.visibility;
      if (input.tags !== undefined) next.tags = input.tags;

      await persistData(draft, next);
    },

    async addFile(
      draft: ModelDraftEntity,
      role: DraftFileRole,
      file: { buffer: Buffer<ArrayBuffer>; filename: string; contentType: string },
    ): Promise<DraftFileUploadResponseDto> {
      const key = stagingKey(draft.userId, draft.id, file.filename);

      await storage.send(
        new PutObjectCommand({
          Bucket: bucket.Name,
          Key: key,
          Body: file.buffer,
          ContentType: file.contentType,
          Metadata: {
            filename: sanitizeFilename(file.filename),
            createdat: new Date().toISOString(),
          },
        }),
      );

      const data = currentData(draft);
      const meta = {
        s3Key: key,
        filename: file.filename,
        sizeBytes: file.buffer.length,
        mimeType: file.contentType,
      };

      const next: DraftData = { ...data };
      if (role === 'primary') {
        if (data.primaryFile) {
          await storage
            .send(new DeleteObjectCommand({ Bucket: bucket.Name, Key: data.primaryFile.s3Key }))
            .catch(() => undefined);
        }
        next.primaryFile = meta;
        await persistData(draft, next);
        return { role, ...meta };
      }

      const attachment: DraftFileV1 = { id: randomUUID(), ...meta };
      next.attachments = [...(data.attachments ?? []), attachment];
      await persistData(draft, next);
      return { id: attachment.id, role, ...meta };
    },

    async removeFile(draft: ModelDraftEntity, fileId: string): Promise<void> {
      const data = currentData(draft);

      const next: DraftData = { ...data };
      let s3Key: string | null = null;

      if (fileId === 'primary') {
        if (!data.primaryFile) throw new ModelDraftFileNotFoundError(fileId);
        s3Key = data.primaryFile.s3Key;
        next.primaryFile = undefined;
      } else {
        const attachments = data.attachments ?? [];
        const match = attachments.find((a) => a.id === fileId);
        if (!match) throw new ModelDraftFileNotFoundError(fileId);
        s3Key = match.s3Key;
        next.attachments = attachments.filter((a) => a.id !== fileId);
      }

      await persistData(draft, next);
      if (s3Key) {
        await storage
          .send(new DeleteObjectCommand({ Bucket: bucket.Name, Key: s3Key }))
          .catch(() => undefined);
      }
    },

    async publish(draft: ModelDraftEntity): Promise<PublishDraftResponseDto> {
      const userId = draft.userId;
      const draftId = draft.id;
      const data = assertPublishable(currentData(draft));

      const existingModel = draft.modelId ? await modelRepository.findOneById(draft.modelId) : null;
      if (draft.modelId && !existingModel) throw new ModelDraftNotFoundError(draftId);
      if (existingModel) modelDomain.assertNotDeleted(existingModel);

      const model =
        existingModel ??
        modelDomain.createModel({
          title: data.title,
          visibility: data.visibility,
        });

      const netlogoFileKey = await copyStagedToPermanent({
        stagingKey: data.primaryFile.s3Key,
        modelId: model.id,
        filename: data.primaryFile.filename,
        contentType: data.primaryFile.mimeType,
        pathPrefix: 'uploads/models',
      });

      const attachmentCopies = await Promise.all(
        (data.attachments ?? []).map(async (att) => ({
          ...att,
          copiedKey: await copyStagedToPermanent({
            stagingKey: att.s3Key,
            modelId: model.id,
            filename: att.filename,
            contentType: att.mimeType,
            pathPrefix: 'uploads/models/additional-files',
          }),
        })),
      );

      const tags = await Promise.all(
        (data.tags ?? []).map(async (tagName) => {
          return tagService.upsertByName(tagName);
        }),
      );

      const result = await transactionManager.run(async (ctx) => {
        if (!existingModel) {
          await modelRepository.insertTx(ctx, model);
          await modelAuthorRepository.insertTx(
            ctx,
            modelAuthorDomain.createAuthor(model.id, userId, 'owner'),
          );
        }

        const previousVersion = existingModel
          ? await modelVersionRepository.findLatestByModel(model.id)
          : null;
        if (previousVersion) {
          await modelVersionRepository.finalize(
            ctx,
            previousVersion.modelId,
            previousVersion.versionNumber,
          );
        }

        const versionNumber = await modelVersionRepository.getNextVersionNumber(ctx, model.id);
        const version = modelVersionDomain.createVersion({
          modelId: model.id,
          versionNumber,
          title: data.title,
          description: data.description,
          netlogoFileKey,
        });

        await modelVersionRepository.insertTx(ctx, version);

        await Promise.all(
          tags
            .map((tag) =>
              modelVersionTagDomain.createModelVersionTag({
                modelId: model.id,
                versionNumber,
                tagId: tag.id,
              }),
            )
            .map((entity) => modelVersionTagRepository.insertTx(ctx, entity)),
        );

        await modelRepository.setLatestVersion(ctx, model.id, versionNumber);

        for (const att of attachmentCopies) {
          await modelAdditionalFileRepository.insertTx(
            ctx,
            modelAdditionalFileDomain.createAdditionalFile({
              modelId: model.id,
              taggedVersionNumber: versionNumber,
              fileKey: att.copiedKey,
            }),
          );
        }

        await eventRepository.insert(ctx, {
          type: existingModel ? 'model.version.created' : 'model.created',
          actorId: userId,
          resourceType: 'model',
          resourceId: model.id,
          payload: { draftId, versionId: `${model.id}:${versionNumber}` },
        });

        await modelDraftRepository.hardDeleteTx(ctx, draftId);

        return { modelId: model.id, versionNumber };
      });

      await deleteStagingPrefix(userId, draftId).catch(() => undefined);
      return result;
    },

    async abandon(draft: ModelDraftEntity): Promise<void> {
      await transactionManager.run(async (ctx) => {
        await modelDraftRepository.hardDeleteTx(ctx, draft.id);
      });
      await deleteStagingPrefix(draft.userId, draft.id).catch(() => undefined);
    },

    async purgeStale(cutoff: Date): Promise<number> {
      const deleted = await modelDraftRepository.deleteStaleBefore(cutoff);
      await Promise.allSettled(deleted.map((d) => deleteStagingPrefix(d.userId, d.id)));
      return deleted.length;
    },
  };
}
