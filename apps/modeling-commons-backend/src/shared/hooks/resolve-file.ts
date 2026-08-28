import rules from '#src/config/rules.ts';
import { FileUploadError, FileValidationError } from '#src/modules/file/domain/file.errors.ts';
import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';
import type { MultipartFields } from '@fastify/multipart';
import { fileTypeFromBuffer } from 'file-type';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { TSchema } from 'typebox';
import { Value } from 'typebox/value';

export interface ResolvedFile {
  filename: string;
  mimetype: string;
  detectedMimetype: string | null;
  encoding: string;
  buffer: Buffer;
  fields: MultipartFields;
  values: unknown;
}

export interface ResolveFileOptions {
  allowedMimeTypes?: Array<string>;
  requireDetectedType?: boolean;
  fieldsSchema?: TSchema;
}

function gc(buffer: Buffer) {
  // Help V8 GC by zeroing out the buffer's contents and releasing its memory.
  buffer.fill(0);
}

function extractTextFields(fields: MultipartFields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!field || Array.isArray(field)) continue;
    if (typeof field === 'object' && 'value' in field) {
      const value = (field as { value: unknown }).value;
      if (typeof value === 'string') out[key] = value;
    }
  }
  return out;
}

export function resolveFile(options: ResolveFileOptions = {}): preHandlerHookHandler {
  const { allowedMimeTypes, requireDetectedType = false, fieldsSchema } = options;
  const allowed = allowedMimeTypes ? new Set(allowedMimeTypes) : null;

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      throw new FileUploadError('No file provided in "file" field');
    }

    const buffer = await data.toBuffer();

    if (data.file.truncated) {
      throw new FileUploadError('File exceeds the maximum allowed size');
    }

    // The declared MIME comes from the client's OS association table, so it varies
    // per machine for the same bytes (a .nlogox is `text/nlogox` where NetLogo is
    // installed, `application/octet-stream` where it isn't). Only the sniffed type
    // decides anything here.
    const detected = await fileTypeFromBuffer(buffer);

    if (detected && rules.mime.deniedTypes.includes(detected.mime)) {
      gc(buffer);
      throw new FileValidationError(data.filename, `MIME type ${detected.mime} is denied`);
    }

    if (allowed && detected && !allowed.has(detected.mime)) {
      gc(buffer);
      throw new FileValidationError(data.filename, `MIME type ${detected.mime} is not allowed`);
    }

    if (requireDetectedType && !detected) {
      gc(buffer);
      throw new FileValidationError(data.filename, 'Unable to detect MIME type');
    }

    let safeMime: string | undefined = detected?.mime;

    for (const { pattern, mapped } of rules.mime.mappedTypes) {
      if (safeMime && pattern.test(safeMime)) {
        safeMime = mapped;
        break;
      }
    }

    safeMime = safeMime ?? rules.mime.undetectedTypesDefault;

    let values: unknown = extractTextFields(data.fields);

    if (fieldsSchema) {
      const converted = Value.Convert(fieldsSchema, values);
      if (!Value.Check(fieldsSchema, converted)) {
        const [first] = Value.Errors(fieldsSchema, converted);
        gc(buffer);
        throw new ArgumentInvalidException(
          first ? `${first.instancePath || '/'}: ${first.message}` : 'Invalid multipart fields',
        );
      }
      values = converted;
    }

    request.uploadedFile = {
      filename: data.filename,
      mimetype: safeMime,
      detectedMimetype: detected?.mime ?? null,
      encoding: data.encoding,
      buffer,
      fields: data.fields,
      values,
    };
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    uploadedFile: ResolvedFile;
  }
}
