export const modelVersionTagEventTypes = {
  added: 'model_version_tag.added',
  removed: 'model_version_tag.removed',
} as const;

export type ModelVersionTagEventPayloads = {
  [modelVersionTagEventTypes.added]: { modelId: string; tagName: string };
  [modelVersionTagEventTypes.removed]: { modelId: string; tagId: string };
};
