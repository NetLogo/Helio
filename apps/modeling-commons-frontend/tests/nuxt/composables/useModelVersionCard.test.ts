import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useModelVersionCard from "~/composables/useModelVersionCard";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

describe("useModelVersionCard", () => {
  it("calls /api/v1/models/{id}/versions/{version}/card", async () => {
    apiState.current!.GET.mockResolvedValueOnce(apiResult.ok({ id: "vc-1", versionNumber: 3 }));

    const { data } = await useModelVersionCard("model-x", 3);

    expect(apiState.current!.GET).toHaveBeenCalledWith(
      "/api/v1/models/{id}/versions/{version}/card",
      { params: { path: { id: "model-x", version: 3 } } },
    );
    expect((data.value as { id: string } | null)?.id).toBe("vc-1");
  });
});
