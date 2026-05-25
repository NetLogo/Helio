import env from '#src/config/env.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import { ExceptionBase } from '#src/shared/exceptions/exception-base.ts';
import {
  CreateBucketCommand,
  ListBucketsCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
  type Bucket,
  type ListBucketsCommandOutput,
} from '@aws-sdk/client-s3';

class StorageInitializationError extends ExceptionBase {
  readonly statusCode = 500;
  readonly error = 'Storage Initialization Error';
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

const signingStorageClient = new S3Client({
  region: env.storage.region,

  credentials: {
    accessKeyId: env.storage.accessKey,
    secretAccessKey: env.storage.secretKey,
  },

  endpoint: env.storage.publicEndpoint,
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

let buckets: ListBucketsCommandOutput;
try {
  buckets = await storage.send(new ListBucketsCommand({}));
} catch (err: unknown) {
  throw new StorageInitializationError(
    'Failed to list storage buckets. This can happen if the storage service is not running or the provided credentials are invalid.',
    err instanceof Error ? err : undefined,
  );
}

let maybeBucket = buckets.Buckets?.find((b: Bucket) => b.Name === env.storage.bucket);

if (!maybeBucket) {
  try {
    await storage.send(new CreateBucketCommand({ Bucket: env.storage.bucket }));
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.name !== 'BucketAlreadyExists' &&
      err.name !== 'BucketAlreadyOwnedByYou'
    ) {
      throw err;
    }
  }
  maybeBucket = { Name: env.storage.bucket };
}
const bucket: Bucket = maybeBucket;

const publicReadPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'AllowAnonymousReadOnPublicPrefix',
      Effect: 'Allow',
      Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${env.storage.bucket}/${PUBLIC_PREFIX}/*`],
    },
  ],
};

await storage.send(
  new PutBucketPolicyCommand({
    Bucket: env.storage.bucket,
    Policy: JSON.stringify(publicReadPolicy),
  }),
);

await storage.send(
  new PutBucketCorsCommand({
    Bucket: env.storage.bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: env.cors.allowedOrigins,
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  }),
);

const internalClient = storage;

export default storage;
export { bucket, getDockerStorageClient, internalClient, signingStorageClient };
