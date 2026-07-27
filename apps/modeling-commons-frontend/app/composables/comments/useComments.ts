import type { MaybeRefOrGetter } from "vue";
import type { Comment, CommentAuthor, CommentPagination } from "~/components/comment/types";

export type CommentSort = "createdAt" | "newest" | "likes";

type CommentsSource = { modelId: string; commentId?: string };

type CommentsPayload = {
  comments: Array<Comment>;
  pagination: CommentPagination;
};

type ReplyPageQuery = {
  page?: number;
  limit?: number;
};

type CommentQuery = ReplyPageQuery & {
  sort?: CommentSort;
};

type ApiCommentAuthor = { id: string; name: string; image: string };

type ApiRepliesPage = {
  count: number;
  limit: number;
  page: number;
  data: Array<ApiComment>;
};

type ApiComment = {
  id: string;
  modelId: string;
  parentId?: string;
  versionNumber?: number;
  legacyId?: number;
  author: ApiCommentAuthor;
  content: string;
  createdAt: string;
  edited?: boolean;
  deleted?: boolean;
  likes: number;
  likedByMe?: boolean;
  permissions?: { canEdit?: boolean; canDelete?: boolean };
  replies?: ApiRepliesPage;
};

type ApiPaginated = {
  count: number;
  limit: number;
  page: number;
  data: Array<ApiComment>;
};

const emptyPagination = (): CommentPagination => ({ count: 0, lastPage: null });

const emptyPayload = (): CommentsPayload => ({
  comments: [],
  pagination: emptyPagination(),
});

// A page that carried no rows loaded nothing, whatever index the server stamped
// on it: a comment at the nesting limit reports its reply `count` with an empty
// `data`, and paging it has to start at 0. The pagination helpers derive
// "load N more" from `count` minus the number of items already in hand.
function toPagination(page: ApiRepliesPage | ApiPaginated): CommentPagination {
  return {
    count: page.count,
    limit: page.limit,
    lastPage: page.data.length > 0 ? page.page : null,
  };
}

function mapAuthor(author: ApiCommentAuthor): CommentAuthor {
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

export function commentsApiBase(): string {
  return useRuntimeConfig().public.apiBase as string;
}

function commentFetchInit(): RequestInit {
  const init: RequestInit = { credentials: "include" };
  if (import.meta.server) {
    const cookie = useRequestHeaders(["cookie"]).cookie;
    if (cookie) init.headers = { cookie };
  }
  return init;
}

function buildQuery(query: CommentQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.sort !== undefined) params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function commentGet<T>(base: string, path: string, query: CommentQuery): Promise<T> {
  const response = await fetch(`${base}${path}${buildQuery(query)}`, commentFetchInit());
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchModelComments(
  base: string,
  modelId: string,
  query: CommentQuery,
): Promise<CommentsPayload> {
  const page = await commentGet<ApiPaginated>(base, `/api/v1/models/${modelId}/comments`, query);
  return { comments: page.data.map(mapApiComment), pagination: toPagination(page) };
}

// Re-rooted single comment with a bounded reply tree. Used both to render a
// standalone thread and to page a node's replies inline (append `.replies`).
export async function fetchComment(
  base: string,
  modelId: string,
  commentId: string,
  query: ReplyPageQuery,
): Promise<Comment | null> {
  const response = await fetch(
    `${base}/api/v1/models/${modelId}/comments/${commentId}${buildQuery(query)}`,
    commentFetchInit(),
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET comment ${commentId} failed with ${response.status}`);
  return mapApiComment((await response.json()) as ApiComment);
}

async function fetchComments(source: CommentsSource, sort?: CommentSort): Promise<CommentsPayload> {
  if (!source.modelId) return emptyPayload();
  const base = commentsApiBase();

  if (source.commentId) {
    const root = await fetchComment(base, source.modelId, source.commentId, {});
    return root ? { comments: [root], pagination: { count: 1, lastPage: 0 } } : emptyPayload();
  }

  return fetchModelComments(base, source.modelId, { sort });
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

  const { data, status, error, refresh } = useAsyncData<CommentsPayload>(
    () => key.value,
    () => fetchComments(resolved.value, resolvedSort.value),
    { watch: [key] },
  );

  const comments = computed(() => data.value?.comments ?? []);
  const pagination = computed<CommentPagination>(() => data.value?.pagination ?? emptyPagination());

  return { comments, pagination, status, error, refresh };
}

export type { CommentsPayload, CommentsSource, CommentQuery };
