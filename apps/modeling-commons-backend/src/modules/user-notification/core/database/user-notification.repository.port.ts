import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import type {
  Feed,
  Notification,
  NotificationRedaction,
} from '#src/modules/user-notification/core/types/index.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type InsertUserNotificationParams = {
  recipientId: string;
  eventId: string;
  category: NotificationCategory;
  url: string;
  payload: Notification['payload'];
  actorId?: string | null;
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
  claimDigestTx: (recipientId: string, day: Date, ctx: TransactionContext) => Promise<boolean>;
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
  redactPayloads: (
    categories: ReadonlyArray<string>,
    redaction: NotificationRedaction,
  ) => Promise<number>;
  findOneById: (id: string) => Promise<UserNotificationRecord | undefined>;
  findAllByRecipient: (
    recipientId: string,
    filters: Feed.Filters,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<UserNotificationRecord>>;
  countUnread: (recipientId: string, categories: Array<NotificationCategory>) => Promise<number>;
  deleteOrphaned: () => Promise<number>;
  deleteOlderThan: (cutoff: Date) => Promise<number>;
}
