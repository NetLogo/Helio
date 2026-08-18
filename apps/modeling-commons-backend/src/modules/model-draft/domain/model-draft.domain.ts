import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import { ModelDraftAccessDeniedError } from '#src/modules/model-draft/domain/model-draft.errors.ts';
import { newId } from '#src/shared/utils/id.ts';

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
        id: newId(),
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
