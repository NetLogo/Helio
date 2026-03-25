import { vi } from 'vitest';
import type { PermissionRepository } from '#src/modules/model-permission/database/permission.repository.port.ts';

export function mockPermissionRepository(): {
  [K in keyof PermissionRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findByModelAndUser: vi.fn(),
    findAuthor: vi.fn(),
    findAllByModel: vi.fn(),
    insertTx: vi.fn(),
    deleteTx: vi.fn(),
  };
}
