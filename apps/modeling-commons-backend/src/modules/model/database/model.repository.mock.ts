import { vi } from 'vitest';
import type { ModelRepository } from '#src/modules/model/database/model.repository.port.ts';

export function mockModelRepository(): { [K in keyof ModelRepository]: ReturnType<typeof vi.fn> } {
  return {
    insert: vi.fn(),
    findOneById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByIdIncludeDeleted: vi.fn(),
    setLatestVersionTx: vi.fn(),
    softDeleteTx: vi.fn(),
    search: vi.fn(),
    incrementInteractionCountTx: vi.fn(),
    findInteractionCounts: vi.fn(),
    findChildren: vi.fn(),
    findCard: vi.fn(),
    findSubjectsReadableBy: vi.fn(),
    insertTx: vi.fn(),
    updateFieldsTx: vi.fn(),
    resolveLegacyId: vi.fn(),
    findRandomPublic: vi.fn(),
  };
}
