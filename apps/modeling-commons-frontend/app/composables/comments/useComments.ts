import type { MaybeRefOrGetter } from "vue";
import type { Comment, CommentAuthor, CommentPagination } from "~/components/comment/types";

type CommentsSource = { modelId: string; commentId?: string };

type CommentsPayload = {
  comments: Array<Comment>;
  pagination: CommentPagination;
};

type ApiClient = ReturnType<typeof useApi>;

type ApiComment = ResponseSuccessData<"GET", "/api/v1/models/{id}/comments/{commentId}">;

type ApiCommentPage = ResponseSuccessData<"GET", "/api/v1/models/{id}/comments">;

type ApiRepliesPage = NonNullable<ApiComment["replies"]>;

type ReplyPageQuery = NonNullable<QueryParams<"GET", "/api/v1/models/{id}/comments/{commentId}">>;

type CommentQuery = NonNullable<QueryParams<"GET", "/api/v1/models/{id}/comments">>;

export type CommentSort = NonNullable<CommentQuery["sort"]>;

const emptyPagination = (): CommentPagination => ({ count: 0, lastPage: null });

const emptyPayload = (): CommentsPayload => ({
  comments: [],
  pagination: emptyPagination(),
});

// A page that carried no rows loaded nothing, whatever index the server stamped
// on it: a comment at the nesting limit reports its reply `count` with an empty
// `data`, and paging it has to start at 0. The pagination helpers derive
// "load N more" from `count` minus the number of items already in hand.
function toPagination(page: ApiRepliesPage | ApiCommentPage): CommentPagination {
  return {
    count: page.count,
    limit: page.limit,
    lastPage: page.data.length > 0 ? page.page : null,
  };
}

function mapAuthor(author: ApiComment["author"]): CommentAuthor {
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
    author: mapAuthor(dto.author),
    content: dto.content,
    createdAt: dto.createdAt,
    edited: dto.edited,
    deleted: dto.deleted,
    likes: dto.likes,
    likedByMe: dto.likedByMe ?? false,
    permissions: dto.permissions,
    replies: dto.replies ? dto.replies.data.map(mapApiComment) : [],
    replyPagination: dto.replies ? toPagination(dto.replies) : emptyPagination(),
  };
}

type ApiResult<T> = { data?: T; response: Response };

export function throwUnlessOk(response: Response, request: string): void {
  if (!response.ok) throw new Error(`${request} failed with ${response.status}`);
}

export function getResponseData<T>({ data, response }: ApiResult<T>, request: string): T {
  throwUnlessOk(response, request);
  if (data === undefined) throw new Error(`${request} returned no body`);
  return data;
}

export async function fetchModelComments(
  api: ApiClient,
  modelId: string,
  query: CommentQuery,
): Promise<CommentsPayload> {
  const result = await api.GET("/api/v1/models/{id}/comments", {
    params: { path: { id: modelId }, query },
  });
  const page = getResponseData(result, `GET comments of model ${modelId}`);
  return { comments: page.data.map(mapApiComment), pagination: toPagination(page) };
}

// Re-rooted single comment with a bounded reply tree. Used both to render a
// standalone thread and to page a node's replies inline (append `.replies`).
export async function fetchComment(
  api: ApiClient,
  modelId: string,
  commentId: string,
  query: ReplyPageQuery,
): Promise<Comment | null> {
  const result = await api.GET("/api/v1/models/{id}/comments/{commentId}", {
    params: { path: { id: modelId, commentId }, query },
  });
  if (result.response.status === 404) return null;
  return mapApiComment(getResponseData(result, `GET comment ${commentId}`));
}

async function fetchComments(source: CommentsSource, sort?: CommentSort): Promise<CommentsPayload> {
  if (!source.modelId) return emptyPayload();
  const api = useApi();

  if (source.commentId) {
    const root = await fetchComment(api, source.modelId, source.commentId, {});
    return root ? { comments: [root], pagination: { count: 1, lastPage: 0 } } : emptyPayload();
  }

  return fetchModelComments(api, source.modelId, { sort });
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
  const pagination = computed<CommentPagination>(() => data.value?.pagination ?? emptyPagination());

  return { comments, pagination, status, error, refresh, loaded };
}

export type { CommentsPayload, CommentsSource, CommentQuery };
