import type {
  ModelPermissionEntity,
  AuthorRecord,
} from '#src/modules/model-permission/domain/permission.types.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface PermissionRepository {
  findByModelAndUser(
    modelId: string,
    granteeUserId: string,
  ): Promise<ModelPermissionEntity | undefined>;
  findAuthor(modelId: string, userId: string): Promise<AuthorRecord | undefined>;
  findAllByModel(modelId: string): Promise<ModelPermissionEntity[]>;
  insertTx(ctx: TransactionContext, entity: ModelPermissionEntity): Promise<void>;
  deleteTx(ctx: TransactionContext, modelId: string, granteeUserId: string): Promise<void>;
}
