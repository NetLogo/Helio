import { describe, it, expect } from 'vitest';
import { requireRole } from '#src/shared/hooks/require-role.ts';
import { ForbiddenException } from '#src/shared/exceptions/index.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';

const reply = {} as FastifyReply;

function reqWithRole(role: string | undefined): FastifyRequest {
  return { user: role ? { systemRole: role } : undefined } as unknown as FastifyRequest;
}

describe('requireRole', () => {
  it('allows a user whose role matches one of the allowed roles', async () => {
    const hook = requireRole('admin');
    await expect(hook(reqWithRole('admin'), reply)).resolves.toBeUndefined();
  });

  it('allows any of multiple roles', async () => {
    const hook = requireRole('admin', 'moderator');
    await expect(hook(reqWithRole('moderator'), reply)).resolves.toBeUndefined();
  });

  it('rejects a user whose role is not in the allowed set', async () => {
    const hook = requireRole('admin');
    await expect(hook(reqWithRole('user'), reply)).rejects.toThrow(ForbiddenException);
  });

  it('rejects when no user is attached to the request', async () => {
    const hook = requireRole('admin');
    await expect(hook(reqWithRole(undefined), reply)).rejects.toThrow(ForbiddenException);
  });

  it('rejects when the user has no systemRole', async () => {
    const hook = requireRole('admin');
    const request = { user: {} } as unknown as FastifyRequest;
    await expect(hook(request, reply)).rejects.toThrow(ForbiddenException);
  });
});
