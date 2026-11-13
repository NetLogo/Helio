export const modelLikeEventTypes = {
  liked: 'model.liked',
  unliked: 'model.unliked',
} as const;

export type ModelLikeEventPayloads = {
  [modelLikeEventTypes.liked]: Record<string, never>;
  [modelLikeEventTypes.unliked]: Record<string, never>;
};
