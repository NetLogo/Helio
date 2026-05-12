import type { Model, ModelInteractionKind, Prisma } from '#prisma/index';
import type { ModelCardRecord } from '#src/modules/model/database/model.card.record.ts';
import type { ModelSearchFilters } from '#src/modules/model/dtos/model.dto.ts';
import type { ModelVisibility } from '#src/modules/model/shared/enums.ts';
import type {
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface ModelRepository extends RepositoryPort<Model> {
  findByIdIncludeDeleted(id: string): Promise<Model | undefined>;
  setLatestVersion(ctx: TransactionContext, modelId: string, versionNumber: number): Promise<void>;
  softDelete(ctx: TransactionContext, id: string): Promise<void>;
  search<T, I extends Prisma.ModelInclude>(
    filters: ModelSearchFilters,
    params: PaginatedQueryParams,
    userId: string | null,
    options: {
      include?: I;
      map: (record: Prisma.ModelGetPayload<{ include: I }>) => T;
    },
  ): Promise<Paginated<T>>;
  fetchByInteraction<I extends Prisma.ModelInclude>(
    where: Prisma.ModelWhereInput,
    params: PaginatedQueryParams,
    interactionKind: ModelInteractionKind,
    options: {
      include?: I;
      order: 'asc' | 'desc';
    },
  ): Promise<{ count: number; sorted: Prisma.ModelGetPayload<{ include: I }>[] }>;
  findChildren(modelId: string, params: PaginatedQueryParams): Promise<Paginated<Model>>;
  findCard(modelId: string): Promise<ModelCardRecord | null>;
  insertTx(ctx: TransactionContext, entity: Model): Promise<void>;
  updateFields(
    ctx: TransactionContext,
    id: string,
    data: { visibility?: ModelVisibility; isEndorsed?: boolean },
  ): Promise<void>;
  resolveLegacyId(legacyId: number): Promise<string | undefined>;
  findRandomPublic(): Promise<{ id: string; title: string } | undefined>;
}
