import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { PUBLIC_PREFIX } from '#src/modules/file/domain/file.types.ts';
import { remapString, type IdMap } from './rewrite.ts';

// CopyObject cannot copy an object larger than this in one call. Nothing the
// app writes comes close, so a hit means an object arrived by another route
// and needs a multipart copy rather than a silent failure.
const MAX_SINGLE_COPY_BYTES = 5 * 1024 ** 3;

const DELETE_BATCH = 1000;

export type StorageMove = { from: string; to: string };

/**
 * Uploads belonging to an unpublished draft. `stagingPrefix` and
 * `publicStagingPrefix` in model-draft.storage.ts are the only writers of
 * either tree, so the whole subtree goes when the drafts do.
 */
export function isStagingKey(key: string): boolean {
  return key.startsWith('staging/') || key.startsWith(`${PUBLIC_PREFIX}/staging/`);
}

export function createStorageClient(): { client: S3Client; bucket: string } {
  const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`missing env ${name}`);
    return value;
  };

  const client = new S3Client({
    region: required('STORE_REGION'),
    credentials: {
      accessKeyId: required('STORE_ACCESS_KEY'),
      secretAccessKey: required('STORE_SECRET_KEY'),
    },
    endpoint: required('STORE_ENDPOINT'),
    forcePathStyle: true,
  });

  return { client, bucket: required('STORE_BUCKET') };
}

export async function listAllKeys(client: S3Client, bucket: string): Promise<Array<string>> {
  const keys: Array<string> = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );
    for (const object of page.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export function planStorageMoves(keys: ReadonlyArray<string>, map: IdMap): Array<StorageMove> {
  const moves: Array<StorageMove> = [];
  for (const key of keys) {
    const to = remapString(key, map);
    if (to !== key) moves.push({ from: key, to });
  }
  return moves;
}

/**
 * Copies each object to its new key, leaving the original in place. Object
 * metadata carries a `userId` that the app validates against `format: nanoid`,
 * so it is remapped in the same call rather than left pointing at a row that
 * no longer exists.
 *
 * Copy and delete are deliberately separate phases. Between them the database
 * swap either commits or rolls back, and until it commits every original
 * object is still exactly where the unmigrated rows expect it.
 */
export async function copyObjects(
  client: S3Client,
  bucket: string,
  moves: ReadonlyArray<StorageMove>,
  map: IdMap,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;

  for (const move of moves) {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: move.from }));

    if ((head.ContentLength ?? 0) > MAX_SINGLE_COPY_BYTES) {
      throw new Error(`${move.from} is too large for a single-part copy (${head.ContentLength} bytes)`);
    }

    const metadata = Object.fromEntries(
      Object.entries(head.Metadata ?? {}).map(([key, value]) => [key, remapString(value, map)]),
    );

    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: move.to,
        CopySource: `${bucket}/${move.from}`,
        MetadataDirective: 'REPLACE',
        Metadata: metadata,
        ACL: move.to.startsWith(`${PUBLIC_PREFIX}/`) ? 'public-read' : 'private',
        ...(head.ContentType ? { ContentType: head.ContentType } : {}),
        ...(head.CacheControl ? { CacheControl: head.CacheControl } : {}),
        ...(head.ContentDisposition ? { ContentDisposition: head.ContentDisposition } : {}),
        ...(head.ContentEncoding ? { ContentEncoding: head.ContentEncoding } : {}),
      }),
    );

    done += 1;
    onProgress?.(done, moves.length);
  }
}

export async function deleteKeys(
  client: S3Client,
  bucket: string,
  keys: ReadonlyArray<string>,
): Promise<void> {
  for (let offset = 0; offset < keys.length; offset += DELETE_BATCH) {
    const batch = keys.slice(offset, offset + DELETE_BATCH);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }
}
