import type { FileEntity } from '#src/modules/file/domain/file.types.ts';
import type { RepositoryPort } from '#src/shared/db/repository.port.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

export interface FileRepository extends RepositoryPort<FileEntity> {
  insertTx(ctx: TransactionContext, entity: FileEntity): Promise<void>;
  findMetadataById(id: string): Promise<Omit<FileEntity, 'blob'> | undefined>;
}
