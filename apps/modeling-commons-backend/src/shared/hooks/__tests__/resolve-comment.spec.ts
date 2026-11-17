import { CommentNotFoundError } from '#src/modules/model-comment/domain/model-comment.errors.ts';
import { resolveComment } from '#src/shared/hooks/resolve-comment.ts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockPort, type MockedPort } from '#src/shared/test/mock-port.ts';
import type { ModelCommentRepository } from '#src/modules/model-comment/database/model-comment.repository.port.ts';

const reply = {} as FastifyReply;

function makeRequest(opts: {
  modelId: string;
  commentId: string;
  modelCommentRepository: MockedPort<ModelCommentRepository>;
}): FastifyRequest {
  return {
    params: { id: opts.modelId, commentId: opts.commentId },
    server: {
      diContainer: { cradle: { modelCommentRepository: opts.modelCommentRepository } },
    },
  } as unknown as FastifyRequest;
}

describe('resolveComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws CommentNotFoundError when the comment does not exist', async () => {
    const modelCommentRepository = mockPort<ModelCommentRepository>();
    modelCommentRepository.findById.mockResolvedValue(undefined);

    const request = makeRequest({ modelId: 'm1', commentId: 'c1', modelCommentRepository });

    // @ts-expect-error - no need for done callback
    await expect(resolveComment()(request, reply)).rejects.toThrow(CommentNotFoundError);
  });

  it('throws CommentNotFoundError when the comment belongs to a different model', async () => {
    const modelCommentRepository = mockPort<ModelCommentRepository>();
    modelCommentRepository.findById.mockResolvedValue({ id: 'c1', modelId: 'other' });

    const request = makeRequest({ modelId: 'm1', commentId: 'c1', modelCommentRepository });

    // @ts-expect-error - no need for done callback
    await expect(resolveComment()(request, reply)).rejects.toThrow(CommentNotFoundError);
    expect(modelCommentRepository.findById).toHaveBeenCalledWith('c1');
  });

  it('attaches the comment to the request when the model id matches', async () => {
    const comment = { id: 'c1', modelId: 'm1', content: 'hello' };
    const modelCommentRepository = mockPort<ModelCommentRepository>();
    modelCommentRepository.findById.mockResolvedValue(comment);

    const request = makeRequest({ modelId: 'm1', commentId: 'c1', modelCommentRepository });

    // @ts-expect-error - no need for done callback
    await resolveComment()(request, reply);

    expect((request as unknown as { comment: unknown }).comment).toBe(comment);
  });
});
