import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import ClientFooter from "./ClientFooter.vue";

mockNuxtImport("useWebsite", () => () =>
  ref({
    name: "Modeling Commons",
    fullName: "Modeling Commons",
    logo: "<svg/>",
    description: "",
    longDescription: "",
    url: "http://app.test",
    keywords: [],
  }),
);

describe("ClientFooter", () => {
  it("renders primary nav links", async () => {
    const wrapper = await mountSuspended(ClientFooter);
    const text = wrapper.text();
    expect(text).toContain("Home");
    expect(text).toContain("Models");
    expect(text).toContain("About");
    expect(text).toContain("Donate");
  });

  it("renders policy links", async () => {
    const wrapper = await mountSuspended(ClientFooter);
    expect(wrapper.find('a[href="/privacy"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/terms-of-service"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/cookies"]').exists()).toBe(true);
  });

  it("renders contact email links", async () => {
    const wrapper = await mountSuspended(ClientFooter);
    expect(wrapper.find('a[href="mailto:modelingcommons@ccl.northwestern.edu"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('a[href="mailto:bugs@ccl.northwestern.edu"]').exists()).toBe(true);
  });

  it("renders the current year", async () => {
    const wrapper = await mountSuspended(ClientFooter);
    expect(wrapper.text()).toContain(String(new Date().getFullYear()));
  });
});
