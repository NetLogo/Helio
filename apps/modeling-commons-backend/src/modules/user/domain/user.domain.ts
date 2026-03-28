import { SystemRole } from '#src/modules/user/domain/user.types.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';

export default function userDomain() {
  return {
    assertNotDeleted(user: UserEntity): void {
      if (user.deletedAt) {
        throw new ArgumentInvalidException('User is already deleted');
      }
    },

    canViewProfile(
      target: UserEntity,
      requesterId: string | null,
      requesterRole: string | null,
    ): boolean {
      if (target.isProfilePublic) return true;
      if (requesterId === target.id) return true;
      if (requesterRole === SystemRole.admin) return true;
      return false;
    },

    isAdmin(role: string | null | undefined): boolean {
      return role === SystemRole.admin;
    },

    isSelfOrAdmin(userId: string, requesterId: string, requesterRole: string): boolean {
      return userId === requesterId || requesterRole === SystemRole.admin;
    },
  };
}
