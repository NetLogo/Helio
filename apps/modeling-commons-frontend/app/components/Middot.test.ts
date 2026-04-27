import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import Middot from "./Middot.vue";

describe("Middot", () => {
  it("renders a middle dot character", async () => {
    const wrapper = await mountSuspended(Middot);
    expect(wrapper.text()).toBe("·");
  });

  it("forwards attrs onto the span", async () => {
    const wrapper = await mountSuspended(Middot, {
      attrs: { "data-testid": "sep" },
    });
    expect(wrapper.find('[data-testid="sep"]').exists()).toBe(true);
  });
});
