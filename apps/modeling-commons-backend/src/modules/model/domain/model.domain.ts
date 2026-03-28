import { randomUUID } from 'node:crypto';
import type { CreateModelProps, ModelEntity } from '#src/modules/model/domain/model.types.ts';
import { ModelAlreadyDeletedError } from '#src/modules/model/domain/model.errors.ts';

export default function modelDomain() {
  return {
    createModel(props: CreateModelProps): ModelEntity {
      const now = new Date();
      return {
        id: randomUUID(),
        latestVersionId: null,
        parentModelId: props.parentModelId ?? null,
        parentVersionId: props.parentVersionId ?? null,
        visibility: props.visibility ?? 'public',
        isEndorsed: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
    },

    assertNotDeleted(model: ModelEntity): void {
      if (model.deletedAt) {
        throw new ModelAlreadyDeletedError(model.id);
      }
    },
  };
}
