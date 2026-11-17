import { DAY_S, HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';

const notificationsConfig = {
  maxDigestItems: 50,
  windowMs: 48 * HOUR_MS,
  minAgeMs: 5 * MINUTE_MS,
  unsubscribeTokenPurpose: 'notification-unsubscribe',
  unsubscribeTokenTtlSeconds: 90 * DAY_S,
} as const;

export default notificationsConfig;
