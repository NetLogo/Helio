import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import CommentView from "~/components/comment/CommentView.vue";
import CommentsPanel from "~/components/comment/CommentsPanel.vue";
import { findCommentById } from "~/components/comment/comment-tree";
import { comments as fixtureComments } from "~/components/comment/fixtures";
import type { Comment, CommentPagination } from "~/components/comment/types";
import {
  COMMENT_ROUTES,
  getCommentApiCalls,
  installCommentApiMock,
  useCommentApiMock,
  mountCommentsSection,
  resetCommentMocks,
  routerReplaceMock,
  setLoggedIn,
  setRouteQuery,
  toastAddMock,
  useProfileMock,
  useRouteMock,
  useRouterMock,
  useToastMock,
  useUserMock,
} from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());
mockNuxtImport("useToast", () => () => useToastMock());
mockNuxtImport("useRoute", () => () => useRouteMock());
mockNuxtImport("useRouter", () => () => useRouterMock());
mockNuxtImport("useApi", () => () => useCommentApiMock());

beforeEach(() => {
  resetCommentMocks();
  installCommentApiMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function panelComments(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>) {
  return wrapper.getComponent(CommentsPanel).props("comments") as Array<Comment>;
}

function panelPagination(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>) {
  return wrapper.getComponent(CommentsPanel).props("pagination") as CommentPagination;
}

async function emitFromPanel(
  wrapper: Awaited<ReturnType<typeof mountCommentsSection>>,
  event: string,
  payload?: unknown,
) {
  wrapper.getComponent(CommentsPanel).vm.$emit(event, payload);
  await flushPromises();
  await nextTick();
}

function calls(method: string, route?: string) {
  return getCommentApiCalls().filter(
    (call) => call.method === method && (route === undefined || call.route === route),
  );
}

describe("CommentsSection sources", () => {
  it("renders the panel with the mapped comments for a modelId", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    const comments = panelComments(wrapper);
    expect(comments.map((comment) => comment.id)).toEqual(
      fixtureComments.map((comment) => comment.id),
    );
    expect(panelPagination(wrapper)).toEqual({
      count: fixtureComments.length,
      limit: 20,
      lastPage: 0,
    });
  });

  it("renders a single thread rooted at the given commentId", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", commentId: "100" });

    const comments = panelComments(wrapper);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.id).toBe("100");
    expect(comments[0]?.replies?.length).toBeGreaterThan(0);
    expect(panelPagination(wrapper)).toEqual({ count: 1, lastPage: 0 });
  });

  it("roots the thread at a nested commentId", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", commentId: "103" });

    expect(panelComments(wrapper)[0]?.id).toBe("103");
  });

  it("renders an empty panel for an unknown commentId", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", commentId: "does-not-exist" });

    expect(panelComments(wrapper)).toEqual([]);
    expect(panelPagination(wrapper)).toEqual({ count: 0, lastPage: null });
  });

  it("renders nothing when no modelId is given", async () => {
    const wrapper = await mountCommentsSection({});

    expect(wrapper.findComponent(CommentsPanel).exists()).toBe(false);
  });
});

describe("CommentsSection auth gating", () => {
  it("marks the panel read-only and toasts on write attempts when logged out", async () => {
    setLoggedIn(false);
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(true);

    await emitFromPanel(wrapper, "write");
    expect(toastAddMock).toHaveBeenCalledTimes(1);
  });

  it("renders a writable panel and stays silent on write attempts when logged in", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(false);

    await emitFromPanel(wrapper, "write");
    expect(toastAddMock).not.toHaveBeenCalled();
  });

  it("forces the panel read-only via the readOnly prop while logged in", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1", readOnly: true });

    expect(wrapper.getComponent(CommentsPanel).props("readOnly")).toBe(true);
  });
});

describe("CommentsSection highlight", () => {
  function viewFor(wrapper: Awaited<ReturnType<typeof mountCommentsSection>>, id: string) {
    return wrapper.findAllComponents(CommentView).find((view) => view.props("comment")?.id === id);
  }

  it("threads the highlighted comment id from the URL down to the targeted comment", async () => {
    setRouteQuery({ highlightedCommentId: "5" });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    expect(wrapper.getComponent(CommentsPanel).props("highlightedCommentId")).toBe("5");

    const target = viewFor(wrapper, "5");
    const other = viewFor(wrapper, "1");
    expect(target).toBeDefined();
    expect(other).toBeDefined();
    expect(target!.attributes("tabindex")).toBe("-1");
    expect(other!.attributes("tabindex")).toBeUndefined();
    expect(target!.attributes("class")).not.toBe(other!.attributes("class"));
  });

  it("clears the highlight and strips only its query param on focusout", async () => {
    setRouteQuery({ highlightedCommentId: "5", page: "2" });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    const target = wrapper.find('[tabindex="-1"]');
    expect(target.exists()).toBe(true);

    await target.trigger("focusout");
    await nextTick();

    expect(wrapper.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();
    expect(wrapper.find('[tabindex="-1"]').exists()).toBe(false);
    expect(routerReplaceMock).toHaveBeenCalledWith({ query: { page: "2" } });
  });

  it("ignores array and empty highlight query values", async () => {
    setRouteQuery({ highlightedCommentId: ["5", "7"] });
    const fromArray = await mountCommentsSection({ modelId: "model-1" });
    expect(fromArray.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();

    setRouteQuery({ highlightedCommentId: "" });
    const fromEmpty = await mountCommentsSection({ modelId: "model-1" });
    expect(fromEmpty.getComponent(CommentsPanel).props("highlightedCommentId")).toBeUndefined();
  });
});

describe("CommentsSection submission mutations", () => {
  // Submissions never touch the tree optimistically. create/reply confirm by
  // reading the new comment back by id and inserting it; edit/delete refetch.
  // `useAsyncData` caches by key across mounts, so assert a refetch as a delta
  // in list GETs.
  function listGets() {
    return calls("GET", COMMENT_ROUTES.list);
  }

  function fetchedById(id: string) {
    return calls("GET", COMMENT_ROUTES.single).some((call) => call.pathParams.commentId === id);
  }

  it("posts a created comment, confirms it by id, and prepends it", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });
    const listBefore = listGets().length;

    await emitFromPanel(wrapper, "create", { content: "Fresh take" });

    const post = calls("POST", COMMENT_ROUTES.list)[0];
    expect(post?.body).toEqual({ content: "Fresh take" });

    const comments = panelComments(wrapper);
    expect(comments[0]).toMatchObject({ id: "server-1", content: "Fresh take" });
    expect(comments).toHaveLength(fixtureComments.length + 1);
    expect(panelPagination(wrapper).count).toBe(fixtureComments.length + 1);

    // Read back by id, not a list refetch (which "most liked" could bury).
    expect(fetchedById("server-1")).toBe(true);
    expect(listGets().length).toBe(listBefore);
  });

  it("posts a reply, confirms it by id, and inserts it under the parent", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "reply", { commentId: "1", content: "Replying here" });

    const post = calls("POST", COMMENT_ROUTES.list)[0];
    expect(post?.body).toEqual({ content: "Replying here", parentId: "1" });

    const parent = findCommentById(panelComments(wrapper), "1");
    expect(parent?.replies?.[0]).toMatchObject({ id: "server-1", content: "Replying here" });
    expect(parent?.replyPagination?.count).toBe(3);
    expect(fetchedById("server-1")).toBe(true);
  });

  it("PATCHes an edited comment and refetches", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });
    const before = listGets().length;

    await emitFromPanel(wrapper, "edit", { commentId: "5", content: "Nicer." });

    const patch = calls("PATCH")[0];
    expect(patch?.pathParams).toEqual({ id: "model-1", commentId: "5" });
    expect(patch?.body).toEqual({ content: "Nicer." });
    expect(listGets().length).toBe(before + 1);
  });

  it("DELETEs a comment, refetches, and confirms with a toast", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });
    const before = listGets().length;

    await emitFromPanel(wrapper, "delete", { commentId: "5" });

    expect(
      calls("DELETE", COMMENT_ROUTES.single).some((call) => call.pathParams.commentId === "5"),
    ).toBe(true);
    expect(listGets().length).toBe(before + 1);
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Comment deleted" }),
    );
  });

  it("toasts and does not refetch when a submission fails", async () => {
    installCommentApiMock({
      fail: ({ method, route }) => method === "POST" && route === COMMENT_ROUTES.list,
    });
    const wrapper = await mountCommentsSection({ modelId: "model-1" });
    const before = listGets().length;

    await emitFromPanel(wrapper, "create", { content: "Doomed" });

    expect(panelComments(wrapper)).toHaveLength(fixtureComments.length);
    expect(listGets().length).toBe(before);
    expect(toastAddMock).toHaveBeenCalledTimes(1);
  });

  it("posts successive submissions without wedging", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "create", { content: "First" });
    await emitFromPanel(wrapper, "reply", { commentId: "7", content: "Second" });

    const posts = calls("POST", COMMENT_ROUTES.list);
    expect(posts.map((post) => post.body)).toEqual([
      { content: "First" },
      { content: "Second", parentId: "7" },
    ]);
  });
});

describe("CommentsSection optimistic likes", () => {
  it("applies like and unlike to the target comment and hits the like endpoint", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "like", { commentId: "5" });
    let target = findCommentById(panelComments(wrapper), "5");
    expect(target).toMatchObject({ likes: 2, likedByMe: true });
    expect(calls("POST", COMMENT_ROUTES.like).map((call) => call.pathParams.commentId)).toEqual([
      "5",
    ]);

    await emitFromPanel(wrapper, "unlike", { commentId: "5" });
    target = findCommentById(panelComments(wrapper), "5");
    expect(target).toMatchObject({ likes: 1, likedByMe: false });
    expect(calls("DELETE", COMMENT_ROUTES.like).map((call) => call.pathParams.commentId)).toEqual([
      "5",
    ]);
  });

  it("reseeds optimistic likes from the server when the source changes", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "like", { commentId: "5" });
    expect(findCommentById(panelComments(wrapper), "5")?.likes).toBe(2);

    await wrapper.setProps({ modelId: "model-2" });
    await flushPromises();
    await nextTick();

    expect(findCommentById(panelComments(wrapper), "5")?.likes).toBe(1);
  });
});

describe("CommentsSection pagination seams", () => {
  // The server decides the reply page size; the client echoes it back so the
  // next page starts where the embedded one ended. Sending a size of its own
  // makes the server skip rows (offset is page * limit) and the click appends
  // nothing.
  function replyStub(id: string): Comment {
    return {
      id,
      modelId: "model-1",
      parentId: "900",
      author: { name: "Jane Doe", image: "" },
      content: `Reply ${id}`,
      createdAt: "2024-03-11T16:02:00",
      likes: 0,
      likedByMe: false,
      replies: [],
      replyPagination: { count: 0, lastPage: null },
    };
  }

  const threeReplies: Comment = {
    id: "900",
    modelId: "model-1",
    author: { name: "Omar Ibrahim", image: "" },
    content: "A root with more replies than the server embeds",
    createdAt: "2024-03-11T15:30:00",
    likes: 0,
    likedByMe: false,
    replies: ["901", "902", "903"].map(replyStub),
    replyPagination: { count: 3, lastPage: null },
  };

  const countedOnly: Comment = {
    ...threeReplies,
    id: "910",
    replies: [],
    replyPagination: { count: 2, lastPage: null },
  };

  it("requests the next reply page at the page size the server used", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "load", { commentId: "1" });

    const replyFetch = calls("GET", COMMENT_ROUTES.single).find(
      (call) => call.pathParams.commentId === "1",
    );
    expect(replyFetch?.query).toEqual({ page: 1, limit: 2 });
  });

  it("appends the replies the embedded page left out", async () => {
    installCommentApiMock({ roots: [threeReplies] });
    const wrapper = await mountCommentsSection({ modelId: "model-900" });

    const before = findCommentById(panelComments(wrapper), "900");
    expect(before?.replies?.map((reply) => reply.id)).toEqual(["901", "902"]);
    expect(before?.replyPagination?.count).toBe(3);

    await emitFromPanel(wrapper, "load", { commentId: "900" });

    const after = findCommentById(panelComments(wrapper), "900");
    expect(after?.replies?.map((reply) => reply.id)).toEqual(["901", "902", "903"]);
  });

  it("starts at page 0 for a comment whose replies were counted but never loaded", async () => {
    installCommentApiMock({ roots: [countedOnly] });
    const wrapper = await mountCommentsSection({ modelId: "model-910" });

    expect(findCommentById(panelComments(wrapper), "910")?.replies).toEqual([]);

    await emitFromPanel(wrapper, "load", { commentId: "910" });

    const replyFetch = calls("GET", COMMENT_ROUTES.single).find(
      (call) => call.pathParams.commentId === "910",
    );
    expect(replyFetch?.query).toMatchObject({ page: 0 });
  });

  it("requests the next comment page on load-more", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });

    await emitFromPanel(wrapper, "load-more", { count: fixtureComments.length, lastPage: 0 });

    const pageFetch = calls("GET").find((call) => call.query.page === 1);
    expect(pageFetch?.route).toBe(COMMENT_ROUTES.list);
    expect(panelPagination(wrapper).lastPage).toBe(1);
  });
});

describe("CommentsSection refresh", () => {
  it("keeps the loaded comment rows on screen while a refresh is in flight", async () => {
    const wrapper = await mountCommentsSection({ modelId: "model-1" });
    const rowsBefore = wrapper.findAllComponents(CommentView).map((row) => row.vm.$.uid);
    expect(rowsBefore.length).toBeGreaterThan(0);

    const serve = useCommentApiMock().GET.getMockImplementation()!;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    useCommentApiMock().GET.mockImplementation(async (...args: Parameters<typeof serve>) => {
      await gate;
      return serve(...args);
    });

    const refreshing = refreshNuxtData();
    await nextTick();

    expect(wrapper.find('[data-testid="comments-loading"]').exists()).toBe(false);
    expect(wrapper.findAllComponents(CommentView).map((row) => row.vm.$.uid)).toEqual(rowsBefore);

    release();
    await refreshing;
    await flushPromises();

    expect(wrapper.findAllComponents(CommentView).map((row) => row.vm.$.uid)).toEqual(rowsBefore);
  });
});
