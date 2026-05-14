import fs from 'node:fs';
import path from 'node:path';

const seedFilesPath = path.join(import.meta.dirname, 'seed-files');

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
};

function readInfoTab(_xmlContent: string): string {
  return `
  # Info Tab Content
  This is a placeholder for the info tab content extracted from the nlogox file.
  In a real implementation, you would parse the XML and extract the relevant section.
  `;
}

export interface NlogoxFile {
  key: string;
  filename: string;
  blob: Buffer;
  contentType: 'application/xml';
  sizeBytes: bigint;
  infoTab: string;
  previewImage: { blob: Buffer; contentType: string };
}

export function readNlogox(filename: string, previewImg: string): NlogoxFile {
  const filepath = path.join(seedFilesPath, filename);
  const stats = fs.statSync(filepath);
  const content = fs.readFileSync(filepath, 'utf-8');

  const previewPath = path.join(seedFilesPath, previewImg);
  const ext = path.extname(previewImg).toLowerCase();

  return {
    key: `uploads/models/${filename}`,
    filename,
    blob: Buffer.from(content, 'utf-8'),
    contentType: 'application/xml',
    sizeBytes: BigInt(stats.size),
    infoTab: readInfoTab(content),
    previewImage: {
      blob: fs.readFileSync(previewPath),
      contentType: MIME_BY_EXT[ext] || 'application/octet-stream',
    },
  };
}

export function fakeNlogox(title: string): Buffer {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>\n<model><title>${title}</title></model>`,
    'utf-8',
  );
}

export function fakeCsv(): Buffer {
  return Buffer.from('tick,wolves,sheep\n0,50,100\n1,48,105\n2,45,112\n', 'utf-8');
}

export function fakeReadme(): Buffer {
  return Buffer.from('# Wolf Sheep Predation\n\nA classic predator-prey model.', 'utf-8');
}
