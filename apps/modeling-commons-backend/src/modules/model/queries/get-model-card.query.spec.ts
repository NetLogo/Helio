import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeGetModelCardQuery from '#src/modules/model/queries/get-model-card.query.ts';
import { ModelNotFoundError } from '#src/modules/model/domain/model.errors.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';
import { mockModelInteractionRepository } from '#src/modules/model-interaction/database/model-interaction.repository.mock.ts';
import { mockModelLikeRepository } from '#src/modules/model-like/database/model-like.repository.mock.ts';

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    visibility: 'public',
    isEndorsed: false,
    parentModelId: null,
    parentVersionNumber: null,
    latestVersionNumber: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    versions: [
      {
        modelId: 'm1',
        versionNumber: 1,
        title: 'v1',
        description: 'desc',
        netlogoFileKey: 'uploads/models/m1/file.nlogo',
        previewImageFileKey: 'preview-images/m1/p.png',
        finalizedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [{ tag: { id: 't1', name: 'sim' } }],
      },
    ],
    authors: [
      {
        modelId: 'm1',
        userId: 'u1',
        role: 'owner',
        createdAt: new Date(),
        user: { id: 'u1', name: 'Alice', image: null, role: 'user' },
      },
    ],
    _count: { versions: 1, childModels: 0, likes: 4 },
    ...overrides,
  };
}

function buildQuery() {
  const modelRepository = mockModelRepository();
  const modelInteractionRepository = mockModelInteractionRepository();
  const modelLikeRepository = mockModelLikeRepository();
  const modelMapper = { toResponse: vi.fn((m: { id: string }) => ({ id: m.id, mapped: true })) };
  const modelVersionMapper = {
    toResponse: vi.fn((v: { versionNumber: number }) => ({ versionNumber: v.versionNumber, isFinalized: false })),
  };
  const modelAuthorMapper = {
    toResponse: vi.fn((a: { userId: string; role: string }) => ({ userId: a.userId, role: a.role })),
  };
  const tagMapper = { toResponse: vi.fn((t: { id: string; name: string }) => t) };
  const fileService = { getUrl: vi.fn(async (k: string) => `https://cdn/${k}`) };

  modelInteractionRepository.countsByKindForModel.mockResolvedValue({
    view: 10,
    run: 1,
    download: 2,
    share: 3,
  });

  const query = makeGetModelCardQuery({
    modelRepository,
    modelMapper,
    modelVersionMapper,
    modelAuthorMapper,
    tagMapper,
    fileService,
    modelInteractionRepository,
    modelLikeRepository,
  } as never);

  return {
    query,
    modelRepository,
    modelInteractionRepository,
    modelLikeRepository,
    fileService,
  };
}

describe('getModelCardQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('execute', () => {
    it('throws ModelNotFoundError when no card is found', async () => {
      const { query, modelRepository } = buildQuery();
      modelRepository.findCard.mockResolvedValue(null);

      await expect(query.execute('missing', null)).rejects.toThrow(ModelNotFoundError);
    });

    it('returns the mapped response shape with stats and counts', async () => {
      const { query, modelRepository } = buildQuery();
      modelRepository.findCard.mockResolvedValue(makeCard());

      const result = await query.execute('m1', 'u1');

      expect(result.model).toEqual({ id: 'm1', mapped: true });
      expect(result.counts).toEqual({ versions: 1, children: 0 });
      expect(result.stats.likes).toBe(4);
      expect(result.stats.views).toBe(10);
      expect(result.stats.runs).toBe(1);
      expect(result.stats.downloads).toBe(2);
      expect(result.stats.shares).toBe(3);
    });
  });

  describe('toResponse', () => {
    it('reports likedByMe=false and skips existsFor for an anonymous viewer', async () => {
      const { query, modelLikeRepository } = buildQuery();

      const result = await query.toResponse(makeCard() as never, null);

      expect(result.stats.likedByMe).toBe(false);
      expect(modelLikeRepository.existsFor).not.toHaveBeenCalled();
    });

    it('looks up likedByMe through the like repository for an authenticated viewer', async () => {
      const { query, modelLikeRepository } = buildQuery();
      modelLikeRepository.existsFor.mockResolvedValue(true);

      const result = await query.toResponse(makeCard() as never, 'u1');

      expect(modelLikeRepository.existsFor).toHaveBeenCalledWith('m1', 'u1');
      expect(result.stats.likedByMe).toBe(true);
    });

    it('returns latestVersion=null and skips file URL resolution when no version exists', async () => {
      const { query, fileService } = buildQuery();
      const card = makeCard({ versions: [] });

      const result = await query.toResponse(card as never, null);

      expect(result.latestVersion).toBeNull();
      expect(result.previewImageUrl).toBeNull();
      expect(fileService.getUrl).not.toHaveBeenCalled();
    });

    it('builds netlogoFileDownloadUrl and previewImageUrl from the file service', async () => {
      const { query, fileService } = buildQuery();

      const result = await query.toResponse(makeCard() as never, null);

      expect(result.latestVersion!.netlogoFileDownloadUrl).toBe(
        'https://cdn/uploads/models/m1/file.nlogo',
      );
      expect(result.previewImageUrl).toBe('https://cdn/preview-images/m1/p.png');
      expect(fileService.getUrl).toHaveBeenCalledTimes(2);
    });

    it('returns previewImageUrl=null when the latest version has no preview key', async () => {
      const { query } = buildQuery();
      const card = makeCard({
        versions: [
          {
            ...makeCard().versions[0]!,
            previewImageFileKey: null,
          },
        ],
      });

      const result = await query.toResponse(card as never, null);
      expect(result.previewImageUrl).toBeNull();
    });
  });
});
