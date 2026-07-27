import { describe, it, expect } from 'vitest';
import {
  toRawOrderBy,
  buildListRepliesByParentsQuery,
} from '#src/modules/model-comment/database/model-comment.repository.ts';
import type { PaginatedQueryParams } from '#src/shared/db/repository.port.ts';

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
