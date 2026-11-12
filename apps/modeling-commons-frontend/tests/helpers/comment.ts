import { mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { vi } from "vitest";
import { computed, nextTick, reactive, ref } from "vue";
import CommentView from "~/components/comment/CommentView.vue";
import CommentsPanel from "~/components/comment/CommentsPanel.vue";
import CommentsSection from "~/components/comment/CommentsSection.vue";
import { findCommentById } from "~/components/comment/comment-tree";
import { comments as fixtureComments, deepThread } from "~/components/comment/fixtures";
import type { Comment, CommentViewSettings, CommentsPanelProps } from "~/components/comment/types";
import { makeSession, makeUser } from "./fixtures";
import type { ResponseSuccessData } from "~/utils/openapi";
import { apiResult, makeApiClientMock } from "./mockApi";

const loggedIn = ref(true);
const signedInUserId = ref<string>();

const currentUser = computed(() => {
  if (!loggedIn.value) {
    return { session: null, isLoggedIn: false as const, user: null };
  }
  const user = makeUser(signedInUserId.value ? { id: signedInUserId.value } : {});
  return { ...user, session: makeSession(user.id), isLoggedIn: true as const, user };
});

export const toastAddMock = vi.fn();

export function useUserMock() {
  return currentUser;
}

export function useProfileMock() {
  return { profile: computed(() => currentUser.value.user), refresh: vi.fn() };
}

export function useToastMock() {
  return { add: toastAddMock, remove: vi.fn(), update: vi.fn(), clear: vi.fn() };
}

export function setLoggedIn(value: boolean) {
  loggedIn.value = value;
}

export function setSignedInUserId(id: string | undefined) {
  signedInUserId.value = id;
}

const routeQuery = ref<Record<string, unknown>>({});
export const routerReplaceMock = vi.fn();

export function setRouteQuery(query: Record<string, unknown>) {
  routeQuery.value = query;
}

export function useRouteMock() {
  return reactive({
    name: "test-route",
    path: "/",
    fullPath: "/",
    params: {},
    query: routeQuery,
    hash: "",
    matched: [],
    meta: {},
  });
}

export function useRouterMock() {
  return {
    replace: routerReplaceMock,
    push: vi.fn(),
    afterEach: vi.fn(),
    beforeEach: vi.fn(),
    beforeResolve: vi.fn(),
    resolve: vi.fn(),
  };
}

export function resetCommentMocks() {
  loggedIn.value = true;
  toastAddMock.mockClear();
  routeQuery.value = {};
  routerReplaceMock.mockClear();
}

export function mountCommentsPanel(
  comments: Array<Comment>,
  overrides: Partial<CommentsPanelProps> = {},
) {
  return mountSuspended(CommentsPanel, {
    props: {
      comments,
      pagination: { count: comments.length, lastPage: 1 },
      ...overrides,
    },
  });
}

export function mountCommentView(comment: Comment, overrides: Partial<CommentViewSettings> = {}) {
  return mountSuspended(CommentView, {
    props: { comment, ...overrides },
  });
}

export async function mountCommentsSection(props: {
  modelId?: string;
  commentId?: string;
  readOnly?: boolean;
  sort?: "createdAt" | "likes";
}) {
  const wrapper = await mountSuspended(CommentsSection, { props });
  await flushPromises();
  await nextTick();
  return wrapper;
}

type ApiComment = ResponseSuccessData<"GET", "/api/v1/models/{id}/comments/{commentId}">;

const SERVER_REPLY_EMBED_LIMIT = 2;
const SERVER_DEFAULT_LIMIT = 20;

type RepliesPageParams = { page: number; limit: number };

export function toApiComment(
  comment: Comment,
  repliesPage: RepliesPageParams = { page: 0, limit: SERVER_REPLY_EMBED_LIMIT },
): ApiComment {
  const replies = comment.replies ?? [];
  const count = Math.max(comment.replyPagination?.count ?? 0, replies.length);
  const offset = repliesPage.page * repliesPage.limit;
  return {
    id: comment.id,
    modelId: comment.modelId ?? "model-demo",
    parentId: comment.parentId,
    author: {
      id: comment.author.url ? comment.author.url.replace("/users/", "") : "",
      name: comment.author.name,
      image: comment.author.image,
    },
    content: comment.content,
    createdAt: comment.createdAt,
    edited: comment.edited,
    deleted: comment.deleted,
    likes: comment.likes,
    likedByMe: comment.likedByMe ?? false,
    permissions: comment.permissions,
    replies: count
      ? {
          count,
          limit: repliesPage.limit,
          page: repliesPage.page,
          data: replies
            .slice(offset, offset + repliesPage.limit)
            .map((reply) => toApiComment(reply)),
        }
      : undefined,
  };
}

export const COMMENT_ROUTES = {
  list: "/api/v1/models/{id}/comments",
  single: "/api/v1/models/{id}/comments/{commentId}",
  like: "/api/v1/models/{id}/comments/{commentId}/like",
} as const;

type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

type CommentRequestInit = {
  params?: { path?: Record<string, string>; query?: Record<string, unknown> };
  body?: Record<string, unknown>;
};

export type CommentApiCall = {
  method: ApiMethod;
  route: string;
  pathParams: Record<string, string>;
  query: Record<string, unknown>;
  body?: Record<string, unknown>;
};

type CommentApiConfig = {
  listCount?: number;
  roots?: Array<Comment>;
  fail?: (call: CommentApiCall) => boolean;
};

const commentApiState = { mock: makeApiClientMock(), calls: [] as Array<CommentApiCall> };

export function useCommentApiMock() {
  return commentApiState.mock.client;
}

export function getCommentApiCalls(): Array<CommentApiCall> {
  return commentApiState.calls;
}

function makeCreatedComment(call: CommentApiCall, id: string): ApiComment {
  return {
    id,
    modelId: call.pathParams.id ?? "model-demo",
    parentId: call.body?.parentId as string | undefined,
    author: { id: "user-ada", name: "Ada Lovelace", image: "" },
    content: (call.body?.content as string | undefined) ?? "",
    createdAt: "2024-01-01T00:00:00.000Z",
    likes: 0,
    likedByMe: false,
    permissions: { canEdit: true, canDelete: true },
  };
}

export function installCommentApiMock(config: CommentApiConfig = {}) {
  const mock = makeApiClientMock();
  commentApiState.mock = mock;
  commentApiState.calls = [];
  let createSeq = 0;
  const roots = config.roots ?? fixtureComments;
  const trees = [...roots, deepThread];
  // Created comments are read back by id (the confirmed-insert flow), so the
  // mock has to serve what a POST just minted.
  const created = new Map<string, ApiComment>();

  function serveComment(call: CommentApiCall) {
    const id = call.pathParams.commentId!;
    const fresh = created.get(id);
    if (fresh) return apiResult.ok(fresh);
    const root = findCommentById(trees, id);
    if (!root) return apiResult.err(404);
    return apiResult.ok(
      toApiComment(root, {
        page: Number(call.query.page ?? 0),
        limit: Number(call.query.limit ?? SERVER_DEFAULT_LIMIT),
      }),
    );
  }

  function serveList(call: CommentApiCall) {
    const data = roots.map((root) => toApiComment(root));
    return apiResult.ok({
      count: config.listCount ?? data.length,
      limit: SERVER_DEFAULT_LIMIT,
      page: Number(call.query.page ?? 0),
      data,
    });
  }

  function serveCreate(call: CommentApiCall) {
    const id = `server-${++createSeq}`;
    created.set(id, makeCreatedComment(call, id));
    return apiResult.ok({ id });
  }

  function serve(call: CommentApiCall) {
    if (config.fail?.(call)) return apiResult.err(500);
    if (call.method === "GET" && call.route === COMMENT_ROUTES.single) return serveComment(call);
    if (call.method === "GET") return serveList(call);
    if (call.method === "POST" && call.route === COMMENT_ROUTES.list) return serveCreate(call);
    return apiResult.noContent();
  }

  function recordAndServe(method: ApiMethod) {
    return async (route: string, init: CommentRequestInit = {}) => {
      const call: CommentApiCall = {
        method,
        route,
        pathParams: init.params?.path ?? {},
        query: init.params?.query ?? {},
        body: init.body,
      };
      commentApiState.calls.push(call);
      return serve(call);
    };
  }

  mock.GET.mockImplementation(recordAndServe("GET"));
  mock.POST.mockImplementation(recordAndServe("POST"));
  mock.PATCH.mockImplementation(recordAndServe("PATCH"));
  mock.DELETE.mockImplementation(recordAndServe("DELETE"));
  return mock;
}
