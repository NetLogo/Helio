import type {
  ModelInteractionEntity,
  ModelInteractionKind,
} from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { ClientContext } from '#src/shared/http/client-context.ts';
import { newId } from '#src/shared/utils/id.ts';

export default function modelInteractionDomain() {
  return {
    create(
      modelId: string,
      kind: ModelInteractionKind,
      ctx: ClientContext,
      versionNumber: number | null,
    ): ModelInteractionEntity {
      return {
        id: newId(),
        modelId,
        versionNumber,
        kind,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        ipHash: ctx.ipHash,
        userAgent: ctx.userAgent,
        referer: ctx.referer,
        geo: null,
        cookie: ctx.cookie,
        createdAt: new Date(),
      };
    },
  };
}
