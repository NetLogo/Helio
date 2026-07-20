import { vi } from 'vitest';
import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';

export function mockModelCommentRepository(): {
  [K in keyof ModelCommentRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findById: vi.fn(),
    findByIdTx: vi.fn(),
    listTopLevel: vi.fn(),
    listReplies: vi.fn(),
    countRepliesByParent: vi.fn(),
    insertTx: vi.fn(),
    updateContentTx: vi.fn(),
    softDeleteTx: vi.fn(),
    addLikeTx: vi.fn(),
    removeLikeTx: vi.fn(),
  };
}
