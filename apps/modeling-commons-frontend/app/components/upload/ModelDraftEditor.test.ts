import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import ModelDraftEditor from "./ModelDraftEditor.vue";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState, userState, navigateToMock } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
  userState: {
    current: {
      isLoggedIn: true,
      user: { id: "user-1", name: "Ada", image: null },
      session: {},
    } as unknown,
  },
  navigateToMock: vi.fn(),
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useUser", () => () => computed(() => userState.current));
mockNuxtImport("navigateTo", () => navigateToMock);

beforeEach(() => {
  apiState.current = makeApiClientMock();
  apiState.current.PATCH.mockResolvedValue(apiResult.ok(undefined as never));
  apiState.current.POST.mockResolvedValue(apiResult.ok({ id: "draft-1" }));
  apiState.current.DELETE.mockResolvedValue(apiResult.ok(undefined as never));
});

// In create mode without a picked or primary file, the component renders only
// the picker modal — no UStepper. Tests on edit/stepper UI are covered by the
// composable + e2e layers; the UStepper recursive-update bug under
// @nuxt/test-utils makes mounting that path flaky here.

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
    const text = wrapper.text();
    expect(text).not.toContain("Delete model");
    expect(text).not.toContain("Revert");
  });

  it("shows the picker copy that requires a .nlogox file", async () => {
    const wrapper = await mountSuspended(ModelDraftEditor, { props: {} });
    expect(wrapper.text()).toContain(".nlogox");
  });
});
