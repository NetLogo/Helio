import 'dotenv/config';

import path from 'node:path';
import fs from 'fs/promises';

import { parseNlogo, parseNlogox } from './lib/nlogo.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { Dirent } from 'node:fs';

const seedFilesPath = path.join(import.meta.dirname, 'archive-output', 'files');
const outputPath = path.join(import.meta.dirname, 'archive-converted');

// upload each file in seedFilesPath to the S3 bucket, key relative to seedFilesPath
const report = {
  files: { converted: 0, skipped: 0, failed: 0 },
  versions: {} as Record<string, { converted: number; skipped: number; failed: number }>,
  errors: [] as {
    file: string;
    netlogoVersion?: string | null;
    error: string;
    stackTrace?: string;
  }[],
};

const MAX_FILES = parseInt(process.env['MAX_FILES'] || '1000000', 10);
const OFFSET_INDEX = parseInt(process.env['OFFSET_INDEX'] || '0', 10);
const BATCH_SIZE = parseInt(process.env['BATCH_SIZE'] || '1', 10);

async function $fetch(...args: Parameters<typeof fetch>): Promise<Response> {
  const maxRetries = 5;
  let attempt = 0;
  let delay = 1000;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(...args);
      if (response.status === 503) {
        throw new Error(`Service unavailable (503)`);
      }
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(
          `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      console.warn(
        `Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Unexpected error in $fetch');
}

async function convertModel(file: Dirent) {
  if (file.isFile()) {
    const filePath = path.join(file.parentPath, file.name);

    const extName = path.extname(file.name).toLowerCase();
    if (['.nlogo', '.nlogo3d', '.nlogox', '.nlogox3d'].includes(extName)) {
      const fileContent = await fs.readFile(filePath);
      const { netlogoVersion = 'unknown' } = ['.nlogo', '.nlogo3d'].includes(extName)
        ? parseNlogo(fileContent.toString())
        : parseNlogox(fileContent.toString());

      console.info(`Processing file: ${file.name} (NetLogo version: ${netlogoVersion})`);

      try {
        const formData = new FormData();
        formData.append('model', new Blob([fileContent]), file.name);

        const response = await $fetch('https://convert.netlogo.org/convert', {
          method: 'POST',
          body: formData,
          // retry with exponential backoff on 503 or network errors, up to 5 attempts
        });

        if (!response.ok) {
          const errorText =
            (await response.text()) ??
            (await response
              .json()
              .then((json) => JSON.stringify(json))
              .catch(() => null)) ??
            'No error details';
          handleStatus(
            'failed',
            filePath,
            netlogoVersion,
            new Error(`Conversion failed with status ${response.status}: ${errorText}`),
            {
              statusCode: response.status,
              responseText: errorText,
              responseHeaders: Object.fromEntries(response.headers.entries()),
            },
          );
          return;
        } else {
          const convertedContent = await readResponseStream(response);
          const convertedFilename = file.name.replace(/\.nlogo(3d)?$/, '.nlogox$1');
          const relKey = path.relative(
            seedFilesPath,
            path.join(file.parentPath, convertedFilename),
          );
          await writeLocalFile(relKey, convertedContent);
        }
      } catch (error) {
        handleStatus(
          'failed',
          filePath,
          netlogoVersion,
          error instanceof Error ? error : new Error(String(error)),
        );
        return;
      }

      handleStatus('converted', filePath, netlogoVersion);
    } else {
      handleStatus('skipped', filePath, 'N/A');
      return;
    }
  }
}

async function convertModels() {
  const allEntries = await fs.readdir(seedFilesPath, { withFileTypes: true, recursive: true });

  const convertibleExts = ['.nlogo', '.nlogo3d', '.nlogox', '.nlogox3d'];
  const files = allEntries.filter(
    (f) => f.isFile() && convertibleExts.includes(path.extname(f.name).toLowerCase()),
  );

  const skippedCount = allEntries.length - files.length;
  console.log(
    `Found ${allEntries.length} entries, ${files.length} convertible, ${skippedCount} skipped. Starting conversion...`,
  );
  report.files.skipped += skippedCount;

  function cursor() {
    let lastProcessedIndex = OFFSET_INDEX - 1;
    return function getNext() {
      lastProcessedIndex++;
      if (lastProcessedIndex >= files.length || lastProcessedIndex >= OFFSET_INDEX + MAX_FILES) {
        return null;
      }
      return files[lastProcessedIndex];
    };
  }

  const getNext = cursor();

  function processOne(file: Dirent | null, slot: number): Promise<void> {
    if (file === null) return Promise.resolve();
    if (!file) return Promise.resolve();

    return convertModel(file)
      .then(() => writeLocalFile(`report.json`, Buffer.from(JSON.stringify(report, null, 2))))
      .then(() => processOne(getNext(), slot))
      .catch((error) => {
        console.error(`Error processing file ${file.name}:`, error);
        return processOne(getNext(), slot);
      });
  }

  const slots = Array.from({ length: BATCH_SIZE }, (_, i) => processOne(getNext(), i));
  await Promise.all(slots);
}

function handleStatus(
  status: 'converted' | 'skipped' | 'failed',
  filePath: string,
  netlogoVersion?: string | null,
  error?: Error,
  metadata?: Record<string, any>,
): void {
  if (status === 'failed' && error) {
    report.errors.push({
      file: filePath,
      netlogoVersion,
      error: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      ...metadata,
    });
  }
  report.files[status]++;

  const versionKey = netlogoVersion || 'unknown';
  report.versions[versionKey] ??= { converted: 0, skipped: 0, failed: 0 };
  report.versions[versionKey][status]++;
}

async function writeGitIgnore() {
  const gitIgnore = `
  *
  !.gitignore
  `;
  await mkdir(outputPath, { recursive: true });
  await writeFile(path.join(outputPath, '.gitignore'), gitIgnore);
}

async function writeLocalFile(relKey: string, contents: Buffer) {
  const full = path.join(outputPath, relKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents);
}

async function readResponseStream(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    if (value) chunks.push(value);
    done = doneReading;
  }

  return Buffer.concat(chunks);
}

async function runHeadless() {}

writeGitIgnore()
  .then(() => convertModels())
  .then(() => writeLocalFile('report.json', Buffer.from(JSON.stringify(report, null, 2))))
  .then(() => console.log('Conversion complete. Report written to archive-converted/report.json'))
  .catch((error) => console.error('Error during conversion:', error));
