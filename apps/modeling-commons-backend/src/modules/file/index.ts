import type fileDomain from '#src/modules/file/domain/file.domain.ts';

declare global {
  export interface Dependencies {
    fileDomain: ReturnType<typeof fileDomain>;
    fileService: ReturnType<typeof import('#src/modules/file/file.service.ts').default>;
  }
}
