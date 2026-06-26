import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelDraftRepository {
  findById: (id: string) => Promise<ModelDraftEntity | undefined>;
  listByUser: (
    userId: string,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<ModelDraftEntity>>;
  insertTx: (ctx: TransactionContext, entity: ModelDraftEntity) => Promise<void>;
  updateDataTx: (
    ctx: TransactionContext,
    id: string,
    schemaVersion: number,
    data: unknown,
  ) => Promise<void>;
  hardDeleteTx: (ctx: TransactionContext, id: string) => Promise<void>;
  deleteByModelIdTx: (
    ctx: TransactionContext,
    modelId: string,
  ) => Promise<Array<ModelDraftEntity>>;
  deleteStaleBefore: (cutoff: Date) => Promise<Array<ModelDraftEntity>>;
}
