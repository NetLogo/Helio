import { HOUR_MS, MINUTE_MS } from '#src/shared/utils/consts.ts';

interface SendTimeouts {
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}

const notificationsConfig = {
  claimLeaseMs: 15 * MINUTE_MS,
  maxDigestItems: 50,
  windowMs: 25 * HOUR_MS,
  minAgeMs: 5 * MINUTE_MS,
} as const;

export function isSendWithinLease(mailConfig: SendTimeouts, leaseMs: number): boolean {
  return mailConfig.connectionTimeout + mailConfig.greetingTimeout + mailConfig.socketTimeout < leaseMs;
}

export default notificationsConfig;
