import { Type, type Static } from 'typebox';

export const commentAuthorDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  image: Type.String(),
});

export type CommentAuthorDto = Static<typeof commentAuthorDtoSchema>;

export const commentResponseDtoSchema = Type.Cyclic(
  {
    Comment: Type.Object({
      id: Type.String({ format: 'uuid' }),
      modelId: Type.String({ format: 'uuid' }),
      parentId: Type.Optional(Type.String({ format: 'uuid' })),
      versionNumber: Type.Optional(Type.Integer()),
      legacyId: Type.Optional(Type.Integer()),
      author: commentAuthorDtoSchema,
      content: Type.String(),
      createdAt: Type.String(),
      edited: Type.Optional(Type.Boolean()),
      deleted: Type.Optional(Type.Boolean()),
      likes: Type.Integer(),
      likedByMe: Type.Optional(Type.Boolean()),
      permissions: Type.Optional(
        Type.Object({
          canEdit: Type.Optional(Type.Boolean()),
          canDelete: Type.Optional(Type.Boolean()),
        }),
      ),
      replies: Type.Optional(
        Type.Object({
          count: Type.Integer(),
          limit: Type.Integer(),
          page: Type.Integer(),
          data: Type.Array(Type.Ref('Comment')),
        }),
      ),
    }),
  },
  'Comment',
);

export type CommentResponseDto = Static<typeof commentResponseDtoSchema>;
