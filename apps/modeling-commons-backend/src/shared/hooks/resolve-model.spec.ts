import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import { NotFoundException, ForbiddenException } from '#src/shared/exceptions/index.ts';
import { mockPermissionRepository } from '#src/modules/model-permission/database/permission.repository.mock.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';

const reply = {} as FastifyReply;

type ModelRow = {
  id: string;
  visibility: 'public' | 'private' | 'unlisted';
  deletedAt: Date | null;
};

function makeRequest(opts: {
  modelId: string;
  userId?: string;
  model?: ModelRow | null;
  user?: { id: string; systemRole: 'admin' | 'moderator' | 'user'; banned: boolean; deletedAt: Date | null } | null;
  permissionRepository?: ReturnType<typeof mockPermissionRepository>;
}): { request: FastifyRequest; permissionRepository: ReturnType<typeof mockPermissionRepository> } {
  const permissionRepository = opts.permissionRepository ?? mockPermissionRepository();
  const db = {
    model: { findUnique: vi.fn().mockResolvedValue(opts.model ?? null) },
    user: { findUnique: vi.fn().mockResolvedValue(opts.user ?? null) },
  };

  const request = {
    params: { id: opts.modelId },
    user: opts.userId ? { id: opts.userId } : undefined,
    server: { diContainer: { cradle: { db, permissionRepository } } },
  } as unknown as FastifyRequest;

  return { request, permissionRepository };
}

describe('resolveModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundException when the model does not exist', async () => {
    const { request } = makeRequest({ modelId: 'missing', model: null });
    await expect(resolveModel('read')(request, reply)).rejects.toThrow(NotFoundException);
  });

  it('allows an anonymous viewer to read a public model and attaches it to the request', async () => {
    const { request } = makeRequest({
      modelId: 'm1',
      model: { id: 'm1', visibility: 'public', deletedAt: null },
    });

    await resolveModel('read')(request, reply);

    expect((request as unknown as { model: ModelRow }).model.id).toBe('m1');
    expect((request as unknown as { modelAccess: { viewer: unknown } }).modelAccess.viewer).toBeNull();
  });

  it('denies an anonymous viewer from reading a private model', async () => {
    const { request } = makeRequest({
      modelId: 'm1',
      model: { id: 'm1', visibility: 'private', deletedAt: null },
    });

    await expect(resolveModel('read')(request, reply)).rejects.toThrow(ForbiddenException);
  });

  it('looks up authorship and grants for an authenticated viewer', async () => {
    const permissionRepository = mockPermissionRepository();
    permissionRepository.findAuthor.mockResolvedValue({ role: 'owner' });
    permissionRepository.findByModelAndUser.mockResolvedValue({ permissionLevel: 'admin' });

    const { request } = makeRequest({
      modelId: 'm1',
      userId: 'u1',
      user: { id: 'u1', systemRole: 'user', banned: false, deletedAt: null },
      model: { id: 'm1', visibility: 'private', deletedAt: null },
      permissionRepository,
    });

    await resolveModel('admin')(request, reply);

    expect(permissionRepository.findAuthor).toHaveBeenCalledWith('m1', 'u1');
    expect(permissionRepository.findByModelAndUser).toHaveBeenCalledWith('m1', 'u1');
    const ctx = (request as unknown as { modelAccess: { ownerRole: string; grantLevel: string } })
      .modelAccess;
    expect(ctx.ownerRole).toBe('owner');
    expect(ctx.grantLevel).toBe('admin');
  });

  it('denies write on a public model for an unrelated authenticated viewer', async () => {
    const permissionRepository = mockPermissionRepository();
    permissionRepository.findAuthor.mockResolvedValue(undefined);
    permissionRepository.findByModelAndUser.mockResolvedValue(undefined);

    const { request } = makeRequest({
      modelId: 'm1',
      userId: 'u2',
      user: { id: 'u2', systemRole: 'user', banned: false, deletedAt: null },
      model: { id: 'm1', visibility: 'public', deletedAt: null },
      permissionRepository,
    });

    await expect(resolveModel('write')(request, reply)).rejects.toThrow(ForbiddenException);
  });
});
