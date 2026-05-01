import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useModelVersions from "~/composables/useModelVersions";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

describe("useModelVersions", () => {
  it("requests versions for the given id with limit:100, page:0", async () => {
    apiState.current!.GET.mockResolvedValue(
      apiResult.ok({
        count: 2,
        limit: 100,
        page: 0,
        data: [{ versionNumber: 1 }, { versionNumber: 2 }],
      }),
    );

    const result = await useModelVersions("model-v");
    await result.execute();

    expect(apiState.current!.GET).toHaveBeenCalledWith("/api/v1/models/{id}/versions", {
      params: { path: { id: "model-v" }, query: { limit: 100, page: 0 } },
    });
    expect(result.data.value?.length).toBe(2);
  });

  it("returns [] when id is empty", async () => {
    const { data, execute } = await useModelVersions("");
    await execute();

    expect(apiState.current!.GET).not.toHaveBeenCalled();
    expect(data.value).toEqual([]);
  });
});
