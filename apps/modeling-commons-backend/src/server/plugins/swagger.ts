import env from '#src/config/env.ts';
import Swagger from '@fastify/swagger';
import Scalar from '@scalar/fastify-api-reference';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from '#src/lib/auth.ts';

async function swaggerGeneratorPlugin(fastify: FastifyInstance) {
  await fastify.register(Swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: env.product.name,
        description: `The OpenAPI documentation for the ${env.product.name} API.`,
        version: env.product.version,
      },
    },

    swagger: {
      info: {
        title: env.product.name,
        description: `The Swagger API documentation for the ${env.product.name} project.`,
        version: env.product.version,
      },
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  fastify.route({
    method: ['GET'],
    url: '/api-docs/auth/openapi.json',
    schema: {
      hide: true,
    },
    handler: async (_, reply) => {
      const schema = await auth.api.generateOpenAPISchema();
      reply.send(schema);
    },
  });

  await fastify.register(Scalar, {
    routePrefix: '/api-docs',
    configuration: {
      metaData: {
        title: `${env.product.name} API Reference`,
        description: `The OpenAPI documentation for the ${env.product.name} API.`,
        version: env.product.version,
      },
      sources: [
        { url: '/api-docs/openapi.json', title: 'REST API' },
        { url: '/api-docs/auth/openapi.json', title: 'Authentication API' },
      ],
    },
  });

  fastify.log.info(`Swagger documentation is available at /api-docs`);
}

export default fp(swaggerGeneratorPlugin, {
  name: 'swaggerGenerator',
});
