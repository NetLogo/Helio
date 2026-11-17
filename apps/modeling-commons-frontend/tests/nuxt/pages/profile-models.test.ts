import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileModelsPage from "~/pages/users/[id]/models.vue";
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

mockNuxtImport("useRoute", () => () => ({
  name: "users-id-models",
  path: "/users/user-1/models",
  fullPath: "/users/user-1/models",
  params: { id: "user-1" },
  query: {},
  hash: "",
  matched: [],
  meta: {},
}));

const MODEL_CARDS_PATH = "/api/v1/models/card";

function respond({ url }: RecordedRequest) {
  if (url.pathname === MODEL_CARDS_PATH) {
    return jsonResponse({
      count: 40,
      limit: 20,
      page: Number(url.searchParams.get("page")),
      data: [],
    });
  }
  return jsonResponse({ id: "user-1", name: "Ada", isProfilePublic: true, socialLinks: [] });
}

beforeEach(() => {
  clearApiPagination("models-by-user-user-1");
  clearNuxtData("profile-user-1");
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(respond);
});

const sentModelCardQueries = () =>
  apiState
    .current!.requests.filter(({ url }) => url.pathname === MODEL_CARDS_PATH)
    .map(({ url }) => Object.fromEntries(url.searchParams));

describe("profile models page", () => {
  it("pages through the member's models with the page parameter, not an offset the API ignores", async () => {
    const wrapper = await mountSuspended(ProfileModelsPage);
    await flushPromises();

    wrapper.findComponent({ name: "ModelCards" }).vm.$emit("onLoadMore");
    await vi.waitFor(() => expect(sentModelCardQueries()).toHaveLength(2));

    expect(sentModelCardQueries()).toEqual([
      { authorId: "user-1", limit: "20", page: "0", publicOnly: "false" },
      { authorId: "user-1", limit: "20", page: "1", publicOnly: "false" },
    ]);
  });
});
