import type { Prisma } from '#prisma/index';

export const modelCardArgs = {
  include: {
    versions: {
      orderBy: { versionNumber: 'desc' },
      take: 1,
      include: {
        tags: { include: { tag: true } },
      },
    },
    authors: {
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    },
    _count: {
      select: { versions: true, childModels: true },
    },
  },
} satisfies Prisma.ModelDefaultArgs;

export type ModelCardRecord = Prisma.ModelGetPayload<typeof modelCardArgs>;
