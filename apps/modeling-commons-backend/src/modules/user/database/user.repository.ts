import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';
import type {
  UserEntity,
  UserSearchFilters,
  UserKind,
  SystemRole,
} from '#src/modules/user/domain/user.types.ts';
import type { UserRecord } from '#src/modules/user/user.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function userRepository({
  db,
  userMapper,
  repositoryBase,
}: Dependencies): UserRepository {
  const tableName = 'user';
  const base = repositoryBase<UserEntity, UserRecord>({
    tableName,
    mapper: userMapper,
  });

  return {
    ...base,

    async findByIdIncludeDeleted(id: string): Promise<UserEntity | undefined> {
      const record = await db.user.findUnique({ where: { id } });
      return record ? userMapper.toDomain(record as unknown as UserRecord) : undefined;
    },

    async softDelete(ctx: TransactionContext, id: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },

    async updateFields(
      ctx: TransactionContext,
      id: string,
      data: { userKind?: UserKind; isProfilePublic?: boolean; systemRole?: SystemRole },
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.user.update({ where: { id }, data });
    },

    async search(
      filters: UserSearchFilters,
      params: PaginatedQueryParams,
      publicOnly: boolean,
    ): Promise<Paginated<UserEntity>> {
      const where: Pick<UserSearchFilters, 'userKind' | 'systemRole'> & {
        deletedAt: null;
        isProfilePublic?: boolean;
      } = { deletedAt: null };

      if (publicOnly) {
        where.isProfilePublic = true;
      }

      if (filters.userKind) where.userKind = filters.userKind;
      if (filters.systemRole) where.systemRole = filters.systemRole;

      const [count, records] = await Promise.all([
        db.user.count({ where }),
        db.user.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);

      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => userMapper.toDomain(r as UserRecord)),
      };
    },
  };
}
