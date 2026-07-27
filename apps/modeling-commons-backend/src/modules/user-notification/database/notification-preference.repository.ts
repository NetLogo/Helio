import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type {
  NotificationPreferenceRepositoryPort,
  UpsertNotificationPreferenceParams,
} from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export default function notificationPreferenceRepository({
  db,
}: Dependencies): NotificationPreferenceRepositoryPort {
  return {
    async findAllByUser(userId: string): Promise<Array<NotificationPreferenceRecord>> {
      return db.userNotificationPreference.findMany({ where: { userId } });
    },

    async upsertTx(
      ctx: TransactionContext,
      params: UpsertNotificationPreferenceParams,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.userNotificationPreference.upsert({
        where: { userId_category: { userId: params.userId, category: params.category } },
        create: params,
        update: { email: params.email, inApp: params.inApp },
      });
    },
  };
}
