export type ModelFileKind = 'model' | 'additional';

export type ModelAdditionalFileEntity = {
  id: string;
  modelId: string;
  taggedVersionNumber: number;
  fileKey: string;
  kind: ModelFileKind;
  createdAt: Date;
};

export type AddAdditionalFileProps = {
  modelId: string;
  taggedVersionNumber: number;
  fileKey: string;
  kind?: ModelFileKind;
};
