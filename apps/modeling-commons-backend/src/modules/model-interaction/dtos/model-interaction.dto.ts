import { type Static, Type } from 'typebox';

export const recordInteractionBodySchema = Type.Object({
  versionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});
export type RecordInteractionBody = Static<typeof recordInteractionBodySchema>;

export const interactionSummaryResponseSchema = Type.Object({
  likes: Type.Integer({ minimum: 0 }),
  views: Type.Integer({ minimum: 0 }),
  runs: Type.Integer({ minimum: 0 }),
  downloads: Type.Integer({ minimum: 0 }),
  shares: Type.Integer({ minimum: 0 }),
  likedByMe: Type.Boolean(),
});
export type InteractionSummaryResponseDto = Static<typeof interactionSummaryResponseSchema>;
