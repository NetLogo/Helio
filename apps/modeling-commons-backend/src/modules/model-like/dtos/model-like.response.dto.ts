import { type Static, Type } from 'typebox';

export const modelLikeSummaryResponseSchema = Type.Object({
  count: Type.Integer({ minimum: 0 }),
  likedByMe: Type.Boolean(),
});

export type ModelLikeSummaryResponseDto = Static<typeof modelLikeSummaryResponseSchema>;
