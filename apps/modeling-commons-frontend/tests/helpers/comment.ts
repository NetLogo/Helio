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

const loggedIn = ref(true);

const currentUser = computed(() => {
  if (!loggedIn.value) {
    return { session: null, isLoggedIn: false as const, user: null };
  }
  const user = makeUser();
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

type ApiComment = {
  id: string;
  modelId: string;
  parentId?: string;
  author: { id: string; name: string; image: string };
  content: string;
  createdAt: string;
  edited?: boolean;
  likes: number;
  likedByMe: boolean;
  permissions?: { canEdit?: boolean; canDelete?: boolean };
  replies?: { count: number; limit: number; page: number; data: Array<ApiComment> };
};

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type FetchCall = { url: string; method: string; body?: Record<string, unknown> };

let fetchCallLog: Array<FetchCall> = [];

export function commentFetchCalls(): Array<FetchCall> {
  return fetchCallLog;
}

type FetchMockConfig = {
  listCount?: number;
  roots?: Array<Comment>;
  fail?: (ctx: { method: string; path: string }) => boolean;
};

export function installCommentFetchMock(config: FetchMockConfig = {}) {
  fetchCallLog = [];
  let createSeq = 0;
  const roots = config.roots ?? fixtureComments;
  const trees = [...roots, deepThread];
  // Created comments are read back by id (the confirmed-insert flow), so the
  // mock has to serve what a POST just minted.
  const created = new Map<string, ApiComment>();

  const mock = vi.fn(async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = new URL(input);
    const path = url.pathname;
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    fetchCallLog.push({ url: input, method, body });

    if (config.fail?.({ method, path })) return new Response(null, { status: 500 });

    if (method === "PATCH") return new Response(null, { status: 204 });
    if (method === "DELETE") return new Response(null, { status: 204 });
    if (method === "POST" && path.endsWith("/like")) return new Response(null, { status: 204 });
    if (method === "POST" && path.endsWith("/comments")) {
      const id = `server-${++createSeq}`;
      const modelId = path.match(/\/models\/([^/]+)\/comments/)?.[1] ?? "model-demo";
      created.set(id, {
        id,
        modelId,
        parentId: body?.parentId,
        author: { id: "user-ada", name: "Ada Lovelace", image: "" },
        content: body?.content ?? "",
        createdAt: "2024-01-01T00:00:00.000Z",
        likes: 0,
        likedByMe: false,
        permissions: { canEdit: true, canDelete: true },
      });
      return jsonResponse({ id }, 201);
    }

    const threadMatch = path.match(/\/comments\/([^/]+)$/);
    if (method === "GET" && threadMatch) {
      const id = threadMatch[1]!;
      const fresh = created.get(id);
      if (fresh) return jsonResponse(fresh);
      const root = findCommentById(trees, id);
      if (!root) return new Response(null, { status: 404 });
      return jsonResponse(
        toApiComment(root, {
          page: Number(url.searchParams.get("page") ?? 0),
          limit: Number(url.searchParams.get("limit") ?? SERVER_DEFAULT_LIMIT),
        }),
      );
    }

    if (method === "GET") {
      const data = roots.map((root) => toApiComment(root));
      return jsonResponse({
        count: config.listCount ?? data.length,
        limit: 20,
        page: Number(url.searchParams.get("page") ?? 0),
        data,
      });
    }

    return new Response(null, { status: 204 });
  });

  vi.stubGlobal("fetch", mock);
  return mock;
}
