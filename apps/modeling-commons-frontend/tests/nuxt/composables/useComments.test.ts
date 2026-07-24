import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { comments as fixtureComments } from "~/components/comment/fixtures";
import useComments from "~/composables/comments/useComments";
import type { CommentsSource } from "~/composables/comments/useComments";
import { commentFetchCalls, installCommentFetchMock } from "~~/tests/helpers";

beforeEach(() => {
  installCommentFetchMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useComments with a modelId source", () => {
  it("maps the paginated list response with a success status", async () => {
    const { comments, pagination, status, error, refresh } = useComments({ modelId: "m-1" });
    await refresh();

    expect(comments.value.map((comment) => comment.id)).toEqual(
      fixtureComments.map((comment) => comment.id),
    );
    expect(pagination.value).toEqual({ count: fixtureComments.length, limit: 20, lastPage: 0 });
    expect(status.value).toBe("success");
    expect(error.value).toBeFalsy();
  });

  it("maps author ids into profile urls and defaults likedByMe", async () => {
    const { comments, refresh } = useComments({ modelId: "m-1" });
    await refresh();

    const first = comments.value[0]!;
    expect(first.author.url).toBe("/users/user-omar");
    expect(typeof first.likedByMe).toBe("boolean");
  });

  it("returns roots without a parentId", async () => {
    const { comments, refresh } = useComments({ modelId: "m-parents" });
    await refresh();

    expect(comments.value.length).toBeGreaterThan(0);
    expect(comments.value.every((comment) => comment.parentId === undefined)).toBe(true);
  });

  it("forwards the sort key as a query param", async () => {
    const { refresh } = useComments({ modelId: "m-1" }, "likes");
    await refresh();

    const listCall = commentFetchCalls().find((call) => call.method === "GET");
    expect(listCall?.url).toContain("sort=likes");
  });

  it("keeps the server's reply page size and marks a counted-but-unloaded page", async () => {
    const counted = { ...fixtureComments[0]!, id: "c-1", replies: [], replyPagination: { count: 4, lastPage: null } };
    installCommentFetchMock({ roots: [counted] });
    const { comments, refresh } = useComments({ modelId: "m-counted" });
    await refresh();

    const root = comments.value[0]!;
    expect(root.replies).toEqual([]);
    expect(root.replyPagination).toEqual({ count: 4, limit: 2, lastPage: null });
  });

  it("returns an empty payload for an empty modelId without fetching", async () => {
    const { comments, pagination, refresh } = useComments({ modelId: "" });
    await refresh();

    expect(comments.value).toEqual([]);
    expect(pagination.value).toEqual({ count: 0, lastPage: null });
    expect(commentFetchCalls()).toHaveLength(0);
  });
});

describe("useComments with a commentId source", () => {
  it("wraps the found comment as the single root of the thread", async () => {
    const { comments, pagination, refresh } = useComments({ modelId: "m-1", commentId: "100" });
    await refresh();

    expect(comments.value).toHaveLength(1);
    expect(comments.value[0]?.id).toBe("100");
    expect(comments.value[0]?.replies?.length).toBeGreaterThan(0);
    expect(pagination.value).toEqual({ count: 1, lastPage: 0 });
  });

  it("roots the thread at a nested comment", async () => {
    const { comments, refresh } = useComments({ modelId: "m-1", commentId: "103" });
    await refresh();

    expect(comments.value[0]?.id).toBe("103");
    expect(comments.value[0]?.replies?.map((reply) => reply.id)).toEqual(["104", "107"]);
  });

  it("returns an empty payload for an unknown commentId", async () => {
    const { comments, pagination, status, refresh } = useComments({
      modelId: "m-1",
      commentId: "nope",
    });
    await refresh();

    expect(comments.value).toEqual([]);
    expect(pagination.value).toEqual({ count: 0, lastPage: null });
    expect(status.value).toBe("success");
  });
});

describe("useComments source reactivity", () => {
  it("refetches when the source ref changes", async () => {
    const source = ref<CommentsSource>({ modelId: "m-3" });
    const { comments, refresh } = useComments(source);
    await refresh();

    expect(comments.value).toHaveLength(fixtureComments.length);

    source.value = { modelId: "m-3", commentId: "100" };
    await nextTick();

    await vi.waitFor(() => {
      expect(comments.value).toHaveLength(1);
      expect(comments.value[0]?.id).toBe("100");
    });
  });

  it("accepts a getter source", async () => {
    const id = ref("5");
    const { comments, refresh } = useComments(() => ({ modelId: "m-1", commentId: id.value }));
    await refresh();

    expect(comments.value[0]?.id).toBe("5");
  });
});
