import { describe, it, expect } from 'vitest';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { UnauthorizedException } from '#src/shared/exceptions/index.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';

const reply = {} as FastifyReply;

describe('requireAuth', () => {
  it('resolves when request.user is present', async () => {
    const request = { user: { id: 'user-1' } } as unknown as FastifyRequest;
    await expect(requireAuth(request, reply)).resolves.toBeUndefined();
  });

  it('throws UnauthorizedException when request.user is missing', async () => {
    const request = {} as FastifyRequest;
    await expect(requireAuth(request, reply)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when request.user is null', async () => {
    const request = { user: null } as unknown as FastifyRequest;
    await expect(requireAuth(request, reply)).rejects.toThrow(UnauthorizedException);
  });
});
