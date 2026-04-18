export type ModelAdditionalFileEntity = {
  id: string;
  modelId: string;
  taggedVersionNumber: number;
  fileKey: string;
  createdAt: Date;
};

export type AddAdditionalFileProps = {
  modelId: string;
  taggedVersionNumber: number;
  fileKey: string;
};
