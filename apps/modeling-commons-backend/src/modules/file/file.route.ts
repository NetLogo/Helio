import rules from '#src/config/rules.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveFile } from '#src/shared/hooks/resolve-file.ts';
import type { FastifyInstance } from 'fastify';
import { Type } from 'typebox';
import { FileTooLargeError } from './domain/file.errors.ts';
import { randomUUID } from 'node:crypto';

const MAX_AVATAR_BYTES = rules.avatar.maxFileSize;

export default async function fileRoutes(fastify: FastifyInstance) {
  const { fileService } = fastify.diContainer.cradle;

  fastify.post(
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
      preHandler: [
        requireAuth,
        resolveFile({
          allowedMimeTypes: rules.avatar.allowedMimeTypes,
          requireDetectedType: true,
        }),
      ],
    },
    async (request, reply) => {
      const { mimetype, buffer } = request.uploadedFile;

      if (buffer.length > MAX_AVATAR_BYTES) {
        throw new FileTooLargeError(buffer.length, MAX_AVATAR_BYTES);
      }

      const filename = `${randomUUID()}-ua`;

      const key = await fileService.upload({
        filename,
        buffer,
        contentType: mimetype,
        access: 'public-read',
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pathPrefix: `avatars/${request.user!.id}`,
      });

      const url = await fileService.getUrl(key);

      return reply.code(201).send({ url });
    },
  );
}
