import rules from '#src/config/rules.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { Type } from 'typebox';
import { FileUploadError } from './domain/file.errors.ts';

const ALLOWED_AVATAR_MIME_TYPES = new Set(rules.avatar.allowedMimeTypes);
const MAX_AVATAR_BYTES = rules.avatar.maxFileSize;

export default async function fileRoutes(fastify: FastifyInstance) {
  const { fileService } = fastify.diContainer.cradle;

  fastify.post<{ Body: { file: MultipartFile } }>(
    '/v1/uploads/avatar',
    {
      schema: {
        response: {
          201: Type.Object({ url: Type.String() }),
        },
        tags: ['File'],
        consumes: ['multipart/form-data'],
        description:
          'Upload an avatar image (multipart/form-data, field "file"). Returns the public URL of the uploaded file.',
      },
      config: {
        rateLimit: {
          // Would a user really need more than 5 avatar
          // uploads per minute? I don't believe so.
          // Verdict: sensible limit.
          // -Omar Ibrahim, May 04 26
          ...rules.limits.fileUploadRoute.strict,
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        throw new FileUploadError('No file provided in "file" field');
      }

      if (!ALLOWED_AVATAR_MIME_TYPES.has(data.mimetype)) {
        throw new FileUploadError(`Unsupported file type: ${data.mimetype}`);
      }

      const buffer = await data.toBuffer();
      const ownBuffer = Buffer.alloc(buffer.length);
      buffer.copy(ownBuffer);
      buffer.fill(0);

      if (ownBuffer.length > MAX_AVATAR_BYTES) {
        throw new FileUploadError(
          `Avatar must be ${MAX_AVATAR_BYTES / (1024 * 1024)} MB or smaller`,
        );
      }

      const key = await fileService.upload({
        filename: data.filename,
        buffer: ownBuffer,
        contentType: data.mimetype,
        access: 'public-read',
        pathPrefix: `avatars/${request.user!.id}`,
      });

      const url = await fileService.getUrl(key);

      return reply.code(201).send({ url });
    },
  );
}
