import type { UserEntity, UserSearchFilters } from '#src/modules/user/domain/user.types.ts';
import type {
  Paginated,
  PaginatedQueryParams,
  RepositoryPort,
} from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { SystemRole, UserKind } from './user.record.ts';

export type UserAvatarRecord = { id: string; name: string | null; image: string | null };

export interface UserRepository extends RepositoryPort<UserEntity> {
  findByIdIncludeDeleted: (id: string) => Promise<UserEntity | undefined>;
  findAvatarsByIds: (ids: Array<string>) => Promise<Array<UserAvatarRecord>>;
  softDeleteTx: (ctx: TransactionContext, id: string) => Promise<void>;
  updateFieldsTx: (
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
