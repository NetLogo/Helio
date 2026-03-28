import type { AuthorRole, ModelAuthorEntity } from '#src/modules/model-author/domain/model-author.types.ts';
import {
  CannotRemoveOwnerError,
  NotOwnerError,
} from '#src/modules/model-author/domain/model-author.errors.ts';

export default function modelAuthorDomain() {
  return {
    createAuthor(modelId: string, userId: string, role: AuthorRole): ModelAuthorEntity {
      return {
        modelId,
        userId,
        role,
        createdAt: new Date(),
      };
    },

    assertIsOwner(author: ModelAuthorEntity): void {
      if (author.role !== 'owner') {
        throw new NotOwnerError();
      }
    },

    assertNotOwner(author: ModelAuthorEntity): void {
      if (author.role === 'owner') {
        throw new CannotRemoveOwnerError();
      }
    },
  };
}
