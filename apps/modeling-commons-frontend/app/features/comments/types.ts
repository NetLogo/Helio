import type { Comment, CommentPagination } from "~/components/comment/types";

export type ApiComment = ResponseSuccessData<"GET", "/api/v1/models/{id}/comments/{commentId}">;
export type ApiCommentPage = ResponseSuccessData<"GET", "/api/v1/models/{id}/comments">;
export type ApiRepliesPage = NonNullable<ApiComment["replies"]>;
export type CommentQuery = NonNullable<QueryParams<"GET", "/api/v1/models/{id}/comments">>;
export type CommentReplyQuery = NonNullable<
  QueryParams<"GET", "/api/v1/models/{id}/comments/{commentId}">
>;
export type CommentSort = NonNullable<CommentQuery["sort"]>;
export type CreateCommentInput = RequestBody<"POST", "/api/v1/models/{id}/comments">;
export type CreatedComment = ResponseSuccessData<"POST", "/api/v1/models/{id}/comments">;

export type CommentsPayload = {
  comments: Array<Comment>;
  pagination: CommentPagination;
};
