import { notificationEventTypes } from '#src/modules/notification-producers.ts';
import { realtimeEventTypes } from '#src/modules/realtime-topics.ts';
import { DAY_MS, DAY_S } from '#src/shared/utils/consts.ts';

const workersConfig = {
  schema: 'pgboss',
  apiPoolSize: 2,
  polling: {
    intervalSeconds: 2,
  },
  deadLetter: {
    retentionSeconds: 30 * DAY_S,
    deleteAfterSeconds: 30 * DAY_S,
  },
  retiredQueueNames: [
    'send-notification-digests',
    'process-events',
    'send-emails',
    'event-dispatch',
  ],
  userNotifications: {
    queueName: 'user-notifications',
    subscribesTo: notificationEventTypes,
    queue: {
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: 5 * 60,
      deleteAfterSeconds: 7 * DAY_S,
    },
    work: {
      localConcurrency: 4,
    },
  },
  realtime: {
    queueName: 'realtime',
    subscribesTo: realtimeEventTypes,
    queue: {
      retryLimit: 1,
      retryDelay: 1,
      retryBackoff: false,
      expireInSeconds: 30,
      deleteAfterSeconds: 60 * 60,
    },
    work: {
      localConcurrency: 4,
      pollingIntervalSeconds: 0.5,
    },
  },
  sendEmail: {
    queueName: 'send-email',
    queue: {
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
  queueNotificationDigests: {
    queueName: 'queue-notification-digests',
    queue: {
      retryLimit: 3,
      retryDelay: 30 * 60,
      retryBackoff: false,
      expireInSeconds: 60 * 60,
      deleteAfterSeconds: 7 * DAY_S,
    },
    cronExpression: '0 17 * * *', // 17:00 UTC daily
    recipientBatchSize: 25,
  },
  sendDigest: {
    queueName: 'send-digest',
    queue: {
      retryLimit: 3,
      retryDelay: 10 * 60,
      retryBackoff: true,
      retryDelayMax: 60 * 60,
      expireInSeconds: 5 * 60,
      deleteAfterSeconds: 7 * DAY_S,
    },
    work: {
      localConcurrency: 4,
    },
    singletonSeconds: DAY_S,
  },
  modelDraftJanitor: {
    queueName: 'purge-stale-model-drafts',
    queue: {
      retryLimit: 2,
      retryDelay: 5 * 60,
      deleteAfterSeconds: 7 * DAY_S,
    },
    cronExpression: '0 3 * * 0', // Sunday 03:00 UTC
    staleMs: 90 * DAY_MS,
  },
  notificationJanitor: {
    queueName: 'purge-notifications',
    queue: {
      retryLimit: 2,
      retryDelay: 5 * 60,
      deleteAfterSeconds: 7 * DAY_S,
    },
    cronExpression: '0 4 * * 0', // Sunday 04:00 UTC
    retentionMs: 90 * DAY_MS,
  },
} as const;

export default workersConfig;
