import type { FastifyInstance } from 'fastify';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import {
  createDraftRequestDtoSchema,
  draftFileParamsSchema,
  draftFileUploadResponseSchema,
  draftIdParamsSchema,
  modelDraftPaginatedResponseSchema,
  modelDraftResponseDtoSchema,
  patchDraftRequestDtoSchema,
  publishDraftResponseSchema,
  type CreateDraftRequestDto,
  type DraftFileParams,
  type DraftIdParams,
  type PatchDraftRequestDto,
} from '#src/modules/model-draft/dtos/model-draft.dto.ts';
import type { DraftFileRole } from '#src/modules/model-draft/dtos/model-draft.dto.ts';
import { ArgumentInvalidException } from '#src/shared/exceptions/index.ts';

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
      preHandler: [requireAuth],
    },
    async (request) => {
      const entity = await modelDraftService.get(request.params.id, request.user!.id);
      return modelDraftMapper.toResponse(entity);
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
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await modelDraftService.patch(request.params.id, request.user!.id, request.body);
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
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const data = await request.file();
      if (!data) throw new ArgumentInvalidException('File upload required');

      const readField = (key: string): string | undefined => {
        const field = data.fields[key];
        if (field && typeof field === 'object' && 'value' in field) {
          const value = (field as { value: unknown }).value;
          return typeof value === 'string' ? value : undefined;
        }
        return undefined;
      };

      const role = readField('role');
      if (role !== 'primary' && role !== 'attachment') {
        throw new ArgumentInvalidException('role must be "primary" or "attachment"');
      }

      const buf = await data.toBuffer();
      const owned = Buffer.alloc(buf.length) as Buffer<ArrayBuffer>;
      buf.copy(owned);
      buf.fill(0);

      const result = await modelDraftService.addFile(
        request.params.id,
        request.user!.id,
        role as DraftFileRole,
        { buffer: owned, filename: data.filename, contentType: data.mimetype },
      );
      return reply.code(201).send(result);
    },
  );

  fastify.delete<{ Params: DraftFileParams }>(
    '/v1/model-drafts/:id/files/:fileId',
    {
      schema: { params: draftFileParamsSchema, tags: ['ModelDraft'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await modelDraftService.removeFile(
        request.params.id,
        request.user!.id,
        request.params.fileId,
      );
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
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const result = await modelDraftService.publish(request.params.id, request.user!.id);
      return reply.code(201).send(result);
    },
  );

  fastify.delete<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id',
    {
      schema: { params: draftIdParamsSchema, tags: ['ModelDraft'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await modelDraftService.abandon(request.params.id, request.user!.id);
      return reply.code(204).send();
    },
  );

}
