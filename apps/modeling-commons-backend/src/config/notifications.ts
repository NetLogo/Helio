import { HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';

const notificationsConfig = {
  maxDigestItems: 50,
  windowMs: 25 * HOUR_MS,
  minAgeMs: 5 * MINUTE_MS,
  unsubscribeTokenPurpose: 'notification-unsubscribe',
} as const;

export default notificationsConfig;
