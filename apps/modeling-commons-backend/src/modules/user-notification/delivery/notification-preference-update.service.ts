import workersConfig from '#src/config/workers.ts';
import { getPendingWindow } from '#src/modules/user-notification/digest/digest.domain.ts';
import type { UpdatePreferenceInput } from '#src/modules/user-notification/preferences/notification-preferences.service.ts';
import type { SendDigestJobData } from '#src/modules/user-notification/user-notification.events.ts';

const { queueName } = workersConfig.sendDigest;

export default function makeNotificationPreferenceUpdateService({
  transactionManager,
  notificationPreferencesService,
  jobQueue,
}: Dependencies) {
  return {
    async updatePreferences(
      userId: string,
      preferences: Array<UpdatePreferenceInput>,
    ): Promise<void> {
      await transactionManager.run(async (ctx) => {
        const switchedOn = await notificationPreferencesService.updatePreferencesTx(
          ctx,
          userId,
          preferences,
        );
        if (switchedOn.length === 0) return;

        const { since, until } = getPendingWindow(new Date());
        const data: SendDigestJobData = {
          recipientId: userId,
          since: since.toISOString(),
          until: until.toISOString(),
          categories: switchedOn,
        };
        await jobQueue.sendTx(ctx, queueName, data);
      });
    },
  };
}
