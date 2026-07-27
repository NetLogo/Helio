import { Type, type Static } from 'typebox';
import { baseResponseDtoSchema } from '#src/shared/api/response.base.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';
import { sortQueryRequestDtoSchema } from '#src/shared/api/sort-query.request.dto.ts';
import { visibilitySchema } from '#src/modules/model/shared/enums.ts';
import { dateRangeQueryRequestDtoSchema } from '#src/shared/api/date-range-query.request.dto.ts';
import type { ModelActionMap } from '#src/shared/permissions/model-access.actions.ts';
import type {
  CreateModelProps,
  ModelSearchFilters,
  ModelSortBy,
  UpdateModelProps,
} from '#src/modules/model/domain/model.types.ts';

export const createModelRequestDtoSchema = Type.Object({
  title: Type.String({
    description: 'Model title',
    minLength: 1,
    maxLength: 255,
  }),
  description: Type.Optional(Type.String({ description: 'Model description', maxLength: 10000 })),
  visibility: Type.Optional(visibilitySchema),
  parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
  parentVersionNumber: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const updateModelRequestDtoSchema = Type.Object({
  visibility: Type.Optional(visibilitySchema),
});

export const modelIdParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});

export const modelLegacyIdParamsSchema = Type.Object({
  legacyId: Type.Integer({ minimum: 1 }),
});

export const modelVersionParamsSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
});

export const modelSortBySchema = Type.Union(
  [
    Type.Literal('recent'),
    Type.Literal('views'),
    Type.Literal('downloads'),
    Type.Literal('runs'),
    Type.Literal('likes'),
  ],
  { $id: 'ModelSortBy', description: 'Sort order for model search results' },
);

export const modelCardVariantSchema = Type.Object({
  variant: Type.Optional(
    Type.Union([Type.Literal('card'), Type.Literal('default')], {
      description: 'Variant of the model to return',
      default: 'default',
    }),
  ),
});
export type ModelCardVariant = Static<typeof modelCardVariantSchema>['variant'];

export const modelSearchQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  dateRangeQueryRequestDtoSchema,
  sortQueryRequestDtoSchema(modelSortBySchema),
  Type.Object({
    tags: Type.Optional(
      Type.Array(Type.String(), { description: 'Filter models by tag', default: [] }),
    ),
    authorId: Type.Optional(Type.String({ format: 'uuid' })),
    authorRoles: Type.Optional(Type.Array(Type.Enum(['owner', 'contributor']))),
    parentModelId: Type.Optional(Type.String({ format: 'uuid' })),
    isEndorsed: Type.Optional(Type.Boolean()),
    isLibraryModel: Type.Optional(Type.Boolean()),
    keyword: Type.Optional(Type.String()),
    netlogoVersion: Type.Optional(Type.String()),
    publicOnly: Type.Optional(Type.Boolean({ default: true })),
  }),
]);

export const modelResponseDtoSchema = Type.Intersect([
  baseResponseDtoSchema,
  Type.Object({
    latestVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    parentModelId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    parentVersionNumber: Type.Union([Type.Integer(), Type.Null()]),
    visibility: visibilitySchema,
    isEndorsed: Type.Boolean(),
    isLibraryModel: Type.Boolean(),
  }),
]);

export const modelPermissionsDtoSchema = Type.Object({
  canView: Type.Boolean(),
  canFork: Type.Boolean(),
  canComment: Type.Boolean(),
  canReport: Type.Boolean(),
  canLike: Type.Boolean(),
  canEdit: Type.Boolean(),
  canPublishVersion: Type.Boolean(),
  canEditDraft: Type.Boolean(),
  canRevertVersion: Type.Boolean(),
  canManageAuthors: Type.Boolean(),
  canChangePermissions: Type.Boolean(),
  canTransferOwnership: Type.Boolean(),
  canDelete: Type.Boolean(),
});

type _AssertSameKeys =
  Static<typeof modelPermissionsDtoSchema> extends ModelActionMap
    ? ModelActionMap extends Static<typeof modelPermissionsDtoSchema>
      ? true
      : never
    : never;
const _assertActionMapKeysMatch: _AssertSameKeys = true;
void _assertActionMapKeysMatch;

export const modelPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(modelResponseDtoSchema),
  }),
]);

export type ModelIdParams = Static<typeof modelIdParamsSchema>;
export type ModelLegacyIdParams = Static<typeof modelLegacyIdParamsSchema>;
export type ModelVersionParams = Static<typeof modelVersionParamsSchema>;
export type ModelSearchQuery = Static<typeof modelSearchQuerySchema>;
export type CreateModelRequestDto = Static<typeof createModelRequestDtoSchema>;
export type UpdateModelRequestDto = Static<typeof updateModelRequestDtoSchema>;
export type ModelPermissionsDto = Static<typeof modelPermissionsDtoSchema>;
export type ModelResponseDto = Static<typeof modelResponseDtoSchema>;

export type ModelVariant = Static<typeof modelCardVariantSchema>;

// The domain owns these shapes; the schemas above are their HTTP surface. Asserting mutual
// assignability here keeps a schema edit from silently drifting away from the domain type.
type _SameShape<A, B> = A extends B ? (B extends A ? true : never) : never;

const _assertCreatePropsMatch: _SameShape<CreateModelRequestDto, CreateModelProps> = true;
const _assertUpdatePropsMatch: _SameShape<UpdateModelRequestDto, UpdateModelProps> = true;
const _assertSortByMatches: _SameShape<Static<typeof modelSortBySchema>, ModelSortBy> = true;
const _assertSearchFiltersMatch: _SameShape<
  Omit<ModelSearchQuery, 'limit' | 'page'>,
  ModelSearchFilters
> = true;
void _assertCreatePropsMatch;
void _assertUpdatePropsMatch;
void _assertSortByMatches;
void _assertSearchFiltersMatch;
