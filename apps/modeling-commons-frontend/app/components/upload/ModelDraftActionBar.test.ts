import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelDraftActionBar from "./ModelDraftActionBar.vue";
import type { DOMWrapper } from "@vue/test-utils";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    isEdit: true,
    publishing: false,
    hydrating: false,
    reverting: false,
    deletingModel: false,
    isDirty: false,
    draftId: "draft-1",
    saveStatusLabel: "Saved",
    submitLabel: "Publish",
    discardLabel: "Discard edits",
    ...overrides,
  };
}

function publishButton(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper
    .findAll("button")
    .find((b: DOMWrapper<HTMLButtonElement>) => b.text().includes("Publish"));
}

describe("ModelDraftActionBar", () => {
  it("disables the Publish action while the draft is hydrating", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: true }),
    });
    const button = publishButton(wrapper);
    expect(button).toBeTruthy();
    expect(button!.attributes("disabled")).toBeDefined();
  });

  it("enables the Publish action once hydration completes", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: false }),
    });
    const button = publishButton(wrapper);
    expect(button).toBeTruthy();
    expect(button!.attributes("disabled")).toBeUndefined();
  });

  it("does not emit submit while hydrating even if the Publish button is clicked", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: true }),
    });
    await publishButton(wrapper)!.trigger("click");
    expect(wrapper.emitted("submit")).toBeFalsy();
  });
});
