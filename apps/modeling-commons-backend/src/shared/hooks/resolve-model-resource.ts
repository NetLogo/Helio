import { NotFoundException } from '#src/shared/exceptions/index.ts';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

interface ModelOwnedResource {
  modelId: string;
}

export function resolveModelResource<T extends ModelOwnedResource>(opts: {
  resourceName: string;
  paramName: string;
  load: (id: string, cradle: Dependencies) => Promise<T | null | undefined>;
}): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const params = request.params as { id: string | undefined; [key: string]: string | undefined };
    const modelId = params.id;
    const resourceId = params[opts.paramName];

    if (!resourceId || !modelId) {
      throw new NotFoundException(`${opts.resourceName} not found`);
    }

    const entity = await opts.load(resourceId, request.server.diContainer.cradle);
    if (!entity || entity.modelId !== modelId) {
      throw new NotFoundException(`${opts.resourceName} not found`);
    }

    request.modelResource = entity;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    modelResource: unknown;
  }
}
