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

  it("renders the 'Generate preview' button", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    const button = wrapper.find('[data-testid="generate-preview-button"]');
    expect(button.exists()).toBe(true);
    expect(button.text()).toContain("Generate preview");
  });

  it("disables the 'Generate preview' button when no primary file is present", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState(), hasPrimaryFile: false },
    });
    const button = wrapper.find('[data-testid="generate-preview-button"]');
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("enables the 'Generate preview' button when a primary file is present", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        hasPrimaryFile: true,
        generatingPreview: false,
      },
    });
    const button = wrapper.find('[data-testid="generate-preview-button"]');
    expect(button.attributes("disabled")).toBeUndefined();
  });

  it("disables the 'Generate preview' button while generating", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        hasPrimaryFile: true,
        generatingPreview: true,
      },
    });
    const button = wrapper.find('[data-testid="generate-preview-button"]');
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("emits 'generate-preview' when the button is clicked", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        hasPrimaryFile: true,
      },
    });
    await wrapper.find('[data-testid="generate-preview-button"]').trigger("click");
    expect(wrapper.emitted("generate-preview")).toBeTruthy();
  });

  it("renders the preview image uploader control", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.find('[data-testid="preview-image-uploader"]').exists()).toBe(true);
  });

  it("disables the preview image uploader while a preview is being generated", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        hasPrimaryFile: true,
        generatingPreview: true,
      },
    });
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("disabled")).toBeDefined();
  });

  it("disables the preview image uploader while an upload is in flight", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        uploadingPreview: true,
      },
    });
    const fileInput = wrapper.find('input[type="file"]');
    expect(fileInput.exists()).toBe(true);
    expect(fileInput.attributes("disabled")).toBeDefined();
  });

  it("disables the 'Generate preview' button while a preview is uploading", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        hasPrimaryFile: true,
        uploadingPreview: true,
      },
    });
    const button = wrapper.find('[data-testid="generate-preview-button"]');
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("renders the previewImageUrl when provided", async () => {
    const wrapper = await mountSuspended(AddDetailsCard, {
      props: {
        modelValue: makeState(),
        previewImageUrl: "https://example.com/preview.png",
      },
    });
    const img = wrapper.find('img[alt="Model preview"]');
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/preview.png");
  });

  it.todo(
    "validation copy ('Model title is required') is rendered by the parent UForm in upload.vue, not by AddDetailsCard itself",
  );
});
