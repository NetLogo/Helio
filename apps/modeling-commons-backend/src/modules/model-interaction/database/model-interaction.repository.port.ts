import type {
  InteractionCounts,
  ModelInteractionEntity,
  ModelInteractionKind,
} from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type RecentMatchParams = {
  modelId: string;
  kind: ModelInteractionKind;
  userId: string | null;
  ipHash: string | null;
  sessionId: string | null;
  cookie: string | null;
  withinMs: number;
};

export interface ModelInteractionRepository {
  insertTx(ctx: TransactionContext, entity: ModelInteractionEntity): Promise<void>;
  hasRecentMatch(params: RecentMatchParams): Promise<boolean>;
  countByModelAndKind(modelId: string, kind: ModelInteractionKind): Promise<number>;
  countsByKindForModel(modelId: string): Promise<InteractionCounts>;
  countsForModels(modelIds: string[]): Promise<Record<string, InteractionCounts>>;
}
