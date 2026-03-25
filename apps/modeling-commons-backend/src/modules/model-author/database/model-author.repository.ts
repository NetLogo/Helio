import type { ModelAuthorRepository } from '#src/modules/model-author/database/model-author.repository.port.ts';
import type {
  ModelAuthorEntity,
  AuthorRole,
} from '#src/modules/model-author/domain/model-author.types.ts';
import type { ModelAuthorRecord } from '#src/modules/model-author/model-author.mapper.ts';
import type { Paginated, PaginatedQueryParams } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function modelAuthorRepository({
  db,
  modelAuthorMapper,
}: Dependencies): ModelAuthorRepository {
  return {
    async findByCompositeKey(
      modelId: string,
      userId: string,
    ): Promise<ModelAuthorEntity | undefined> {
      const record = await db.modelAuthor.findUnique({
        where: { modelId_userId: { modelId, userId } },
      });
      return record
        ? modelAuthorMapper.toDomain(record as unknown as ModelAuthorRecord)
        : undefined;
    },

    async findOwnerByModel(modelId: string): Promise<ModelAuthorEntity | undefined> {
      const record = await db.modelAuthor.findFirst({
        where: { modelId, role: 'owner' },
      });
      return record
        ? modelAuthorMapper.toDomain(record as unknown as ModelAuthorRecord)
        : undefined;
    },

    async findAllByModel(modelId: string): Promise<ModelAuthorEntity[]> {
      const records = await db.modelAuthor.findMany({
        where: { modelId },
        orderBy: { createdAt: 'asc' },
      });
      return records.map((r: unknown) => modelAuthorMapper.toDomain(r as ModelAuthorRecord));
    },

    async findModelsByUser(
      userId: string,
      params: PaginatedQueryParams,
    ): Promise<Paginated<ModelAuthorEntity>> {
      const where = { userId };
      const [count, records] = await Promise.all([
        db.modelAuthor.count({ where }),
        db.modelAuthor.findMany({
          where,
          orderBy: params.orderBy
            ? { [params.orderBy.field]: params.orderBy.param }
            : { createdAt: 'desc' },
          skip: params.offset,
          take: params.limit,
        }),
      ]);
      return {
        count,
        limit: params.limit,
        page: params.page,
        data: records.map((r: unknown) => modelAuthorMapper.toDomain(r as ModelAuthorRecord)),
      };
    },

    async insertTx(ctx: TransactionContext, entity: ModelAuthorEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = modelAuthorMapper.toPersistence(entity);
      await client.modelAuthor.create({ data });
    },

    async updateRoleTx(
      ctx: TransactionContext,
      modelId: string,
      userId: string,
      role: AuthorRole,
    ): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelAuthor.update({
        where: { modelId_userId: { modelId, userId } },
        data: { role },
      });
    },

    async deleteTx(ctx: TransactionContext, modelId: string, userId: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelAuthor.delete({
        where: { modelId_userId: { modelId, userId } },
      });
    },
  };
}
