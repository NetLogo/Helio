import { Prisma } from '#prisma/index';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  InsertUserNotificationParams,
  UserNotificationRepositoryPort,
} from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type {
  NotificationCategory,
  NotificationFeedFilters,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { PaginatedQueryParams, Paginated } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

function feedWhere(
  recipientId: string,
  filters: NotificationFeedFilters,
): Prisma.UserNotificationWhereInput {
  return {
    recipientId,
    category: { in: filters.categories },
    ...(filters.since ? { createdAt: { gte: filters.since } } : {}),
    ...(filters.unreadOnly ? { readAt: null } : {}),
  };
}

export default function userNotificationRepository({
  db,
}: Dependencies): UserNotificationRepositoryPort {
  return {
    // Swallowing P2002 leaves the surrounding transaction aborted in Postgres, so this must
    // stay the last write of its transaction - any statement after it would fail on a
    // connection that can only roll back.
    async insertTx(
      ctx: TransactionContext,
      params: InsertUserNotificationParams,
    ): Promise<UserNotificationRecord | undefined> {
      const client = resolveTransaction(ctx);
      try {
        return await client.userNotification.create({ data: params });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return undefined;
        }
        throw error;
      }
    },

    async markEmailSent(id: string, at: Date): Promise<void> {
      await db.userNotification.update({
        where: { id },
        data: { emailSentAt: at },
      });
    },

    async markRead(id: string, at: Date): Promise<void> {
      await db.userNotification.update({
        where: { id },
        data: { readAt: at },
      });
    },

    async findOneById(id: string): Promise<UserNotificationRecord | undefined> {
      return (await db.userNotification.findUnique({ where: { id } })) ?? undefined;
    },

    async findAllByRecipient(
      recipientId: string,
      filters: NotificationFeedFilters,
      params: PaginatedQueryParams,
    ): Promise<Paginated<UserNotificationRecord>> {
      const where = feedWhere(recipientId, filters);

      const [records, count] = await Promise.all([
        db.userNotification.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
        db.userNotification.count({ where }),
      ]);

      return { count, limit: params.limit, page: params.page, data: records };
    },

    async countUnread(
      recipientId: string,
      categories: Array<NotificationCategory>,
    ): Promise<number> {
      return db.userNotification.count({
        where: feedWhere(recipientId, { categories, unreadOnly: true }),
      });
    },
  };
}
