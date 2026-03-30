import { vi } from 'vitest';
import type { ModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.port.ts';

export function mockModelVersionRepository(): {
  [K in keyof ModelVersionRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    insert: vi.fn(),
    findOneById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insertTx: vi.fn(),
    findByModelAndVersion: vi.fn(),
    findLatestByModel: vi.fn(),
    finalize: vi.fn(),
    updateFields: vi.fn(),
    listByModel: vi.fn(),
    getNextVersionNumber: vi.fn(),
  };
}
