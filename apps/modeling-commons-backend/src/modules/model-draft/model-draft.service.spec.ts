import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelDraftService from '#src/modules/model-draft/model-draft.service.ts';
import rules from '#src/config/rules.ts';
import modelDraftDomain from '#src/modules/model-draft/domain/model-draft.domain.ts';
import modelDomain from '#src/modules/model/domain/model.domain.ts';
import modelVersionDomain from '#src/modules/model-version/domain/model-version.domain.ts';
import modelVersionTagDomain from '#src/modules/model-version-tag/domain/model-version-tag.domain.ts';
import modelAuthorDomain from '#src/modules/model-author/domain/model-author.domain.ts';
import modelAdditionalFileDomain from '#src/modules/model-additional-file/domain/model-additional-file.domain.ts';
import {
  ModelDraftFileNotFoundError,
  ModelDraftInvalidPayloadError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.mock.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import { mockModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.mock.ts';
import { mockModelVersionTagRepository } from '#src/modules/model-version-tag/database/model-version-tag.repository.mock.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { DraftDataV1 } from '#src/modules/model-draft/schemas/v1.ts';
import type { Model } from '#prisma/index';
import { ID_PATTERN } from '#src/shared/utils/id.ts';

function makeDraft(
  data: DraftDataV1 = {},
  overrides: Partial<ModelDraftEntity> = {},
): ModelDraftEntity {
  return {
    id: 'draft-1',
    userId: 'user-1',
    modelId: null,
    schemaVersion: 1,
    data: data as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validPrimary = {
  s3Key: 'staging/user-1/draft-1/abc-file.nlogo',
  filename: 'file.nlogo',
  sizeBytes: 10,
  mimeType: 'text/plain',
};

function makeStorageMock() {
  return {
    putStaged: vi.fn(),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    copyStagedToPermanent: vi.fn(),
    deleteStagingPrefix: vi.fn().mockResolvedValue(undefined),
  };
}

function buildService(overrides: Record<string, unknown> = {}) {
  const modelDraftRepository = mockModelDraftRepository();
  const transactionManager = mockTransactionManager();
  const modelDraftStorage = makeStorageMock();
  const domain = modelDraftDomain();

  const service = makeModelDraftService({
    transactionManager,
    modelDraftRepository,
    modelDraftDomain: domain,
    modelDraftStorage,
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    ...overrides,
  } as never);

  return { service, modelDraftRepository, modelDraftStorage, transactionManager };
}

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    ...modelDomain().createModel({ title: 'Existing', visibility: 'public' }),
    ...overrides,
  };
}

function buildPublishService(overrides: Record<string, unknown> = {}) {
  const modelRepository = mockModelRepository();
  const modelVersionRepository = mockModelVersionRepository();
  modelVersionRepository.getNextVersionNumber.mockResolvedValue(1);
  modelVersionRepository.findLatestByModel.mockResolvedValue(null);

  const modelDraftStorage = {
    ...makeStorageMock(),
    copyStagedToPermanent: vi.fn().mockResolvedValue('uploads/models/permanent.nlogo'),
  };

  const previewImageService = {
    generatePreviewFromNetlogoFile: vi.fn().mockRejectedValue(new Error('no preview')),
  };

  const built = buildService({
    modelRepository,
    modelVersionRepository,
    modelDraftStorage,
    previewImageService,
    modelDomain: modelDomain(),
    modelVersionDomain: modelVersionDomain(),
    modelVersionTagDomain: modelVersionTagDomain(),
    modelVersionTagRepository: { insertTx: vi.fn() },
    modelAuthorDomain: modelAuthorDomain(),
    modelAuthorRepository: { insertTx: vi.fn() },
    modelAdditionalFileDomain: modelAdditionalFileDomain(),
    modelAdditionalFileRepository: { insertTx: vi.fn() },
    tagService: { upsertByName: vi.fn() },
    tagRepository: { findOneById: vi.fn() },
    fileService: { upload: vi.fn() },
    eventRepository: { insert: vi.fn() },
    ...overrides,
  });

  return { ...built, modelRepository, modelVersionRepository };
}

const publishableDraftData: DraftDataV1 = {
  title: 'My Model',
  visibility: 'private',
  primaryFile: validPrimary,
};

describe('modelDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('patch', () => {
    it('writes title/description/visibility/tags through the repository', async () => {
      const { service, modelDraftRepository } = buildService();
      const draft = makeDraft();

      await service.patch(draft, {
        title: 'New Title',
        description: 'A description',
        visibility: 'private',
        tags: ['x', 'y'],
      });

      expect(modelDraftRepository.updateDataTx).toHaveBeenCalledOnce();
      const [, draftId, schemaVersion, next] = modelDraftRepository.updateDataTx.mock.calls[0]!;
      expect(draftId).toBe(draft.id);
      expect(schemaVersion).toBe(1);
      expect(next).toMatchObject({
        title: 'New Title',
        description: 'A description',
        visibility: 'private',
        tags: ['x', 'y'],
      });
    });

    it('only updates fields that are present in the patch', async () => {
      const { service, modelDraftRepository } = buildService();
      const draft = makeDraft({
        title: 'Existing',
        visibility: 'public',
        primaryFile: validPrimary,
      });

      await service.patch(draft, { description: 'only description' });

      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.title).toBe('Existing');
      expect(next.visibility).toBe('public');
      expect(next.description).toBe('only description');
      expect(next.primaryFile).toEqual(validPrimary);
    });
  });

  describe('removeFile', () => {
    it('removes the primary file and deletes its object from storage', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      const draft = makeDraft({ primaryFile: validPrimary });

      await service.removeFile(draft, 'primary');

      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.primaryFile).toBeUndefined();
      expect(modelDraftStorage.deleteObject).toHaveBeenCalledWith(validPrimary.s3Key);
    });

    it('throws when removing a primary file that does not exist', async () => {
      const { service } = buildService();
      await expect(service.removeFile(makeDraft(), 'primary')).rejects.toThrow(
        ModelDraftFileNotFoundError,
      );
    });

    it('removes a matching attachment by id', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      const att = {
        id: '11111111-1111-1111-1111-111111111111',
        s3Key: 'staging/u/d/x-att.txt',
        filename: 'att.txt',
        sizeBytes: 4,
        mimeType: 'text/plain',
      };
      const other = {
        ...att,
        id: '22222222-2222-2222-2222-222222222222',
        s3Key: 'staging/u/d/y-att.txt',
      };
      const draft = makeDraft({ attachments: [att, other] });

      await service.removeFile(draft, att.id);

      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.attachments).toEqual([other]);
      expect(modelDraftStorage.deleteObject).toHaveBeenCalledWith(att.s3Key);
    });

    it('throws when removing an unknown attachment id', async () => {
      const { service } = buildService();
      const draft = makeDraft({ attachments: [] });
      await expect(service.removeFile(draft, 'missing')).rejects.toThrow(
        ModelDraftFileNotFoundError,
      );
    });
  });

  describe('addFile', () => {
    it('stages a primary file and persists it on the draft', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-new.nlogo');
      const draft = makeDraft();

      const result = await service.addFile(draft, 'primary', {
        buffer: Buffer.from('hello') as Buffer<ArrayBuffer>,
        filename: 'new.nlogo',
        contentType: 'text/plain',
      });

      expect(result.role).toBe('primary');
      expect(result.s3Key).toBe('staging/user-1/draft-1/abc-new.nlogo');
      expect(result.sizeBytes).toBe(5);
      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.primaryFile?.s3Key).toBe('staging/user-1/draft-1/abc-new.nlogo');
    });

    it('rejects a primary file without a valid NetLogo extension', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-model.txt');
      const draft = makeDraft();

      await expect(
        service.addFile(draft, 'primary', {
          buffer: Buffer.from('not a model') as Buffer<ArrayBuffer>,
          filename: 'model.txt',
          contentType: 'text/plain',
        }),
      ).rejects.toThrow(ModelDraftInvalidPayloadError);

      expect(modelDraftRepository.updateDataTx).not.toHaveBeenCalled();
    });

    it('does not stage a primary file that fails validation', async () => {
      const { service, modelDraftStorage } = buildService();
      const draft = makeDraft();

      await expect(
        service.addFile(draft, 'primary', {
          buffer: Buffer.from('not a model') as Buffer<ArrayBuffer>,
          filename: 'model.txt',
          contentType: 'text/plain',
        }),
      ).rejects.toThrow(ModelDraftInvalidPayloadError);

      expect(modelDraftStorage.putStaged).not.toHaveBeenCalled();
    });

    it.each(['model.nlogo', 'model.nlogox', 'model.nlogo3d', 'model.nlogox3d'])(
      'accepts a primary file named %s',
      async (filename) => {
        const { service, modelDraftRepository, modelDraftStorage } = buildService();
        modelDraftStorage.putStaged.mockResolvedValue(`staging/user-1/draft-1/abc-${filename}`);
        const draft = makeDraft();

        const result = await service.addFile(draft, 'primary', {
          buffer: Buffer.from('; a model') as Buffer<ArrayBuffer>,
          filename,
          contentType: 'text/plain',
        });

        expect(result.role).toBe('primary');
        const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
        expect(next.primaryFile?.filename).toBe(filename);
      },
    );

    it('replaces an existing primary file and deletes the old object', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/new.nlogo');
      const draft = makeDraft({ primaryFile: validPrimary });

      await service.addFile(draft, 'primary', {
        buffer: Buffer.from('x') as Buffer<ArrayBuffer>,
        filename: 'new.nlogo',
        contentType: 'text/plain',
      });

      expect(modelDraftStorage.deleteObject).toHaveBeenCalledWith(validPrimary.s3Key);
    });

    it('appends an attachment with a generated id', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/att.csv');
      const draft = makeDraft();

      const result = await service.addFile(draft, 'attachment', {
        buffer: Buffer.from('abc') as Buffer<ArrayBuffer>,
        filename: 'att.csv',
        contentType: 'text/csv',
      });

      expect(result.role).toBe('attachment');
      expect(result.id).toMatch(new RegExp(ID_PATTERN));
      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.attachments).toHaveLength(1);
      expect(next.attachments![0]!.s3Key).toBe('staging/user-1/draft-1/att.csv');
    });

    it('stages a preview image as a public object and persists it', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue(
        'files/public/staging/user-1/draft-1/abc-preview.png',
      );
      const draft = makeDraft();

      const result = await service.addFile(draft, 'preview', {
        buffer: Buffer.from('img') as Buffer<ArrayBuffer>,
        filename: 'preview.png',
        contentType: 'image/png',
      });

      expect(result.role).toBe('preview');
      expect(modelDraftStorage.putStaged).toHaveBeenCalledWith(
        expect.objectContaining({ public: true }),
      );
      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.previewImage?.s3Key).toBe('files/public/staging/user-1/draft-1/abc-preview.png');
    });

    it('stages non-preview files as private objects', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-new.nlogo');

      await service.addFile(makeDraft(), 'primary', {
        buffer: Buffer.from('x') as Buffer<ArrayBuffer>,
        filename: 'new.nlogo',
        contentType: 'text/plain',
      });

      expect(modelDraftStorage.putStaged).toHaveBeenCalledWith(
        expect.objectContaining({ public: false }),
      );
    });

    it("tags a 'model-file' attachment with kind 'model'", async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/extra.nlogo');
      const draft = makeDraft();

      await service.addFile(draft, 'model-file', {
        buffer: Buffer.from('abc') as Buffer<ArrayBuffer>,
        filename: 'extra.nlogo',
        contentType: 'text/plain',
      });

      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.attachments).toHaveLength(1);
      expect(next.attachments!.at(-1)!.kind).toBe('model');
    });

    it("tags an 'attachment' upload with kind 'additional'", async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/att.csv');
      const draft = makeDraft();

      await service.addFile(draft, 'attachment', {
        buffer: Buffer.from('abc') as Buffer<ArrayBuffer>,
        filename: 'att.csv',
        contentType: 'text/csv',
      });

      const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
      expect(next.attachments).toHaveLength(1);
      expect(next.attachments!.at(-1)!.kind).toBe('additional');
    });
  });

  describe('generatePreviewImage', () => {
    function buildWithPreview() {
      const previewImageService = {
        generatePreviewFromNetlogoFile: vi
          .fn()
          .mockResolvedValue({
            buffer: new Uint8Array([1, 2, 3]).buffer,
            contentType: 'image/png',
          }),
      };
      return { previewImageService, ...buildService({ previewImageService }) };
    }

    it('stages the generated preview as a public object', async () => {
      const { service, modelDraftStorage } = buildWithPreview();
      modelDraftStorage.putStaged.mockResolvedValue(
        'files/public/staging/user-1/draft-1/uuid-preview.png',
      );
      const draft = makeDraft({ primaryFile: validPrimary });

      const result = await service.generatePreviewImage(draft);

      expect(result.s3Key).toBe('files/public/staging/user-1/draft-1/uuid-preview.png');
      expect(modelDraftStorage.putStaged).toHaveBeenCalledWith(
        expect.objectContaining({
          public: true,
          filename: 'preview.png',
          contentType: 'image/png',
        }),
      );
    });

    it('throws when the draft has no primary file', async () => {
      const { service } = buildWithPreview();
      await expect(service.generatePreviewImage(makeDraft({}))).rejects.toThrow(
        ModelDraftFileNotFoundError,
      );
    });
  });

  describe('abandon', () => {
    it('hard-deletes the draft and clears its staging prefix', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      const draft = makeDraft();

      await service.abandon(draft);

      expect(modelDraftRepository.hardDeleteTx).toHaveBeenCalledWith(expect.anything(), draft.id);
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith(draft.userId, draft.id);
    });

    it('swallows storage cleanup failures so the delete still succeeds', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.deleteStagingPrefix.mockRejectedValue(new Error('s3 down'));

      await expect(service.abandon(makeDraft())).resolves.toBeUndefined();
    });
  });

  describe('publish', () => {
    it('syncs the model visibility to the draft visibility on a new model', async () => {
      const { service, modelRepository } = buildPublishService();
      const draft = makeDraft(publishableDraftData);

      await service.publish(draft);

      expect(modelRepository.updateFields).toHaveBeenCalledOnce();
      const [, modelId, fields] = modelRepository.updateFields.mock.calls[0]!;
      expect(typeof modelId).toBe('string');
      expect(fields).toEqual({ visibility: 'private' });
    });

    it('updates an existing model visibility when the draft changes it', async () => {
      const existingModel = makeModel({ id: 'model-1', visibility: 'public' });
      const { service, modelRepository } = buildPublishService();
      modelRepository.findOneById.mockResolvedValue(existingModel);

      const draft = makeDraft(
        { ...publishableDraftData, visibility: 'private' },
        { modelId: 'model-1' },
      );

      await service.publish(draft);

      expect(modelRepository.insertTx).not.toHaveBeenCalled();
      expect(modelRepository.updateFields).toHaveBeenCalledWith(expect.anything(), 'model-1', {
        visibility: 'private',
      });
    });

    it('keeps the visibility update inside the same transaction as the version write', async () => {
      const { service, modelRepository, modelVersionRepository } = buildPublishService();
      const draft = makeDraft(publishableDraftData);

      await service.publish(draft);

      const updateCtx = modelRepository.updateFields.mock.calls[0]![0];
      const versionCtx = modelVersionRepository.insertTx.mock.calls[0]![0];
      expect(updateCtx).toBe(versionCtx);
    });

    function seededDraftData(
      overrides: Partial<DraftDataV1> = {},
      seededOverrides: Partial<NonNullable<DraftDataV1['seededFrom']>> = {},
    ): DraftDataV1 {
      return {
        title: 'Edited title',
        description: 'Edited description',
        visibility: 'private',
        primaryFile: validPrimary,
        seededFrom: {
          versionNumber: 1,
          primaryFileS3Key: validPrimary.s3Key,
          modelFileS3Keys: [],
          additionalFileS3Keys: [],
          ...seededOverrides,
        },
        ...overrides,
      };
    }

    function buildEditPublishService() {
      const modelVersionTagRepository = mockModelVersionTagRepository();
      modelVersionTagRepository.findByVersion.mockResolvedValue([]);
      const eventRepository = { insert: vi.fn() };
      const built = buildPublishService({ modelVersionTagRepository, eventRepository });
      built.modelRepository.findOneById.mockResolvedValue(
        makeModel({ id: 'model-1', visibility: 'public', deletedAt: null }),
      );
      return { ...built, modelVersionTagRepository, eventRepository };
    }

    it('patches the current version for a metadata-only edit (no new version)', async () => {
      const {
        service,
        modelRepository,
        modelVersionRepository,
        eventRepository,
        modelDraftRepository,
      } = buildEditPublishService();
      modelVersionRepository.findLatestByModel.mockResolvedValue({
        modelId: 'model-1',
        versionNumber: 1,
        title: 'Old',
        description: null,
        previewImageFileKey: null,
        netlogoFileKey: 'uploads/models/old.nlogo',
        netlogoVersion: null,
        infoTab: null,
        createdAt: new Date(),
        finalizedAt: null,
      });

      const draft = makeDraft(seededDraftData(), { modelId: 'model-1' });

      const result = await service.publish(draft);

      expect(result).toEqual({
        modelId: 'model-1',
        versionNumber: 1,
        createdNewVersion: false,
      });
      expect(modelVersionRepository.updateFields).toHaveBeenCalledOnce();
      expect(modelVersionRepository.getNextVersionNumber).not.toHaveBeenCalled();
      expect(modelVersionRepository.insertTx).not.toHaveBeenCalled();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model.version.updated' }),
      );
      expect(modelRepository.findOneById).toHaveBeenCalledWith('model-1');
      expect(modelDraftRepository.hardDeleteTx).toHaveBeenCalledWith(expect.anything(), draft.id);
    });

    it('bumps the version when the primary file changes', async () => {
      const { service, modelVersionRepository, eventRepository } = buildEditPublishService();
      modelVersionRepository.getNextVersionNumber.mockResolvedValue(2);
      modelVersionRepository.findLatestByModel.mockResolvedValue({
        modelId: 'model-1',
        versionNumber: 1,
        finalizedAt: null,
      } as never);

      const draft = makeDraft(
        seededDraftData({
          primaryFile: { ...validPrimary, s3Key: 'staging/user-1/draft-1/new-primary.nlogo' },
        }),
        { modelId: 'model-1' },
      );

      const result = await service.publish(draft);

      expect(result.createdNewVersion).toBe(true);
      expect(result.versionNumber).toBe(2);
      expect(modelVersionRepository.finalize).toHaveBeenCalledOnce();
      expect(modelVersionRepository.insertTx).toHaveBeenCalledOnce();
      expect(eventRepository.insert).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'model.version.created' }),
      );
    });

    it('bumps the version when a model-file is added', async () => {
      const { service, modelVersionRepository } = buildEditPublishService();
      modelVersionRepository.getNextVersionNumber.mockResolvedValue(2);
      modelVersionRepository.findLatestByModel.mockResolvedValue({
        modelId: 'model-1',
        versionNumber: 1,
        finalizedAt: null,
      } as never);

      const draft = makeDraft(
        seededDraftData({
          attachments: [
            {
              id: '33333333-3333-3333-3333-333333333333',
              s3Key: 'staging/user-1/draft-1/new-model.nlogo',
              filename: 'new-model.nlogo',
              sizeBytes: 5,
              mimeType: 'text/plain',
              kind: 'model',
            },
          ],
        }),
        { modelId: 'model-1' },
      );

      const result = await service.publish(draft);

      expect(result.createdNewVersion).toBe(true);
      expect(modelVersionRepository.insertTx).toHaveBeenCalledOnce();
    });

    it('falls back to a new version when the draft has no seededFrom baseline', async () => {
      const { service, modelVersionRepository } = buildEditPublishService();

      const draft = makeDraft(
        { title: 'Edited', visibility: 'private', primaryFile: validPrimary },
        { modelId: 'model-1' },
      );

      const result = await service.publish(draft);

      expect(result.createdNewVersion).toBe(true);
      expect(modelVersionRepository.insertTx).toHaveBeenCalledOnce();
    });
  });

  describe('create (seedDraftDataFromModel)', () => {
    function buildSeedService(
      additionalFiles: Array<{ fileKey: string; kind: 'model' | 'additional' }>,
      versionOverrides: Record<string, unknown> = {},
    ) {
      const modelRepository = mockModelRepository();
      modelRepository.findOneById.mockResolvedValue(
        makeModel({ id: 'model-1', visibility: 'public', latestVersionNumber: 1, deletedAt: null }),
      );

      const modelVersionRepository = mockModelVersionRepository();
      modelVersionRepository.findByModelAndVersion.mockResolvedValue({
        modelId: 'model-1',
        versionNumber: 1,
        title: 'Seeded title',
        description: 'Seeded description',
        netlogoFileKey: 'uploads/models/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-primary.nlogo',
        previewImageFileKey: null,
        finalizedAt: null,
        ...versionOverrides,
      } as never);

      const modelVersionTagRepository = mockModelVersionTagRepository();
      modelVersionTagRepository.findByVersion.mockResolvedValue([]);

      const modelAdditionalFileRepository = {
        findByModel: vi.fn().mockResolvedValue(
          additionalFiles.map((f, i) => ({
            id: `file-${i}`,
            modelId: 'model-1',
            taggedVersionNumber: 1,
            fileKey: f.fileKey,
            kind: f.kind,
          })),
        ),
        insertTx: vi.fn(),
      };

      const storage = {
        send: vi.fn().mockResolvedValue({ ContentLength: 7, ContentType: 'text/plain' }),
      };
      const bucket = { Name: 'test-bucket' };

      const db = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({
              id: 'user-1',
              systemRole: 'user',
              banned: false,
              deletedAt: null,
            }),
        },
        model: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'model-1',
            visibility: 'public',
            deletedAt: null,
            authors: [{ role: 'owner' }],
            permissions: [],
          }),
        },
      };

      const built = buildService({
        modelRepository,
        modelVersionRepository,
        modelVersionTagRepository,
        modelAdditionalFileRepository,
        modelDomain: modelDomain(),
        tagRepository: { findOneById: vi.fn() },
        storage,
        bucket,
        db,
      });

      return { ...built, modelAdditionalFileRepository };
    }

    it('copies only kind:model files into the draft and leaves additionalFileS3Keys empty', async () => {
      const { service, modelDraftRepository, modelAdditionalFileRepository } = buildSeedService([
        {
          fileKey:
            'uploads/models/additional-files/11111111-1111-1111-1111-111111111111-extra.nlogo',
          kind: 'model',
        },
        {
          fileKey: 'uploads/models/additional-files/22222222-2222-2222-2222-222222222222-data.csv',
          kind: 'additional',
        },
      ]);

      await service.create('user-1', { modelId: 'model-1' });

      expect(modelAdditionalFileRepository.findByModel).toHaveBeenCalledWith('model-1', 1);

      const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
      const data = entity.data;

      expect(data.attachments).toHaveLength(1);
      expect(data.attachments![0]!.kind).toBe('model');
      expect(data.attachments![0]!.filename).toBe('extra.nlogo');

      expect(data.seededFrom!.additionalFileS3Keys).toEqual([]);
      expect(data.seededFrom!.modelFileS3Keys).toEqual([data.attachments![0]!.s3Key]);
      expect(data.title).toBe('Seeded title');
    });

    it('seeds an empty attachments set when the version has only additional files', async () => {
      const { service, modelDraftRepository } = buildSeedService([
        {
          fileKey: 'uploads/models/additional-files/33333333-3333-3333-3333-333333333333-data.csv',
          kind: 'additional',
        },
      ]);

      await service.create('user-1', { modelId: 'model-1' });

      const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
      const data = entity.data;

      expect(data.attachments).toBeUndefined();
      expect(data.seededFrom!.additionalFileS3Keys).toEqual([]);
      expect(data.seededFrom!.modelFileS3Keys).toEqual([]);
    });

    describe('filenameFromKey shapes', () => {
      it('strips a legacy UUID-dash prefix from a single-segment key', async () => {
        const { service, modelDraftRepository } = buildSeedService([], {
          netlogoFileKey: 'uploads/models/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-primary.nlogo',
        });

        await service.create('user-1', { modelId: 'model-1' });

        const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
        expect(entity.data.primaryFile!.filename).toBe('primary.nlogo');
      });

      it('strips a nanoid-dash prefix from a staging-shaped key', async () => {
        const { service, modelDraftRepository } = buildSeedService([], {
          netlogoFileKey: 'staging/user-1/draft-0/AbCdEfGhIj-wolf-sheep.nlogox',
        });

        await service.create('user-1', { modelId: 'model-1' });

        const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
        expect(entity.data.primaryFile!.filename).toBe('wolf-sheep.nlogox');
      });

      it('leaves a createStorageKey-style key untouched since the filename is its own segment', async () => {
        const { service, modelDraftRepository } = buildSeedService([], {
          netlogoFileKey: 'uploads/models/2026/04/17/AbCdEfGhIj/my_model.png',
        });

        await service.create('user-1', { modelId: 'model-1' });

        const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
        expect(entity.data.primaryFile!.filename).toBe('my_model.png');
      });

      it('does not truncate a long filename that has no dash-joined id prefix', async () => {
        const longFilename =
          'a-very-long-model-filename-that-exceeds-thirty-seven-characters.nlogox';
        const { service, modelDraftRepository } = buildSeedService([], {
          netlogoFileKey: `uploads/models/2026/04/17/AbCdEfGhIj/${longFilename}`,
        });

        await service.create('user-1', { modelId: 'model-1' });

        const entity = modelDraftRepository.insertTx.mock.calls[0]![1] as { data: DraftDataV1 };
        expect(entity.data.primaryFile!.filename).toBe(longFilename);
      });
    });
  });

  describe('purgeStale', () => {
    it('returns the number of deleted drafts and clears storage for each', async () => {
      const { service, modelDraftRepository, modelDraftStorage } = buildService();
      modelDraftRepository.deleteStaleBefore.mockResolvedValue([
        makeDraft({}, { id: 'd1', userId: 'u1' }),
        makeDraft({}, { id: 'd2', userId: 'u2' }),
      ]);

      const count = await service.purgeStale(new Date('2020-01-01'));

      expect(count).toBe(2);
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledTimes(2);
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith('u1', 'd1');
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith('u2', 'd2');
    });
  });

  describe('purgeForModelTx', () => {
    it('hard-deletes every draft for the model within the transaction', async () => {
      const { service, modelDraftRepository, transactionManager } = buildService();
      const drafts = [makeDraft({}, { id: 'd1', modelId: 'm1' })];
      modelDraftRepository.deleteByModelIdTx.mockResolvedValue(drafts);

      const result = await transactionManager.run((ctx) => service.purgeForModelTx(ctx, 'm1'));

      expect(modelDraftRepository.deleteByModelIdTx).toHaveBeenCalledWith(expect.anything(), 'm1');
      expect(result).toBe(drafts);
    });
  });

  describe('cleanupDraftStaging', () => {
    it('clears the staging prefix for each purged draft', async () => {
      const { service, modelDraftStorage } = buildService();

      await service.cleanupDraftStaging([
        makeDraft({}, { id: 'd1', userId: 'u1' }),
        makeDraft({}, { id: 'd2', userId: 'u2' }),
      ]);

      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith('u1', 'd1');
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith('u2', 'd2');
    });

    it('swallows storage cleanup failures', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.deleteStagingPrefix.mockRejectedValue(new Error('s3 down'));

      await expect(
        service.cleanupDraftStaging([makeDraft({}, { id: 'd1', userId: 'u1' })]),
      ).resolves.toBeUndefined();
    });
  });

  describe('addFile preview rules', () => {
    it.each(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])(
      'accepts a preview image of type %s',
      async (contentType) => {
        const { service, modelDraftRepository, modelDraftStorage } = buildService();
        modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-preview.png');
        const draft = makeDraft();

        const result = await service.addFile(draft, 'preview', {
          buffer: Buffer.from('image bytes') as Buffer<ArrayBuffer>,
          filename: 'preview.png',
          contentType,
        });

        expect(result.role).toBe('preview');
        const next = modelDraftRepository.updateDataTx.mock.calls[0]![3] as DraftDataV1;
        expect(next.previewImage?.mimeType).toBe(contentType);
      },
    );

    it.each([
      ['application/octet-stream', 'an unsniffable or neutralised file'],
      ['application/pdf', 'a document'],
      ['text/html', 'a markup payload'],
      ['image/svg+xml', 'a scriptable image'],
      ['application/xml', 'an xml payload'],
    ])('rejects a preview declared %s (%s)', async (contentType) => {
      const { service, modelDraftStorage, modelDraftRepository } = buildService();
      const draft = makeDraft();

      await expect(
        service.addFile(draft, 'preview', {
          buffer: Buffer.from('payload') as Buffer<ArrayBuffer>,
          filename: 'preview.png',
          contentType,
        }),
      ).rejects.toThrow(ModelDraftInvalidPayloadError);

      expect(modelDraftStorage.putStaged).not.toHaveBeenCalled();
      expect(modelDraftRepository.updateDataTx).not.toHaveBeenCalled();
    });

    it('rejects a preview image over the size cap without staging it', async () => {
      const { service, modelDraftStorage } = buildService();
      const draft = makeDraft();
      const oversized = Buffer.alloc(rules.previewImage.maxFileSize + 1);

      await expect(
        service.addFile(draft, 'preview', {
          buffer: oversized as Buffer<ArrayBuffer>,
          filename: 'preview.png',
          contentType: 'image/png',
        }),
      ).rejects.toThrow(ModelDraftInvalidPayloadError);

      expect(modelDraftStorage.putStaged).not.toHaveBeenCalled();
    });

    it('accepts a preview image exactly at the size cap', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-preview.png');
      const draft = makeDraft();

      const result = await service.addFile(draft, 'preview', {
        buffer: Buffer.alloc(rules.previewImage.maxFileSize) as Buffer<ArrayBuffer>,
        filename: 'preview.png',
        contentType: 'image/png',
      });

      expect(result.role).toBe('preview');
    });

    it('leaves the other roles free of the image ruleset', async () => {
      const { service, modelDraftStorage } = buildService();
      modelDraftStorage.putStaged.mockResolvedValue('staging/user-1/draft-1/abc-data.csv');
      const draft = makeDraft();

      const result = await service.addFile(draft, 'attachment', {
        buffer: Buffer.from('a,b,c') as Buffer<ArrayBuffer>,
        filename: 'data.csv',
        contentType: 'application/octet-stream',
      });

      expect(result.role).toBe('attachment');
    });
  });
});
