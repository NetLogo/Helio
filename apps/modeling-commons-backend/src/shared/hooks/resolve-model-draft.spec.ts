import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveModelDraft } from '#src/shared/hooks/resolve-model-draft.ts';
import {
  ModelDraftAccessDeniedError,
  ModelDraftNotFoundError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';
import { ForbiddenException, UnauthorizedException } from '#src/shared/exceptions/index.ts';
import { mockModelDraftRepository } from '#src/modules/model-draft/database/model-draft.repository.mock.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ModelDraftEntity } from '#src/modules/model-draft/domain/model-draft.types.ts';

const reply = {} as FastifyReply;

function makeDraft(overrides: Partial<ModelDraftEntity> = {}): ModelDraftEntity {
  return {
    id: 'draft-1',
    userId: 'user-1',
    modelId: null,
    schemaVersion: 1,
    data: {} as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildRequest(opts: {
  draftId: string;
  userId?: string;
  draftRepo?: ReturnType<typeof mockModelDraftRepository>;
  modelRow?: {
    id: string;
    visibility: 'public' | 'private' | 'unlisted';
    deletedAt: Date | null;
    authors: { role: string }[];
    permissions: { permissionLevel: string }[];
  } | null;
  viewer?: { id: string; systemRole: 'admin' | 'moderator' | 'user'; banned: boolean; deletedAt: Date | null } | null;
}): { request: FastifyRequest; draftRepo: ReturnType<typeof mockModelDraftRepository> } {
  const draftRepo = opts.draftRepo ?? mockModelDraftRepository();
  const db = {
    user: { findUnique: vi.fn().mockResolvedValue(opts.viewer ?? null) },
    model: { findUnique: vi.fn().mockResolvedValue(opts.modelRow ?? null) },
  };

  const request = {
    params: { id: opts.draftId },
    user: opts.userId ? { id: opts.userId } : undefined,
    server: { diContainer: { cradle: { db, modelDraftRepository: draftRepo } } },
  } as unknown as FastifyRequest;

  return { request, draftRepo };
}

describe('resolveModelDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UnauthorizedException when no user is on the request', async () => {
    const { request } = buildRequest({ draftId: 'd1' });
    await expect(resolveModelDraft()(request, reply)).rejects.toThrow(UnauthorizedException);
  });

  it('throws ModelDraftNotFoundError when the draft does not exist', async () => {
    const draftRepo = mockModelDraftRepository();
    draftRepo.findById.mockResolvedValue(undefined);
    const { request } = buildRequest({ draftId: 'd1', userId: 'u1', draftRepo });

    await expect(resolveModelDraft()(request, reply)).rejects.toThrow(ModelDraftNotFoundError);
  });

  it('throws ModelDraftAccessDeniedError when the draft belongs to another user', async () => {
    const draftRepo = mockModelDraftRepository();
    draftRepo.findById.mockResolvedValue(makeDraft({ userId: 'other' }));
    const { request } = buildRequest({ draftId: 'd1', userId: 'u1', draftRepo });

    await expect(resolveModelDraft()(request, reply)).rejects.toThrow(ModelDraftAccessDeniedError);
  });

  it('attaches the draft when the caller owns it and no model is linked', async () => {
    const draftRepo = mockModelDraftRepository();
    const draft = makeDraft({ userId: 'u1' });
    draftRepo.findById.mockResolvedValue(draft);
    const { request } = buildRequest({ draftId: 'd1', userId: 'u1', draftRepo });

    await resolveModelDraft()(request, reply);

    expect((request as unknown as { modelDraft: ModelDraftEntity }).modelDraft).toBe(draft);
  });

  it('rejects when the draft references a missing model', async () => {
    const draftRepo = mockModelDraftRepository();
    draftRepo.findById.mockResolvedValue(makeDraft({ userId: 'u1', modelId: 'm1' }));
    const { request } = buildRequest({
      draftId: 'd1',
      userId: 'u1',
      draftRepo,
      modelRow: null,
      viewer: { id: 'u1', systemRole: 'user', banned: false, deletedAt: null },
    });

    await expect(resolveModelDraft()(request, reply)).rejects.toThrow(/model not found/i);
  });

  it('throws ForbiddenException when the linked model exists but the user cannot write', async () => {
    const draftRepo = mockModelDraftRepository();
    draftRepo.findById.mockResolvedValue(makeDraft({ userId: 'u1', modelId: 'm1' }));
    const { request } = buildRequest({
      draftId: 'd1',
      userId: 'u1',
      draftRepo,
      modelRow: {
        id: 'm1',
        visibility: 'public',
        deletedAt: null,
        authors: [],
        permissions: [],
      },
      viewer: { id: 'u1', systemRole: 'user', banned: false, deletedAt: null },
    });

    await expect(resolveModelDraft()(request, reply)).rejects.toThrow(ForbiddenException);
  });

  it('attaches the draft when the user has write access to the linked model (owner)', async () => {
    const draftRepo = mockModelDraftRepository();
    const draft = makeDraft({ userId: 'u1', modelId: 'm1' });
    draftRepo.findById.mockResolvedValue(draft);
    const { request } = buildRequest({
      draftId: 'd1',
      userId: 'u1',
      draftRepo,
      modelRow: {
        id: 'm1',
        visibility: 'public',
        deletedAt: null,
        authors: [{ role: 'owner' }],
        permissions: [],
      },
      viewer: { id: 'u1', systemRole: 'user', banned: false, deletedAt: null },
    });

    await resolveModelDraft()(request, reply);

    expect((request as unknown as { modelDraft: ModelDraftEntity }).modelDraft).toBe(draft);
  });
});
