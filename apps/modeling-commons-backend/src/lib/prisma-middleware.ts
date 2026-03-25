import { Prisma } from '#prisma/client';

const SOFT_DELETE_MODELS = ['Model', 'User'] as const;
type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

const INTERCEPTED_OPERATIONS = ['findMany', 'findFirst', 'findFirstOrThrow', 'count'] as const;

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return SOFT_DELETE_MODELS.includes(model as SoftDeleteModel);
}

export const softDeleteExtension = Prisma.defineExtension({
  query: {
    $allOperations({ model, operation, args, query }) {
      if (
        !isSoftDeleteModel(model) ||
        !(INTERCEPTED_OPERATIONS as readonly string[]).includes(operation)
      ) {
        return query(args);
      }

      const where = (args as { where?: Record<string, unknown> }).where ?? {};
      if (!('deletedAt' in where)) {
        (args as { where: Record<string, unknown> }).where = {
          ...where,
          deletedAt: null,
        };
      }

      return query(args);
    },
  },
});
