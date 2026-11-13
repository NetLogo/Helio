import { notificationEventTypes } from '#src/modules/notification-catalog.ts';
import { DAY_MS, DAY_S } from '#src/shared/utils/consts.ts';

const workersConfig = {
  schema: 'pgboss',
  apiPoolSize: 2,
  deadLetter: {
    retentionSeconds: 30 * DAY_S,
    deleteAfterSeconds: 30 * DAY_S,
  },
  userNotifications: {
    queueName: 'user-notifications',
    subscribesTo: notificationEventTypes,
    options: {
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: 5 * 60,
    },
    work: {
      localConcurrency: 4,
    },
  },
  sendEmail: {
    queueName: 'send-email',
    options: {
      retryLimit: 8,
      retryDelay: 60,
      retryBackoff: true,
      retryDelayMax: 2 * 60 * 60,
      expireInSeconds: 2 * 60,
      deleteAfterSeconds: 30 * DAY_S,
    },
    work: {
      localConcurrency: 4,
    },
  },
  dailyDigest: {
    queueName: 'send-daily-digests',
    options: {
      retryLimit: 3,
      retryDelay: 30 * 60,
      expireInSeconds: 60 * 60,
    },
    cronExpression: '0 17 * * *', // 17:00 UTC daily
    recipientBatchSize: 25,
  },
  sendDigest: {
    queueName: 'send-digest',
    options: {
      retryLimit: 3,
      retryDelay: 10 * 60,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: 5 * 60,
    },
    work: {
      localConcurrency: 4,
    },
  },
  modelDraftJanitor: {
    queueName: 'purge-stale-model-drafts',
    options: {
      retryDelay: 5 * 60,
    },
    cronExpression: '0 3 * * 0', // Sunday 03:00 UTC
    staleMs: 90 * DAY_MS,
  },
  notificationJanitor: {
    queueName: 'purge-notifications',
    options: {
      retryDelay: 5 * 60,
    },
    cronExpression: '0 4 * * 0', // Sunday 04:00 UTC
    retentionMs: 90 * DAY_MS,
  },
} as const;

export const subscriberQueues = [workersConfig.userNotifications];

export const workerQueues = [
  workersConfig.sendEmail,
  workersConfig.dailyDigest,
  workersConfig.sendDigest,
  workersConfig.modelDraftJanitor,
  workersConfig.notificationJanitor,
];

export default workersConfig;
