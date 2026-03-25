import type { Mapper } from '#src/shared/ddd/mapper.interface.ts';
import type { FileEntity } from '#src/modules/file/domain/file.types.ts';
import type { FileRecord } from '#src/modules/file/file.mapper.ts';
import type { FileResponseDto } from '#src/modules/file/dtos/file.response.dto.ts';
import type { FileRepository } from '#src/modules/file/database/file.repository.port.ts';
import type fileDomain from '#src/modules/file/domain/file.domain.ts';

declare global {
  export interface Dependencies {
    fileMapper: Mapper<FileEntity, FileRecord, FileResponseDto>;
    fileRepository: FileRepository;
    fileDomain: ReturnType<typeof fileDomain>;
    fileService: ReturnType<typeof import('#src/modules/file/file.service.ts').default>;
  }
}
