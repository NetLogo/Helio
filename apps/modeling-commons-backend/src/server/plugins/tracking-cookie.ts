import {
  TRACKING_COOKIE_NAME,
  generateUniqueId,
  readTrackingCookie,
  setTrackingCookie,
} from '#src/shared/http/client-context.ts';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function trackingCookiePlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/auth/')) return;
    if (readTrackingCookie(request)) return;
    const value = generateUniqueId();
    const existingCookie = request.headers.cookie;
    request.headers.cookie = existingCookie
      ? `${existingCookie}; ${TRACKING_COOKIE_NAME}=${value}`
      : `${TRACKING_COOKIE_NAME}=${value}`;
    setTrackingCookie(reply, value);
  });
}

export default fp(trackingCookiePlugin, {
  name: 'trackingCookie',
});
