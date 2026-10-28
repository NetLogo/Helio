import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeNotificationEmailService from '#src/modules/user-notification/notification-email.service.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/database/user-notification.repository.mock.ts';

describe('notificationEmailService sendClaimed', () => {
  const userNotificationRepository = mockUserNotificationRepository();
  const mailService = { sendMailAsync: vi.fn(), sendMail: vi.fn() };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const content = { to: 'recipient@example.test', subject: 'New comment' };

  const service = makeNotificationEmailService({
    userNotificationRepository,
    mailService,
    logger,
  } as never);

  const claims = new Map<string, Date>();
  const sentIds = new Set<string>();
  const claimedAt = new Date('2026-01-01T00:00:00Z');

  function isHeldClaim(id: string, claimedAt: Date): boolean {
    return claims.get(id)?.getTime() === claimedAt.getTime();
  }

  function holdElsewhere(id: string): void {
    claims.set(id, new Date(0));
  }

  beforeEach(() => {
    claims.clear();
    sentIds.clear();
    userNotificationRepository.claimUnsent
      .mockReset()
      .mockImplementation(async (ids: Array<string>) => {
        const emailClaimedAt = claimedAt;
        return ids
          .filter((id) => !claims.has(id) && !sentIds.has(id))
          .map((id) => {
            claims.set(id, emailClaimedAt);
            return { id, emailClaimedAt };
          });
      });
    userNotificationRepository.markSent
      .mockReset()
      .mockImplementation(async (ids: Array<string>, claimedAt: Date) => {
        for (const id of ids.filter((id) => isHeldClaim(id, claimedAt))) {
          claims.delete(id);
          sentIds.add(id);
        }
      });
    userNotificationRepository.releaseClaim
      .mockReset()
      .mockImplementation(async (ids: Array<string>, claimedAt: Date) => {
        for (const id of ids.filter((id) => isHeldClaim(id, claimedAt))) claims.delete(id);
      });
    mailService.sendMailAsync.mockReset().mockResolvedValue({});
    logger.error.mockReset();
  });

  it('builds and sends nothing when no row can be claimed', async () => {
    holdElsewhere('a');
    const buildEmail = vi.fn().mockResolvedValue(content);

    await service.sendClaimed(['a'], buildEmail);

    expect(buildEmail).not.toHaveBeenCalled();
    expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    expect(sentIds.size).toBe(0);
  });

  it('releases the claim and rethrows when building the email fails', async () => {
    const renderError = new Error('render failed');

    await expect(
      service.sendClaimed(['a', 'b'], vi.fn().mockRejectedValue(renderError)),
    ).rejects.toBe(renderError);

    expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    expect(sentIds.size).toBe(0);
    expect(claims.size).toBe(0);
  });

  it('releases the claim and rethrows when sending fails', async () => {
    const smtpError = new Error('SMTP unreachable');
    mailService.sendMailAsync.mockRejectedValue(smtpError);

    await expect(service.sendClaimed(['a', 'b'], vi.fn().mockResolvedValue(content))).rejects.toBe(
      smtpError,
    );

    expect(sentIds.size).toBe(0);
    expect(claims.size).toBe(0);
  });

  it('builds for and marks sent exactly the rows it claimed, and never releases them', async () => {
    holdElsewhere('held');
    const buildEmail = vi.fn().mockResolvedValue(content);

    await service.sendClaimed(['a', 'held', 'b'], buildEmail);

    expect(buildEmail).toHaveBeenCalledWith(['a', 'b']);
    expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
    expect([...sentIds].sort()).toEqual(['a', 'b']);
    expect(claims.get('held')).toEqual(new Date(0));
    expect(userNotificationRepository.releaseClaim).not.toHaveBeenCalled();
  });

  it('marks the claimed rows sent without sending when there is nothing to send', async () => {
    await service.sendClaimed(['a', 'b'], vi.fn().mockResolvedValue(null));

    expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    expect([...sentIds].sort()).toEqual(['a', 'b']);
  });

  it('logs and resolves when the email went out but marking it sent fails', async () => {
    const dbError = new Error('database unreachable');
    userNotificationRepository.markSent.mockRejectedValue(dbError);

    await expect(
      service.sendClaimed(['a'], vi.fn().mockResolvedValue(content)),
    ).resolves.toBeUndefined();

    expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: dbError }));
    expect(userNotificationRepository.releaseClaim).not.toHaveBeenCalled();
  });
});
