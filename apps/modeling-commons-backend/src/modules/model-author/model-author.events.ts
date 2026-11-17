export const modelAuthorEventTypes = {
  added: 'model_author.added',
  removed: 'model_author.removed',
  ownershipTransferred: 'model_author.ownership_transferred',
} as const;

export type ModelAuthorEventPayloads = {
  [modelAuthorEventTypes.added]: { userId: string; role: string };
  [modelAuthorEventTypes.removed]: { userId: string };
  [modelAuthorEventTypes.ownershipTransferred]: { previousOwnerId: string; newOwnerId: string };
};
