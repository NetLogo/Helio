import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeModelDraftService from '#src/modules/model-draft/model-draft.service.ts';
import modelDraftDomain from '#src/modules/model-draft/domain/model-draft.domain.ts';
import modelDomain from '#src/modules/model/domain/model.domain.ts';
import modelVersionDomain from '#src/modules/model-version/domain/model-version.domain.ts';
import modelVersionTagDomain from '#src/modules/model-version-tag/domain/model-version-tag.domain.ts';
import modelAuthorDomain from '#src/modules/model-author/domain/model-author.domain.ts';
import modelAdditionalFileDomain from '#src/modules/model-additional-file/domain/model-additional-file.domain.ts';
import { ModelDraftFileNotFoundError } from '#src/modules/model-draft/domain/model-draft.errors.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { mockModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.mock.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import { mockModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.mock.ts';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { DraftDataV1 } from '#src/modules/model-draft/schemas/v1.ts';
import type { Model } from '#prisma/index';

function makeDraft(data: DraftDataV1 = {}, overrides: Partial<ModelDraftEntity> = {}): ModelDraftEntity {
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
  return { ...modelDomain().createModel({ title: 'Existing', visibility: 'public' }), ...overrides };
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
      const [, draftId, schemaVersion, next] =
        modelDraftRepository.updateDataTx.mock.calls[0]!;
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
      const other = { ...att, id: '22222222-2222-2222-2222-222222222222', s3Key: 'staging/u/d/y-att.txt' };
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
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
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
  });

  describe('generatePreviewImage', () => {
    function buildWithPreview() {
      const previewImageService = {
        generatePreviewFromNetlogoFile: vi
          .fn()
          .mockResolvedValue({ buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'image/png' }),
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
        expect.objectContaining({ public: true, filename: 'preview.png', contentType: 'image/png' }),
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

      expect(modelDraftRepository.hardDeleteTx).toHaveBeenCalledWith(
        expect.anything(),
        draft.id,
      );
      expect(modelDraftStorage.deleteStagingPrefix).toHaveBeenCalledWith(
        draft.userId,
        draft.id,
      );
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
      expect(modelRepository.updateFields).toHaveBeenCalledWith(
        expect.anything(),
        'model-1',
        { visibility: 'private' },
      );
    });

    it('keeps the visibility update inside the same transaction as the version write', async () => {
      const { service, modelRepository, modelVersionRepository } = buildPublishService();
      const draft = makeDraft(publishableDraftData);

      await service.publish(draft);

      const updateCtx = modelRepository.updateFields.mock.calls[0]![0];
      const versionCtx = modelVersionRepository.insertTx.mock.calls[0]![0];
      expect(updateCtx).toBe(versionCtx);
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
});
