import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import UploadCardTitle from "./UploadCardTitle.vue";

describe("UploadCardTitle", () => {
  it("renders the title prop", async () => {
    const wrapper = await mountSuspended(UploadCardTitle, {
      props: { title: "Add Details" },
    });
    expect(wrapper.text()).toContain("Add Details");
  });

  it("renders the required-fields hint", async () => {
    const wrapper = await mountSuspended(UploadCardTitle, {
      props: { title: "Upload Files" },
    });
    expect(wrapper.text()).toContain("Required fields are marked with an asterisk");
  });

  it("renders an asterisk styled with the coral text color", async () => {
    const wrapper = await mountSuspended(UploadCardTitle, {
      props: { title: "Whatever" },
    });
    expect(wrapper.find("span.text-coral").text()).toBe("*");
  });
});
