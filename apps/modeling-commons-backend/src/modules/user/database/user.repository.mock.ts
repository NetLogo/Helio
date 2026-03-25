import { vi } from 'vitest';
import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';

export function mockUserRepository(): { [K in keyof UserRepository]: ReturnType<typeof vi.fn> } {
  return {
    insert: vi.fn(),
    findOneById: vi.fn(),
    findAll: vi.fn(),
    findAllPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByIdIncludeDeleted: vi.fn(),
    softDelete: vi.fn(),
    updateFields: vi.fn(),
    search: vi.fn(),
  };
}
