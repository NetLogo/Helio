import { vi } from 'vitest';
import type { ModelVersionRepository } from '#src/modules/model-version/database/model-version.repository.port.ts';

export function mockModelVersionRepository(): {
  [K in keyof ModelVersionRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    insertTx: vi.fn(),
    findByModelAndVersion: vi.fn(),
    findLatestByModel: vi.fn(),
    finalize: vi.fn(),
    updateFields: vi.fn(),
    listByModel: vi.fn(),
    getNextVersionNumber: vi.fn(),
  };
}
