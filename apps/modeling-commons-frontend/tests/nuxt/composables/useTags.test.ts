import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useTags from "~/composables/tag/useTags";
import usePopularTags from "~/composables/tag/usePopularTags";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => {
  return () => apiState.current!.client;
});

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

function lastQuery(path: string) {
  const call = apiState.current!.GET.mock.calls.findLast(([called]) => called === path);
  expect(call, `no GET call for ${path}`).toBeDefined();
  return call![1]?.params?.query as Record<string, unknown>;
}

describe("useTags", () => {
  it("paginates with page, not an offset the API ignores", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
    );

    useTags();
    await vi.waitFor(() => expect(apiState.current!.GET).toHaveBeenCalled());

    const query = lastQuery("/api/v1/tags");
    expect(query.page).toBe(0);
    expect(query).not.toHaveProperty("offset");
  });
});

describe("usePopularTags", () => {
  it("requests /api/v1/tags/popular with the configured limit and page", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 24, page: 0, data: [] }),
    );

    usePopularTags(24);
    await vi.waitFor(() => expect(apiState.current!.GET).toHaveBeenCalled());

    const query = lastQuery("/api/v1/tags/popular");
    expect(query.limit).toBe(24);
    expect(query.page).toBe(0);
  });
});
