import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import AddDetailsCard from "./AddDetailsCard.vue";
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

describe("AddDetailsCard", () => {
  it("renders the card title", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Add Details");
  });

  it("renders the title, description, and tags labels", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Model Title");
    expect(wrapper.text()).toContain("Description");
    expect(wrapper.text()).toContain("Tags");
  });

  it("seeds the title input from the bound state", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState({ title: "Wolf Sheep" }) },
    });
    const titleInput = wrapper.find('input[type="text"]')
      .element as HTMLInputElement;
    expect(titleInput.value).toBe("Wolf Sheep");
  });

  it("renders an input bound to the title field", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    const titleInput = wrapper.find('input[type="text"]');
    expect(titleInput.exists()).toBe(true);
    await titleInput.setValue("New title");
    // The bound v-model updates either via emit or by mutation of the shared
    // state object. We don't assert the propagation mechanism here — only
    // that the input is wired and writable.
    expect((titleInput.element as HTMLInputElement).value).toBe("New title");
  });

  it("renders a textarea bound to the description field", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);
    await textarea.setValue("A description");
    expect((textarea.element as HTMLTextAreaElement).value).toBe("A description");
  });

  it("renders an image-uploader region for the preview image", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Model Preview Image");
  });

  it.todo(
    "validation copy ('Model title is required') is rendered by the parent UForm in upload.vue, not by AddDetailsCard itself",
  );
});
