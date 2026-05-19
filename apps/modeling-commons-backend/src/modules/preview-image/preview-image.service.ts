import env from '#src/config/env.ts';
import { getDockerStorageClient } from '#src/lib/storage.ts';
import type { StorageClient } from '#src/shared/storage/index.ts';
import {
  ModelPreviewServiceError,
  ModelPreviewTimeoutError,
  ModelPreviewTooLargeError,
} from './domain/preview-image.errors.ts';

interface PreviewImageData {
  buffer: ArrayBuffer;
  contentType: string;
  contentSize: number;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function makePreviewImageService({ fileService }: Dependencies) {
  return {
    async generatePreviewFromNetlogoFile(netlogoFileKey: string): Promise<PreviewImageData> {
      // In development with docker storage we must sign URLs against the
      // docker-internal host so the netlogo-services container can reach them.
      const client: StorageClient | undefined =
        env.isDevelopment && env.storage.dockerEndpoint ? getDockerStorageClient() : undefined;

      const modelUrl = await fileService.getUrl(netlogoFileKey, { client });
      const modelFormat = netlogoFileKey.split('.').pop() ?? 'nlogox';
      const serviceUrl = new URL(`${env.netlogoServices.endpoint}/preview`);
      serviceUrl.searchParams.set('model_url', modelUrl);
      serviceUrl.searchParams.set('model_format', modelFormat);

      const abort = new AbortController();
      const timeout = setTimeout(() => {
        abort.abort();
      }, 30_000);

      let image: Response;
      try {
        image = await fetch(serviceUrl.toString(), {
          method: 'GET',
          headers: { accept: 'image/png' },
          signal: abort.signal,
        });
      } catch (error) {
        clearTimeout(timeout);
        if ((error as Error).name === 'AbortError') {
          throw new ModelPreviewTimeoutError(netlogoFileKey);
        }
        throw new ModelPreviewServiceError(netlogoFileKey, error as Error);
      }
      clearTimeout(timeout);

      if (!image.ok) {
        throw new ModelPreviewServiceError(
          netlogoFileKey,
          new Error(`Rendering service responded with status ${image.status}`),
        );
      }

      const contentLength = Number(image.headers.get('Content-Length'));
      if (contentLength && contentLength > MAX_IMAGE_SIZE) {
        await image.body?.cancel();
        throw new ModelPreviewTooLargeError(netlogoFileKey);
      }

      const buffer = await image.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        throw new ModelPreviewTooLargeError(netlogoFileKey);
      }

      return {
        buffer,
        contentType: image.headers.get('Content-Type') ?? 'image/png',
        contentSize: buffer.byteLength,
      };
    },
  };
}
