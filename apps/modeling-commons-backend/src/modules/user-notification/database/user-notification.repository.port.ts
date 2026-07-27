import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
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
}
