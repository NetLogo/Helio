import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import CommentTextRepresentation from "./CommentTextRepresentation.vue";

async function mountText(text: string) {
  return mountSuspended(CommentTextRepresentation, { props: { text } });
}

describe("CommentTextRepresentation", () => {
  it("renders plain text without anchors", async () => {
    const wrapper = await mountText("Just a regular comment.");
    expect(wrapper.text()).toBe("Just a regular comment.");
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("linkifies https URLs with safe anchor attributes", async () => {
    const wrapper = await mountText("Check https://example.com/docs for details");

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://example.com/docs");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer nofollow");
    expect(link.text()).toBe("https://example.com/docs");
    expect(wrapper.text()).toContain("Check");
    expect(wrapper.text()).toContain("for details");
  });

  it("linkifies http URLs", async () => {
    const wrapper = await mountText("Legacy link http://example.com here");
    expect(wrapper.find("a").attributes("href")).toBe("http://example.com");
  });

  it("excludes trailing punctuation from the link", async () => {
    const wrapper = await mountText("(see https://example.com/docs).");

    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("https://example.com/docs");
    expect(link.text()).toBe("https://example.com/docs");
    expect(wrapper.text()).toContain(").");
  });

  it("does not linkify non-http(s) schemes", async () => {
    const wrapper = await mountText("Try ftp://example.com/file or javascript:alert(1) instead");
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("preserves newlines in the rendered text", async () => {
    const wrapper = await mountText("line one\nline two\n\nline four");

    const paragraph = wrapper.find("p");
    expect(paragraph.classes()).toContain("whitespace-pre-wrap");
    expect(paragraph.element.textContent).toBe("line one\nline two\n\nline four");
  });

  it("linkifies multiple URLs independently", async () => {
    const wrapper = await mountText("First https://a.example.com then https://b.example.com done");

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]!.attributes("href")).toBe("https://a.example.com");
    expect(links[1]!.attributes("href")).toBe("https://b.example.com");
  });
});
