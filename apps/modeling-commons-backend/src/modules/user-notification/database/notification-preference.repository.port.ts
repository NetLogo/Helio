import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export type UpsertNotificationPreferenceParams = {
  userId: string;
  category: string;
  email: boolean;
  inApp: boolean;
};

export interface NotificationPreferenceRepositoryPort {
  findAllByUser: (userId: string) => Promise<Array<NotificationPreferenceRecord>>;
  upsertTx: (ctx: TransactionContext, params: UpsertNotificationPreferenceParams) => Promise<void>;
}
