import env from '#src/config/env.ts';
import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

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
    // If you don't need to generate client types you could keep swagger
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

  await fastify.register(SwaggerUI, {
    routePrefix: '/api-docs',
  });

  fastify.log.info(`Swagger documentation is available at /api-docs`);
}

export default fp(swaggerGeneratorPlugin, {
  name: 'swaggerGenerator',
});
