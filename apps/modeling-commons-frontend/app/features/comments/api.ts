import type { Comment } from "~/components/comment/types";

export async function fetchModelComments(
  modelId: string,
  query: CommentQuery,
): Promise<CommentsPayload> {
  const result = await useApi().GET("/api/v1/models/{id}/comments", {
    params: { path: { id: modelId }, query },
  });
  return mapCommentPage(getCommentResponseData(result, `GET comments of model ${modelId}`));
}

// Re-rooted single comment with a bounded reply tree. Used both to render a
// standalone thread and to page a node's replies inline (append `.replies`).
export async function fetchComment(
  modelId: string,
  commentId: string,
  query: CommentReplyQuery,
): Promise<Comment | null> {
  const result = await useApi().GET("/api/v1/models/{id}/comments/{commentId}", {
    params: { path: { id: modelId, commentId }, query },
  });
  if (result.response.status === 404) return null;
  return mapApiComment(getCommentResponseData(result, `GET comment ${commentId}`));
}

export async function createComment(
  modelId: string,
  body: CreateCommentInput,
): Promise<CreatedComment> {
  const result = await useApi().POST("/api/v1/models/{id}/comments", {
    params: { path: { id: modelId } },
    body,
  });
  return getCommentResponseData(result, "POST comment");
}

export async function editComment(
  modelId: string,
  commentId: string,
  content: string,
): Promise<void> {
  const { response } = await useApi().PATCH("/api/v1/models/{id}/comments/{commentId}", {
    params: { path: { id: modelId, commentId } },
    body: { content },
  });
  throwUnlessCommentRequestOk(response, `PATCH comment ${commentId}`);
}

export async function likeComment(modelId: string, commentId: string): Promise<void> {
  const { response } = await useApi().POST("/api/v1/models/{id}/comments/{commentId}/like", {
    params: { path: { id: modelId, commentId } },
  });
  throwUnlessCommentRequestOk(response, `POST like on comment ${commentId}`);
}

export async function unlikeComment(modelId: string, commentId: string): Promise<void> {
  const { response } = await useApi().DELETE("/api/v1/models/{id}/comments/{commentId}/like", {
    params: { path: { id: modelId, commentId } },
  });
  throwUnlessCommentRequestOk(response, `DELETE like on comment ${commentId}`);
}

export async function deleteComment(modelId: string, commentId: string): Promise<void> {
  const { response } = await useApi().DELETE("/api/v1/models/{id}/comments/{commentId}", {
    params: { path: { id: modelId, commentId } },
  });
  throwUnlessCommentRequestOk(response, `DELETE comment ${commentId}`);
}
