import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
export const prisma = new PrismaClient({ adapter });

export const s3 = new S3Client({
  region: process.env['STORE_REGION'],
  credentials: {
    accessKeyId: process.env['STORE_ACCESS_KEY']!,
    secretAccessKey: process.env['STORE_SECRET_KEY']!,
  },
  endpoint: process.env['STORE_ENDPOINT'],
  forcePathStyle: true,
});

export const bucket = process.env['STORE_BUCKET']!;
