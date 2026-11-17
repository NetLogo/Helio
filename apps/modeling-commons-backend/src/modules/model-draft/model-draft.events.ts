export const modelDraftEventTypes = {
  modelCreated: 'model.created',
  versionCreated: 'model.version.created',
  versionUpdated: 'model.version.updated',
} as const;

type DraftPublishedPayload = { draftId: string; versionId: string };

export type ModelDraftEventPayloads = {
  [modelDraftEventTypes.modelCreated]: DraftPublishedPayload;
  [modelDraftEventTypes.versionCreated]: DraftPublishedPayload;
  [modelDraftEventTypes.versionUpdated]: DraftPublishedPayload;
};
