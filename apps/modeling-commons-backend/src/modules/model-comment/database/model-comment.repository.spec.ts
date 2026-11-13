import { describe, it, expect, vi, beforeEach } from 'vitest';
import modelCommentRepository, {
  toRawOrderBy,
  buildListRepliesByParentsQuery,
} from '#src/modules/model-comment/database/model-comment.repository.ts';
import type { PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';

const createMany = vi.fn();
const create = vi.fn();
const update = vi.fn();

vi.mock('#src/shared/db/prisma-transaction.manager.ts', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    resolveTransaction: () => ({
      modelCommentLike: { createMany, create },
      modelComment: { update },
    }),
  };
});

// Prisma.sql compiles to a Prisma.Sql (.sql / .values) without a DB connection, so the
// injection-resistance of the raw window query in listRepliesByParents can be asserted here,
// even though the fully-mocked test:unit setup has no Postgres to actually run it against.
describe('model-comment repository raw query builders', () => {
  describe('toRawOrderBy', () => {
    it('whitelists a hostile field into the createdAt fallback with no trace of the input', () => {
      const sql = toRawOrderBy({
        field: '"createdAt" ASC) AS rn, (SELECT password FROM "user" LIMIT 1',
        param: 'asc',
      });
      expect(sql.sql).toBe('"createdAt" ASC, "id" ASC');
      expect(sql.values).toEqual([]);
    });

    it('whitelists a hostile param into the ascending fallback with no trace of the input', () => {
      const sql = toRawOrderBy({
        field: 'likes',
        param: 'desc; DROP TABLE "ModelComment"; --' as PaginatedQueryParams['orderBy']['param'],
      });
      expect(sql.sql).toBe('"likesCount" ASC, "id" ASC');
      expect(sql.values).toEqual([]);
    });

    it('accepts the legitimate likes/desc combination', () => {
      const sql = toRawOrderBy({ field: 'likes', param: 'desc' });
      expect(sql.sql).toBe('"likesCount" DESC, "id" ASC');
    });
  });

  describe('buildListRepliesByParentsQuery', () => {
    it('absorbs hostile orderBy into the whitelist and binds hostile parentIds/offset/limit as values', () => {
      const parentIds = ["' OR 1=1 --", 'x\'; DROP TABLE "ModelComment"; --'];
      const params: PaginatedQueryParams = {
        limit: 2,
        page: 1,
        offset: 0,
        orderBy: {
          field: '"createdAt" ASC) AS rn, (SELECT password FROM "user" LIMIT 1',
          param: 'desc; DROP TABLE "ModelComment"; --' as PaginatedQueryParams['orderBy']['param'],
        },
      };

      const query = buildListRepliesByParentsQuery(parentIds, params);

      expect(query.sql).not.toContain('DROP TABLE');
      expect(query.sql).not.toContain('password');
      expect(query.sql).not.toContain('1=1');
      expect(query.sql).toContain('ORDER BY "createdAt" ASC, "id" ASC');
      expect(query.sql).toContain('WHERE "parentId" IN (?,?)');
      expect(query.sql).toContain('WHERE rn = 1 OR (rn > ? AND rn <= ?)');

      expect(query.values).toEqual([...parentIds, 0, 2]);
    });

    it('computes the window bound as Number(offset) + Number(limit), not string concatenation', () => {
      const params: PaginatedQueryParams = {
        limit: '2' as unknown as number,
        page: 1,
        offset: '0' as unknown as number,
        orderBy: { field: 'createdAt', param: 'asc' },
      };

      const query = buildListRepliesByParentsQuery(['parent-1'], params);

      expect(query.values.at(-2)).toBe(0);
      expect(query.values.at(-1)).toBe(2);
    });
  });
});

describe('modelCommentRepository.addLikeTx', () => {
  const transactionManager = mockTransactionManager();
  const repository = modelCommentRepository({ db: {} } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts with skipDuplicates and bumps the count when a row was written', async () => {
    createMany.mockResolvedValue({ count: 1 });

    const added = await transactionManager.run((ctx) =>
      repository.addLikeTx(ctx, 'comment-1', 'user-1'),
    );

    expect(added).toBe(true);
    expect(createMany).toHaveBeenCalledWith({
      data: { modelCommentId: 'comment-1', userId: 'user-1' },
      skipDuplicates: true,
    });
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'comment-1' },
      data: { likesCount: { increment: 1 } },
    });
  });

  it('reports false and leaves the count alone when the like already existed', async () => {
    createMany.mockResolvedValue({ count: 0 });

    const added = await transactionManager.run((ctx) =>
      repository.addLikeTx(ctx, 'comment-1', 'user-1'),
    );

    expect(added).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
