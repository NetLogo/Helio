import { describe, it, expect, vi } from 'vitest';
import { makePrismaBossDb } from '#src/shared/jobs/prisma-boss-db.ts';

describe('makePrismaBossDb', () => {
  it('runs pg-boss SQL with spread values and wraps the rows', async () => {
    const rows = [{ id: 'job-1' }];
    const client = { $queryRawUnsafe: vi.fn().mockResolvedValue(rows) };

    const result = await makePrismaBossDb(client as never).executeSql('SELECT $1, $2', [1, 'a']);

    expect(client.$queryRawUnsafe).toHaveBeenCalledWith('SELECT $1, $2', 1, 'a');
    expect(result).toEqual({ rows });
  });
});
