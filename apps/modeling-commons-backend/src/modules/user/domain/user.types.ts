export const SystemRole = {
  admin: 'admin',
  moderator: 'moderator',
  user: 'user',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const UserKind = {
  student: 'student',
  teacher: 'teacher',
  researcher: 'researcher',
  other: 'other',
} as const;
export type UserKind = (typeof UserKind)[keyof typeof UserKind];

export type UserEntity = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  systemRole: SystemRole;
  userKind: UserKind;
  isProfilePublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type UpdateUserProfileProps = {
  userKind?: UserKind;
  isProfilePublic?: boolean;
  systemRole?: SystemRole;
};

export type UserSearchFilters = {
  userKind?: UserKind;
  systemRole?: SystemRole;
};
