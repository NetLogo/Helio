import type { UserEntity, UserSearchFilters } from '#src/modules/user/domain/user.types.ts';
import type {
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { SystemRole, UserKind } from './user.record.ts';

export interface UserRepository extends RepositoryPort<UserEntity> {
  findByIdIncludeDeleted: (id: string) => Promise<UserEntity | undefined>;
  softDelete: (ctx: TransactionContext, id: string) => Promise<void>;
  updateFields: (
    ctx: TransactionContext,
    id: string,
    data: {
      userKind?: UserKind;
      isProfilePublic?: boolean;
      systemRole?: SystemRole;
      onboardedAt?: Date | null;
    },
  ) => Promise<void>;
  search: (
    filters: UserSearchFilters,
    params: PaginatedQueryParams,
    publicOnly: boolean,
  ) => Promise<Paginated<UserEntity>>;
}
