import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import type { Email } from '#src/modules/user-notification/core/types/index.ts';

export function hasDeliverableEmail(
  recipient: UserEntity | undefined,
): recipient is Email.UserWithEmail {
  return Boolean(recipient && !recipient.deletedAt && !recipient.banned && recipient.email);
}
