import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import useForumModels from "~/composables/model/useForumModels";
import type { ModelsFilters } from "~/forms/models";
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

const emptyFilters: ModelsFilters = {};

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
  routeState.current = { query: {} };
});

describe("useForumModels", () => {
  it("requests /api/v1/models/card with default pagination", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
    );

    const filters = ref<ModelsFilters>({ ...emptyFilters });
    const models = useForumModels({ filters });
    await models.refresh();

    const listCall = apiState.current!.GET.mock.calls.find(
      ([path]) => path === "/api/v1/models/card",
    );
    expect(listCall).toBeDefined();
    expect(listCall![1]?.params?.query?.limit).toBe(20);
    expect(listCall![1]?.params?.query?.page).toBe(0);
  });

  it("exposes hasMore and isEmpty derived from the response", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({ count: 0, limit: 20, page: 0, data: [] }),
    );

    const filters = ref<ModelsFilters>({ ...emptyFilters });
    const models = useForumModels({ filters });
    await models.refresh();

    expect(models.rows.value).toEqual([]);
    expect(models.totalCount.value).toBe(0);
    expect(models.hasMore.value).toBe(false);
    expect(models.isEmpty.value).toBe(true);
  });
});
