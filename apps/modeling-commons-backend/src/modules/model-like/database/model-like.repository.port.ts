import type { ModelLikeEntity } from '#src/modules/model-like/domain/model-like.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelLikeRepository {
  upsertTx: (ctx: TransactionContext, entity: ModelLikeEntity) => Promise<boolean>;
  deleteTx: (ctx: TransactionContext, modelId: string, userId: string) => Promise<boolean>;
  countByModel: (modelId: string) => Promise<number>;
  existsFor: (modelId: string, userId: string) => Promise<boolean>;
  countsForModels: (modelIds: Array<string>) => Promise<Record<string, number>>;
  likedModelIdsForUser: (userId: string, modelIds: Array<string>) => Promise<Set<string>>;
}
