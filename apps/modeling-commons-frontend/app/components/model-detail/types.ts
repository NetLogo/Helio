export interface VersionRow {
  versionNumber: number;
  title: string;
  description: string | null;
  uploaderName?: string | null;
  nlogoxFileId: string;
  createdAt: string;
  isFinalized: boolean;
}

export interface AttachedFile {
  id: string;
  title: string;
  description: string;
  type: string;
  authorName: string;
  updatedAt: string;
  isPending: boolean;
}

export interface FamilyModel {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  isEndorsed: boolean;
  createdAt: string;
  authorName: string | null;
  versionCount: number;
  linkedVersionNumber: number | null;
}
