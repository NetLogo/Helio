import type { UpdateUserProfileProps } from '#src/modules/user/domain/user.types.ts';

export const userEventTypes = {
  updated: 'user.updated',
  deleted: 'user.deleted',
} as const;

export type UserEventPayloads = {
  [userEventTypes.updated]: UpdateUserProfileProps;
  [userEventTypes.deleted]: Record<string, never>;
};
