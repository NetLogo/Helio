import { Prisma } from '#prisma/index';
import type {
  EmailClaimRecord,
  UserNotificationRecord,
} from '#src/modules/user-notification/database/user-notification.record.ts';
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
    // stay the last write of its transaction; read the existing row with
    // findOneByDeliveryKey after the transaction returns, never on this connection.
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

    async findOneByDeliveryKey(
      eventId: string,
      recipientId: string,
      category: NotificationCategory,
    ): Promise<UserNotificationRecord | undefined> {
      return (
        (await db.userNotification.findUnique({
          where: { eventId_recipientId_category: { eventId, recipientId, category } },
        })) ?? undefined
      );
    },

    async claimUnsent(ids: Array<string>, leaseMs: number): Promise<Array<EmailClaimRecord>> {
      // Raw SQL: the lease compare-and-set must read now() and make_interval in the same
      // statement that writes, and return the claim time, which updateMany cannot.
      return db.$queryRaw<Array<EmailClaimRecord>>`
        UPDATE "UserNotification"
        SET "emailClaimedAt" = now()
        WHERE "id" = ANY(${ids})
          AND "emailSentAt" IS NULL
          AND ("emailClaimedAt" IS NULL
            OR "emailClaimedAt" < now() - make_interval(secs => ${leaseMs / 1000}))
        RETURNING "id", "emailClaimedAt"
      `;
    },

    async markSent(ids: Array<string>, claimedAt: Date, at: Date): Promise<void> {
      await db.userNotification.updateMany({
        where: { id: { in: ids }, emailClaimedAt: claimedAt },
        data: { emailSentAt: at, emailClaimedAt: null },
      });
    },

    async releaseClaim(ids: Array<string>, claimedAt: Date): Promise<void> {
      await db.userNotification.updateMany({
        where: { id: { in: ids }, emailClaimedAt: claimedAt },
        data: { emailClaimedAt: null },
      });
    },

    async findPendingForRecipient(
      recipientId: string,
      categories: Array<NotificationCategory>,
      since: Date,
      until: Date,
    ): Promise<Array<UserNotificationRecord>> {
      return db.userNotification.findMany({
        where: {
          recipientId,
          category: { in: categories },
          emailSentAt: null,
          createdAt: { gte: since, lte: until },
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    async findDigestRecipients(
      since: Date,
      until: Date,
      dailyByDefault: Array<NotificationCategory>,
      afterRecipientId: string | null,
      limit: number,
    ): Promise<Array<string>> {
      // Raw SQL: Prisma has no query for a preference left join with a default-category
      // fallback plus DISTINCT keyset pagination over recipients.
      const recipients = await db.$queryRaw<Array<{ recipientId: string }>>`
        SELECT DISTINCT n."recipientId"
        FROM "UserNotification" n
        LEFT JOIN "UserNotificationPreference" p
          ON p."userId" = n."recipientId" AND p."category" = n."category"
        WHERE n."emailSentAt" IS NULL
          AND n."createdAt" >= ${since}
          AND n."createdAt" <= ${until}
          AND (p."email" = 'daily' OR (p."id" IS NULL AND n."category" = ANY(${dailyByDefault})))
          ${afterRecipientId === null ? Prisma.empty : Prisma.sql`AND n."recipientId" > ${afterRecipientId}`}
        ORDER BY n."recipientId"
        LIMIT ${limit}
      `;
      return recipients.map((recipient) => recipient.recipientId);
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

    async deleteOrphaned(): Promise<number> {
      return db.$executeRaw`
        DELETE FROM "UserNotification" n
        WHERE n."targetType" = 'model'
          AND n."targetId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "Model" m WHERE m."id" = n."targetId" AND m."deletedAt" IS NULL
          )
      `;
    },

    async deleteOlderThan(cutoff: Date): Promise<number> {
      const { count } = await db.userNotification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return count;
    },
  };
}
