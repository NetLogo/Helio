export const PermissionLevel = {
  read: 'read',
  write: 'write',
  admin: 'admin',
} as const;
export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export const AuthorRole = {
  owner: 'owner',
  contributor: 'contributor',
} as const;
export type AuthorRole = (typeof AuthorRole)[keyof typeof AuthorRole];

export const ModelVisibility = {
  public: 'public',
  private: 'private',
  unlisted: 'unlisted',
} as const;
export type ModelVisibility = (typeof ModelVisibility)[keyof typeof ModelVisibility];

const levelRank: Record<PermissionLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export function meetsLevel(granted: PermissionLevel, required: PermissionLevel): boolean {
  return levelRank[granted] >= levelRank[required];
}

export type ModelPermissionEntity = {
  id: string;
  modelId: string;
  granteeUserId: string;
  permissionLevel: PermissionLevel;
  createdAt: Date;
};

export type AuthorRecord = {
  modelId: string;
  userId: string;
  role: AuthorRole;
};

export type ModelForPermissionCheck = {
  id: string;
  visibility: string;
  deletedAt: Date | null;
};
