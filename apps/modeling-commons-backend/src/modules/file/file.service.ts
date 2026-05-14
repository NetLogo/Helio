import env from '#src/config/env.ts';
import { FileNotFoundError } from '#src/modules/file/domain/file.errors.ts';
import {
  isPublicKey,
  parseMetadata,
  type FileAccess,
  type FileMetadata,
} from '#src/modules/file/domain/file.types.ts';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  getSignedUrl,
  HeadObjectCommand,
  PutObjectCommand,
  type StorageClient,
} from '#src/shared/storage/index.ts';

export type FileInfo = {
  key: string;
  contentType: string;
  sizeBytes: bigint;
  metadata: FileMetadata;
  access: FileAccess;
};

export default function makeFileService({ fileDomain, storage, bucket }: Dependencies) {
  const publicBaseUrl = env.storage.publicBaseUrl.replace(/\/+$/, '');

  return {
    async upload(params: {
      filename: string;
      buffer: Buffer<ArrayBuffer>;
      contentType: string;
      access?: FileAccess;
      pathPrefix?: string;
      userId?: string;
    }): Promise<string> {
      const file = fileDomain.createFile(params);
      await storage.send(
        new PutObjectCommand({
          Bucket: bucket.Name,
          Key: file.key,
          Body: file.blob,
          ContentType: file.contentType,
          Metadata: file.metadata,
          ACL: file.access,
        }),
      );
      return file.key;
    },

    async getMetadata(key: string): Promise<FileInfo> {
      const head = await storage.send(new HeadObjectCommand({ Bucket: bucket.Name, Key: key }));
      if (!head) throw new FileNotFoundError(key);
      const metadata = parseMetadata(key, head.Metadata);
      return {
        key,
        contentType: head.ContentType ?? 'application/octet-stream',
        sizeBytes: BigInt(head.ContentLength ?? 0),
        metadata,
        access: isPublicKey(key) ? 'public-read' : 'private',
      };
    },

    async getUrl(
      key: string,
      options: { client?: StorageClient; expiresIn?: number } = {},
    ): Promise<string> {
      if (isPublicKey(key)) {
        return `${publicBaseUrl}/${key}`;
      }
      const { expiresIn = 3600, client = storage } = options;
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket.Name, Key: key }), {
        expiresIn,
      });
    },

    async download(key: string): Promise<{
      blob: Buffer<ArrayBuffer>;
      contentType: string;
      filename: string;
    }> {
      const res = await storage.send(new GetObjectCommand({ Bucket: bucket.Name, Key: key }));
      if (!res.Body) throw new FileNotFoundError(key);
      const metadata = parseMetadata(key, res.Metadata);
      const bytes = await res.Body.transformToByteArray();
      const blob = Buffer.from(bytes) as Buffer<ArrayBuffer>;
      return {
        blob,
        contentType: res.ContentType ?? 'application/octet-stream',
        filename: metadata.filename,
      };
    },

    async delete(key: string): Promise<void> {
      await storage.send(new DeleteObjectCommand({ Bucket: bucket.Name, Key: key }));
    },
  };
}
