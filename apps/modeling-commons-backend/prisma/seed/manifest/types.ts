export type SystemRoleLit = 'admin' | 'moderator' | 'user';
export type UserKindLit = 'student' | 'teacher' | 'researcher' | 'other';
export type VisibilityLit = 'public' | 'private' | 'unlisted';
export type AuthorRoleLit = 'owner' | 'contributor';
export type PermissionLevelLit = 'read' | 'write' | 'admin';

export interface SocialLinkSeed {
  rawValue: string;
  type: 'twitter' | 'linkedin' | 'github' | 'facebook' | 'instagram' | 'website' | 'other';
}

export interface UserSeed {
  /** Stable slug used to derive the user id and cross-reference from models. */
  key: string;
  legacyId?: number;
  name: string;
  email: string;
  emailVerified?: boolean;
  systemRole?: SystemRoleLit;
  userKind?: UserKindLit;
  isProfilePublic?: boolean;
  bio?: string;
  country?: string;
  affiliation?: string;
  socialLinks?: SocialLinkSeed[];
  dob?: string;
  onboarded?: boolean;
  createdDaysAgo?: number;
  /** Mint a stable dev session token (`dev-session-<key>`) for local sign-in. */
  devSession?: boolean;
}

export interface TagSeed {
  name: string;
  displayName: string;
  legacyId?: number;
}

/** A model file backed by a real `.nlogox` shipped in `seed/files/`. */
export interface RealFileSeed {
  file: string;
  preview?: string;
}

/** A synthesized placeholder model file (no real `.nlogox` shipped). */
export interface PlaceholderFileSeed {
  placeholder: true;
  preview?: string;
}

export type ModelFileSeed = RealFileSeed | PlaceholderFileSeed;

export function isRealFile(f: ModelFileSeed): f is RealFileSeed {
  return 'file' in f;
}

export interface TextFileSeed {
  filename: string;
  content: string;
}

export interface VersionSeed {
  title: string;
  description?: string;
  netlogoVersion?: string;
  infoTab?: string;
  tags?: string[];
  file: ModelFileSeed;
  supplementaryFiles?: TextFileSeed[];
  createdDaysAgo?: number;
}

export interface ModelAuthorSeed {
  user: string;
  role?: AuthorRoleLit;
}

export interface ModelPermissionSeed {
  /** `null` grants the permission to everyone (anonymous). */
  grantee: string | null;
  level?: PermissionLevelLit;
}

export interface PopularitySeed {
  views: number;
  runs: number;
  downloads: number;
  shares: number;
  likedBy?: string[];
}

export interface AdditionalFileSeed {
  taggedVersionNumber: number;
  filename: string;
  content: string;
}

export interface ModelSeed {
  key: string;
  legacyId?: number;
  visibility?: VisibilityLit;
  isEndorsed?: boolean;
  isLibraryModel?: boolean;
  parent?: string;
  parentVersionNumber?: number;
  deleted?: boolean;
  createdDaysAgo?: number;
  authors: ModelAuthorSeed[];
  permissions?: ModelPermissionSeed[];
  versions: VersionSeed[];
  additionalFiles?: AdditionalFileSeed[];
  popularity?: PopularitySeed;
}

export interface DraftSeed {
  key: string;
  user: string;
  /** Existing model this draft revises (a new version), if any. */
  basedOnModel?: string;
  title?: string;
  description?: string;
  visibility?: VisibilityLit;
  tags?: string[];
  primaryFile?: ModelFileSeed;
  createdDaysAgo?: number;
}
