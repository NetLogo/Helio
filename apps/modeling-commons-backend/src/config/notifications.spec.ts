import { describe, it, expect } from 'vitest';
import mailConfig from '#src/config/mail.ts';
import notificationsConfig, { isSendWithinLease } from '#src/config/notifications.ts';

describe('isSendWithinLease', () => {
  it('keeps the configured SMTP timeouts below the claim lease', () => {
    expect(isSendWithinLease(mailConfig, notificationsConfig.claimLeaseMs)).toBe(true);
  });

  it('rejects timeouts whose sum reaches the lease', () => {
    const timeouts = { connectionTimeout: 1_000, greetingTimeout: 2_000, socketTimeout: 3_000 };
    expect(isSendWithinLease(timeouts, 6_000)).toBe(false);
  });
});
