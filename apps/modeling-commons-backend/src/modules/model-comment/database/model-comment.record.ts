import type { Prisma } from '#prisma/index';

// `_count.likes` is filtered to `viewerId` so every read hydrates `likedByMe`
// from the same query (no per-row round trip). A viewerId of '' never
// matches a real uuid, so the count is always 0 for anonymous reads.
export function modelCommentInclude(viewerId?: string) {
  return {
    user: { select: { id: true, name: true, image: true } },
    _count: { select: { likes: { where: { userId: viewerId ?? '' } } } },
  } satisfies Prisma.ModelCommentInclude;
}

export type ModelCommentRecord = Prisma.ModelCommentGetPayload<{
  include: ReturnType<typeof modelCommentInclude>;
}>;
