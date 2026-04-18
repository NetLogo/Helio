import type { Tag } from '#prisma/index';

export type TagEntity = Tag;

export type CreateTagProps = {
  name: string;
  displayName?: string;
};
