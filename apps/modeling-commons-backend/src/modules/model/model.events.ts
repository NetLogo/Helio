export const modelEventTypes = {
  deleted: 'model.deleted',
} as const;

export type ModelEventPayloads = {
  [modelEventTypes.deleted]: Record<string, never>;
};
