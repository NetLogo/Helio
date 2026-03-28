import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';
import type { Paginated, PaginatedQueryParams, RepositoryPort } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelVersionRepository extends RepositoryPort<ModelVersionEntity> {
  insertTx(ctx: TransactionContext, entity: ModelVersionEntity): Promise<void>;
  findByModelAndVersion(modelId: string, versionNumber: number): Promise<ModelVersionEntity | undefined>;
  findLatestByModel(modelId: string): Promise<ModelVersionEntity | undefined>;
  finalize(ctx: TransactionContext, versionId: string): Promise<void>;
  updateFields(
    ctx: TransactionContext,
    versionId: string,
    data: { title?: string; description?: string; previewImage?: Buffer },
  ): Promise<void>;
  listByModel(modelId: string, params: PaginatedQueryParams): Promise<Paginated<ModelVersionEntity>>;
  getNextVersionNumber(ctx: TransactionContext, modelId: string): Promise<number>;
}
