import type { Prisma } from '#prisma/index';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  NotificationCategory,
  NotificationFeedFilters,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type InsertUserNotificationParams = {
  recipientId: string;
  eventId: string;
  category: string;
  url: string;
  payload: Prisma.InputJsonObject;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  inAppSuppressed: boolean;
};

export interface UserNotificationRepositoryPort {
  insertTx: (
    ctx: TransactionContext,
    params: InsertUserNotificationParams,
  ) => Promise<UserNotificationRecord>;
  markEmailSentTx: (
    ids: Array<string>,
    at: Date,
    ctx: TransactionContext,
  ) => Promise<Array<string>>;
  findPendingForRecipient: (
    recipientId: string,
    categories: Array<NotificationCategory>,
    since: Date,
    until: Date,
  ) => Promise<Array<UserNotificationRecord>>;
  findDigestRecipients: (
    since: Date,
    until: Date,
    dailyByDefault: Array<NotificationCategory>,
    afterRecipientId: string | null,
    limit: number,
  ) => Promise<Array<string>>;
  markRead: (id: string, at: Date) => Promise<void>;
  findOneById: (id: string) => Promise<UserNotificationRecord | undefined>;
  findAllByRecipient: (
    recipientId: string,
    filters: NotificationFeedFilters,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<UserNotificationRecord>>;
  countUnread: (recipientId: string, categories: Array<NotificationCategory>) => Promise<number>;
  deleteOrphaned: () => Promise<number>;
  deleteOlderThan: (cutoff: Date) => Promise<number>;
}
