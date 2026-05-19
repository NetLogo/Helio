import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeSearchModelsQuery from '#src/modules/model/queries/search-models-card.query.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';

describe('searchModelsCardQuery', () => {
  const modelRepository = mockModelRepository();
  const getModelCardQuery = { toDomain: vi.fn((r) => r) };
  const query = makeSearchModelsQuery({ modelRepository, getModelCardQuery } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes filters, pagination defaults, viewer id, and card include shape to the repository', async () => {
    modelRepository.search.mockResolvedValue({ data: [], total: 0, page: 0, limit: 20 });

    await query.execute({ keyword: 'wolf' }, { limit: 5, page: 1 }, 'user-1');

    const [filters, params, userId, opts] = modelRepository.search.mock.calls[0]!;
    expect(filters).toEqual({ keyword: 'wolf' });
    expect(userId).toBe('user-1');
    expect(params).toMatchObject({ limit: 5, page: 1, offset: 5 });
    expect(opts.include).toBeDefined();
    expect(typeof opts.map).toBe('function');
  });

  it('uses getModelCardQuery.toDomain as the row mapper', async () => {
    modelRepository.search.mockResolvedValue({ data: [], total: 0, page: 0, limit: 20 });

    await query.execute({}, {}, null);

    const opts = modelRepository.search.mock.calls[0]![3];
    const sentinel = { id: 'card-1' };
    opts.map(sentinel);
    expect(getModelCardQuery.toDomain).toHaveBeenCalledWith(sentinel);
  });
});
