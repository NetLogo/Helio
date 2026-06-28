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
  generatePreviewImageResponseSchema,
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
  const { modelDraftService, modelDraftMapper, fileService } = fastify.diContainer.cradle;

  async function resolvePreviewImageUrl(s3Key: string | undefined): Promise<string | null> {
    if (!s3Key) return null;
    return fileService.getUrl(s3Key);
  }

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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        request.user!.id,
        { limit, page, offset, orderBy: { field: 'updatedAt', param: 'desc' } },
      );
      return {
        ...result,
        data: await Promise.all(
          result.data.map(async (e) => {
            const dto = modelDraftMapper.toResponse(e);
            return {
              ...dto,
              previewImageUrl: await resolvePreviewImageUrl(dto.data.previewImage?.s3Key),
            };
          }),
        ),
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
      const response = modelDraftMapper.toResponse(request.modelDraft);
      return {
        ...response,
        previewImageUrl: await resolvePreviewImageUrl(response.data.previewImage?.s3Key),
      };
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
          'Upload a file to the draft. Multipart form with required "file" field and "role" field ("primary" | "model-file" | "attachment" | "preview"). A "model-file" is a version-relevant model file; an "attachment" is an additional (non-version-relevant) file.',
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
      if (role === 'preview') {
        const previewImageUrl = await fileService.getUrl(result.s3Key);
        return reply.code(201).send({ ...result, previewImageUrl });
      }
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
    '/v1/model-drafts/:id/preview-image/generate',
    {
      schema: {
        params: draftIdParamsSchema,
        response: { 201: generatePreviewImageResponseSchema },
        tags: ['ModelDraft'],
        description:
          "Auto-generate a preview image from the draft's primary NetLogo file. Result is staged on the draft.",
      },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      const result = await modelDraftService.generatePreviewImage(request.modelDraft);
      const previewImageUrl = await fileService.getUrl(result.s3Key);
      return reply.code(201).send({ ...result, previewImageUrl });
    },
  );

  fastify.post<{ Params: DraftIdParams }>(
    '/v1/model-drafts/:id/publish',
    {
      schema: {
        params: draftIdParamsSchema,
        response: { 200: publishDraftResponseSchema, 201: publishDraftResponseSchema },
        tags: ['ModelDraft'],
      },
      preHandler: [requireAuth, resolveModelDraft()],
    },
    async (request, reply) => {
      const result = await modelDraftService.publish(request.modelDraft);
      return reply.code(result.createdNewVersion ? 201 : 200).send(result);
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
