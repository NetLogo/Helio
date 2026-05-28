import {
  ModelDraftFileNotFoundError,
  ModelDraftInvalidPayloadError,
  ModelDraftNotFoundError,
  ModelDraftNotPublishableError,
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
  type DraftDataV1,
  type DraftFileV1,
  type DraftPreviewImageV1,
  type DraftPrimaryFileV1,
} from '#src/modules/model-draft/schemas/index.ts';
import { UnauthorizedException } from '#src/shared/exceptions/exceptions.ts';
import { canWrite } from '#src/shared/permissions/model-access.policy.ts';
import { loadModelAccessContext } from '#src/shared/permissions/model-access.viewer.ts';
import { CopyObjectCommand, HeadObjectCommand } from '#src/shared/storage/index.ts';
import { sanitizeFilename } from '#src/shared/storage/utils.ts';
import { randomUUID } from 'node:crypto';
import { ModelNotFoundError } from '../model/domain/model.errors.ts';
import { UserNotFoundError } from '../user/domain/user.errors.ts';

export default function makeModelDraftService({
  transactionManager,
  modelDraftRepository,
  modelDraftDomain,
  modelDraftStorage,
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
  previewImageService,
  fileService,
  tagService,
  tagRepository,
  eventRepository,
  storage,
  bucket,
  db,
  logger,
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

  function stagingKey(userId: string, draftId: string, filename: string): string {
    return `staging/${userId}/${draftId}/${randomUUID()}-${sanitizeFilename(filename)}`;
  }

  function filenameFromKey(key: string): string {
    const last = key.split('/').pop() ?? key;
    // S3 keys we emit are `${uuid}-${sanitizedFilename}`. Slice past the 36-char uuid + '-'.
    return last.length > 37 ? last.slice(37) : last;
  }

  async function resolvePreviewImageFileKey(params: {
    data: { previewImage?: DraftPreviewImageV1 };
    modelId: string;
    netlogoFileKey: string;
    userId: string;
  }): Promise<string | null> {
    if (params.data.previewImage) {
      return await modelDraftStorage.copyStagedToPermanent({
        stagingKey: params.data.previewImage.s3Key,
        modelId: params.modelId,
        filename: params.data.previewImage.filename,
        contentType: params.data.previewImage.mimeType,
        pathPrefix: 'files/public/preview-images',
        acl: 'public-read',
        userId: params.userId,
      });
    }

    try {
      const { buffer, contentType } = await previewImageService.generatePreviewFromNetlogoFile(
        params.netlogoFileKey,
      );
      return await fileService.upload({
        buffer: Buffer.from(new Uint8Array(buffer)),
        filename: 'preview.png',
        contentType,
        access: 'public-read',
        pathPrefix: `preview-images/${params.modelId}`,
        userId: params.userId,
      });
    } catch (error) {
      // A missing thumbnail must not block publish.
      logger.warn(
        { err: error, modelId: params.modelId, netlogoFileKey: params.netlogoFileKey },
        'Failed to auto-generate preview image on publish',
      );
      return null;
    }
  }

  async function copyToStaging(params: {
    sourceKey: string;
    userId: string;
    draftId: string;
    filename: string;
  }): Promise<{ s3Key: string; sizeBytes: number; mimeType: string }> {
    const destKey = stagingKey(params.userId, params.draftId, params.filename);
    await storage.send(
      new CopyObjectCommand({
        Bucket: bucket.Name,
        Key: destKey,
        CopySource: `${bucket.Name}/${params.sourceKey}`,
      }),
    );
    const head = await storage.send(new HeadObjectCommand({ Bucket: bucket.Name, Key: destKey }));
    return {
      s3Key: destKey,
      sizeBytes: head.ContentLength ?? 0,
      mimeType: head.ContentType ?? 'application/octet-stream',
    };
  }

  async function seedDraftDataFromModel(
    userId: string,
    draftId: string,
    modelId: string,
  ): Promise<DraftDataV1> {
    const model = await modelRepository.findOneById(modelId);
    if (!model) throw new ModelNotFoundError(modelId);
    modelDomain.assertNotDeleted(model);

    if (model.latestVersionNumber == null) return emptyDraftData();

    const version = await modelVersionRepository.findByModelAndVersion(
      modelId,
      model.latestVersionNumber,
    );
    if (!version) return emptyDraftData();

    const [versionTags, additionalFiles] = await Promise.all([
      modelVersionTagRepository.findByVersion(modelId, version.versionNumber),
      modelAdditionalFileRepository.findByModel(modelId, version.versionNumber),
    ]);

    const tagEntities = await Promise.all(
      versionTags.map(async (vt) => tagRepository.findOneById(vt.tagId)),
    );
    const tags = tagEntities
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => t.name);

    const primaryFilename = filenameFromKey(version.netlogoFileKey);
    const primaryCopy = await copyToStaging({
      sourceKey: version.netlogoFileKey,
      userId,
      draftId,
      filename: primaryFilename,
    });
    const primaryFile: DraftPrimaryFileV1 = {
      s3Key: primaryCopy.s3Key,
      filename: primaryFilename,
      sizeBytes: primaryCopy.sizeBytes,
      mimeType: primaryCopy.mimeType,
    };

    const attachments: Array<DraftFileV1> = await Promise.all(
      additionalFiles.map(async (att) => {
        const filename = filenameFromKey(att.fileKey);
        const copy = await copyToStaging({
          sourceKey: att.fileKey,
          userId,
          draftId,
          filename,
        });
        return {
          id: randomUUID(),
          s3Key: copy.s3Key,
          filename,
          sizeBytes: copy.sizeBytes,
          mimeType: copy.mimeType,
        };
      }),
    );

    const previewImageCopy = version.previewImageFileKey
      ? await copyToStaging({
          sourceKey: version.previewImageFileKey,
          userId,
          draftId,
          filename: filenameFromKey(version.previewImageFileKey),
        })
      : undefined;

    const previewImage = previewImageCopy
      ? {
          s3Key: previewImageCopy.s3Key,
          filename: filenameFromKey(version.previewImageFileKey ?? 'preview.png'),
          sizeBytes: previewImageCopy.sizeBytes,
          mimeType: previewImageCopy.mimeType,
        }
      : undefined;

    return {
      title: version.title,
      description: version.description ?? undefined,
      visibility: model.visibility,
      tags: tags.length > 0 ? tags : undefined,
      primaryFile,
      attachments: attachments.length > 0 ? attachments : undefined,
      previewImage,
    };
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

      if (input.modelId) {
        entity.data = await seedDraftDataFromModel(userId, entity.id, input.modelId);
      }

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
      const key = await modelDraftStorage.putStaged({
        userId: draft.userId,
        draftId: draft.id,
        buffer: file.buffer,
        filename: file.filename,
        contentType: file.contentType,
      });

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
          await modelDraftStorage.deleteObject(data.primaryFile.s3Key).catch(() => undefined);
        }
        next.primaryFile = meta;
        await persistData(draft, next);
        return { role, ...meta };
      }

      if (role === 'preview') {
        if (data.previewImage) {
          await modelDraftStorage.deleteObject(data.previewImage.s3Key).catch(() => undefined);
        }
        next.previewImage = meta;
        await persistData(draft, next);
        return { role, ...meta };
      }

      const attachment: DraftFileV1 = { id: randomUUID(), ...meta };
      next.attachments = [...(data.attachments ?? []), attachment];
      await persistData(draft, next);
      return { id: attachment.id, role, ...meta };
    },

    async generatePreviewImage(draft: ModelDraftEntity): Promise<DraftPreviewImageV1> {
      const data = currentData(draft);
      if (!data.primaryFile) {
        throw new ModelDraftFileNotFoundError('primary');
      }

      const { buffer } = await previewImageService.generatePreviewFromNetlogoFile(
        data.primaryFile.s3Key,
      );
      const previewBuffer = Buffer.from(new Uint8Array(buffer));

      const key = await modelDraftStorage.putStaged({
        userId: draft.userId,
        draftId: draft.id,
        buffer: previewBuffer,
        filename: 'preview.png',
        contentType: 'image/png',
      });

      if (data.previewImage) {
        await modelDraftStorage.deleteObject(data.previewImage.s3Key).catch(() => undefined);
      }

      const previewImage: DraftPreviewImageV1 = {
        s3Key: key,
        filename: 'preview.png',
        sizeBytes: previewBuffer.length,
        mimeType: 'image/png',
      };

      await persistData(draft, { ...data, previewImage });
      return previewImage;
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
        await modelDraftStorage.deleteObject(s3Key).catch(() => undefined);
      }
    },

    async publish(draft: ModelDraftEntity): Promise<PublishDraftResponseDto> {
      const userId = draft.userId;
      const draftId = draft.id;
      let data;
      try {
        data = assertPublishable(currentData(draft));
      } catch (err) {
        if (err instanceof ModelDraftInvalidPayloadError) {
          throw new ModelDraftNotPublishableError(err.message);
        }
        throw err;
      }

      const existingModel = draft.modelId ? await modelRepository.findOneById(draft.modelId) : null;
      if (draft.modelId && !existingModel) throw new ModelDraftNotFoundError(draftId);
      if (existingModel) modelDomain.assertNotDeleted(existingModel);

      const model =
        existingModel ??
        modelDomain.createModel({
          title: data.title,
          visibility: data.visibility,
        });

      const netlogoFileKey = await modelDraftStorage.copyStagedToPermanent({
        stagingKey: data.primaryFile.s3Key,
        modelId: model.id,
        filename: data.primaryFile.filename,
        contentType: data.primaryFile.mimeType,
        pathPrefix: 'uploads/models',
        userId,
      });

      const attachmentCopies = await Promise.all(
        (data.attachments ?? []).map(async (att) => ({
          ...att,
          copiedKey: await modelDraftStorage.copyStagedToPermanent({
            stagingKey: att.s3Key,
            modelId: model.id,
            filename: att.filename,
            contentType: att.mimeType,
            pathPrefix: 'uploads/models/additional-files',
            userId,
          }),
        })),
      );

      const previewImageFileKey = await resolvePreviewImageFileKey({
        data,
        modelId: model.id,
        netlogoFileKey,
        userId,
      });

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
          ? await modelVersionRepository.findLatestByModel(model.id, ctx)
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
          previewImageFileKey,
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
            .map(async (entity) => modelVersionTagRepository.insertTx(ctx, entity)),
        );

        await modelRepository.setLatestVersion(ctx, model.id, versionNumber);
        await modelRepository.updateFields(ctx, model.id, { visibility: data.visibility });

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

      await modelDraftStorage.deleteStagingPrefix(userId, draftId).catch(() => undefined);
      return result;
    },

    async abandon(draft: ModelDraftEntity): Promise<void> {
      await transactionManager.run(async (ctx) => {
        await modelDraftRepository.hardDeleteTx(ctx, draft.id);
      });
      await modelDraftStorage.deleteStagingPrefix(draft.userId, draft.id).catch(() => undefined);
    },

    async purgeStale(cutoff: Date): Promise<number> {
      const deleted = await modelDraftRepository.deleteStaleBefore(cutoff);
      await Promise.allSettled(
        deleted.map(async (d) => modelDraftStorage.deleteStagingPrefix(d.userId, d.id)),
      );
      return deleted.length;
    },
  };
}
