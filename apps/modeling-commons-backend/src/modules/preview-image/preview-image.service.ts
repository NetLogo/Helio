import env from '#src/config/env.ts';
import { getDockerStorageClient } from '#src/lib/storage.ts';
import type { StorageClient } from '#src/shared/storage/index.ts';
import { VersionNotFoundError } from '../model-version/domain/model-version.errors.ts';
import { ModelPreviewServiceError } from './domain/preview-image.errors.ts';

export default function makePreviewImageService({ getVersionQuery, fileService }: Dependencies) {
  return {
    async generatePreviewImageFromModelVersion(
      modelId: string,
      versionNumber: number,
    ): Promise<{ buffer: ArrayBuffer; contentType: string }> {
      const modelVersion = await getVersionQuery.execute(modelId, versionNumber);
      if (!modelVersion) throw new VersionNotFoundError(modelId, versionNumber);

      const { netlogoFileKey } = modelVersion;

      // If we use docker in development, we have to
      // sign the URL for a different host, namely
      // host.docker.internal, instead of localhost/
      // -Omar Ibrahim, Apr 23 26
      let client: StorageClient | undefined =
        env.isDevelopment && env.storage.dockerEndpoint ? getDockerStorageClient() : undefined;

      const modelUrl = await fileService.getUrl(netlogoFileKey, { client });
      const serviceUrl = new URL(`${env.netlogoServices.endpoint}/preview`);
      serviceUrl.searchParams.set('model_url', modelUrl);

      const image = await fetch(serviceUrl.toString(), {
        method: 'GET',
        headers: {
          accept: 'image/png',
        },
      });

      if (!image.ok) {
        throw new ModelPreviewServiceError(
          modelId,
          versionNumber,
          new Error(
            `Preview image service responded with status ${image.status}: ${await image.text()}`,
          ),
        );
      }

      return {
        buffer: await image.arrayBuffer(),
        contentType: image.headers.get('Content-Type') || 'image/png',
      };
    },
  };
}
