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
  title: string;
  body: string;
  url: string;
};

export interface UserNotificationRepositoryPort {
  insertTx: (
    ctx: TransactionContext,
    params: InsertUserNotificationParams,
  ) => Promise<UserNotificationRecord | undefined>;
  markEmailSent: (id: string, at: Date) => Promise<void>;
  markRead: (id: string, at: Date) => Promise<void>;
  findOneById: (id: string) => Promise<UserNotificationRecord | undefined>;
  findAllByRecipient: (
    recipientId: string,
    filters: NotificationFeedFilters,
    params: PaginatedQueryParams,
  ) => Promise<Paginated<UserNotificationRecord>>;
  countUnread: (recipientId: string, categories: Array<NotificationCategory>) => Promise<number>;
}
