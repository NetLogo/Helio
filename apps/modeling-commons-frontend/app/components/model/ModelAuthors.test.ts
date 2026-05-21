import { describe, expect, it } from "vitest";
import { mockComponent, mountSuspended } from "@nuxt/test-utils/runtime";
import ModelAuthors from "./ModelAuthors.vue";

mockComponent("UTooltip", {
  setup(_, { slots }) {
    return () => slots.default?.();
  },
});

describe("ModelAuthors", () => {
  it("links the primary author name to their slug path", async () => {
    const wrapper = await mountSuspended(ModelAuthors, {
      props: {
        authors: [{ userId: "user-1", userName: "Ada Lovelace", role: "owner" }],
      },
    });
    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/users/ada-lovelace/user-1");
    expect(link.text()).toContain("Ada Lovelace");
  });

  it("prefers the owner role when picking the primary author", async () => {
    const wrapper = await mountSuspended(ModelAuthors, {
      props: {
        authors: [
          { userId: "u1", userName: "Contributor One", role: "contributor" },
          { userId: "u2", userName: "Real Owner", role: "owner" },
        ],
      },
    });
    expect(wrapper.find("a").text()).toContain("Real Owner");
  });

  it("shows an 'and N others' summary when more than one author exists", async () => {
    const wrapper = await mountSuspended(ModelAuthors, {
      props: {
        authors: [
          { userId: "u1", userName: "Ada", role: "owner" },
          { userId: "u2", userName: "Grace", role: "contributor" },
          { userId: "u3", userName: "Edsger", role: "contributor" },
        ],
      },
    });
    expect(wrapper.text()).toMatch(/and\s+2(\s+2)?\s+others/);
  });

  it("does not show the 'and N others' summary for a single author", async () => {
    const wrapper = await mountSuspended(ModelAuthors, {
      props: {
        authors: [{ userId: "u1", userName: "Ada", role: "owner" }],
      },
    });
    expect(wrapper.text()).not.toContain("other");
  });

  it("keys author iterations by userId so reorders move nodes instead of mutating in place", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "app/components/model/ModelAuthors.vue"),
      "utf8",
    );
    expect(src).not.toMatch(/:key="index"/);
    expect(src).toMatch(/:key="author\.userId"/);
  });

  it("falls back to 'Anonymous' when the primary author has no name", async () => {
    const wrapper = await mountSuspended(ModelAuthors, {
      props: {
        authors: [{ userId: "u1", userName: null, role: "owner" }],
      },
    });
    expect(wrapper.find("a").text()).toContain("Anonymous");
  });
});
