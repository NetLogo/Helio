import { describe, it, expect, vi, beforeEach } from 'vitest';
import modelLikeRepository from '#src/modules/model-like/database/model-like.repository.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';

const createMany = vi.fn();
const findUnique = vi.fn();
const create = vi.fn();

vi.mock('#src/shared/db/prisma-transaction.manager.ts', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    resolveTransaction: () => ({ modelLike: { createMany, findUnique, create } }),
  };
});

const entity = {
  modelId: 'model-1',
  userId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('modelLikeRepository.upsertTx', () => {
  const transactionManager = mockTransactionManager();
  const repository = modelLikeRepository({ db: {} } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts with skipDuplicates and reports true when a row was written', async () => {
    createMany.mockResolvedValue({ count: 1 });

    const inserted = await transactionManager.run((ctx) => repository.upsertTx(ctx, entity));

    expect(inserted).toBe(true);
    expect(createMany).toHaveBeenCalledWith({ data: entity, skipDuplicates: true });
  });

  it('reports false when the like already existed', async () => {
    createMany.mockResolvedValue({ count: 0 });

    const inserted = await transactionManager.run((ctx) => repository.upsertTx(ctx, entity));

    expect(inserted).toBe(false);
  });

  it('does not read before writing', async () => {
    createMany.mockResolvedValue({ count: 1 });

    await transactionManager.run((ctx) => repository.upsertTx(ctx, entity));

    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
