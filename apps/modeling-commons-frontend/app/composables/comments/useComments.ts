import type { MaybeRefOrGetter } from "vue";
import { findCommentById } from "~/components/comment/comment-tree";
import { comments as modelCommentsFixture, deepThread } from "~/components/comment/fixtures";
import type { Comment, CommentPagination } from "~/components/comment/types";

type CommentsSource = { modelId: string } | { commentId: string };

type CommentsPayload = {
  comments: Array<Comment>;
  pagination: CommentPagination;
};

const emptyPayload = (): CommentsPayload => ({
  comments: [],
  pagination: { count: 0, lastPage: 0 },
});

// TODO: PLACEHOLDER — there is no comments backend yet. Replace ONLY this
// function's body with the real calls once the endpoints exist:
//   { modelId }   -> GET /api/v1/models/{id}/comments
//   { commentId } -> GET /api/v1/comments/{id}/thread
// Until those routes are in shared/types/api.d.ts, use the repo convention of
// raw `fetch(apiBase + path, { credentials: "include" })` (see
// composables/model/useModelInteractions.ts), then migrate to
// `api.GET(...)` after regenerating types with `yarn generate:types`.
async function fetchComments(source: CommentsSource): Promise<CommentsPayload> {
  const fixtureTrees = [...modelCommentsFixture, deepThread];

  if ("modelId" in source) {
    if (!source.modelId) return emptyPayload();
    const comments = structuredClone(modelCommentsFixture);
    return { comments, pagination: { count: comments.length, lastPage: 1 } };
  }

  const root = source.commentId ? findCommentById(fixtureTrees, source.commentId) : null;
  if (!root) return emptyPayload();
  return { comments: [structuredClone(root)], pagination: { count: 1, lastPage: 1 } };
}

export default function useComments(source: MaybeRefOrGetter<CommentsSource>) {
  const resolved = computed(() => toValue(source));
  const key = computed(() =>
    "modelId" in resolved.value
      ? `comments:model:${resolved.value.modelId}`
      : `comments:thread:${resolved.value.commentId}`,
  );

  const { data, status, error, refresh } = useAsyncData<CommentsPayload>(
    () => key.value,
    () => fetchComments(resolved.value),
    { watch: [key] },
  );

  const comments = computed(() => data.value?.comments ?? []);
  const pagination = computed<CommentPagination>(
    () => data.value?.pagination ?? { count: 0, lastPage: 0 },
  );

  return { comments, pagination, status, error, refresh };
}

export type { CommentsPayload, CommentsSource };
