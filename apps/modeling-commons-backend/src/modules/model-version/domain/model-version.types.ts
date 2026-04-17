import type { ModelVersion } from '#prisma/index';

export type ModelVersionEntity = ModelVersion;

export type CreateVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Uint8Array<ArrayBuffer>;
};

export type UpdateCurrentVersionProps = {
  title?: string;
  description?: string;
  previewImage?: Uint8Array<ArrayBuffer>;
};
