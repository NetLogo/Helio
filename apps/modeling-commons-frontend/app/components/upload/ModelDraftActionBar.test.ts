import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ModelDraftActionBar from "./ModelDraftActionBar.vue";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    isEdit: true,
    publishing: false,
    hydrating: false,
    deletingModel: false,
    draftId: "draft-1",
    saveStatusLabel: "Saved",
    submitLabel: "Publish",
    discardLabel: "Discard edits",
    isLastStep: true,
    ...overrides,
  };
}

function primaryAction(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.get('[data-testid="draft-primary-action"]');
}

describe("ModelDraftActionBar", () => {
  it("disables the primary action while the draft is hydrating", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: true }),
    });
    expect(primaryAction(wrapper).attributes("disabled")).toBeDefined();
  });

  it("enables the primary action once hydration completes", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: false }),
    });
    expect(primaryAction(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("does not emit submit while hydrating even if the primary action is clicked", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ hydrating: true }),
    });
    await primaryAction(wrapper).trigger("click");
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("renders Publish and emits submit on the last step", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ isLastStep: true, submitLabel: "Publish" }),
    });
    const button = primaryAction(wrapper);
    expect(button.text()).toContain("Publish");
    await button.trigger("click");
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("next")).toBeFalsy();
  });

  it("renders Next and emits next on a non-final step", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ isLastStep: false, submitLabel: "Next" }),
    });
    const button = primaryAction(wrapper);
    expect(button.text()).toContain("Next");
    await button.trigger("click");
    expect(wrapper.emitted("next")).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeFalsy();
  });

  it("keeps the same disabled gating for Next as for Publish", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, {
      props: makeProps({ isLastStep: false, submitLabel: "Next", hydrating: true }),
    });
    await primaryAction(wrapper).trigger("click");
    expect(primaryAction(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.emitted("next")).toBeFalsy();
  });

  it("no longer renders a revert action in the action bar", async () => {
    const wrapper = await mountSuspended(ModelDraftActionBar, { props: makeProps() });
    expect(wrapper.text()).not.toContain("Revert");
    expect(wrapper.find('[data-testid="revert-changes"]').exists()).toBe(false);
  });
});
