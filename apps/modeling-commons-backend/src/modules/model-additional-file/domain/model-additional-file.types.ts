export type ModelAdditionalFileEntity = {
  id: string;
  modelId: string;
  taggedVersionId: string;
  fileId: string;
  createdAt: Date;
};

export type AddAdditionalFileProps = {
  modelId: string;
  taggedVersionId: string;
  fileId: string;
};
