import type { ModelVersionTagEntity } from '#src/modules/model-version-tag/domain/model-version-tag.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelVersionTagRepository {
  insertTx(ctx: TransactionContext, entity: ModelVersionTagEntity): Promise<void>;
  deleteTx(ctx: TransactionContext, modelId: string, versionNumber: number, tagId: string): Promise<void>;
  findByVersion(modelId: string, versionNumber: number): Promise<ModelVersionTagEntity[]>;
  exists(modelId: string, versionNumber: number, tagId: string): Promise<boolean>;
}
