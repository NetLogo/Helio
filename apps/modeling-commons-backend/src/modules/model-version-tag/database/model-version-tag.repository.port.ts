import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelVersionTagRepository {
  insertTx(ctx: TransactionContext, entity: ModelVersionTagEntity): Promise<void>;
  deleteTx(ctx: TransactionContext, modelVersionId: string, tagId: string): Promise<void>;
  findByVersionId(modelVersionId: string): Promise<ModelVersionTagEntity[]>;
  exists(modelVersionId: string, tagId: string): Promise<boolean>;
}
