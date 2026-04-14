import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelVersionRepository {
  insertTx(ctx: TransactionContext, entity: ModelVersionEntity): Promise<void>;
  findByModelAndVersion(
    modelId: string,
    versionNumber: number,
  ): Promise<ModelVersionEntity | undefined>;
  findLatestByModel(modelId: string): Promise<ModelVersionEntity | undefined>;
  finalize(ctx: TransactionContext, modelId: string, versionNumber: number): Promise<void>;
  updateFields(
    ctx: TransactionContext,
    modelId: string,
    versionNumber: number,
    data: { title?: string; description?: string; previewImage?: Buffer<ArrayBuffer> },
  ): Promise<void>;
  listByModel(
    modelId: string,
    params: PaginatedQueryParams,
  ): Promise<Paginated<ModelVersionEntity>>;
  getNextVersionNumber(ctx: TransactionContext, modelId: string): Promise<number>;
}
