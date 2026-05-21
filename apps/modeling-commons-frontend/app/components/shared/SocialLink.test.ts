import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import SocialLink from "./SocialLink.vue";

describe("SocialLink", () => {
  it("builds an X profile URL from a handle and shows the @handle", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "x", rawValue: "ada" },
    });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("https://x.com/ada");
    expect(link.attributes("target")).toBe("_blank");
    expect(wrapper.text()).toContain("@ada");
  });

  it("strips a leading @ in the X handle when building the URL", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "x", rawValue: "@ada" },
    });
    expect(wrapper.find("a").attributes("href")).toBe("https://x.com/ada");
    expect(wrapper.text()).toContain("@ada");
  });

  it("builds a GitHub URL and displays the raw username", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "github", rawValue: "octocat" },
    });
    expect(wrapper.find("a").attributes("href")).toBe("https://github.com/octocat");
    expect(wrapper.text()).toContain("octocat");
  });

  it("renders the website URL verbatim", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "website", rawValue: "https://example.com/" },
    });
    expect(wrapper.find("a").attributes("href")).toBe("https://example.com/");
    expect(wrapper.text()).toContain("https://example.com/");
  });

  it("sets rel='noopener noreferrer' on the external anchor", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "x", rawValue: "ada" },
    });
    const rel = wrapper.find("a").attributes("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("omits the display text in the compact variant but keeps the link", async () => {
    const wrapper = await mountSuspended(SocialLink, {
      props: { type: "github", rawValue: "octocat", variant: "compact" },
    });
    expect(wrapper.find("a").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("octocat");
  });
});
