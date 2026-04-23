import env from '#src/config/env.ts';
import { S3Client, type Bucket, CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageConfigurationError';
  }
}

const storage = new S3Client({
  region: env.storage.region,

  credentials: {
    accessKeyId: env.storage.accessKey,
    secretAccessKey: env.storage.secretKey,
  },

  endpoint: env.storage.endpoint,
  forcePathStyle: true,
});

function getDockerStorageClient() {
  return new S3Client({
    region: env.storage.region,

    credentials: {
      accessKeyId: env.storage.accessKey,
      secretAccessKey: env.storage.secretKey,
    },

    endpoint: env.storage.dockerEndpoint,
    forcePathStyle: true,
  });
}

const buckets = await storage.send(new ListBucketsCommand({}));
let maybeBucket = buckets.Buckets?.find((b: Bucket) => b.Name === env.storage.bucket);
if (!maybeBucket) {
  maybeBucket = await storage.send(new CreateBucketCommand({ Bucket: env.storage.bucket }));
}

if (!maybeBucket) {
  throw new StorageConfigurationError(`Failed to access or create bucket: ${env.storage.bucket}`);
}

const bucket: Bucket = maybeBucket;

export default storage;
export { bucket, getDockerStorageClient };
