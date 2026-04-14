import type { FileRepository, FileModelInfo } from '#src/modules/file/database/file.repository.port.ts';
import type { FileEntity } from '#src/modules/file/domain/file.types.ts';
import type { FileRecord } from '#src/modules/file/file.mapper.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';

export default function fileRepository({
  db,
  fileMapper,
  repositoryBase,
}: Dependencies): FileRepository {
  const tableName = 'file';
  const base = repositoryBase<FileEntity, FileRecord>({ tableName, mapper: fileMapper });

  return {
    ...base,

    async insertTx(ctx: TransactionContext, entity: FileEntity): Promise<void> {
      const client = resolveTransaction(ctx);
      const data = fileMapper.toPersistence(entity);
      await client.file.create({ data });
    },

    async findMetadataById(id: string): Promise<Omit<FileEntity, 'blob'> | undefined> {
      const record = await db.file.findUnique({
        where: { id },
        select: {
          id: true,
          filename: true,
          contentType: true,
          sizeBytes: true,
          createdAt: true,
        },
      });
      if (!record) return undefined;
      return {
        id: record.id,
        filename: record.filename,
        contentType: record.contentType,
        sizeBytes: record.sizeBytes,
        createdAt: record.createdAt,
      };
    },

    async findModelByFileId(fileId: string): Promise<FileModelInfo | null> {
      const modelSelect = { id: true, visibility: true, deletedAt: true } as const;

      const version = await db.modelVersion.findFirst({
        where: { nlogoxFileId: fileId },
        select: { model: { select: modelSelect } },
      });
      if (version) return version.model;

      const versionFile = await db.modelVersionFile.findFirst({
        where: { fileId },
        select: { modelVersion: { select: { model: { select: modelSelect } } } },
      });
      if (versionFile) return versionFile.modelVersion.model;

      const additionalFile = await db.modelAdditionalFile.findFirst({
        where: { fileId },
        select: { model: { select: modelSelect } },
      });
      if (additionalFile) return additionalFile.model;

      return null;
    },
  };
}
