import { describe, it, expect } from 'vitest';
import { ModelInteractionKind } from '#prisma/index';
import type { ModelSearchFilters } from '#src/modules/model/dtos/model.dto.ts';
import type { PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import { buildModelWhere, buildModelOrderBy, interactionKindBySortKey } from './model.search.ts';

const emptyFilters: ModelSearchFilters = {} as ModelSearchFilters;

describe('buildModelWhere', () => {
  it('always wraps conditions in AND and includes deletedAt: null', () => {
    const where = buildModelWhere(emptyFilters, null);
    expect(where).toHaveProperty('AND');
    expect(where.AND).toContainEqual({ deletedAt: null });
  });

  describe('visibility', () => {
    it('restricts to public when userId is null', () => {
      const where = buildModelWhere(emptyFilters, null);
      expect(where.AND).toContainEqual({ visibility: 'public' });
      // ensure no access-OR clause leaked in
      expect(JSON.stringify(where)).not.toContain('granteeUserId');
    });

    it('restricts to public when publicOnly is true, even with userId', () => {
      const where = buildModelWhere({ publicOnly: true } as ModelSearchFilters, 'user-1');
      expect(where.AND).toContainEqual({ visibility: 'public' });
      expect(JSON.stringify(where)).not.toContain('granteeUserId');
    });

    it('expands to public OR (private/unlisted AND has access) when userId and not publicOnly', () => {
      const where = buildModelWhere(emptyFilters, 'user-1');
      expect(where.AND).toContainEqual({
        OR: [
          { visibility: 'public' },
          {
            visibility: { in: ['private', 'unlisted'] },
            OR: [
              { authors: { some: { userId: 'user-1' } } },
              { permissions: { some: { granteeUserId: 'user-1' } } },
            ],
          },
        ],
      });
    });
  });

  describe('optional filters', () => {
    it('adds parentModelId when set', () => {
      const where = buildModelWhere({ parentModelId: 'parent-1' } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({ parentModelId: 'parent-1' });
    });

    it('adds isEndorsed when explicitly false (not just truthy)', () => {
      const where = buildModelWhere({ isEndorsed: false } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({ isEndorsed: false });
    });

    it('adds isLibraryModel when explicitly false', () => {
      const where = buildModelWhere({ isLibraryModel: false } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({ isLibraryModel: false });
    });

    it('omits isEndorsed / isLibraryModel when undefined', () => {
      const where = buildModelWhere(emptyFilters, null);
      const json = JSON.stringify(where);
      expect(json).not.toContain('isEndorsed');
      expect(json).not.toContain('isLibraryModel');
    });

    it('adds authorId filter as authors.some.userId', () => {
      const where = buildModelWhere({ authorId: 'author-1' } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({
        authors: { some: { userId: 'author-1' } },
      });
    });

    it('adds tag filter with case-insensitive equality on version tag name', () => {
      const where = buildModelWhere({ tag: 'Vision' } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({
        versions: {
          some: {
            tags: {
              some: { tag: { name: { equals: 'Vision', mode: 'insensitive' } } },
            },
          },
        },
      });
    });

    it('adds keyword filter spanning version title and description (case-insensitive contains)', () => {
      const where = buildModelWhere({ keyword: 'gpt' } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({
        OR: [
          { versions: { some: { title: { contains: 'gpt', mode: 'insensitive' } } } },
          { versions: { some: { description: { contains: 'gpt', mode: 'insensitive' } } } },
        ],
      });
    });
  });

  it('combines all filters into a single AND', () => {
    const where = buildModelWhere(
      {
        parentModelId: 'p',
        isEndorsed: true,
        isLibraryModel: true,
        authorId: 'a',
        tag: 't',
        keyword: 'k',
      } as ModelSearchFilters,
      'user-1',
    );
    // deletedAt + visibility-OR + 6 filter conditions = 8
    expect(where.AND).toHaveLength(8);
  });
});

describe('buildModelOrderBy', () => {
  const noParams: PaginatedQueryParams = {} as PaginatedQueryParams;

  it('orders by likes count desc when sortBy is "likes" (overrides orderBy param)', () => {
    const result = buildModelOrderBy(
      { sortBy: 'likes' } as ModelSearchFilters,
      { orderBy: { field: 'createdAt', param: 'asc' } } as PaginatedQueryParams,
    );
    expect(result).toEqual({ likes: { _count: 'desc' } });
  });

  it('uses params.orderBy when provided and sortBy is not "likes"', () => {
    const result = buildModelOrderBy(emptyFilters, {
      orderBy: { field: 'updatedAt', param: 'asc' },
    } as PaginatedQueryParams);
    expect(result).toEqual({ updatedAt: 'asc' });
  });

  it('defaults to createdAt desc when nothing is specified', () => {
    const result = buildModelOrderBy(emptyFilters, noParams);
    expect(result).toEqual({ createdAt: 'desc' });
  });
});

describe('interactionKindBySortKey', () => {
  it('maps view/run/download sort keys to their interaction kinds', () => {
    expect(interactionKindBySortKey).toEqual({
      views: ModelInteractionKind.view,
      runs: ModelInteractionKind.run,
      downloads: ModelInteractionKind.download,
    });
  });

  it('does not define mappings for non-interaction sort keys', () => {
    expect(interactionKindBySortKey).not.toHaveProperty('likes');
    expect(interactionKindBySortKey).not.toHaveProperty('createdAt');
  });
});
