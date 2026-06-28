import fs from 'node:fs';
import path from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, bucket } from './providers.js';

const seedFilesPath = path.join(import.meta.dirname, '..', 'seed-files');

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.nlogox': 'application/xml',
  '.nlogo': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

const PUBLIC_PREFIX = 'files/public';

function mimeFor(filename: string): string {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
}

/** Pull the human-readable Info tab out of an nlogox file, if present. */
function extractInfoTab(xml: string): string | undefined {
  const match = xml.match(/<info>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/info>/);
  return match?.[1]?.trim() || undefined;
}

export interface NlogoxAsset {
  /** S3 key for the (private) model file. */
  key: string;
  filename: string;
  blob: Buffer;
  contentType: string;
  sizeBytes: bigint;
  infoTab: string | undefined;
  preview?: PreviewAsset;
}

export interface PreviewAsset {
  /** Public S3 key for the preview image. */
  key: string;
  filename: string;
  blob: Buffer;
  contentType: string;
}

function loadPreview(previewFilename: string): PreviewAsset {
  const blob = fs.readFileSync(path.join(seedFilesPath, previewFilename));
  return {
    key: `${PUBLIC_PREFIX}/preview-images/seed/${previewFilename}`,
    filename: previewFilename,
    blob,
    contentType: mimeFor(previewFilename),
  };
}

/** Load a real `.nlogox` file shipped in `seed-files/`, with its Info tab + optional preview. */
export function loadNlogox(filename: string, previewFilename?: string): NlogoxAsset {
  const filepath = path.join(seedFilesPath, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return {
    key: `uploads/models/${filename}`,
    filename,
    blob: Buffer.from(content, 'utf-8'),
    contentType: 'application/xml',
    sizeBytes: BigInt(fs.statSync(filepath).size),
    infoTab: extractInfoTab(content),
    preview: previewFilename ? loadPreview(previewFilename) : undefined,
  };
}

/**
 * Synthesize a placeholder `.nlogox` for a library model we don't ship a real
 * file for. Cards still render (title, description, preview); the file just
 * won't open in the NetLogo viewer.
 */
export function fakeNlogox(slug: string, title: string, previewFilename?: string): NlogoxAsset {
  const xml = `<?xml version="1.0" encoding="utf-8" ?>
<model version="NetLogo 7.0.0" snapToGrid="true">
  <code><![CDATA[;; ${title} - placeholder seed model
to setup
  clear-all
  reset-ticks
end

to go
  tick
end]]></code>
  <info><![CDATA[## WHAT IS IT?

${title} is part of the NetLogo Models Library. This is a seeded placeholder used for local development.]]></info>
</model>`;
  const filename = `${slug}.nlogox`;
  const blob = Buffer.from(xml, 'utf-8');
  return {
    key: `uploads/models/${filename}`,
    filename,
    blob,
    contentType: 'application/xml',
    sizeBytes: BigInt(blob.byteLength),
    infoTab: extractInfoTab(xml),
    preview: previewFilename ? loadPreview(previewFilename) : undefined,
  };
}

export interface SupplementaryAsset {
  key: string;
  filename: string;
  blob: Buffer;
  contentType: string;
  sizeBytes: bigint;
}

export function textAsset(
  filename: string,
  content: string,
  keyPrefix = 'uploads/models',
): SupplementaryAsset {
  const blob = Buffer.from(content, 'utf-8');
  return {
    key: `${keyPrefix.replace(/\/+$/, '')}/${filename}`,
    filename,
    blob,
    contentType: mimeFor(filename),
    sizeBytes: BigInt(blob.byteLength),
  };
}

/**
 * Uploads to object storage, de-duplicated by key. Public assets (preview
 * images) live under `files/public/` and are uploaded with a public-read ACL
 * so `fileService.getUrl` serves them directly.
 */
export class AssetUploader {
  private uploaded = new Set<string>();

  async put(opts: {
    key: string;
    body: Buffer;
    contentType: string;
    filename: string;
    public?: boolean;
  }): Promise<void> {
    if (this.uploaded.has(opts.key)) return;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
        ...(opts.public ? { ACL: 'public-read' } : {}),
        Metadata: { filename: opts.filename, createdAt: new Date().toISOString() },
      }),
    );
    this.uploaded.add(opts.key);
  }

  async putNlogox(asset: NlogoxAsset): Promise<void> {
    await this.put({
      key: asset.key,
      body: asset.blob,
      contentType: asset.contentType,
      filename: asset.filename,
    });
    if (asset.preview) {
      await this.put({
        key: asset.preview.key,
        body: asset.preview.blob,
        contentType: asset.preview.contentType,
        filename: asset.preview.filename,
        public: true,
      });
    }
  }

  async putSupplementary(asset: SupplementaryAsset): Promise<void> {
    await this.put({
      key: asset.key,
      body: asset.blob,
      contentType: asset.contentType,
      filename: asset.filename,
    });
  }

  get count(): number {
    return this.uploaded.size;
  }
}
