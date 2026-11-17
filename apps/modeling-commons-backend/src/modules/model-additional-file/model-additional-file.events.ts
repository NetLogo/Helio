export const modelAdditionalFileEventTypes = {
  added: 'model_additional_file.added',
  deleted: 'model_additional_file.deleted',
} as const;

export type ModelAdditionalFileEventPayloads = {
  [modelAdditionalFileEventTypes.added]: { modelId: string; filename: string };
  [modelAdditionalFileEventTypes.deleted]: { modelId: string };
};
