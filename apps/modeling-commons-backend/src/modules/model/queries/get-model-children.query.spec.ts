import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeGetModelChildrenQuery from '#src/modules/model/queries/get-model-children.query.ts';
import { mockModelRepository } from '#src/modules/model/database/model.repository.mock.ts';

describe('getModelChildrenQuery', () => {
  const modelRepository = mockModelRepository();
  const query = makeGetModelChildrenQuery({ modelRepository } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to modelRepository.findChildren with the model id and pagination defaults', async () => {
    modelRepository.findChildren.mockResolvedValue({ data: [], total: 0, page: 0, limit: 20 });

    await query.execute('model-1', {});

    expect(modelRepository.findChildren).toHaveBeenCalledWith(
      'model-1',
      expect.objectContaining({ limit: 20, page: 0, offset: 0 }),
    );
  });

  it('applies user-supplied page+limit and derives offset', async () => {
    modelRepository.findChildren.mockResolvedValue({ data: [], total: 0, page: 3, limit: 10 });

    await query.execute('model-1', { limit: 10, page: 3 });

    const args = modelRepository.findChildren.mock.calls[0]![1];
    expect(args.limit).toBe(10);
    expect(args.page).toBe(3);
    expect(args.offset).toBe(30);
  });

  it('returns the paginated result from the repository unchanged', async () => {
    const page = { data: [{ id: 'c1' }], total: 1, page: 0, limit: 20 };
    modelRepository.findChildren.mockResolvedValue(page);

    const result = await query.execute('model-1', {});
    expect(result).toBe(page);
  });
});
