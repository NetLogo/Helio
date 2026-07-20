import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import CommentsSection from "~/components/comment/CommentsSection.vue";
import { findCommentById } from "~/components/comment/comment-tree";
import { deepThread } from "~/components/comment/fixtures";
import { installCommentFetchMock, useProfileMock, useUserMock } from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

const routeState = vi.hoisted(() => ({ commentId: "100" }));

mockNuxtImport("useRoute", () => () => ({
  name: "model-comment-thread",
  path: `/models/model-demo/comments/${routeState.commentId}`,
  fullPath: `/models/model-demo/comments/${routeState.commentId}`,
  params: { id: "model-demo", commentId: routeState.commentId },
  query: {},
  hash: "",
  matched: [],
  meta: {},
}));

beforeEach(() => {
  routeState.commentId = "100";
  installCommentFetchMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mountThreadPage(commentId: string) {
  routeState.commentId = commentId;
  const Page = (await import("~/pages/models/[id]/comments/[commentId].vue")).default;
  const wrapper = await mountSuspended(Page);
  await flushPromises();
  await nextTick();
  return wrapper;
}

const parentLink = (wrapper: Awaited<ReturnType<typeof mountThreadPage>>) =>
  wrapper.find('[data-testid="parent-thread-link"]');

describe("models/[id]/comments/[commentId].vue", () => {
  it("renders CommentsSection with the route's commentId and links back to the model", async () => {
    const wrapper = await mountThreadPage("100");

    const section = wrapper.findComponent(CommentsSection);
    expect(section.exists()).toBe(true);
    expect(section.props("commentId")).toBe("100");
    expect(wrapper.find('a[href="/models/model-demo"]').exists()).toBe(true);
  });

  it("links to the parent thread when the root is a nested reply", async () => {
    const nested = findCommentById([deepThread], "103");
    expect(nested?.parentId).toBeDefined();

    const wrapper = await mountThreadPage("103");

    const link = parentLink(wrapper);
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe(`/models/model-demo/comments/${nested!.parentId}`);
  });

  it("shows no parent-thread link for a top-level comment", async () => {
    const wrapper = await mountThreadPage("100");

    expect(parentLink(wrapper).exists()).toBe(false);
  });

  it("names the thread root's author in the subtitle", async () => {
    const nested = findCommentById([deepThread], "103");
    const wrapper = await mountThreadPage("103");

    expect(wrapper.find('[data-testid="thread-subtitle"]').text()).toContain(
      nested!.author.name,
    );
  });

  it("falls back to a generic subtitle when the thread cannot be found", async () => {
    const wrapper = await mountThreadPage("does-not-exist");

    const subtitle = wrapper.find('[data-testid="thread-subtitle"]');
    expect(subtitle.exists()).toBe(true);
    expect(subtitle.text()).not.toBe("");
  });
});
