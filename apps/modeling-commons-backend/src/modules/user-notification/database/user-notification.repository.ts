import { Prisma } from '#prisma/index';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  InsertUserNotificationParams,
  UserNotificationRepositoryPort,
} from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export default function userNotificationRepository({
  db,
}: Dependencies): UserNotificationRepositoryPort {
  return {
    // Swallowing P2002 leaves the surrounding transaction aborted in Postgres, so this must
    // stay the last write of its transaction - any statement after it would fail on a
    // connection that can only roll back.
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

    async markEmailSent(id: string, at: Date): Promise<void> {
      await db.userNotification.update({
        where: { id },
        data: { emailSentAt: at },
      });
    },
  };
}
