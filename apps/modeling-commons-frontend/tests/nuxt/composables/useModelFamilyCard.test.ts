import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import useModelFamilyCard from "~/composables/useModelFamilyCard";
import { makeApiClientMock, apiResult } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

describe("useModelFamilyCard", () => {
  it("requests /api/v1/models/{id}/family/card lazily and populates data on execute", async () => {
    apiState.current!.GET.mockResolvedValueOnce(apiResult.ok({ id: "family-1", root: null, children: [] }));

    const { data, execute } = await useModelFamilyCard("model-fam");
    await execute();

    expect(apiState.current!.GET).toHaveBeenCalledWith(
      "/api/v1/models/{id}/family/card",
      { params: { path: { id: "model-fam" } } },
    );
    expect((data.value as { id: string } | null)?.id).toBe("family-1");
  });
});
