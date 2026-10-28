import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { EmailMode } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type UpsertNotificationPreferenceParams = {
  userId: string;
  category: string;
  email: EmailMode;
  inApp: boolean;
};

export interface NotificationPreferenceRepositoryPort {
  findAllByUser: (userId: string) => Promise<Array<NotificationPreferenceRecord>>;
  findAllByUserTx: (
    ctx: TransactionContext,
    userId: string,
  ) => Promise<Array<NotificationPreferenceRecord>>;
  upsertTx: (ctx: TransactionContext, params: UpsertNotificationPreferenceParams) => Promise<void>;
}
