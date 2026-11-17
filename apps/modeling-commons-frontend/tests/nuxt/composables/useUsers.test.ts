import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useUsers from "~/composables/user/useUsers";
import { jsonResponse, makeRecordingApi, type RecordingApi } from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  clearApiPagination("users-");
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(({ url }) =>
    jsonResponse({ count: 40, limit: 20, page: Number(url.searchParams.get("page")), data: [] }),
  );
});

const sentQueries = () =>
  apiState.current!.requests.map(({ url }) => Object.fromEntries(url.searchParams));

describe("useUsers", () => {
  it("pages through users with the page parameter, not an offset the API ignores", async () => {
    const { loadNextPage } = useUsers();
    await vi.waitFor(() => expect(apiState.current!.requests).toHaveLength(1));
    await flushPromises();

    loadNextPage();
    await vi.waitFor(() => expect(apiState.current!.requests).toHaveLength(2));

    expect(sentQueries()).toEqual([
      { limit: "20", page: "0" },
      { limit: "20", page: "1" },
    ]);
  });
});
