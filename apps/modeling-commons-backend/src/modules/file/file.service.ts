import { FileNotFoundError } from '#src/modules/file/domain/file.errors.ts';
import type { FileEntity } from '#src/modules/file/domain/file.types.ts';

export default function makeFileService({
  transactionManager,
  fileRepository,
  fileDomain,
}: Dependencies) {
  return {
    async upload(buffer: Buffer, filename: string, contentType: string): Promise<string> {
      const entity = fileDomain.createFile({ buffer, filename, contentType });
      return transactionManager.run(async (ctx) => {
        await fileRepository.insertTx(ctx, entity);
        return entity.id;
      });
    },

    async getMetadata(fileId: string): Promise<Omit<FileEntity, 'blob'>> {
      const metadata = await fileRepository.findMetadataById(fileId);
      if (!metadata) throw new FileNotFoundError(fileId);
      return metadata;
    },

    async download(fileId: string): Promise<FileEntity> {
      const file = await fileRepository.findOneById(fileId);
      if (!file) throw new FileNotFoundError(fileId);
      return file;
    },
  };
}
