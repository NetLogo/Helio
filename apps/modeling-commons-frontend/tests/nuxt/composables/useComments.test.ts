import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { comments as fixtureComments, deepThread } from "~/components/comment/fixtures";
import useComments from "~/composables/comments/useComments";
import type { CommentsSource } from "~/composables/comments/useComments";

describe("useComments with a modelId source", () => {
  it("returns the fixture comments with pagination and a success status", async () => {
    const { comments, pagination, status, error, refresh } = useComments({ modelId: "m-1" });
    await refresh();

    expect(comments.value).toEqual(fixtureComments);
    expect(pagination.value).toEqual({ count: fixtureComments.length, lastPage: 1 });
    expect(status.value).toBe("success");
    expect(error.value).toBeFalsy();
  });

  it("returns deep clones so consumers cannot corrupt the fixtures", async () => {
    const { comments, refresh } = useComments({ modelId: "m-2" });
    await refresh();

    const first = comments.value[0]!;
    expect(first).not.toBe(fixtureComments[0]);
    expect(first.replies?.[0]).not.toBe(fixtureComments[0]!.replies?.[0]);

    first.content = "mutated";
    first.replies?.splice(0);
    await refresh();

    expect(comments.value[0]?.content).toBe(fixtureComments[0]!.content);
    expect(comments.value[0]?.replies).toHaveLength(fixtureComments[0]!.replies!.length);
  });

  it("returns roots without a parentId", async () => {
    const { comments, refresh } = useComments({ modelId: "m-parents" });
    await refresh();

    expect(comments.value.length).toBeGreaterThan(0);
    expect(comments.value.every((comment) => comment.parentId === undefined)).toBe(true);
  });

  it("returns an empty payload for an empty modelId", async () => {
    const { comments, pagination, refresh } = useComments({ modelId: "" });
    await refresh();

    expect(comments.value).toEqual([]);
    expect(pagination.value).toEqual({ count: 0, lastPage: 0 });
  });
});

describe("useComments with a commentId source", () => {
  it("wraps the found comment as the single root of the thread", async () => {
    const { comments, pagination, refresh } = useComments({ commentId: "100" });
    await refresh();

    expect(comments.value).toHaveLength(1);
    expect(comments.value[0]).toEqual(deepThread);
    expect(comments.value[0]).not.toBe(deepThread);
    expect(pagination.value).toEqual({ count: 1, lastPage: 1 });
  });

  it("roots the thread at a nested comment", async () => {
    const { comments, refresh } = useComments({ commentId: "103" });
    await refresh();

    expect(comments.value[0]?.id).toBe("103");
    expect(comments.value[0]?.replies?.map((reply) => reply.id)).toEqual(["104", "107"]);
  });

  it("carries the stamped parentId through the thread fetch", async () => {
    const { comments, refresh } = useComments({ commentId: "103" });
    await refresh();

    expect(comments.value[0]?.parentId).toBe("102");
    expect(comments.value[0]?.replies?.length).toBeGreaterThan(0);
    expect(comments.value[0]?.replies?.every((reply) => reply.parentId === "103")).toBe(true);
  });

  it("returns an empty payload for an unknown commentId", async () => {
    const { comments, pagination, status, refresh } = useComments({ commentId: "nope" });
    await refresh();

    expect(comments.value).toEqual([]);
    expect(pagination.value).toEqual({ count: 0, lastPage: 0 });
    expect(status.value).toBe("success");
  });
});

describe("useComments source reactivity", () => {
  it("refetches when the source ref changes", async () => {
    const source = ref<CommentsSource>({ modelId: "m-3" });
    const { comments, refresh } = useComments(source);
    await refresh();

    expect(comments.value).toHaveLength(fixtureComments.length);

    source.value = { commentId: "100" };
    await nextTick();

    await vi.waitFor(() => {
      expect(comments.value).toHaveLength(1);
      expect(comments.value[0]?.id).toBe("100");
    });
  });

  it("accepts a getter source", async () => {
    const id = ref("5");
    const { comments, refresh } = useComments(() => ({ commentId: id.value }));
    await refresh();

    expect(comments.value[0]?.id).toBe("5");
  });
});
