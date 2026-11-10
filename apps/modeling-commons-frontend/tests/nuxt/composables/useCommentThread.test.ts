import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, type EffectScope, type Ref } from "vue";
import { comments as fixtureComments } from "~/components/comment/fixtures";
import { findCommentById } from "~/components/comment/comment-tree";
import { COMMENT_STREAM_REFRESH_DEBOUNCE_MS, type Comment } from "~/components/comment/types";
import { STREAM_EVENTS } from "~/components/shared/event-stream";
import useCommentThread from "~/composables/comments/useCommentThread";
import type { CommentSort } from "~/composables/comments/useComments";
import {
  COMMENT_ROUTES,
  getCommentApiCalls,
  installCommentApiMock,
  installFakeEventSource,
  latestEventSource,
  resetCommentMocks,
  resetDocumentVisibility,
  setDocumentVisibility,
  useCommentApiMock,
  useToastMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useToast", () => () => useToastMock());
mockNuxtImport("useConnectionHealth", () => () => ({ isOffline: ref(false) }));
mockNuxtImport("useApi", () => () => useCommentApiMock());

const MODEL_ID = "m-1";

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
  it.each([STREAM_EVENTS.comments, STREAM_EVENTS.resync])(
    "refetches once after the debounce on bursts of %s",
    async (event) => {
      await mountThread();
      latestEventSource()!.simulateOpen();
      await advancePastDebounce();
      const before = listFetches();

      latestEventSource()!.simulateEvent(event);
      latestEventSource()!.simulateEvent(event);

      await vi.advanceTimersByTimeAsync(COMMENT_STREAM_REFRESH_DEBOUNCE_MS - 1);
      expect(listFetches()).toBe(before);

      await advancePastDebounce();
      expect(listFetches()).toBe(before + 1);
    },
  );

  it("skips the pushed refetch while an edit is pending", async () => {
    const release = holdRequests("PATCH", COMMENT_ROUTES.single);
    const thread = await mountThread();
    latestEventSource()!.simulateOpen();
    await advancePastDebounce();
    const before = listFetches();

    const editing = thread.edit({ commentId: fixtureComments[0]!.id, content: "edited" });
    expect(thread.pending.value).toBe(true);
    latestEventSource()!.simulateEvent(STREAM_EVENTS.comments);
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
    latestEventSource()!.simulateEvent(STREAM_EVENTS.comments);
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
    latestEventSource()!.simulateEvent(STREAM_EVENTS.comments);
    latestEventSource()!.simulateEvent(STREAM_EVENTS.resync);
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
    latestEventSource()!.simulateEvent(STREAM_EVENTS.comments);
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
