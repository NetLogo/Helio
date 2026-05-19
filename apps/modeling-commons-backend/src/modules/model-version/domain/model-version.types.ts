import type { ModelVersion } from '#prisma/index';

export type ModelVersionEntity = ModelVersion;

export type CreateVersionProps = {
  title?: string;
  description?: string;
  previewImageFileKey?: string | null;
};

export type UpdateCurrentVersionProps = {
  title?: string;
  description?: string;
  previewImageFileKey?: string | null;
};
