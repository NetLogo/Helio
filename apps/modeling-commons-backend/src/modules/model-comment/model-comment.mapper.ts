import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';
import type { CommentResponseDto } from '#src/modules/model-comment/dtos/comment.response.dto.ts';

export type CommentResponseCtx = {
  viewerId?: string;
  viewerRole?: string;
};

export type ModelCommentMapper = {
  toResponse: (entity: ModelCommentEntity, ctx?: CommentResponseCtx) => CommentResponseDto;
};

// Not a `Mapper<Entity, Record, Response>` (create-mapper.ts) — `toResponse`
// here takes a viewer context (permissions/likedByMe are viewer-relative),
// which that shared interface doesn't model. `replies` is deliberately never
// set: bounded-tree embedding is the query layer's job (list-comments/get-comment).
export default function modelCommentMapper(): ModelCommentMapper {
  return {
    toResponse(entity: ModelCommentEntity, ctx: CommentResponseCtx = {}): CommentResponseDto {
      const deleted = entity.deletedAt !== null;

      const author =
        deleted || !entity.user
          ? { id: '', name: '[deleted]', image: '' }
          : {
              id: entity.user.id,
              name: entity.user.name ?? '[deleted]',
              image: entity.user.image ?? '',
            };

      const permissions =
        !deleted && ctx.viewerId
          ? {
              canEdit: ctx.viewerId === entity.userId,
              canDelete: ctx.viewerId === entity.userId || ctx.viewerRole === 'admin',
            }
          : undefined;

      return {
        id: entity.id,
        modelId: entity.modelId,
        parentId: entity.parentId ?? undefined,
        versionNumber: entity.versionNumber ?? undefined,
        legacyId: entity.legacyId ?? undefined,
        author,
        content: deleted ? '[deleted]' : (entity.content ?? ''),
        createdAt: entity.createdAt.toISOString(),
        edited: !deleted && entity.editedAt !== null ? true : undefined,
        deleted: deleted ? true : undefined,
        likes: entity.likesCount,
        likedByMe: ctx.viewerId ? entity.likedByMe : undefined,
        permissions,
      };
    },
  };
}

declare global {
  interface Dependencies {
    modelCommentMapper: ModelCommentMapper;
  }
}
