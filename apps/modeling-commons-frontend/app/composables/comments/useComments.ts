import type { MaybeRefOrGetter } from "vue";
import type { CommentPagination } from "~/components/comment/types";

type CommentsSource = { modelId: string; commentId?: string };

async function fetchComments(source: CommentsSource, sort?: CommentSort): Promise<CommentsPayload> {
  if (!source.modelId) return createEmptyCommentsPayload();

  if (source.commentId) {
    const root = await fetchComment(source.modelId, source.commentId, {});
    return root
      ? { comments: [root], pagination: { count: 1, lastPage: 0 } }
      : createEmptyCommentsPayload();
  }

  return fetchModelComments(source.modelId, { sort });
}

export default function useComments(
  source: MaybeRefOrGetter<CommentsSource>,
  sort?: MaybeRefOrGetter<CommentSort | undefined>,
) {
  const resolved = computed(() => toValue(source));
  const resolvedSort = computed<CommentSort>(() => toValue(sort) ?? "likes");
  const key = computed(() => {
    const value = resolved.value;
    return value.commentId
      ? `comments:thread:${value.modelId}:${value.commentId}`
      : `comments:model:${value.modelId}:${resolvedSort.value}`;
  });

  const asyncData = useAsyncData<CommentsPayload>(
    () => key.value,
    () => fetchComments(resolved.value, resolvedSort.value),
    { watch: [key] },
  );
  const { data, status, error, refresh } = asyncData;
  const loaded = asyncData.then(() => undefined);

  const comments = computed(() => data.value?.comments ?? []);
  const pagination = computed<CommentPagination>(
    () => data.value?.pagination ?? createEmptyCommentPagination(),
  );

  return { comments, pagination, status, error, refresh, loaded };
}

export type { CommentsSource };
