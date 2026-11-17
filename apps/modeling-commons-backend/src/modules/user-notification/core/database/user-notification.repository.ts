import { Prisma, type UserNotification } from '#prisma/index';
import {
  toUserNotificationRecord,
  type UserNotificationRecord,
} from '#src/modules/user-notification/core/database/user-notification.record.ts';
import type {
  InsertUserNotificationParams,
  UserNotificationRepositoryPort,
} from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import type {
  Feed,
  NotificationRedaction,
} from '#src/modules/user-notification/core/types/index.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { PaginatedQueryParams, Paginated } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { newId } from '#src/shared/utils/id.ts';

function feedWhere(recipientId: string, filters: Feed.Filters): Prisma.UserNotificationWhereInput {
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
export function buildInsertNotificationQuery(
  id: string,
  params: InsertUserNotificationParams,
): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "UserNotification"
      ("id", "recipientId", "eventId", "category", "url", "payload", "actorId", "targetType", "targetId", "inAppSuppressed")
    VALUES
      (${id}, ${params.recipientId}, ${params.eventId}, ${params.category}, ${params.url}, ${JSON.stringify(params.payload)}::jsonb, ${params.actorId ?? null}, ${params.targetType ?? null}, ${params.targetId ?? null}, ${params.inAppSuppressed})
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
      const [inserted] = await client.$queryRaw<Array<UserNotification>>(
        buildInsertNotificationQuery(newId(), params),
      );
      return toUserNotificationRecord(
        inserted ??
          (await client.userNotification.findUniqueOrThrow({
            where: {
              eventId_recipientId_category: {
                eventId: params.eventId,
                recipientId: params.recipientId,
                category: params.category,
              },
            },
          })),
      );
    },

    async markEmailSentTx(
      ids: Array<string>,
      at: Date,
      ctx: TransactionContext,
    ): Promise<Array<string>> {
      const notifications = await resolveTransaction(ctx).userNotification.updateManyAndReturn({
        where: { id: { in: ids }, emailSentAt: null },
        data: { emailSentAt: at },
        select: { id: true },
      });
      return notifications.map((notification) => notification.id);
    },

    async claimDigestTx(recipientId: string, day: Date, ctx: TransactionContext): Promise<boolean> {
      const { count } = await resolveTransaction(ctx).notificationDigest.createMany({
        data: { recipientId, day },
        skipDuplicates: true,
      });
      return count === 1;
    },

    async findPendingForRecipient(
      recipientId: string,
      categories: Array<NotificationCategory>,
      since: Date,
      until: Date,
    ): Promise<Array<UserNotificationRecord>> {
      const records = await db.userNotification.findMany({
        where: {
          recipientId,
          category: { in: categories },
          emailSentAt: null,
          createdAt: { gte: since, lte: until },
        },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toUserNotificationRecord);
    },

    async findDigestRecipients(
      since: Date,
      until: Date,
      dailyByDefault: Array<NotificationCategory>,
      afterRecipientId: string | null,
      limit: number,
    ): Promise<Array<string>> {
      // Raw SQL: Prisma has no query for a preference left join with a default-category
      // fallback plus grouped keyset pagination over recipients.
      const recipients = await db.$queryRaw<Array<{ recipientId: string }>>`
        SELECT n."recipientId"
        FROM "UserNotification" n
        LEFT JOIN "UserNotificationPreference" p
          ON p."userId" = n."recipientId" AND p."category" = n."category"
        WHERE n."emailSentAt" IS NULL
          AND n."createdAt" >= ${since}
          AND n."createdAt" <= ${until}
          AND (p."email" = 'daily' OR (p."id" IS NULL AND n."category" = ANY(${dailyByDefault})))
          ${afterRecipientId === null ? Prisma.empty : Prisma.sql`AND n."recipientId" > ${afterRecipientId}`}
        GROUP BY n."recipientId"
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

    async redactPayloads(
      categories: ReadonlyArray<string>,
      { match, payloadFields }: NotificationRedaction,
    ): Promise<number> {
      // Raw SQL: Prisma updates replace a Json column whole and cannot merge keys into it.
      // Fields are blanked rather than dropped so the payload keeps its declared shape.
      return db.$executeRaw`
        UPDATE "UserNotification"
        SET "payload" = "payload" || (
          SELECT COALESCE(jsonb_object_agg(field, ''), '{}'::jsonb)
          FROM unnest(${payloadFields}::text[]) AS field
        )
        WHERE "category" = ANY(${categories})
          AND "payload" ->> ${match.payloadKey} = ${match.value}
      `;
    },

    async findOneById(id: string): Promise<UserNotificationRecord | undefined> {
      const record = await db.userNotification.findUnique({ where: { id } });
      return record ? toUserNotificationRecord(record) : undefined;
    },

    async findAllByRecipient(
      recipientId: string,
      filters: Feed.Filters,
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

      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map(toUserNotificationRecord),
      };
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
      await db.notificationDigest.deleteMany({ where: { day: { lt: cutoff } } });
      const { count } = await db.userNotification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return count;
    },
  };
}
