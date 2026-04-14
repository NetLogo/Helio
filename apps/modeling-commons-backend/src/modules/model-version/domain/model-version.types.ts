export type ModelVersionEntity = {
  modelId: string;
  versionNumber: number;
  title: string;
  description: string | null;
  previewImage: Buffer<ArrayBuffer> | null;
  nlogoxFileId: string;
  netlogoVersion: string | null;
  infoTab: string | null;
  createdAt: Date;
  finalizedAt: Date | null;
};

export type CreateVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Buffer<ArrayBuffer>;
};

export type UpdateCurrentVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Buffer<ArrayBuffer>;
};
