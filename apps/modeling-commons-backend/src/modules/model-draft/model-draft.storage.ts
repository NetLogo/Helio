import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '#src/shared/storage/index.ts';
import { sanitizeFilename } from '#src/shared/storage/utils.ts';
import { nanoid } from 'nanoid';

// Staging keys fuse this random prefix with the filename in one segment, so
// filenameFromKey has to strip exactly this many characters plus the dash.
// Both producers of the shape must use it or the reader mangles filenames.
export const STAGING_KEY_RANDOM_SEGMENT_LENGTH = 10;

export default function makeModelDraftStorage({ storage, bucket, fileDomain }: Dependencies) {
  function stagingPrefix(userId: string, draftId: string): string {
    return `staging/${userId}/${draftId}/`;
  }

  function publicStagingPrefix(userId: string, draftId: string): string {
    return `${PUBLIC_PREFIX}/staging/${userId}/${draftId}/`;
  }

  function stagingKey(
    userId: string,
    draftId: string,
    filename: string,
    isPublic = false,
  ): string {
    const prefix = isPublic
      ? publicStagingPrefix(userId, draftId)
      : stagingPrefix(userId, draftId);
    return `${prefix}${nanoid(STAGING_KEY_RANDOM_SEGMENT_LENGTH)}-${sanitizeFilename(filename)}`;
  }

  async function deletePrefix(prefix: string): Promise<void> {
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
  }

  return {
    async putStaged(params: {
      userId: string;
      draftId: string;
      buffer: Buffer<ArrayBuffer>;
      filename: string;
      contentType: string;
      public?: boolean;
    }): Promise<string> {
      const key = stagingKey(params.userId, params.draftId, params.filename, params.public);
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket.Name,
          Key: key,
          Body: params.buffer,
          ContentType: params.contentType,
          ...(params.public ? { ACL: 'public-read' } : {}),
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
      acl?: 'private' | 'public-read';
      userId?: string;
    }): Promise<string> {
      const file = fileDomain.createFile({
        buffer: Buffer.alloc(0), // buffer is not used for copying, but domain requires it
        filename: params.filename,
        contentType: params.contentType,
        access: params.acl ?? 'private',
        pathPrefix: params.pathPrefix,
        userId: params.userId,
      });
      await storage.send(
        new CopyObjectCommand({
          Bucket: bucket.Name,
          Key: file.key,
          CopySource: `${bucket.Name}/${params.stagingKey}`,
          ContentType: file.contentType,
          MetadataDirective: 'REPLACE',
          Metadata: file.metadata,
          ACL: params.acl,
        }),
      );
      return file.key;
    },

    async deleteStagingPrefix(userId: string, draftId: string): Promise<void> {
      await deletePrefix(stagingPrefix(userId, draftId));
      await deletePrefix(publicStagingPrefix(userId, draftId));
    },
  };
}
