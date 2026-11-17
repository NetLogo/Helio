import { MINUTE_MS, SECOND_MS } from '#src/shared/utils/consts.ts';

const realtimeConfig = {
  channel: 'mc_realtime',
  streams: {
    maxPerUser: 16,
    maxTopicsPerStream: 16,
    heartbeatIntervalMs: 25 * SECOND_MS,
    clientRetryMs: 10 * SECOND_MS,
    maxStreamLifetimeMs: 15 * MINUTE_MS,
    closingRetryMs: SECOND_MS,
  },
  listener: {
    applicationName: 'mc-sse-listener',
    keepAliveInitialDelayMs: 30 * SECOND_MS,
    reconnectBaseDelayMs: 500,
    reconnectMaxDelayMs: 30 * SECOND_MS,
  },
} as const;

export default realtimeConfig;
