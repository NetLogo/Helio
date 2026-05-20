import { NotFoundException } from '#src/shared/exceptions/index.ts';
import { resolveModelResource } from '#src/shared/hooks/resolve-model-resource.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

const reply = {} as FastifyReply;

function makeRequest(params: Record<string, string | undefined>): FastifyRequest {
  return {
    params,
    server: { diContainer: { cradle: {} } },
  } as unknown as FastifyRequest;
}

describe('resolveModelResource', () => {
  it('throws NotFoundException when the model id param is missing', async () => {
    const hook = resolveModelResource({
      resourceName: 'Tag',
      paramName: 'tagId',
      load: vi.fn(),
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(makeRequest({ tagId: 't1' }), reply)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the resource id param is missing', async () => {
    const hook = resolveModelResource({
      resourceName: 'Tag',
      paramName: 'tagId',
      load: vi.fn(),
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(makeRequest({ id: 'm1' }), reply)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when load returns null/undefined', async () => {
    const load = vi.fn().mockResolvedValue(null);
    const hook = resolveModelResource({ resourceName: 'Tag', paramName: 'tagId', load });
    // @ts-expect-error - no need for done callback
    await expect(hook(makeRequest({ id: 'm1', tagId: 't1' }), reply)).rejects.toThrow(
      NotFoundException,
    );
    expect(load).toHaveBeenCalledWith('t1', expect.anything());
  });

  it('throws NotFoundException when the loaded resource belongs to a different model', async () => {
    const hook = resolveModelResource({
      resourceName: 'Tag',
      paramName: 'tagId',
      load: vi.fn().mockResolvedValue({ id: 't1', modelId: 'other' }),
    });
    // @ts-expect-error - no need for done callback
    await expect(hook(makeRequest({ id: 'm1', tagId: 't1' }), reply)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('attaches the resource when the model id matches', async () => {
    const resource = { id: 't1', modelId: 'm1', extra: 'data' };
    const hook = resolveModelResource({
      resourceName: 'Tag',
      paramName: 'tagId',
      load: vi.fn().mockResolvedValue(resource),
    });

    const request = makeRequest({ id: 'm1', tagId: 't1' });
    // @ts-expect-error - no need for done callback
    await hook(request, reply);

    expect((request as unknown as { modelResource: unknown }).modelResource).toBe(resource);
  });
});
