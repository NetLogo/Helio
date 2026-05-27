import {
  ModelInteractionKind,
  type InteractionCounts,
} from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { ClientContext } from '#src/shared/http/client-context.ts';

const VIEW_DEDUPE_MS = 30 * 60 * 1000;

export default function makeModelInteractionService({
  transactionManager,
  modelInteractionRepository,
  modelInteractionDomain,
  modelLikeRepository,
  modelRepository,
}: Dependencies) {
  return {
    async record(
      kind: ModelInteractionKind,
      modelId: string,
      ctx: ClientContext,
      versionNumber: number | null = null,
    ): Promise<void> {
      if (kind === ModelInteractionKind.view) {
        const recent = await modelInteractionRepository.hasRecentMatch({
          modelId,
          kind,
          userId: ctx.userId,
          ipHash: ctx.ipHash,
          sessionId: ctx.sessionId,
          cookie: ctx.cookie,
          withinMs: VIEW_DEDUPE_MS,
        });
        if (recent) return;
      }

      const entity = modelInteractionDomain.create(modelId, kind, ctx, versionNumber);
      await transactionManager.run(async (tx) => {
        await modelInteractionRepository.insertTx(tx, entity);
        await modelRepository.incrementInteractionCount(tx, modelId, kind);
      });
    },

    async summary(
      modelId: string,
      userId: string | null,
    ): Promise<
      InteractionCounts & { likes: number; likedByMe: boolean }
    > {
      const [counts, likes, likedByMe] = await Promise.all([
        modelRepository.findInteractionCounts(modelId),
        modelLikeRepository.countByModel(modelId),
        userId ? modelLikeRepository.existsFor(modelId, userId) : Promise.resolve(false),
      ]);
      const resolved = counts ?? { view: 0, run: 0, download: 0, share: 0 };
      return { ...resolved, likes, likedByMe };
    },
  };
}
