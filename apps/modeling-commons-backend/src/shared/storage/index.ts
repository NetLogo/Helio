import type { S3Client } from '@aws-sdk/client-s3';

export * from '@aws-sdk/client-s3';
export * from '@aws-sdk/s3-request-presigner';
export type StorageClient = S3Client;
