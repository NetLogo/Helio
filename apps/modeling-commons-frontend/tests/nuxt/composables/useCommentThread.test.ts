import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, type EffectScope, type Ref } from "vue";
import { comments as fixtureComments } from "~/components/comment/fixtures";
import { findCommentById } from "~/components/comment/comment-tree";
import { COMMENT_STREAM_REFRESH_DEBOUNCE_MS, type Comment } from "~/components/comment/types";
import useCommentThread from "~/composables/comments/useCommentThread";
import type { CommentSort } from "~/features/comments/types";
import {
  COMMENT_ROUTES,
  apiResult,
  getCommentApiCalls,
  installCommentApiMock,
  installFakeEventSource,
  latestEventSource,
  resetCommentMocks,
  resetDocumentVisibility,
  setDocumentVisibility,
  toApiComment,
  useCommentApiMock,
  useToastMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useToast", () => () => useToastMock());
mockNuxtImport("useConnectionHealth", () => () => ({ isOffline: ref(false) }));
mockNuxtImport("useApi", () => () => useCommentApiMock());

const MODEL_ID = "m-1";
const commentCreated = {
  topic: { type: "model", id: MODEL_ID },
  event: "model_comment.created",
} as const;
const resync = { event: "resync" } as const;

let scope: EffectScope | null = null;

const listFetches = () =>
  getCommentApiCalls().filter((call) => call.method === "GET" && call.route === COMMENT_ROUTES.list)
    .length;

async function mountThread() {
  scope = effectScope();
  const thread = scope.run(() => useCommentThread({ source: () => ({ modelId: MODEL_ID }) }))!;
  await vi.waitFor(() => expect(listFetches()).toBe(1));
  await flushPromises();
  return thread;
}

async function advancePastDebounce() {
  await vi.advanceTimersByTimeAsync(COMMENT_STREAM_REFRESH_DEBOUNCE_MS);
  await flushPromises();
}

function holdRequests(method: "POST" | "PATCH", route: string) {
  const request = installCommentApiMock()[method];
  const serve = request.getMockImplementation()!;
  const held: Array<() => void> = [];
  request.mockImplementation((requested: string, init?: unknown) => {
    if (requested !== route) return serve(requested, init);
    return new Promise((resolve) => {
      held.push(() => resolve(serve(requested, init)));
    });
  });
  return () => held.forEach((release) => release());
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  resetCommentMocks();
  installCommentApiMock();
  installFakeEventSource();
});

afterEach(() => {
  scope?.stop();
  scope = null;
  resetDocumentVisibility();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useCommentThread with the event stream", () => {
  it.each([
    ["a comment event", commentCreated],
    ["resync", resync],
  ] as const)("refetches once after the debounce on bursts of %s", async (_label, message) => {
    await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    latestEventSource()!.simulateMessage(message);
    latestEventSource()!.simulateMessage(message);

    await vi.advanceTimersByTimeAsync(COMMENT_STREAM_REFRESH_DEBOUNCE_MS - 1);
    expect(listFetches()).toBe(before);

    await advancePastDebounce();
    expect(listFetches()).toBe(before + 1);
  });

  it("subscribes the stream to its model and ignores events for another model", async () => {
    await mountThread();
    latestEventSource()!.simulateOpen("conn-1");
    await advancePastDebounce();
    const before = listFetches();

    latestEventSource()!.simulateMessage({
      topic: { type: "model", id: "m-2" },
      event: "model_comment.created",
    });
    await advancePastDebounce();

    expect(getCommentApiCalls()).toContainEqual(
      expect.objectContaining({
        method: "POST",
        route: "/api/v1/events/subscriptions",
        body: { connectionId: "conn-1", topic: { type: "model", id: MODEL_ID } },
      }),
    );
    expect(listFetches()).toBe(before);
  });

  it("skips the pushed refetch while an edit is pending", async () => {
    const release = holdRequests("PATCH", COMMENT_ROUTES.single);
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    const editing = thread.edit({ commentId: fixtureComments[0]!.id, content: "edited" });
    expect(thread.pending.value).toBe(true);
    latestEventSource()!.simulateMessage(commentCreated);
    await advancePastDebounce();
    expect(listFetches()).toBe(before);

    release();
    await editing;
  });

  it("skips the pushed refetch while a like is in flight", async () => {
    const release = holdRequests("POST", COMMENT_ROUTES.like);
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    thread.like({ commentId: fixtureComments[0]!.id });
    expect(thread.busy.value).toBe(true);
    latestEventSource()!.simulateMessage(commentCreated);
    await advancePastDebounce();
    expect(listFetches()).toBe(before);

    release();
    await flushPromises();
  });

  it("refetches once after a like settles when a signal arrived while it was in flight", async () => {
    const release = holdRequests("POST", COMMENT_ROUTES.like);
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    thread.like({ commentId: fixtureComments[0]!.id });
    latestEventSource()!.simulateMessage(commentCreated);
    latestEventSource()!.simulateMessage(resync);
    await advancePastDebounce();
    expect(listFetches()).toBe(before);

    release();
    await vi.waitFor(() => expect(thread.busy.value).toBe(false));
    await advancePastDebounce();
    expect(listFetches()).toBe(before + 1);

    await advancePastDebounce();
    expect(listFetches()).toBe(before + 1);
  });

  it("does not refetch when a like settles without a signal", async () => {
    const release = holdRequests("POST", COMMENT_ROUTES.like);
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    thread.like({ commentId: fixtureComments[0]!.id });
    release();
    await vi.waitFor(() => expect(thread.busy.value).toBe(false));
    await advancePastDebounce();

    expect(listFetches()).toBe(before);
  });

  it("refetches when the tab becomes visible while the stream is down", async () => {
    await mountThread();
    latestEventSource()!.simulateGiveUp();

    setDocumentVisibility("hidden");
    await flushPromises();
    setDocumentVisibility("visible");
    await advancePastDebounce();

    expect(listFetches()).toBe(2);
  });

  it("refetches once when the tab is shown again and the stream reopens", async () => {
    await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    setDocumentVisibility("hidden");
    await flushPromises();
    setDocumentVisibility("visible");
    await flushPromises();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();

    expect(listFetches()).toBe(before + 1);
  });
});

describe("useCommentThread keeps comments posted in this tab in place", () => {
  let serverRoots: Array<Comment>;
  const ids = (comments: Array<Comment>) => comments.map((comment) => comment.id);

  async function mountWithServer(sort: Ref<CommentSort>) {
    serverRoots = structuredClone(fixtureComments);
    const parent = serverRoots.find((comment) => comment.id === "5")!;
    parent.replies = [{ ...fixtureComments[3]!, id: "5-reply", parentId: "5", replies: [] }];
    parent.replyPagination = { count: 1, lastPage: 0 };
    installCommentApiMock({ roots: serverRoots });
    scope = effectScope();
    const thread = scope.run(() =>
      useCommentThread({ source: () => ({ modelId: MODEL_ID }), sort }),
    )!;
    await vi.waitFor(() => expect(listFetches()).toBe(1));
    await flushPromises();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    return thread;
  }

  async function signalOwnWrite() {
    latestEventSource()!.simulateMessage(commentCreated);
    await advancePastDebounce();
  }

  async function createAndPublish(thread: ReturnType<typeof useCommentThread>) {
    await thread.create({ content: "mine" });
    const created = thread.comments.value[0]!;
    serverRoots.push(created);
    return created;
  }

  it("keeps a created comment first when the refetch sorts it last", async () => {
    const thread = await mountWithServer(ref("likes"));
    const created = await createAndPublish(thread);
    serverRoots[0] = { ...serverRoots[0]!, likes: 99 };

    await signalOwnWrite();

    expect(thread.comments.value[0]!.id).toBe(created.id);
    expect(ids(thread.comments.value)).toHaveLength(fixtureComments.length + 1);
    expect(thread.comments.value[1]!.likes).toBe(99);
  });

  it("keeps a reply under its parent at the slot it was inserted", async () => {
    const thread = await mountWithServer(ref("likes"));
    await thread.reply({ commentId: "5", content: "mine" });
    const parent = findCommentById(thread.comments.value, "5")!;
    const created = parent.replies![0]!;
    const serverParent = serverRoots.find((comment) => comment.id === "5")!;
    serverParent.replies = [...serverParent.replies!, created];
    serverParent.replyPagination = { count: 2, lastPage: 0 };

    await signalOwnWrite();

    expect(ids(findCommentById(thread.comments.value, "5")!.replies!)).toEqual([
      created.id,
      "5-reply",
    ]);
  });

  it("drops the pinning when the sort changes", async () => {
    const sort = ref<CommentSort>("likes");
    const thread = await mountWithServer(sort);
    const created = await createAndPublish(thread);
    const before = listFetches();

    sort.value = "newest";
    await vi.waitFor(() => expect(listFetches()).toBe(before + 1));
    await flushPromises();

    expect(thread.comments.value.at(-1)!.id).toBe(created.id);
  });

  it("removes a pinned comment deleted elsewhere", async () => {
    const thread = await mountWithServer(ref("likes"));
    const created = await createAndPublish(thread);
    serverRoots.pop();

    await signalOwnWrite();

    expect(findCommentById(thread.comments.value, created.id)).toBeNull();
    expect(ids(thread.comments.value)).toEqual(ids(fixtureComments));
  });
});

describe("useCommentThread keeps loaded pages across refreshes", () => {
  const PAGE_SIZE = 2;
  let serverRoots: Array<Comment>;
  const ids = (comments: Array<Comment>) => comments.map((comment) => comment.id);
  const node = (id: string, overrides: Partial<Comment> = {}): Comment => ({
    id,
    modelId: MODEL_ID,
    author: { name: "Ada", image: "" },
    content: id,
    createdAt: "2024-01-01T00:00:00.000Z",
    likes: 0,
    replies: [],
    replyPagination: { count: 0, lastPage: null },
    ...overrides,
  });

  async function mountPaged() {
    const replies = ["r1", "r2", "r3"].map((id) => node(id, { parentId: "a" }));
    serverRoots = [
      node("a", { replies, replyPagination: { count: replies.length, lastPage: 0 } }),
      node("b"),
      node("c"),
      node("d"),
    ];
    const request = installCommentApiMock({ roots: serverRoots }).GET;
    const serve = request.getMockImplementation()!;
    request.mockImplementation(
      async (route: string, init?: { params?: { query?: { page?: number } } }) => {
        if (route !== COMMENT_ROUTES.list) return serve(route, init);
        await serve(route, init);
        const offset = Number(init?.params?.query?.page ?? 0) * PAGE_SIZE;
        return apiResult.ok({
          count: serverRoots.length,
          limit: PAGE_SIZE,
          page: Number(init?.params?.query?.page ?? 0),
          data: serverRoots.slice(offset, offset + PAGE_SIZE).map((root) => toApiComment(root)),
        });
      },
    );
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    await thread.loadMore(thread.pagination.value);
    await thread.loadReplies({ commentId: "a" });
    return thread;
  }

  async function refreshFromStream() {
    latestEventSource()!.simulateMessage(commentCreated);
    await advancePastDebounce();
  }

  it("keeps later comment pages and loaded replies after a stream refresh", async () => {
    const thread = await mountPaged();
    expect(ids(thread.comments.value)).toEqual(["a", "b", "c", "d"]);
    const before = listFetches();

    await refreshFromStream();

    expect(listFetches()).toBe(before + 1);
    expect(ids(thread.comments.value)).toEqual(["a", "b", "c", "d"]);
    expect(ids(findCommentById(thread.comments.value, "a")!.replies!)).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
    expect(thread.pagination.value.lastPage).toBe(1);
  });

  it("applies first-page edits and deletions from a stream refresh", async () => {
    const thread = await mountPaged();
    serverRoots[0]!.content = "edited";
    Object.assign(serverRoots[1]!, { deleted: true, content: "[deleted]" });

    await refreshFromStream();

    expect(ids(thread.comments.value)).toEqual(["a", "b", "c", "d"]);
    expect(thread.comments.value[0]!.content).toBe("edited");
    expect(thread.comments.value[1]!.deleted).toBe(true);
    expect(thread.pagination.value.count).toBe(4);
  });

  it("shows an edit made here to a comment on a later page", async () => {
    const thread = await mountPaged();
    Object.assign(serverRoots[3]!, { content: "edited", edited: true });

    await thread.edit({ commentId: "d", content: "edited" });

    expect(ids(thread.comments.value)).toEqual(["a", "b", "c", "d"]);
    expect(findCommentById(thread.comments.value, "d")!.content).toBe("edited");
  });
});
