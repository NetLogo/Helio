import type {
  ModelAuthorEntity,
  AuthorRole,
} from '#src/modules/model-author/domain/model-author.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelAuthorRepository {
  findByCompositeKey(modelId: string, userId: string): Promise<ModelAuthorEntity | undefined>;
  findOwnerByModel(modelId: string): Promise<ModelAuthorEntity | undefined>;
  findAllByModel(modelId: string): Promise<ModelAuthorEntity[]>;
  findModelsByUser(
    userId: string,
    params: PaginatedQueryParams,
  ): Promise<Paginated<ModelAuthorEntity>>;
  insertTx(ctx: TransactionContext, entity: ModelAuthorEntity): Promise<void>;
  updateRoleTx(
    ctx: TransactionContext,
    modelId: string,
    userId: string,
    role: AuthorRole,
  ): Promise<void>;
  deleteTx(ctx: TransactionContext, modelId: string, userId: string): Promise<void>;
}
