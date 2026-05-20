import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import SectionHeader from "./SectionHeader.vue";

describe("SectionHeader", () => {
  it("renders the title", async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      props: { title: "Recent Models" },
    });
    expect(wrapper.text()).toContain("Recent Models");
  });

  it("uses h5 as the default heading element", async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      props: { title: "Recent Models" },
    });
    expect(wrapper.find("h5").exists()).toBe(true);
    expect(wrapper.find("h5").text()).toContain("Recent Models");
  });

  it("uses the heading element specified via the `heading` prop", async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      props: { title: "Featured", heading: "h2" },
    });
    expect(wrapper.find("h2").exists()).toBe(true);
    expect(wrapper.find("h2").text()).toContain("Featured");
  });

  it("renders subtitle text when provided", async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      props: { title: "Featured", subtitle: "Curated picks from the team" },
    });
    expect(wrapper.text()).toContain("Curated picks from the team");
    expect(wrapper.find("p").exists()).toBe(true);
  });

  it("does not render a subtitle paragraph when no subtitle is provided", async () => {
    const wrapper = await mountSuspended(SectionHeader, {
      props: { title: "Featured" },
    });
    expect(wrapper.find("p").exists()).toBe(false);
  });
});
