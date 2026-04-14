export type ModelVersionTagEntity = {
  modelId: string;
  versionNumber: number;
  tagId: string;
  createdAt: Date;
};

export type AddTagProps = {
  modelId: string;
  versionNumber: number;
  tagId: string;
};
