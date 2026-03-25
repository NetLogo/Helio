import env from '#src/config/env.ts';
import rules from '#src/config/rules.ts';
import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function multipartPlugin(fastify: FastifyInstance) {
  // await fastify.register(multipart, {
  //   limits: {
  //     fileSize: rules.limits.fileUpload.size.max,
  //     files: rules.limits.fileUpload.filesPerUpload.max,
  //   },
  //   logLevel: env.log.level,
  //   throwFileSizeLimit: true,
  // });
}

export default fp(multipartPlugin, {
  name: 'multipart',
});
