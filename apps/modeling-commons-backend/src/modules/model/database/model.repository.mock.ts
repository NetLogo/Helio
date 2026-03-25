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
    setLatestVersion: vi.fn(),
    softDelete: vi.fn(),
    search: vi.fn(),
    findChildren: vi.fn(),
    insertTx: vi.fn(),
    updateFields: vi.fn(),
  };
}
