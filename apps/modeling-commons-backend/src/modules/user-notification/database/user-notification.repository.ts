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
import { newId } from '#src/shared/utils/id.ts';

function feedWhere(
  recipientId: string,
  filters: NotificationFeedFilters,
): Prisma.UserNotificationWhereInput {
  return {
    recipientId,
    category: { in: filters.categories },
    inAppSuppressed: false,
    ...(filters.since ? { createdAt: { gte: filters.since } } : {}),
    ...(filters.unreadOnly ? { readAt: null } : {}),
  };
}

// Raw SQL: Prisma create cannot express ON CONFLICT DO NOTHING with RETURNING, and a caught
// P2002 leaves the surrounding Postgres transaction aborted.
export function buildInsertLedgerRowQuery(
  id: string,
  params: InsertUserNotificationParams,
): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "UserNotification"
      ("id", "recipientId", "eventId", "category", "url", "payload", "actorUserId", "targetType", "targetId", "inAppSuppressed")
    VALUES
      (${id}, ${params.recipientId}, ${params.eventId}, ${params.category}, ${params.url}, ${JSON.stringify(params.payload)}::jsonb, ${params.actorUserId ?? null}, ${params.targetType ?? null}, ${params.targetId ?? null}, ${params.inAppSuppressed})
    ON CONFLICT ("eventId", "recipientId", "category") DO NOTHING
    RETURNING *
  `;
}

export default function userNotificationRepository({
  db,
}: Dependencies): UserNotificationRepositoryPort {
  return {
    async insertTx(
      ctx: TransactionContext,
      params: InsertUserNotificationParams,
    ): Promise<UserNotificationRecord> {
      const client = resolveTransaction(ctx);
      const [inserted] = await client.$queryRaw<Array<UserNotificationRecord>>(
        buildInsertLedgerRowQuery(newId(), params),
      );
      return (
        inserted ??
        client.userNotification.findUniqueOrThrow({
          where: {
            eventId_recipientId_category: {
              eventId: params.eventId,
              recipientId: params.recipientId,
              category: params.category,
            },
          },
        })
      );
    },

    async markEmailSentTx(
      ids: Array<string>,
      at: Date,
      ctx: TransactionContext,
    ): Promise<Array<string>> {
      const rows = await resolveTransaction(ctx).userNotification.updateManyAndReturn({
        where: { id: { in: ids }, emailSentAt: null },
        data: { emailSentAt: at },
        select: { id: true },
      });
      return rows.map((row) => row.id);
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
