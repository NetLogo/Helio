import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import CommentMetadataBar from "./CommentMetadataBar.vue";
import type { CommentMetadataBarProps } from "./types";

const linkedAuthor = {
  name: "Jane Doe",
  image: "https://i.pravatar.cc/150?u=jane",
  url: "/users/user-jane",
};
const plainAuthor = { name: "Jane Doe", image: "https://i.pravatar.cc/150?u=jane" };

const mountBar = (props: Partial<CommentMetadataBarProps> = {}) =>
  mountSuspended(CommentMetadataBar, {
    props: { author: plainAuthor, createdAt: "2024-03-11T15:30:00", ...props },
  });

describe("CommentMetadataBar author link", () => {
  it("links the author name to their profile url", async () => {
    const wrapper = await mountBar({ author: linkedAuthor });

    const link = wrapper.find(`a[href="${linkedAuthor.url}"]`);
    expect(link.exists()).toBe(true);
    expect(link.text()).toContain(linkedAuthor.name);
  });

  it("renders the name without a link when the author has no url", async () => {
    const wrapper = await mountBar();

    expect(wrapper.text()).toContain(plainAuthor.name);
    expect(wrapper.find("a").exists()).toBe(false);
  });
});

describe("CommentMetadataBar date link", () => {
  const threadLink = "/models/model-demo/comments/42";

  it("links the date to the thread page when threadLink is set", async () => {
    const wrapper = await mountBar({ threadLink });

    const link = wrapper.find(`a[href="${threadLink}"]`);
    expect(link.exists()).toBe(true);
    expect(link.text()).not.toBe("");
  });

  it("renders the date as plain text without a threadLink", async () => {
    const wrapper = await mountBar();

    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("keeps the author and date links distinct", async () => {
    const wrapper = await mountBar({ author: linkedAuthor, threadLink });

    const hrefs = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(hrefs).toContain(linkedAuthor.url);
    expect(hrefs).toContain(threadLink);
  });
});
