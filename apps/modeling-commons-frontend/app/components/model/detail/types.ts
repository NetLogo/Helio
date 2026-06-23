export interface VersionRow {
  versionNumber: number;
  title: string;
  description: string | null;
  uploaderName?: string | null;
  netlogoFileDownloadUrl: string | null;
  createdAt: string;
  isFinalized: boolean;
}

export interface AttachedFile {
  id: string;
  title: string;
  description: string;
  type: string;
  kind: "model" | "additional";
  taggedVersionNumber: number;
  versionUrl: string;
  authorName: string;
  updatedAt: string;
  isPending: boolean;
}

export type FamilyModel = ResponseSuccessData<"GET", "/api/v1/models/{id}/family/card">["self"];
