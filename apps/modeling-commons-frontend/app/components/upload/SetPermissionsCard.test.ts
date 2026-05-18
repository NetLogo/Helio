import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import SetPermissionsCard from "./SetPermissionsCard.vue";
import type { UploadFormInput } from "~/forms/upload";

function makeState(overrides: Partial<UploadFormInput> = {}): UploadFormInput {
  return {
    imageFile: null,
    title: "",
    description: "",
    tags: [],
    usecases: [],
    subjects: [],
    permission: "private",
    groupId: null,
    collaboratorEmails: [],
    askForCollaborators: false,
    askForPeerReview: false,
    peerReviewKinds: [],
    peerReviewDescription: null,
    ...overrides,
  } as UploadFormInput;
}

describe("SetPermissionsCard", () => {
  it("renders the section heading", async () => {
    const wrapper = await mountSuspended(SetPermissionsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Set Permissions");
  });

  it("renders all three permission options", async () => {
    const wrapper = await mountSuspended(SetPermissionsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Private");
    expect(wrapper.text()).toContain("Unlisted");
    expect(wrapper.text()).toContain("Public");
  });

  it.todo("renders one radio input per permission option — Reka UI RadioGroup renders custom controls, not native <input type=radio>", async () => {
    const wrapper = await mountSuspended(SetPermissionsCard, {
      props: { modelValue: makeState() },
    });
    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the section copy for permission selection", async () => {
    const wrapper = await mountSuspended(SetPermissionsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Model Permissions");
  });

  it.todo(
    "Asserting which radio is initially selected and 'click cycles permission' is tightly coupled to Reka UI's RadioGroup internals — depends on the runtime DOM. Cover via E2E or via direct UFormField unit test once Nuxt UI ships stable hooks.",
  );
});
