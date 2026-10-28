import type { UserNotification } from '#prisma/index';

export type UserNotificationRecord = UserNotification;

export type EmailClaimRecord = {
  id: string;
  emailClaimedAt: Date;
};
