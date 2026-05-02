import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import { Type } from 'typebox';

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ message: 'File upload required' });
      }

      if (!ALLOWED_AVATAR_MIME_TYPES.has(data.mimetype)) {
        return reply.code(400).send({ message: 'Unsupported image type' });
      }

      const buffer = await data.toBuffer();
      const ownBuffer = Buffer.alloc(buffer.length);
      buffer.copy(ownBuffer);
      buffer.fill(0);

      if (ownBuffer.length > MAX_AVATAR_BYTES) {
        return reply.code(400).send({ message: 'Avatar must be 2 MB or smaller' });
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
