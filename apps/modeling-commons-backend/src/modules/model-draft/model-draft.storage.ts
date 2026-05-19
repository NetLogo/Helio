import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type ObjectCannedACL,
} from '#src/shared/storage/index.ts';
import { sanitizeFilename } from '#src/shared/storage/utils.ts';

export default function makeModelDraftStorage({ storage, bucket }: Dependencies) {
  function stagingPrefix(userId: string, draftId: string): string {
    return `staging/${userId}/${draftId}/`;
  }

  function stagingKey(userId: string, draftId: string, filename: string): string {
    return `${stagingPrefix(userId, draftId)}${randomUUID()}-${sanitizeFilename(filename)}`;
  }

  return {
    async putStaged(params: {
      userId: string;
      draftId: string;
      buffer: Buffer<ArrayBuffer>;
      filename: string;
      contentType: string;
    }): Promise<string> {
      const key = stagingKey(params.userId, params.draftId, params.filename);
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket.Name,
          Key: key,
          Body: params.buffer,
          ContentType: params.contentType,
          Metadata: {
            filename: sanitizeFilename(params.filename),
            createdat: new Date().toISOString(),
          },
        }),
      );
      return key;
    },

    async deleteObject(key: string): Promise<void> {
      await storage.send(new DeleteObjectCommand({ Bucket: bucket.Name, Key: key }));
    },

    async copyStagedToPermanent(params: {
      stagingKey: string;
      modelId: string;
      filename: string;
      contentType: string;
      pathPrefix: string;
      acl?: ObjectCannedACL;
    }): Promise<string> {
      const destKey = `${params.pathPrefix}/${params.modelId}/${randomUUID()}-${sanitizeFilename(params.filename)}`;
      await storage.send(
        new CopyObjectCommand({
          Bucket: bucket.Name,
          Key: destKey,
          CopySource: `${bucket.Name}/${params.stagingKey}`,
          ContentType: params.contentType,
          MetadataDirective: 'REPLACE',
          Metadata: {
            filename: sanitizeFilename(params.filename),
            createdat: new Date().toISOString(),
          },
          ACL: params.acl,
        }),
      );
      return destKey;
    },

    async deleteStagingPrefix(userId: string, draftId: string): Promise<void> {
      const prefix = stagingPrefix(userId, draftId);
      let continuationToken: string | undefined;
      do {
        const listed = await storage.send(
          new ListObjectsV2Command({
            Bucket: bucket.Name,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        const keys = (listed.Contents ?? [])
          .map((o) => o.Key)
          .filter((k): k is string => Boolean(k));
        if (keys.length > 0) {
          await storage.send(
            new DeleteObjectsCommand({
              Bucket: bucket.Name,
              Delete: { Objects: keys.map((Key) => ({ Key })) },
            }),
          );
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    },
  };
}
