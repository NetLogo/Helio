import { randomUUID } from 'node:crypto';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import { ModelDraftAccessDeniedError } from '#src/modules/model-draft/domain/model-draft.errors.ts';

export default function modelDraftDomain() {
  return {
    createDraft(props: {
      userId: string;
      modelId?: string | null;
      schemaVersion: number;
      data: unknown;
    }): ModelDraftEntity {
      const now = new Date();
      return {
        id: randomUUID(),
        userId: props.userId,
        modelId: props.modelId ?? null,
        schemaVersion: props.schemaVersion,
        data: props.data as ModelDraftEntity['data'],
        createdAt: now,
        updatedAt: now,
      };
    },

    assertOwnedBy(draft: ModelDraftEntity, userId: string): void {
      if (draft.userId !== userId) throw new ModelDraftAccessDeniedError();
    },
  };
}
