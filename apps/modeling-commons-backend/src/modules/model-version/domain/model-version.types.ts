export type ModelVersionEntity = {
  id: string;
  modelId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  previewImage: Buffer | null;
  nlogoxFileId: string;
  netlogoVersion: string | null;
  infoTab: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
};

export type CreateVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Buffer;
};

export type UpdateCurrentVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Buffer;
};
