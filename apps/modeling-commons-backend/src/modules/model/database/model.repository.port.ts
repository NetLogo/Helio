import type {
  ModelEntity,
  ModelSearchFilters,
  ModelVisibility,
} from '#src/modules/model/domain/model.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { RepositoryPort } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelRepository extends RepositoryPort<ModelEntity> {
  findByIdIncludeDeleted(id: string): Promise<ModelEntity | undefined>;
  setLatestVersion(ctx: TransactionContext, modelId: string, versionId: string): Promise<void>;
  softDelete(ctx: TransactionContext, id: string): Promise<void>;
  search(
    filters: ModelSearchFilters,
    params: PaginatedQueryParams,
    userId: string | null,
  ): Promise<Paginated<ModelEntity>>;
  findChildren(modelId: string, params: PaginatedQueryParams): Promise<Paginated<ModelEntity>>;
  insertTx(ctx: TransactionContext, entity: ModelEntity): Promise<void>;
  updateFields(
    ctx: TransactionContext,
    id: string,
    data: { visibility?: ModelVisibility; isEndorsed?: boolean },
  ): Promise<void>;
}
