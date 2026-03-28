import type { PermissionRepository } from '#src/modules/model-permission/database/permission.repository.port.ts';
import type {
  ModelPermissionEntity,
  AuthorRecord,
} from '#src/modules/model-permission/domain/permission.types.ts';
import type { PermissionRecord } from '#src/modules/model-permission/permission.mapper.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function permissionRepository({
  db,
  permissionMapper,
}: Dependencies): PermissionRepository {
  return {
    async findByModelAndUser(
      modelId: string,
      granteeUserId: string,
    ): Promise<ModelPermissionEntity | undefined> {
      const record = await db.modelPermission.findUnique({
        where: { modelId_granteeUserId: { modelId, granteeUserId } },
      });
      return record ? permissionMapper.toDomain(record as unknown as PermissionRecord) : undefined;
    },

    async findAuthor(modelId: string, userId: string): Promise<AuthorRecord | undefined> {
      const record = await db.modelAuthor.findUnique({
        where: { modelId_userId: { modelId, userId } },
      });
      return record
        ? {
            modelId: record.modelId,
            userId: record.userId,
            role: record.role as AuthorRecord['role'],
          }
        : undefined;
    },

    async findAllByModel(modelId: string): Promise<ModelPermissionEntity[]> {
      const records = await db.modelPermission.findMany({
        where: { modelId },
        orderBy: { createdAt: 'asc' },
      });
      return records.map((r: unknown) => permissionMapper.toDomain(r as PermissionRecord));
    },

    async insertTx(ctx: TransactionContext, entity: ModelPermissionEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = permissionMapper.toPersistence(entity);
      await client.modelPermission.create({ data });
    },

    async deleteTx(ctx: TransactionContext, modelId: string, granteeUserId: string): Promise<void> {
      const client = resolveTransaction(ctx);
      await client.modelPermission.delete({
        where: { modelId_granteeUserId: { modelId, granteeUserId } },
      });
    },
  };
}
