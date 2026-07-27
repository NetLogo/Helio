import type { User } from '#prisma/index';

export type UserRecord = User;
export { UserKind, SystemRole } from '#src/modules/user/shared/enums.ts';
