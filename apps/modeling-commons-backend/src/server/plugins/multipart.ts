import '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function multipartPlugin(_fastify: FastifyInstance) {
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
