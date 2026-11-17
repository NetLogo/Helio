export const modelVersionEventTypes = {
  created: 'model_version.created',
  updated: 'model_version.updated',
} as const;

export type ModelVersionEventPayloads = {
  [modelVersionEventTypes.created]: { modelId: string; versionNumber: number };
  [modelVersionEventTypes.updated]: { modelId: string };
};
