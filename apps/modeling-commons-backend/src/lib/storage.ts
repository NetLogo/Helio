import env from '#src/config/env.ts';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import {
  CreateBucketCommand,
  ListBucketsCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
  type Bucket,
} from '@aws-sdk/client-s3';

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

export default storage;
export { bucket, getDockerStorageClient };
