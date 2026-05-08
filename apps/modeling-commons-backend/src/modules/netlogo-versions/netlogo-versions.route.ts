import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import {
  NetlogoVersionsQuerySchema,
  NetlogoVersionsResponseDtoSchema,
} from './netlogo-versions.dto.ts';

export default async function netlogoVersionsRoutes(fastify: FastifyInstance) {
  const { modelVersionService } = fastify.diContainer.cradle;

  fastify.withTypeProvider<TypeBoxTypeProvider>().route({
    method: 'GET',
    url: '/v1/netlogo-versions',
    schema: {
      querystring: NetlogoVersionsQuerySchema,
      response: { 200: NetlogoVersionsResponseDtoSchema },
      tags: ['NetLogo Versions', 'Search'],
    },
    handler: async (req) => {
      return modelVersionService.findNetlogoVersionsByPrefix(req.query.prefix ?? '');
    },
  });
}
