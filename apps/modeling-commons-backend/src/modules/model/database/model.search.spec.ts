import { describe, it, expect } from 'vitest';
import type { ModelSearchFilters } from '#src/modules/model/dtos/model.dto.ts';
import type { PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import { buildModelWhere, buildModelOrderBy, sortKeyToCountColumn } from './model.search.ts';

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
      const where = buildModelWhere({ tags: ['Vision'] } as ModelSearchFilters, null);
      expect(where.AND).toContainEqual({
        versions: {
          some: {
            tags: {
              some: { tag: { name: { in: ['Vision'], mode: 'insensitive' } } },
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

    it('adds netlogoVersion filter against versions.some.netlogoVersion', () => {
      const where = buildModelWhere(
        { netlogoVersion: '6.4.0' } as ModelSearchFilters,
        null,
      );
      expect(where.AND).toContainEqual({
        versions: { some: { netlogoVersion: '6.4.0' } },
      });
    });

    it('adds a date-range AND clause when only fromDate is provided', () => {
      const where = buildModelWhere(
        { fromDate: '2024-01-01' } as ModelSearchFilters,
        null,
      );
      const dateClause = (where.AND as object[]).find(
        (c) => 'AND' in (c as object),
      ) as { AND: object[] } | undefined;
      expect(dateClause).toBeDefined();
      expect(dateClause!.AND).toContainEqual({ createdAt: { gte: new Date('2024-01-01') } });
    });

    it('adds a date-range AND clause when only toDate is provided', () => {
      const where = buildModelWhere(
        { toDate: '2024-12-31' } as ModelSearchFilters,
        null,
      );
      const dateClause = (where.AND as object[]).find(
        (c) => 'AND' in (c as object),
      ) as { AND: object[] } | undefined;
      expect(dateClause).toBeDefined();
      expect(dateClause!.AND).toContainEqual({ createdAt: { lte: new Date('2024-12-31') } });
    });

    it('combines fromDate and toDate into a single AND clause', () => {
      const where = buildModelWhere(
        { fromDate: '2024-01-01', toDate: '2024-12-31' } as ModelSearchFilters,
        null,
      );
      const dateClause = (where.AND as object[]).find(
        (c) => 'AND' in (c as object),
      ) as { AND: object[] } | undefined;
      expect(dateClause).toBeDefined();
      expect(dateClause!.AND).toHaveLength(2);
    });

    it('omits date conditions when neither fromDate nor toDate is set', () => {
      const where = buildModelWhere(emptyFilters, null);
      expect(JSON.stringify(where)).not.toContain('gte');
      expect(JSON.stringify(where)).not.toContain('lte');
    });
  });

  it('combines all filters into a single AND', () => {
    const where = buildModelWhere(
      {
        parentModelId: 'p',
        isEndorsed: true,
        isLibraryModel: true,
        authorId: 'a',
        tags: ['t'],
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

  it('orders by likes count using params.orderBy direction when sortBy is "likes"', () => {
    const result = buildModelOrderBy(
      { sortBy: 'likes' } as ModelSearchFilters,
      { orderBy: { field: 'createdAt', param: 'asc' } } as PaginatedQueryParams,
    );
    expect(result).toEqual({ likes: { _count: 'asc' } });
  });

  it('orders by the viewCount column when sortBy is "views"', () => {
    const result = buildModelOrderBy(
      { sortBy: 'views', order: 'desc' } as ModelSearchFilters,
      noParams,
    );
    expect(result).toEqual({ viewCount: 'desc' });
  });

  it('orders by the runCount column when sortBy is "runs"', () => {
    const result = buildModelOrderBy(
      { sortBy: 'runs', order: 'asc' } as ModelSearchFilters,
      noParams,
    );
    expect(result).toEqual({ runCount: 'asc' });
  });

  it('orders by the downloadCount column when sortBy is "downloads"', () => {
    const result = buildModelOrderBy(
      { sortBy: 'downloads' } as ModelSearchFilters,
      noParams,
    );
    expect(result).toEqual({ downloadCount: 'desc' });
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

describe('sortKeyToCountColumn', () => {
  it('maps view/run/download sort keys to their denormalized count columns', () => {
    expect(sortKeyToCountColumn).toEqual({
      views: 'viewCount',
      runs: 'runCount',
      downloads: 'downloadCount',
    });
  });

  it('does not define mappings for non-count sort keys', () => {
    expect(sortKeyToCountColumn).not.toHaveProperty('likes');
    expect(sortKeyToCountColumn).not.toHaveProperty('createdAt');
  });
});
