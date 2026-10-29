import { DAY_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';

const workersConfig = {
  modelDraftJanitor: {
    queueName: 'purge-stale-model-drafts',
    cronExpression: '0 3 * * 0', // Sunday 03:00 UTC
    staleMs: 90 * DAY_MS,
  },
  eventProcessor: {
    queueName: 'process-events',
    cronExpression: '*/1 * * * *',
    // A drain is a drain: with at most one job queued, a burst of writes collapses into a single
    // pass instead of one redundant scan per event. The cron send collapses into it too.
    queuePolicy: 'short',
    // A full batch means more is waiting, so keep going rather than leave it for the next tick.
    // Bounded because a batch of poison events keeps coming back until `attempts` catches up.
    maxDrainPasses: 10,
    eventBatchSize: 50,
    maxEventAttempts: 5,
  },
  emailSender: {
    queueName: 'send-emails',
    cronExpression: '*/1 * * * *',
    queuePolicy: 'short',
    maxDrainPasses: 10,
    emailBatchSize: 50,
    // Doubling from one minute, eight attempts span about two hours of SMTP outage.
    maxEmailAttempts: 8,
    retryBaseMs: MINUTE_MS,
  },
  digestProcessor: {
    queueName: 'send-notification-digests',
    cronExpression: '0 17 * * *',
    recipientBatchSize: 25,
    retryLimit: 3,
    retryDelaySeconds: 30 * 60,
    expireInSeconds: 60 * 60,
  },
  notificationJanitor: {
    queueName: 'purge-notifications',
    cronExpression: '0 4 * * 0',
    retentionMs: 90 * DAY_MS,
    sentEmailRetentionMs: 30 * DAY_MS,
    failedEmailRetentionMs: 90 * DAY_MS,
  },
} as const;

export default workersConfig;
