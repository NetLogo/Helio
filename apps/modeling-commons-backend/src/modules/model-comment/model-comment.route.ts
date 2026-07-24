import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveComment } from '#src/shared/hooks/resolve-comment.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import type { FastifyInstance } from 'fastify';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';
import {
  modelCommentParamsSchema,
  modelCommentDetailParamsSchema,
  type ModelCommentParams,
  type ModelCommentDetailParams,
} from '#src/modules/model-comment/model-comment.schemas.ts';
import {
  createCommentRequestDtoSchema,
  type CreateCommentRequestDto,
} from '#src/modules/model-comment/dtos/create-comment.request.dto.ts';
import {
  updateCommentRequestDtoSchema,
  type UpdateCommentRequestDto,
} from '#src/modules/model-comment/dtos/update-comment.request.dto.ts';
import {
  listCommentsQueryDtoSchema,
  type ListCommentsQueryDto,
} from '#src/modules/model-comment/dtos/list-comments.query.dto.ts';
import {
  getCommentQueryDtoSchema,
  type GetCommentQueryDto,
} from '#src/modules/model-comment/dtos/get-comment.query.dto.ts';
import {
  commentResponseDtoSchema,
  commentResponseRefSchema,
} from '#src/modules/model-comment/dtos/comment.response.dto.ts';
import { commentPaginatedResponseSchema } from '#src/modules/model-comment/dtos/comment.paginated.response.dto.ts';

export default async function modelCommentRoutes(fastify: FastifyInstance) {
  const { modelCommentService, listCommentsQuery, getCommentQuery } = fastify.diContainer.cradle;

  fastify.addSchema(commentResponseDtoSchema);

  fastify.get<{ Params: ModelCommentParams; Querystring: ListCommentsQueryDto }>(
    '/v1/models/:id/comments',
    {
      schema: {
        params: modelCommentParamsSchema,
        querystring: listCommentsQueryDtoSchema,
        response: { 200: commentPaginatedResponseSchema },
        tags: ['Comment'],
      },
      preHandler: [resolveModel('read')],
    },
    async (request) => {
      return listCommentsQuery.execute(request.params.id, request.query, {
        viewerId: request.user?.id,
        viewerRole: request.user?.systemRole,
      });
    },
  );

  fastify.post<{ Params: ModelCommentParams; Body: CreateCommentRequestDto }>(
    '/v1/models/:id/comments',
    {
      schema: {
        params: modelCommentParamsSchema,
        body: createCommentRequestDtoSchema,
        response: { 201: idDtoSchema },
        tags: ['Comment'],
      },
      preHandler: [requireAuth, resolveModel('read')],
    },
    async (request, reply) => {
      const { id } = await modelCommentService.create({
        modelId: request.params.id,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userId: request.user!.id,
        parentId: request.body.parentId,
        versionNumber: request.body.versionNumber,
        content: request.body.content,
      });
      return reply.code(201).send({ id });
    },
  );

  fastify.get<{ Params: ModelCommentDetailParams; Querystring: GetCommentQueryDto }>(
    '/v1/models/:id/comments/:commentId',
    {
      schema: {
        params: modelCommentDetailParamsSchema,
        querystring: getCommentQueryDtoSchema,
        response: { 200: commentResponseRefSchema },
        tags: ['Comment'],
      },
      preHandler: [resolveModel('read'), resolveComment()],
    },
    async (request) => {
      return getCommentQuery.execute(request.params.commentId, request.query, {
        viewerId: request.user?.id,
        viewerRole: request.user?.systemRole,
      });
    },
  );

  fastify.patch<{ Params: ModelCommentDetailParams; Body: UpdateCommentRequestDto }>(
    '/v1/models/:id/comments/:commentId',
    {
      schema: {
        params: modelCommentDetailParamsSchema,
        body: updateCommentRequestDtoSchema,
        tags: ['Comment'],
      },
      preHandler: [requireAuth, resolveModel('read'), resolveComment()],
    },
    async (request, reply) => {
      await modelCommentService.updateContent({
        modelId: request.params.id,
        commentId: request.params.commentId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        callerId: request.user!.id,
        content: request.body.content,
      });
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: ModelCommentDetailParams }>(
    '/v1/models/:id/comments/:commentId',
    {
      schema: { params: modelCommentDetailParamsSchema, tags: ['Comment'] },
      preHandler: [requireAuth, resolveModel('read'), resolveComment()],
    },
    async (request, reply) => {
      await modelCommentService.softDelete({
        modelId: request.params.id,
        commentId: request.params.commentId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        caller: { id: request.user!.id, systemRole: request.user!.systemRole },
      });
      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: ModelCommentDetailParams }>(
    '/v1/models/:id/comments/:commentId/like',
    {
      schema: { params: modelCommentDetailParamsSchema, tags: ['Comment'] },
      preHandler: [requireAuth, resolveModel('read'), resolveComment()],
    },
    async (request, reply) => {
      await modelCommentService.like({
        modelId: request.params.id,
        commentId: request.params.commentId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userId: request.user!.id,
      });
      return reply.code(204).send();
    },
  );

  fastify.delete<{ Params: ModelCommentDetailParams }>(
    '/v1/models/:id/comments/:commentId/like',
    {
      schema: { params: modelCommentDetailParamsSchema, tags: ['Comment'] },
      preHandler: [requireAuth, resolveModel('read'), resolveComment()],
    },
    async (request, reply) => {
      await modelCommentService.unlike({
        modelId: request.params.id,
        commentId: request.params.commentId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        userId: request.user!.id,
      });
      return reply.code(204).send();
    },
  );
}
