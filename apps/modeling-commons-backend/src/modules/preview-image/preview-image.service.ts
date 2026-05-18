import env from '#src/config/env.ts';
import { getDockerStorageClient } from '#src/lib/storage.ts';
import type { StorageClient } from '#src/shared/storage/index.ts';
import { VersionNotFoundError } from '../model-version/domain/model-version.errors.ts';
import {
  ModelPreviewServiceError,
  ModelPreviewTimeoutError,
  ModelPreviewTooLargeError,
} from './domain/preview-image.errors.ts';

type Report = {
  total: number;
  success: number;
  fail: number;
  detailed: {
    success: { modelId: string; versionNumber: number }[];
    fail: { modelId: string; versionNumber: number; error: string }[];
  };
};
export default function makePreviewImageService({
  db,
  logger,
  getVersionQuery,
  fileService,
}: Dependencies) {
  return {
    async fillInPreviewImages(): Promise<Report> {
      let report: Report = {
        total: 0,
        success: 0,
        fail: 0,
        detailed: {
          fail: [],
          success: [],
        },
      };
      const models = await db.modelVersion.findMany({
        where: {
          previewImage: null,
          model: {
            authors: {
              some: {
                userId: '2355982b-bfb8-488d-bbae-ae5b5ad32d4a',
              },
            },
          },
        },
        distinct: ['modelId'],
        orderBy: [{ createdAt: 'desc' }, { modelId: 'desc' }, { versionNumber: 'desc' }],
      });

      report.total = models.length;

      for (const { modelId, versionNumber } of models) {
        logger.info(`Filling in preview image for model ${modelId} version ${versionNumber}`);
        logger.info(`Report so far: ${JSON.stringify(report)}`);
        try {
          const { buffer } = await this.generatePreviewImageFromModelVersion(
            modelId,
            versionNumber,
          );

          await db.modelVersion.update({
            where: { modelId_versionNumber: { modelId, versionNumber } },
            data: {
              previewImage: new Uint8Array(buffer),
            },
          });
          report.success += 1;
          report.detailed.success.push({ modelId, versionNumber });
        } catch (error) {
          report.fail += 1;
          report.detailed.fail.push({ modelId, versionNumber, error: (error as Error).message });
          logger.error(
            `Failed to generate preview image for model ${modelId} version ${versionNumber}: ${
              (error as Error).message
            }`,
          );
        }
      }

      return report;
    },

    async generatePreviewImageFromModelVersion(
      modelId: string,
      versionNumber: number,
    ): Promise<{ buffer: ArrayBuffer; contentType: string; contentSize: number }> {
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
      const modelFormat = netlogoFileKey.split('.').pop() || 'nlogox';
      const serviceUrl = new URL(`${env.netlogoServices.endpoint}/preview`);
      serviceUrl.searchParams.set('model_url', modelUrl);
      serviceUrl.searchParams.set('model_format', modelFormat);

      logger.info(
        `Requesting preview image from service for model ${modelId} version ${versionNumber}. URL: ${serviceUrl.toString()}`,
      );

      const abort = new AbortController();

      const timeout = setTimeout(() => {
        abort.abort();
      }, 30_000); // 30 seconds

      const image = await fetch(serviceUrl.toString(), {
        method: 'GET',
        headers: {
          accept: 'image/png',
        },
        signal: abort.signal,
      });

      clearTimeout(timeout);

      if (!image.ok) {
        throw new ModelPreviewServiceError(
          modelId,
          versionNumber,
          new ModelPreviewTimeoutError(modelId, versionNumber),
        );
      }

      const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
      const contentLength = Number(image.headers.get('Content-Length'));
      if (contentLength && contentLength > MAX_IMAGE_SIZE) {
        // Drain the body so the connection can be reused, then reject
        // --Omar Ibrahim, May 18 26
        await image.body?.cancel();
        throw new ModelPreviewTooLargeError(modelId, versionNumber);
      }

      const buffer = await image.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        throw new ModelPreviewTooLargeError(modelId, versionNumber);
      }

      return {
        buffer,
        contentType: image.headers.get('Content-Type') || 'image/png',
        contentSize: buffer.byteLength,
      };
    },
  };
}
