import env from '#src/config/env.ts';
import { getDockerStorageClient } from '#src/lib/storage.ts';
import type { StorageClient } from '#src/shared/storage/index.ts';
import { VersionNotFoundError } from '../model-version/domain/model-version.errors.ts';
import { ModelPreviewServiceError } from './domain/preview-image.errors.ts';

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
          modelId: {
            in: [
              '15faff10-27a5-4c23-afc8-9b2fa375d5e5',
              'cb6cf93b-3833-4333-b3cd-5d94e271d078',
              'ee2b2b13-038a-43b4-9bad-32f306995793',
              '7ac94495-3b0c-40d3-9823-bf1694f83e1d',
              'fbfd7138-929f-44d1-8064-60540d4f1760',
            ],
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
      const modelFormat = netlogoFileKey.split('.').pop() || 'nlogox';
      const serviceUrl = new URL(`${env.netlogoServices.endpoint}/preview`);
      serviceUrl.searchParams.set('model_url', modelUrl);
      serviceUrl.searchParams.set('model_format', modelFormat);

      logger.info(
        `Requesting preview image from service for model ${modelId} version ${versionNumber}. URL: ${serviceUrl.toString()}`,
      );

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
