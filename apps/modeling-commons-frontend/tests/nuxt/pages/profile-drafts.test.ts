import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DraftsPage from "~/pages/profile/drafts/index.vue";
import { toastAddMock, useToastMock } from "~~/tests/helpers";
import {
  jsonResponse,
  makeRecordingApi,
  type RecordedRequest,
  type RecordingApi,
} from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useToast", () => () => useToastMock());

const draft = {
  id: "draft-1",
  updatedAt: "2026-10-01T12:00:00.000Z",
  previewImageUrl: null,
  data: { title: "Wolf Sheep", description: "" },
};

beforeEach(() => {
  clearNuxtData("my-drafts");
  toastAddMock.mockClear();
  apiState.current = makeRecordingApi();
});

function respondToDelete(status: number) {
  apiState.current!.respondWith((request: RecordedRequest) =>
    request.method === "GET"
      ? jsonResponse({ count: 1, limit: 20, page: 0, data: [draft] })
      : new Response(null, { status }),
  );
}

function getDeletes() {
  return apiState
    .current!.requests.filter((request) => request.method === "DELETE")
    .map(({ url }) => url.pathname);
}

type MenuItem = { label?: string; onClick?: () => unknown };

async function clickDelete() {
  const wrapper = await mountSuspended(DraftsPage);
  await flushPromises();
  const items = wrapper.findComponent({ name: "UDropdownMenu" }).props("items") as MenuItem[];
  await items.find((item) => item.label === "Delete")!.onClick!();
  await flushPromises();
  return wrapper;
}

describe("profile drafts page delete", () => {
  it("DELETEs the draft through the api client and confirms with a toast", async () => {
    respondToDelete(204);

    await clickDelete();

    expect(getDeletes()).toEqual(["/api/v1/model-drafts/draft-1"]);
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft deleted" }));
  });

  it("toasts the status when the server refuses the delete", async () => {
    respondToDelete(403);

    await clickDelete();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Delete failed", description: "Request failed (403)" }),
    );
  });
});
