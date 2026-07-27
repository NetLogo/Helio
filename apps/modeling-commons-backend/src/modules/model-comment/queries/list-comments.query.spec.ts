import { describe, it, expect } from 'vitest';
import makeListCommentsQuery from '#src/modules/model-comment/queries/list-comments.query.ts';
import modelCommentMapper from '#src/modules/model-comment/model-comment.mapper.ts';
import { mockModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.mock.ts';
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

function page<T>(data: Array<T>, count: number, limit = 2, pageNum = 0): Paginated<T> {
  return { data, count, limit, page: pageNum };
}

function pages<T>(entries: Array<[string, Paginated<T>]>): Map<string, Paginated<T>> {
  return new Map(entries);
}

function buildQuery() {
  const modelCommentRepository = mockModelCommentRepository();
  const mapper = modelCommentMapper();
  const query = makeListCommentsQuery({
    modelCommentRepository,
    modelCommentMapper: mapper,
  } as never);
  return { query, modelCommentRepository };
}

describe('listCommentsQuery', () => {
  it('returns a paginated page of top-level comments using listTopLevel', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root-1' });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1, 20, 0));
    modelCommentRepository.listRepliesByParents.mockResolvedValue(pages([]));

    const result = await query.execute('model-1', {});

    expect(result.count).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('root-1');
    expect(result.data[0]!.replies).toBeUndefined();
    expect(modelCommentRepository.listTopLevel).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ limit: 20, page: 0, orderBy: { field: 'likes', param: 'desc' } }),
      undefined,
    );
  });

  it('maps sort=likes to a descending likesCount orderBy', async () => {
    const { query, modelCommentRepository } = buildQuery();
    modelCommentRepository.listTopLevel.mockResolvedValue(page([], 0));

    await query.execute('model-1', { sort: 'likes' });

    expect(modelCommentRepository.listTopLevel).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ orderBy: { field: 'likes', param: 'desc' } }),
      undefined,
    );
  });

  it('maps sort=newest to a descending createdAt orderBy', async () => {
    const { query, modelCommentRepository } = buildQuery();
    modelCommentRepository.listTopLevel.mockResolvedValue(page([], 0));

    await query.execute('model-1', { sort: 'newest' });

    expect(modelCommentRepository.listTopLevel).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ orderBy: { field: 'createdAt', param: 'desc' } }),
      undefined,
    );
  });

  it('maps sort=createdAt to an ascending createdAt orderBy (oldest first)', async () => {
    const { query, modelCommentRepository } = buildQuery();
    modelCommentRepository.listTopLevel.mockResolvedValue(page([], 0));

    await query.execute('model-1', { sort: 'createdAt' });

    expect(modelCommentRepository.listTopLevel).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ orderBy: { field: 'createdAt', param: 'asc' } }),
      undefined,
    );
  });

  it('passes viewerId through to listTopLevel/listRepliesByParents and the mapper (permissions/likedByMe)', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root-1', userId: 'user-1', likedByMe: true });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1));
    modelCommentRepository.listRepliesByParents.mockResolvedValue(pages([]));

    const result = await query.execute('model-1', {}, { viewerId: 'user-1', viewerRole: 'user' });

    expect(modelCommentRepository.listTopLevel).toHaveBeenCalledWith(
      'model-1',
      expect.anything(),
      'user-1',
    );
    expect(modelCommentRepository.listRepliesByParents).toHaveBeenCalledWith(
      ['root-1'],
      expect.anything(),
      'user-1',
    );
    expect(result.data[0]!.permissions).toEqual({ canEdit: true, canDelete: true });
    expect(result.data[0]!.likedByMe).toBe(true);
  });

  it('embeds at most 2 replies per node while reporting the true total count', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root-1' });
    const c1 = makeEntity({ id: 'c1', parentId: 'root-1' });
    const c2 = makeEntity({ id: 'c2', parentId: 'root-1' });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(async (parentIds: Array<string>) => {
      if (parentIds.includes('root-1')) return pages([['root-1', page([c1, c2], 5, 2, 0)]]);
      return pages([]);
    });

    const result = await query.execute('model-1', {});

    const rootDto = result.data[0]!;
    expect(rootDto.replies).toBeDefined();
    expect(rootDto.replies!.count).toBe(5);
    expect(rootDto.replies!.data).toHaveLength(2);
    expect(rootDto.replies!.data.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('fetches an entire level in a single batched call: three roots with two children each', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const roots = ['root-1', 'root-2', 'root-3'].map((id) => makeEntity({ id }));
    const childrenByRoot: Record<string, Array<ModelCommentEntity>> = {
      'root-1': [
        makeEntity({ id: 'root-1-a', parentId: 'root-1' }),
        makeEntity({ id: 'root-1-b', parentId: 'root-1' }),
      ],
      'root-2': [
        makeEntity({ id: 'root-2-a', parentId: 'root-2' }),
        makeEntity({ id: 'root-2-b', parentId: 'root-2' }),
      ],
      'root-3': [
        makeEntity({ id: 'root-3-a', parentId: 'root-3' }),
        makeEntity({ id: 'root-3-b', parentId: 'root-3' }),
      ],
    };

    modelCommentRepository.listTopLevel.mockResolvedValue(page(roots, 3));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) =>
        pages(
          parentIds
            .filter((id) => id in childrenByRoot)
            .map((id) => [id, page(childrenByRoot[id]!, childrenByRoot[id]!.length, 2, 0)] as const),
        ),
    );
    modelCommentRepository.countRepliesByParent.mockResolvedValue(new Map());

    const result = await query.execute('model-1', {});

    expect(result.data).toHaveLength(3);
    expect(modelCommentRepository.listRepliesByParents).toHaveBeenCalledTimes(3);
    expect(modelCommentRepository.countRepliesByParent).toHaveBeenCalledTimes(1);

    const [firstCallParentIds] = modelCommentRepository.listRepliesByParents.mock.calls[0]!;
    expect(new Set(firstCallParentIds)).toEqual(new Set(['root-1', 'root-2', 'root-3']));

    const [secondCallParentIds] = modelCommentRepository.listRepliesByParents.mock.calls[1]!;
    expect(new Set(secondCallParentIds)).toEqual(
      new Set(['root-1-a', 'root-1-b', 'root-2-a', 'root-2-b', 'root-3-a', 'root-3-b']),
    );
  });

  it('stops recursing at 3 levels: the deepest expanded level uses countRepliesByParent instead of listRepliesByParents', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root' });
    const depth1 = makeEntity({ id: 'd1', parentId: 'root' });
    const depth2 = makeEntity({ id: 'd2', parentId: 'd1' });
    const depth3 = makeEntity({ id: 'd3', parentId: 'd2' });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) => {
        const [parentId] = parentIds;
        if (parentId === 'root') return pages([['root', page([depth1], 1)]]);
        if (parentId === 'd1') return pages([['d1', page([depth2], 1)]]);
        if (parentId === 'd2') return pages([['d2', page([depth3], 1)]]);
        // depth3's own replies must never be fetched via listRepliesByParents
        return pages([]);
      },
    );
    modelCommentRepository.countRepliesByParent.mockResolvedValue(new Map([['d3', 7]]));

    const result = await query.execute('model-1', {});

    const rootDto = result.data[0]!;
    const d1Dto = rootDto.replies!.data[0]!;
    const d2Dto = d1Dto.replies!.data[0]!;
    const d3Dto = d2Dto.replies!.data[0]!;

    expect(d3Dto.id).toBe('d3');
    expect(d3Dto.replies).toEqual({ count: 7, limit: 2, page: 0, data: [] });
    expect(modelCommentRepository.countRepliesByParent).toHaveBeenCalledWith(['d3']);
    // listRepliesByParents must not have been asked for d3's children (only 3 calls: root, d1, d2)
    expect(modelCommentRepository.listRepliesByParents).toHaveBeenCalledTimes(3);
  });

  it('keeps a childless deleted top-level comment in the page as a tombstone', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const live = makeEntity({ id: 'live-root' });
    const tombstone = makeEntity({ id: 'dead-root', content: null, deletedAt: new Date() });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([live, tombstone], 2));
    modelCommentRepository.listRepliesByParents.mockResolvedValue(pages([]));

    const result = await query.execute('model-1', {});

    expect(result.data.map((c) => c.id)).toEqual(['live-root', 'dead-root']);
    expect(result.data[1]!.deleted).toBe(true);
    expect(result.data[1]!.content).toBe('[deleted]');
    expect(result.count).toBe(2);
  });

  it('keeps a deleted top-level comment that still has replies', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const tombstone = makeEntity({ id: 'dead-root', content: null, deletedAt: new Date() });
    const reply = makeEntity({ id: 'reply-1', parentId: 'dead-root' });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([tombstone], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) =>
        parentIds.includes('dead-root')
          ? pages([['dead-root', page([reply], 1)]])
          : pages([]),
    );

    const result = await query.execute('model-1', {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('dead-root');
    expect(result.data[0]!.deleted).toBe(true);
    expect(result.data[0]!.content).toBe('[deleted]');
    expect(result.data[0]!.replies!.count).toBe(1);
  });

  it('keeps tombstones at the deepest (count-only) level, reporting their raw reply counts', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root' });
    const depth1 = makeEntity({ id: 'd1', parentId: 'root' });
    const depth2 = makeEntity({ id: 'd2', parentId: 'd1' });
    const deadChildless = makeEntity({
      id: 'e-dead-childless',
      parentId: 'd2',
      content: null,
      deletedAt: new Date(),
    });
    const deadWithReplies = makeEntity({
      id: 'e-dead-with-replies',
      parentId: 'd2',
      content: null,
      deletedAt: new Date(),
    });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) => {
        const [parentId] = parentIds;
        if (parentId === 'root') return pages([['root', page([depth1], 1)]]);
        if (parentId === 'd1') return pages([['d1', page([depth2], 1)]]);
        if (parentId === 'd2') {
          return pages([['d2', page([deadChildless, deadWithReplies], 2)]]);
        }
        return pages([]);
      },
    );
    modelCommentRepository.countRepliesByParent.mockResolvedValue(
      new Map([
        ['e-dead-childless', 0],
        ['e-dead-with-replies', 3],
      ]),
    );

    const result = await query.execute('model-1', {});

    const d2Dto = result.data[0]!.replies!.data[0]!.replies!.data[0]!;
    const leaves = d2Dto.replies!.data;

    expect(leaves.map((c) => c.id)).toEqual(['e-dead-childless', 'e-dead-with-replies']);
    expect(leaves[0]!.replies).toBeUndefined();
    expect(leaves[1]!.replies).toEqual({ count: 3, limit: 2, page: 0, data: [] });
  });

  it('keeps a deleted top-level comment whose only reply is itself a tombstone', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const tombstoneRoot = makeEntity({ id: 'dead-root', content: null, deletedAt: new Date() });
    const tombstoneReply = makeEntity({
      id: 'dead-reply',
      parentId: 'dead-root',
      content: null,
      deletedAt: new Date(),
    });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([tombstoneRoot], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) =>
        parentIds.includes('dead-root')
          ? pages([['dead-root', page([tombstoneReply], 1)]])
          : pages([]),
    );

    const result = await query.execute('model-1', {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('dead-root');
    expect(result.data[0]!.replies!.data.map((c) => c.id)).toEqual(['dead-reply']);
    expect(result.data[0]!.replies!.count).toBe(1);
  });

  it('keeps a deleted top-level comment with mixed live/tombstone replies, reporting the raw count', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const tombstoneRoot = makeEntity({ id: 'dead-root', content: null, deletedAt: new Date() });
    const liveReply = makeEntity({ id: 'live-reply', parentId: 'dead-root' });
    const tombstoneReply = makeEntity({
      id: 'dead-reply',
      parentId: 'dead-root',
      content: null,
      deletedAt: new Date(),
    });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([tombstoneRoot], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) =>
        parentIds.includes('dead-root')
          ? pages([['dead-root', page([liveReply, tombstoneReply], 2)]])
          : pages([]),
    );

    const result = await query.execute('model-1', {});

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe('dead-root');
    expect(result.data[0]!.replies!.data.map((c) => c.id)).toEqual(['live-reply', 'dead-reply']);
    expect(result.data[0]!.replies!.count).toBe(2);
  });

  it('keeps a childless deleted reply in a parent’s embedded replies (nested, not just top-level)', async () => {
    const { query, modelCommentRepository } = buildQuery();
    const root = makeEntity({ id: 'root' });
    const liveChild = makeEntity({ id: 'live-child', parentId: 'root' });
    const deadChild = makeEntity({
      id: 'dead-child',
      parentId: 'root',
      content: null,
      deletedAt: new Date(),
    });

    modelCommentRepository.listTopLevel.mockResolvedValue(page([root], 1));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) => {
        if (parentIds.includes('root')) return pages([['root', page([liveChild, deadChild], 2)]]);
        return pages([]); // neither child has replies of its own
      },
    );

    const result = await query.execute('model-1', {});

    expect(result.data[0]!.replies!.data.map((c) => c.id)).toEqual(['live-child', 'dead-child']);
  });
});
