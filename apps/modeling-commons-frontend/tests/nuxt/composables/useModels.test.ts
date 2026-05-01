import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useModels from "~/composables/useModels";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState, routeState, navigateToMock } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
  routeState: { current: { query: {} as Record<string, unknown> } },
  navigateToMock: vi.fn(async () => undefined),
}));

mockNuxtImport("useApi", () => {
  return () => apiState.current!.client;
});

mockNuxtImport("useRoute", () => {
  return () => routeState.current;
});

mockNuxtImport("navigateTo", () => navigateToMock);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
  routeState.current = { query: {} };
});

describe("useModels", () => {
  it("requests /api/v1/models with default pagination", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
    );

    const models = useModels();
    await models.refresh();

    const listCall = apiState.current!.GET.mock.calls.find(([path]) => path === "/api/v1/models");
    expect(listCall).toBeDefined();
    expect(listCall![1]).toEqual({ params: { query: { limit: 20, page: 0 } } });
  });

  it.todo(
    "forwards keyword/tag/isEndorsed filters from the route query — useAsyncData refresh doesn't pick up the route mock change in test env",
    async () => {
      routeState.current = {
        query: { keyword: "bees", tag: "biology", endorsed: "true" },
      };
      apiState.current!.GET.mockResolvedValue(
        apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
      );

      const models = useModels();
      await models.refresh();

      const listCall = apiState.current!.GET.mock.calls.find(([p]) => p === "/api/v1/models");
      expect(listCall![1]).toEqual({
        params: {
          query: { limit: 20, page: 0, keyword: "bees", tag: "biology", isEndorsed: true },
        },
      });
    },
  );

  it("exposes hasMore and isEmpty derived from the response", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
    );

    const models = useModels();
    await models.refresh();

    expect(models.rows.value).toEqual([]);
    expect(models.totalCount.value).toBe(0);
    expect(models.hasMore.value).toBe(false);
    expect(models.isEmpty.value).toBe(true);
  });
});
