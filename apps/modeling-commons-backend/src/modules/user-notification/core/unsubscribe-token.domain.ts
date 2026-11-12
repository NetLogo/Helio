import { signJWT, verifyJWT } from 'better-auth/crypto';
import env from '#src/config/env.ts';
import notificationsConfig from '#src/config/notifications.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import { isKnownCategory } from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import { isRecord } from '#src/shared/utils/json.ts';

export type UnsubscribeClaims<Category extends string = string> = {
  userId: string;
  categories: Array<Category>;
};

export async function signUnsubscribeToken({
  userId,
  categories,
}: UnsubscribeClaims): Promise<string> {
  return signJWT(
    {
      sub: userId,
      aud: notificationsConfig.unsubscribeTokenPurpose,
      categories: [...new Set(categories)].sort(),
    },
    env.auth.secret,
    notificationsConfig.unsubscribeTokenTtlSeconds,
  );
}

export async function readUnsubscribeToken(
  token: string,
): Promise<UnsubscribeClaims<NotificationCategory> | undefined> {
  const claims = await verifyJWT<unknown>(token, env.auth.secret);
  if (!isRecord(claims)) return undefined;
  const { sub, aud, categories } = claims;
  if (aud !== notificationsConfig.unsubscribeTokenPurpose) return undefined;
  if (typeof sub !== 'string' || sub.length === 0 || !Array.isArray(categories)) return undefined;

  const known = categories.filter(
    (category): category is NotificationCategory =>
      typeof category === 'string' && isKnownCategory(category),
  );
  if (known.length === 0) return undefined;
  return { userId: sub, categories: known };
}
