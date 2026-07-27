import type { User } from '#prisma/index';
import type { SystemRole, UserKind } from '#src/modules/user/shared/enums.ts';

export type UserEntity = User & {
  onboardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type UserPublicView = Pick<
  UserEntity,
  'id' | 'name' | 'isProfilePublic' | 'image' | 'createdAt' | 'updatedAt'
>;

export type UpdateUserProfileProps = {
  userKind?: UserKind;
  isProfilePublic?: boolean;
  systemRole?: SystemRole;
  onboardedAt?: Date | null;
  image?: string | null;
};

export type UserSearchFilters = {
  userKind?: UserKind;
  systemRole?: SystemRole;
  keyword?: string;
};
