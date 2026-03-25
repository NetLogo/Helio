import { Type, type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';

const testResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  timestamp: Type.String(),
  data: Type.Object({
    greeting: Type.String(),
    version: Type.String(),
    environment: Type.String(),
  }),
});

export default async function testRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'GET',
    url: '/v1/test',
    schema: {
      description: 'Test endpoint',
      response: {
        200: testResponseSchema,
      },
      tags: ['test'],
      hide: true,
    },
    handler: async (_req, res) => {
      return res.status(200).send({
        success: true,
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        data: {
          greeting: 'Hello from Modeling Commons Backend!',
          version: '0.0.0',
          environment: process.env['NODE_ENV'] ?? 'development',
        },
      });
    },
  });
}
