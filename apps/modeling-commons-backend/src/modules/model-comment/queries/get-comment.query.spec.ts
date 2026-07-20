import { describe, it, expect } from 'vitest';
import makeGetCommentQuery from '#src/modules/model-comment/queries/get-comment.query.ts';
import modelCommentMapper from '#src/modules/model-comment/model-comment.mapper.ts';
import { mockModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.mock.ts';
import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { Paginated } from '#src/shared/db/repository.port.ts';

function makeEntity(overrides: Partial<ModelCommentEntity> = {}): ModelCommentEntity {
  return {
    id: 'entity-id',
    legacyId: null,
    parentId: null,
    userId: 'user-1',
    modelId: 'model-1',
    versionNumber: null,
    content: 'hello',
    likesCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    editedAt: null,
    deletedAt: null,
    user: { id: 'user-1', name: 'Alice', image: null },
    likedByMe: false,
    ...overrides,
  };
}

function page<T>(data: Array<T>, count: number, limit = 20, pageNum = 0): Paginated<T> {
  return { data, count, limit, page: pageNum };
}

function buildQuery() {
  const modelCommentRepository = mockModelCommentRepository();
  const mapper = modelCommentMapper();
  const query = makeGetCommentQuery({
    modelCommentRepository,
    modelCommentMapper: mapper,
  } as never);
  return { query, modelCommentRepository };
}

describe('getCommentQuery', () => {
  it('throws CommentNotFoundError when the comment does not exist', async () => {
    const { query, modelCommentRepository } = buildQuery();
    modelCommentRepository.findById.mockResolvedValue(undefined);

    await expect(query.execute('missing', {})).rejects.toThrow(CommentNotFoundError);
  });

  it('re-roots the target comment with its own reply page (default limit 20)', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const target = makeEntity({ id: 'target-1' });
    const reply = makeEntity({ id: 'reply-1', parentId: 'target-1' });

    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.listReplies.mockImplementation(async (parentId: string) =>
      parentId === 'target-1' ? page([reply], 1, 20, 0) : page([], 0),
    );

    const result = await query.execute('target-1', {});

    expect(result.id).toBe('target-1');
    expect(result.replies!.count).toBe(1);
    expect(result.replies!.data[0]!.id).toBe('reply-1');
    expect(modelCommentRepository.listReplies).toHaveBeenCalledWith(
      'target-1',
      expect.objectContaining({ limit: 20, page: 0 }),
      undefined,
    );
  });

  it('honors ?page=N (and a caller-supplied limit) on the root comment’s own reply page', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const target = makeEntity({ id: 'target-1' });

    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.listReplies.mockResolvedValue(page([], 0, 5, 2));

    await query.execute('target-1', { page: 2, limit: 5 });

    expect(modelCommentRepository.listReplies).toHaveBeenCalledWith(
      'target-1',
      expect.objectContaining({ limit: 5, page: 2, offset: 10 }),
      undefined,
    );
  });

  it('maps sort=likes to a descending likesCount orderBy for the root reply page', async () => {
    const { query, modelCommentRepository } = buildQuery();
    modelCommentRepository.findById.mockResolvedValue(makeEntity({ id: 'target-1' }));
    modelCommentRepository.listReplies.mockResolvedValue(page([], 0));

    await query.execute('target-1', { sort: 'likes' });

    expect(modelCommentRepository.listReplies).toHaveBeenCalledWith(
      'target-1',
      expect.objectContaining({ orderBy: { field: 'likes', param: 'desc' } }),
      undefined,
    );
  });

  it('passes viewerId through to findById/listReplies and the mapper', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const target = makeEntity({ id: 'target-1', userId: 'user-1' });
    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.listReplies.mockResolvedValue(page([], 0));

    const result = await query.execute('target-1', {}, { viewerId: 'user-1' });

    expect(modelCommentRepository.findById).toHaveBeenCalledWith('target-1', 'user-1');
    expect(modelCommentRepository.listReplies).toHaveBeenCalledWith(
      'target-1',
      expect.anything(),
      'user-1',
    );
    expect(result.permissions).toEqual({ canEdit: true, canDelete: true });
  });

  it('keeps a deleted child and its tombstone grandchild in the re-rooted comment', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const target = makeEntity({ id: 'target-1' });
    const tombstoneChild = makeEntity({
      id: 'dead-child',
      parentId: 'target-1',
      content: null,
      deletedAt: new Date(),
    });
    const tombstoneGrandchild = makeEntity({
      id: 'dead-grandchild',
      parentId: 'dead-child',
      content: null,
      deletedAt: new Date(),
    });

    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.listReplies.mockImplementation(async (parentId: string) => {
      if (parentId === 'target-1') return page([tombstoneChild], 1, 20, 0);
      if (parentId === 'dead-child') return page([tombstoneGrandchild], 1);
      return page([], 0);
    });

    const result = await query.execute('target-1', {});

    expect(result.replies!.data.map((c) => c.id)).toEqual(['dead-child']);
    expect(result.replies!.count).toBe(1);
    expect(result.replies!.data[0]!.replies!.data.map((c) => c.id)).toEqual(['dead-grandchild']);
  });

  it('bounds deeper levels to the standard 2-per-level embed even though the root page uses a bigger limit', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const target = makeEntity({ id: 'target-1' });
    const child = makeEntity({ id: 'child-1', parentId: 'target-1' });
    const grandchild1 = makeEntity({ id: 'gc-1', parentId: 'child-1' });
    const grandchild2 = makeEntity({ id: 'gc-2', parentId: 'child-1' });

    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.listReplies.mockImplementation(async (parentId: string) => {
      if (parentId === 'target-1') return page([child], 1, 20, 0);
      if (parentId === 'child-1') return page([grandchild1, grandchild2], 3, 2, 0); // 3 total, 2 embedded
      return page([], 0);
    });

    const result = await query.execute('target-1', {});

    const childDto = result.replies!.data[0]!;
    expect(childDto.replies!.count).toBe(3);
    expect(childDto.replies!.data.map((c) => c.id)).toEqual(['gc-1', 'gc-2']);
    expect(modelCommentRepository.listReplies).toHaveBeenCalledWith(
      'child-1',
      expect.objectContaining({ limit: 2 }),
      undefined,
    );
  });
});
