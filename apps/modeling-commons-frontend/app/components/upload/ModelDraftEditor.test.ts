import { computed, h } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended, mockComponent, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ModelDraftEditor from "./ModelDraftEditor.vue";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState, userState, navigateToMock, toastAdd } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
  userState: {
    current: {
      isLoggedIn: true,
      user: { id: "user-1", name: "Ada", image: null },
      session: {},
    } as unknown,
  },
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useUser", () => () => computed(() => userState.current));
mockNuxtImport("navigateTo", () => navigateToMock);
mockNuxtImport("useToast", () => () => ({ add: toastAdd }));
mockNuxtImport("useModelAdditionalFiles", () => () => ({ data: computed(() => []) }));

// The real UStepper hits a recursive-update bug under @nuxt/test-utils, so the
// step panels are rendered flat here; step navigation is driven by the editor's
// own stepIndex, not by the stepper widget.
mockComponent("UStepper", {
  props: { modelValue: { type: Number, default: 0 }, items: { type: Array, default: () => [] } },
  setup(_props, { slots }) {
    return () => [slots.details?.(), slots.files?.(), slots.permissions?.()];
  },
});

mockComponent("UTooltip", {
  props: { text: { type: String, default: "" } },
  setup(props, { slots }) {
    return () => h("span", { "data-tooltip-text": props.text }, slots.default?.());
  },
});

const draftData = {
  title: "Wolf Sheep",
  description: "predator-prey",
  visibility: "public",
  tags: ["agents"],
  primaryFile: {
    s3Key: "staging/u/d/abc-model.nlogox",
    filename: "model.nlogox",
    sizeBytes: 1024,
    mimeType: "application/xml",
  },
  attachments: [],
};

const draftDto = {
  id: "draft-1",
  userId: "user-1",
  modelId: "model-1",
  schemaVersion: 1,
  data: draftData,
  previewImageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  toastAdd.mockClear();
  apiState.current = makeApiClientMock();
  apiState.current.GET.mockImplementation(async (path: string) =>
    path === "/api/v1/model-drafts/{id}"
      ? apiResult.ok(draftDto)
      : apiResult.ok({ data: [], count: 0, limit: 20, page: 1 }),
  );
  apiState.current.PATCH.mockResolvedValue(apiResult.ok(undefined as never));
  apiState.current.POST.mockResolvedValue(apiResult.ok({ id: "draft-1" }));
  apiState.current.DELETE.mockResolvedValue(apiResult.ok(undefined as never));
});

// In create mode without a picked or primary file, the component renders only
// the picker modal, no stepper.

describe("ModelDraftEditor (picker view)", () => {
  it("renders the title prop in the picker modal", async () => {
    const wrapper = await mountSuspended(ModelDraftEditor, {
      props: { title: "Upload a Model" },
    });
    expect(wrapper.text()).toContain("Upload a Model");
  });

  it("falls back to the default title 'Upload' when none is provided", async () => {
    const wrapper = await mountSuspended(ModelDraftEditor, { props: {} });
    expect(wrapper.text()).toContain("Upload");
  });

  it("does not show Delete or Revert affordances before a primary file is present", async () => {
    const wrapper = await mountSuspended(ModelDraftEditor, { props: {} });
    expect(wrapper.text()).not.toContain("Delete model");
    expect(wrapper.find('[data-testid="revert-changes"]').exists()).toBe(false);
  });

  it("shows the picker copy that requires a .nlogox file", async () => {
    const wrapper = await mountSuspended(ModelDraftEditor, { props: {} });
    expect(wrapper.text()).toContain(".nlogox");
  });
});

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>;

async function mountHydrated(props: Record<string, unknown>) {
  const wrapper = await mountSuspended(ModelDraftEditor, { props });
  await vi.waitFor(() => {
    expect(wrapper.find('[data-testid="draft-primary-action"]').exists()).toBe(true);
  });
  return wrapper;
}

function mountResumedDraft() {
  return mountHydrated({ title: "Upload", initialDraftId: "draft-1" });
}

function mountEditMode() {
  return mountHydrated({ mode: "edit" as const, title: "Edit Model", seedModelId: "model-1" });
}

function primaryAction(wrapper: Wrapper) {
  return wrapper.get('[data-testid="draft-primary-action"]');
}

function published() {
  return apiState.current!.POST.mock.calls.some((call) => String(call[0]).includes("/publish"));
}

describe("ModelDraftEditor (steps)", () => {
  it("labels the primary action Next until the final step, then Publish", async () => {
    const wrapper = await mountResumedDraft();

    expect(primaryAction(wrapper).text()).toContain("Next");

    await primaryAction(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    expect(primaryAction(wrapper).text()).toContain("Next");

    await primaryAction(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    expect(primaryAction(wrapper).text()).toContain("Publish");
  });

  it("advances instead of publishing while a later step remains", async () => {
    const wrapper = await mountResumedDraft();

    await primaryAction(wrapper).trigger("click");
    await wrapper.vm.$nextTick();

    expect(published()).toBe(false);
  });

  it("publishes instead of advancing once the final step is reached", async () => {
    const wrapper = await mountResumedDraft();

    await primaryAction(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    await primaryAction(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    await primaryAction(wrapper).trigger("click");

    await vi.waitFor(() => {
      expect(published()).toBe(true);
    });
  });

  it("publishes from the first step in edit mode, which is not a wizard", async () => {
    const wrapper = await mountEditMode();

    expect(primaryAction(wrapper).text()).toContain("Publish");

    await primaryAction(wrapper).trigger("click");

    await vi.waitFor(() => {
      expect(published()).toBe(true);
    });
  });
});

describe("ModelDraftEditor (revert trigger)", () => {
  it("renders revert as a labelled icon button at the top of the wizard", async () => {
    const wrapper = await mountEditMode();
    const revert = wrapper.get('[data-testid="revert-changes"]');

    expect(revert.attributes("aria-label")).toBe("Revert changes");
    expect(revert.text()).not.toContain("Revert changes");
    expect(wrapper.get("[data-tooltip-text]").attributes("data-tooltip-text")).toBe(
      "Revert changes",
    );
    expect(revert.attributes("disabled")).toBeDefined();
  });

  it("does not render the revert icon in create mode", async () => {
    const wrapper = await mountResumedDraft();
    expect(wrapper.find('[data-testid="revert-changes"]').exists()).toBe(false);
  });

  it("reverts edits back to the loaded draft when the icon is clicked", async () => {
    const wrapper = await mountEditMode();
    const titleInput = wrapper.get('input[type="text"]');
    await titleInput.setValue("Changed title");

    const revert = wrapper.get('[data-testid="revert-changes"]');
    await vi.waitFor(() => {
      expect(revert.attributes("disabled")).toBeUndefined();
    });

    await revert.trigger("click");

    await vi.waitFor(() => {
      expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value).toBe(
        "Wolf Sheep",
      );
    });
    await vi.waitFor(() => {
      expect(toastAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Reverted to original" }),
      );
    });
  });
});
