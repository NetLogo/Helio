export type ModelVersionTagEntity = {
  modelVersionId: string;
  tagId: string;
  createdAt: Date;
};

export type AddTagProps = {
  modelVersionId: string;
  tagId: string;
};
