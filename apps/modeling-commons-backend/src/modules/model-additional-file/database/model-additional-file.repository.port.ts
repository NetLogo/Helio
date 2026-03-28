import type { ModelAdditionalFileEntity } from '#src/modules/model-additional-file/domain/model-additional-file.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelAdditionalFileRepository {
  insertTx(ctx: TransactionContext, entity: ModelAdditionalFileEntity): Promise<void>;
  deleteTx(ctx: TransactionContext, id: string): Promise<void>;
  findOneById(id: string): Promise<ModelAdditionalFileEntity | undefined>;
  findByModel(modelId: string, taggedVersionId?: string): Promise<ModelAdditionalFileEntity[]>;
}
