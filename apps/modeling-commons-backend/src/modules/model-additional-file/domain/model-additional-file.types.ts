export type ModelAdditionalFileEntity = {
  id: string;
  modelId: string;
  taggedVersionNumber: number;
  fileId: string;
  createdAt: Date;
};

export type AddAdditionalFileProps = {
  modelId: string;
  taggedVersionNumber: number;
  fileId: string;
};
