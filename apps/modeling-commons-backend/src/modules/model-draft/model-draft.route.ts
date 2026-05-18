import type { FastifyInstance } from 'fastify';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveFile } from '#src/shared/hooks/resolve-file.ts';
import { resolveModelDraft } from '#src/shared/hooks/resolve-model-draft.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import {
  createDraftRequestDtoSchema,
  draftFileParamsSchema,
  draftFileUploadFieldsSchema,
  draftFileUploadResponseSchema,
  draftIdParamsSchema,
  modelDraftPaginatedResponseSchema,
  modelDraftResponseDtoSchema,
  patchDraftRequestDtoSchema,
  publishDraftResponseSchema,
  type CreateDraftRequestDto,
  type DraftFileParams,
  type DraftFileUploadFieldsDto,
  type DraftIdParams,
  type PatchDraftRequestDto,
} from '#src/modules/model-draft/dtos/model-draft.dto.ts';

export default async function modelDraftRoutes(fastify: FastifyInstance) {
  const { modelDraftService, modelDraftMapper } = fastify.diContainer.cradle;

  fastify.post<{ Body: CreateDraftRequestDto }>(
    '/v1/model-drafts',
    {
      schema: {
        body: createDraftRequestDtoSchema,
        response: { 201: idDtoSchema },
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const result = await modelDraftService.create(request.user!.id, request.body);
      return reply.code(201).send({ id: result.id });
    },
  );

  fastify.get<{ Querystring: { limit?: number; page?: number } }>(
    '/v1/model-drafts',
    {
      schema: {
        querystring: paginatedQueryRequestDtoSchema,
        response: { 200: modelDraftPaginatedResponseSchema },
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { limit = 20, page = 0 } = request.query;
      const offset = page * limit;
      const result = await fastify.diContainer.cradle.modelDraftRepository.listByUser(
        request.user!.id,
        { limit, page, offset, orderBy: { field: 'updatedAt', param: 'desc' } },
      );
      return {
        ...result,
        data: result.data.map((e) => modelDraftMapper.toResponse(e)),
      };
    },
  );

  fastify.get<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id',
    {
      schema: {
        params: draftIdParamsSchema,
        response: { 200: modelDraftResponseDtoSchema },
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request) => {
      return modelDraftMapper.toResponse(request.modelDraft);
    },
  );

  fastify.patch<{ Params: DraftIdParams; Body: PatchDraftRequestDto }>(
    '/v1/model-drafts/:id',
    {
      schema: {
        params: draftIdParamsSchema,
        body: patchDraftRequestDtoSchema,
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      await modelDraftService.patch(request.modelDraft, request.body);
      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id/files',
    {
      schema: {
        params: draftIdParamsSchema,
        response: { 201: draftFileUploadResponseSchema },
        tags: ['ModelDraft'],
        consumes: ['multipart/form-data'],
        description:
          'Upload a file to the draft. Multipart form with required "file" field and "role" field ("primary" | "attachment").',
      },
      preHandler: [
        requireAuth,
        resolveModelDraft(),
        resolveFile({ fieldsSchema: draftFileUploadFieldsSchema }),
      ],
    },
    async (request, reply) => {
      const { buffer, filename, mimetype } = request.uploadedFile;
      const { role } = request.uploadedFile.values as DraftFileUploadFieldsDto;

      const result = await modelDraftService.addFile(request.modelDraft, role, {
        buffer: buffer as Buffer<ArrayBuffer>,
        filename,
        contentType: mimetype,
      });
      return reply.code(201).send(result);
    },
  );

  fastify.delete<{ Params: DraftFileParams }>(
    '/v1/model-drafts/:id/files/:fileId',
    {
      schema: { params: draftFileParamsSchema, tags: ['ModelDraft'] },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      await modelDraftService.removeFile(request.modelDraft, request.params.fileId);
      return reply.code(204).send();
    },
  );

  fastify.post<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id/publish',
    {
      schema: {
        params: draftIdParamsSchema,
        response: { 201: publishDraftResponseSchema },
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      const result = await modelDraftService.publish(request.modelDraft);
      return reply.code(201).send(result);
    },
  );

  fastify.delete<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id',
    {
      schema: { params: draftIdParamsSchema, tags: ['ModelDraft'] },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      await modelDraftService.abandon(request.modelDraft);
      return reply.code(204).send();
    },
  );
}
