import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { userNotificationEventTypes } from '#src/modules/event/domain/event-types.ts';
import { handleFailedDeliveries } from '#src/modules/user-notification/delivery-failures.ts';
import { InvalidUnsubscribeTokenError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  DeliverableRecipient,
  EmailMode,
  EmailModeByCategory,
  NotificationCategory,
  NotificationChannels,
  NotificationRowFacts,
  NotificationProducer,
  UserNotificationCreatedJobData,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type { NotificationPreferenceResponseDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';

export type UpdatePreferenceInput = {
  category: NotificationCategory;
  email?: EmailMode;
  inApp?: boolean;
};

type ResolvedRowFacts = { producer: NotificationProducer; facts: NotificationRowFacts };

export function createUserNotificationService(
  producers: ReadonlyArray<NotificationProducer>,
  {
    transactionManager,
    notificationPreferenceRepository,
    userNotificationRepository,
    userNotificationDomain,
    userNotificationMapper,
    userRepository,
    notificationEmailService,
    notificationDigestService,
    getNotificationPreviewsQuery,
    mailDomain,
    jobQueue,
    logger,
  }: Dependencies,
) {
  async function findDeliverableRecipient(facts: NotificationRowFacts) {
    const recipient = await userRepository.findOneById(facts.recipientUserId);
    if (!userNotificationDomain.isDeliverableRecipient(recipient)) return undefined;

    const preferences = await notificationPreferenceRepository.findAllByUser(recipient.id);
    const override = preferences.find((preference) => preference.category === facts.category);
    const channels = userNotificationDomain.resolvePreference(facts.category, override);
    if (userNotificationDomain.isSuppressed(channels)) return undefined;

    return { recipient, channels };
  }

  async function recordLedgerRow(
    event: EventRecord,
    recipient: DeliverableRecipient,
    facts: NotificationRowFacts,
    channels: NotificationChannels,
  ) {
    return transactionManager.run(async (ctx) =>
      userNotificationRepository.insertTx(
        ctx,
        userNotificationDomain.createLedgerRow(event, recipient.id, facts, channels),
      ),
    );
  }

  async function renderLedgerEmail(
    producer: NotificationProducer,
    ledger: UserNotificationRecord,
    recipient: DeliverableRecipient,
    category: NotificationCategory,
  ) {
    const previews = await getNotificationPreviewsQuery.execute([ledger], recipient.id);
    const emailLinks = userNotificationDomain.getEmailLinks(recipient.id, [category]);
    const content = await producer.renderEmail(
      ledger,
      { id: recipient.id, email: recipient.email, name: recipient.name },
      previews.get(ledger.id) ?? { actor: null, target: null },
      emailLinks,
    );
    return mailDomain.withOneClickUnsubscribe(content, emailLinks.oneClickUnsubscribeUrl);
  }

  async function deliver(
    event: EventRecord,
    { producer, facts }: ResolvedRowFacts,
  ): Promise<UserNotificationRecord | undefined> {
    const deliverable = await findDeliverableRecipient(facts);
    if (!deliverable) return undefined;

    const { recipient, channels } = deliverable;
    const ledger = await recordLedgerRow(event, recipient, facts, channels);
    if (!userNotificationDomain.isSendableNow(channels)) return ledger;

    await notificationEmailService.queueRows([ledger.id], async () =>
      renderLedgerEmail(producer, ledger, recipient, facts.category),
    );
    return ledger;
  }

  async function updatePreferences(
    userId: string,
    preferences: Array<UpdatePreferenceInput>,
  ): Promise<void> {
    const { previous, next } = await transactionManager.run(async (ctx) => {
      const existing = await notificationPreferenceRepository.findAllByUserTx(ctx, userId);
      const existingByCategory = new Map(existing.map((row) => [row.category, row]));
      const previousModes: EmailModeByCategory = {};
      const nextModes: EmailModeByCategory = {};

      for (const preference of preferences) {
        const resolved = userNotificationDomain.resolvePreference(
          preference.category,
          existingByCategory.get(preference.category),
        );
        const email = preference.email ?? resolved.email;

        await notificationPreferenceRepository.upsertTx(ctx, {
          userId,
          category: preference.category,
          email,
          inApp: preference.inApp ?? resolved.inApp,
        });
        previousModes[preference.category] = resolved.email;
        nextModes[preference.category] = email;
      }

      return { previous: previousModes, next: nextModes };
    });

    const flushed = userNotificationDomain.listFlushedCategories(previous, next);
    if (flushed.length === 0) return;

    void notificationDigestService.queueFlushedDigest(userId, flushed).catch((error: unknown) => {
      logger.error({
        name: 'UserNotificationService',
        message: 'Failed to flush the notification digest',
        error,
      });
    });
  }

  async function publishCreated(recipientIds: Array<string>): Promise<void> {
    if (recipientIds.length === 0) return;
    const data: UserNotificationCreatedJobData = { recipientIds };
    await jobQueue.publish(userNotificationEventTypes.created, data);
  }

  return {
    async handleEvent(event: EventRecord): Promise<void> {
      const applicable = producers.filter((producer) => producer.eventTypes.includes(event.type));
      if (applicable.length === 0) return;

      const resolutions = await Promise.allSettled(
        applicable.map(async (producer) => {
          const rowFacts = await producer.resolve(event);
          return rowFacts.map((facts): ResolvedRowFacts => ({ producer, facts }));
        }),
      );
      const resolved = resolutions
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      const deliveries = await Promise.allSettled(
        resolved.map(async (entry) => deliver(event, entry)),
      );
      const ledgerRows = deliveries.flatMap((result) =>
        result.status === 'fulfilled' && result.value ? [result.value] : [],
      );
      const publications = await Promise.allSettled([
        publishCreated(userNotificationDomain.listInAppRecipientIds(ledgerRows)),
      ]);
      handleFailedDeliveries(
        [
          { results: resolutions, message: 'A producer failed to resolve row facts' },
          { results: deliveries, message: 'Failed to deliver a notification' },
          { results: publications, message: 'Failed to publish the created notifications' },
        ],
        logger,
        {
          name: 'UserNotificationService',
          summary: 'One or more notifications failed to resolve or deliver',
        },
      );
    },

    async markRead(userId: string, notificationId: string): Promise<void> {
      const notification = await userNotificationRepository.findOneById(notificationId);
      userNotificationDomain.assertOwnedByRecipient(notification, notificationId, userId);
      if (userNotificationDomain.isRead(notification)) return;

      await userNotificationRepository.markRead(notificationId, new Date());
    },

    async getPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const overrideByCategory = new Map(
        overrides
          .filter((override) => userNotificationDomain.isKnownCategory(override.category))
          .map((override) => [override.category, override]),
      );

      const categories = userNotificationDomain.categories.map((info) => {
        const resolved = userNotificationDomain.resolvePreference(
          info.category,
          overrideByCategory.get(info.category),
        );
        return userNotificationMapper.toCategoryPreference(info, resolved);
      });

      return { categories };
    },

    updatePreferences,

    async unsubscribe(token: string): Promise<void> {
      const claims = userNotificationDomain.readUnsubscribeToken(token);
      if (!claims) throw new InvalidUnsubscribeTokenError();

      await updatePreferences(
        claims.userId,
        claims.categories.map((category) => ({ category, email: 'off' })),
      );
    },
  };
}

export default function makeUserNotificationService(deps: Dependencies) {
  return createUserNotificationService(deps.notificationProducers, deps);
}
