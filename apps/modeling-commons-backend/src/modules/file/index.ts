import env from '#src/config/env.ts';
import type fileDomain from '#src/modules/file/domain/file.domain.ts';
import { asValue, type Resolver } from 'awilix';

declare global {
  export interface Dependencies {
    fileDomain: ReturnType<typeof fileDomain>;
    fileService: ReturnType<typeof import('#src/modules/file/file.service.ts').default>;
    storagePublicBaseUrl: string;
  }
}

export function makeFileDependencies(): {
  storagePublicBaseUrl: Resolver<string>;
} {
  return {
    storagePublicBaseUrl: asValue(env.storage.publicBaseUrl),
  };
}
