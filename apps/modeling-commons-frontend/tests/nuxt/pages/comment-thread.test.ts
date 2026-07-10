import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import CommentsSection from "~/components/comment/CommentsSection.vue";
import { useProfileMock, useUserMock } from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

mockNuxtImport("useRoute", () => () => ({
  name: "model-comment-thread",
  path: "/models/model-demo/comments/100",
  fullPath: "/models/model-demo/comments/100",
  params: { id: "model-demo", commentId: "100" },
  query: {},
  hash: "",
  matched: [],
  meta: {},
}));

describe("models/[id]/comments/[commentId].vue", () => {
  it("renders CommentsSection with the route's commentId and links back to the model", async () => {
    const Page = (await import("~/pages/models/[id]/comments/[commentId].vue")).default;
    const wrapper = await mountSuspended(Page);

    const section = wrapper.findComponent(CommentsSection);
    expect(section.exists()).toBe(true);
    expect(section.props("commentId")).toBe("100");
    expect(wrapper.find('a[href="/models/model-demo"]').exists()).toBe(true);
  });
});
