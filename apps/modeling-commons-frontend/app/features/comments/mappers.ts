import type { Comment, CommentAuthor, CommentPagination } from "~/components/comment/types";

export const createEmptyCommentPagination = (): CommentPagination => ({ count: 0, lastPage: null });

export const createEmptyCommentsPayload = (): CommentsPayload => ({
  comments: [],
  pagination: createEmptyCommentPagination(),
});

// A page that carried no rows loaded nothing, whatever index the server stamped
// on it: a comment at the nesting limit reports its reply `count` with an empty
// `data`, and paging it has to start at 0. The pagination helpers derive
// "load N more" from `count` minus the number of items already in hand.
export function mapCommentPagination(page: ApiRepliesPage | ApiCommentPage): CommentPagination {
  return {
    count: page.count,
    limit: page.limit,
    lastPage: page.data.length > 0 ? page.page : null,
  };
}

function mapCommentAuthor(author: ApiComment["author"]): CommentAuthor {
  return {
    name: author.name,
    image: author.image,
    url: author.id ? `/users/${author.id}` : undefined,
  };
}

export function mapApiComment(dto: ApiComment): Comment {
  return {
    id: dto.id,
    modelId: dto.modelId,
    parentId: dto.parentId,
    author: mapCommentAuthor(dto.author),
    content: dto.content,
    createdAt: dto.createdAt,
    edited: dto.edited,
    deleted: dto.deleted,
    likes: dto.likes,
    likedByMe: dto.likedByMe ?? false,
    permissions: dto.permissions,
    replies: dto.replies ? dto.replies.data.map(mapApiComment) : [],
    replyPagination: dto.replies
      ? mapCommentPagination(dto.replies)
      : createEmptyCommentPagination(),
  };
}

export function mapCommentPage(page: ApiCommentPage): CommentsPayload {
  return { comments: page.data.map(mapApiComment), pagination: mapCommentPagination(page) };
}
