import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useModelAdditionalFiles from "~/composables/model/useModelAdditionalFiles";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

describe("useModelAdditionalFiles", () => {
  it("requests /api/v1/models/{id}/additional-files", async () => {
    apiState.current!.GET.mockResolvedValue(apiResult.ok([{ id: "f1", filename: "extras.csv" }]));

    const result = await useModelAdditionalFiles("model-af");
    await result.execute();

    expect(apiState.current!.GET).toHaveBeenCalledWith("/api/v1/models/{id}/additional-files", {
      params: { path: { id: "model-af" } },
    });
    expect(result.data.value?.length).toBe(1);
  });
});
