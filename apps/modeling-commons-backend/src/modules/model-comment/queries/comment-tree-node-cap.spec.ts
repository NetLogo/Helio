import { describe, it, expect, vi } from 'vitest';

vi.mock('#src/config/rules.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#src/config/rules.ts')>();
  return {
    default: {
      ...actual.default,
      limits: {
        ...actual.default.limits,
        comment: {
          ...actual.default.limits.comment,
          tree: { maxNodes: 10 },
        },
      },
    },
  };
});

import makeListCommentsQuery from '#src/modules/model-comment/queries/list-comments.query.ts';
import makeGetCommentQuery from '#src/modules/model-comment/queries/get-comment.query.ts';
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

function buildListQuery() {
  const modelCommentRepository = mockModelCommentRepository();
  const mapper = modelCommentMapper();
  const query = makeListCommentsQuery({
    modelCommentRepository,
    modelCommentMapper: mapper,
  } as never);
  return { query, modelCommentRepository };
}

function buildGetQuery() {
  const modelCommentRepository = mockModelCommentRepository();
  const mapper = modelCommentMapper();
  const query = makeGetCommentQuery({
    modelCommentRepository,
    modelCommentMapper: mapper,
  } as never);
  return { query, modelCommentRepository };
}

// maxNodes is mocked to 10 for this whole file.
describe('comment tree node cap (rules.limits.comment.tree.maxNodes)', () => {
  it('degrades a level to counts-only once the budget is exhausted, without calling listRepliesByParents for it', async () => {
    const { query, modelCommentRepository } = buildListQuery();
    const roots = [makeEntity({ id: 'root-1' }), makeEntity({ id: 'root-2' })];
    const c1a = makeEntity({ id: 'c1a', parentId: 'root-1' });
    const c1b = makeEntity({ id: 'c1b', parentId: 'root-1' });
    const c2a = makeEntity({ id: 'c2a', parentId: 'root-2' });
    const c2b = makeEntity({ id: 'c2b', parentId: 'root-2' });

    modelCommentRepository.listTopLevel.mockResolvedValue(page(roots, 2, 20, 0));
    modelCommentRepository.listRepliesByParents.mockImplementation(
      async (parentIds: Array<string>) =>
        pages(
          [
            ['root-1', page([c1a, c1b], 5, 2, 0)],
            ['root-2', page([c2a, c2b], 5, 2, 0)],
          ].filter(([id]) => parentIds.includes(id as string)) as Array<
            [string, Paginated<ModelCommentEntity>]
          >,
        ),
    );
    modelCommentRepository.countRepliesByParent.mockResolvedValue(
      new Map([
        ['c1a', 3],
        ['c1b', 0],
        ['c2a', 7],
        ['c2b', 0],
      ]),
    );

    const result = await query.execute('model-1', {});

    // budget = 10 - 2 roots = 8; level 0 (2 parents * embed limit 2 = worst case 4) fits and
    // yields 4 children, leaving budget 4; level 1 (4 parents * embed limit 2 = worst case 8)
    // exceeds the remaining budget of 4, so it is truncated instead of fetched.
    expect(modelCommentRepository.listRepliesByParents).toHaveBeenCalledTimes(1);

    const root1 = result.data.find((c) => c.id === 'root-1')!;
    const root2 = result.data.find((c) => c.id === 'root-2')!;
    const c1aDto = root1.replies!.data.find((c) => c.id === 'c1a')!;
    const c1bDto = root1.replies!.data.find((c) => c.id === 'c1b')!;
    const c2aDto = root2.replies!.data.find((c) => c.id === 'c2a')!;

    expect(c1aDto.replies).toEqual({ count: 3, limit: 2, page: 0, data: [] });
    expect(c2aDto.replies).toEqual({ count: 7, limit: 2, page: 0, data: [] });
    expect(c1bDto.replies).toBeUndefined();
    expect(modelCommentRepository.countRepliesByParent).toHaveBeenCalledWith(
      expect.arrayContaining(['c1a', 'c1b', 'c2a', 'c2b']),
    );
  });

  it('reports the caller-supplied limit/page on a level-0 truncation via get-comment, not EMBED_PARAMS', async () => {
    const { query, modelCommentRepository } = buildGetQuery();
    const target = makeEntity({ id: 'target-1' });

    modelCommentRepository.findById.mockResolvedValue(target);
    modelCommentRepository.countRepliesByParent.mockResolvedValue(new Map([['target-1', 12]]));

    // budget = 10 - 1 root = 9; worst case at level 0 is 1 parent * caller limit 5 = 5... use a
    // caller limit large enough that the worst case (1 * limit) alone exceeds the budget.
    const result = await query.execute('target-1', { page: 1, limit: 12 });

    expect(modelCommentRepository.listRepliesByParents).not.toHaveBeenCalled();
    expect(result.replies).toEqual({ count: 12, limit: 12, page: 1, data: [] });
  });
});
