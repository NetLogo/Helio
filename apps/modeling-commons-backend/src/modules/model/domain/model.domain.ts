import { randomUUID } from 'node:crypto';
import type { Model } from '#prisma/index';
import type { CreateModelProps } from '#src/modules/model/dtos/model.dto.ts';
import { ModelAlreadyDeletedError } from '#src/modules/model/domain/model.errors.ts';

export default function modelDomain() {
  return {
    createModel(props: CreateModelProps): Model {
      const now = new Date();
      return {
        id: randomUUID(),
        latestVersionNumber: null,
        parentModelId: props.parentModelId ?? null,
        parentVersionNumber: props.parentVersionNumber ?? null,
        visibility: props.visibility ?? 'public',
        isEndorsed: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
    },

    assertNotDeleted(model: Model): void {
      if (model.deletedAt) {
        throw new ModelAlreadyDeletedError(model.id);
      }
    },
  };
}
