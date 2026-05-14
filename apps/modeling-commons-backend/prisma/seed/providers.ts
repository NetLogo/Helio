import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
export const prisma = new PrismaClient({ adapter });

export const s3 = new S3Client({
  region: process.env['RUSTFS_REGION'],
  credentials: {
    accessKeyId: process.env['RUSTFS_ACCESS_KEY']!,
    secretAccessKey: process.env['RUSTFS_SECRET_KEY']!,
  },
  endpoint: process.env['RUSTFS_ENDPOINT'],
});

export const bucket = process.env['RUSTFS_BUCKET']!;
