import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import path from 'node:path';
import fs from 'fs/promises';

const storage = new S3Client({
  region: process.env['RUSTFS_REGION'],

  credentials: {
    accessKeyId: process.env['RUSTFS_ACCESS_KEY']!,
    secretAccessKey: process.env['RUSTFS_SECRET_KEY']!,
  },

  endpoint: process.env['RUSTFS_ENDPOINT'],
});
const bucket = { Name: process.env['RUSTFS_BUCKET']! };
const seedFilesPath = path.join(import.meta.dirname, 'archive-output', 'files');

// upload each file in seedFilesPath to the S3 bucket, key relative to seedFilesPath
const report = {
  files: { uploaded: 0 },
};
async function uploadFiles() {
  const files = await fs.readdir(seedFilesPath, { withFileTypes: true, recursive: true });

  for (const file of files) {
    if (file.isFile()) {
      const filePath = path.join(file.parentPath, file.name);
      const key = path.relative(seedFilesPath, filePath).replace(/\\/g, '/'); // Use forward slashes for S3 keys

      const fileContent = await fs.readFile(filePath);

      await storage.send(
        new PutObjectCommand({
          Bucket: bucket.Name,
          Key: key,
          Body: fileContent,
        }),
      );

      report.files.uploaded++;
      if (report.files.uploaded % 50 === 0) {
        console.log(`  ...uploaded ${report.files.uploaded} files`);
      }
    }
  }
}

uploadFiles()
  .then(() => console.log('All files uploaded successfully'))
  .catch((error) => console.error('Error uploading files:', error));
