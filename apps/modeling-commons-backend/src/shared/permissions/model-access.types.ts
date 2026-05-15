import type { AuthorRole, PermissionLevel } from '#src/modules/model-permission/domain/permission.types.ts';

export type AccessLevel = PermissionLevel;

export type SystemRole = 'admin' | 'moderator' | 'user';

export type ViewerContext = {
  id: string;
  systemRole: SystemRole;
  banned: boolean;
  deletedAt: Date | null;
};

export type ModelVisibility = 'public' | 'private' | 'unlisted';

export type ModelAccessSubject = {
  id: string;
  visibility: ModelVisibility | string;
  deletedAt: Date | null;
};

export type PolicyContext = {
  viewer: ViewerContext | null;
  model: ModelAccessSubject;
  ownerRole: AuthorRole | null;
  grantLevel: PermissionLevel | null;
};
