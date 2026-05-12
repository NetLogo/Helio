import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import useModelCard from "~/composables/model/useModelCard";
import { makeModelCard } from "~~/tests/helpers/fixtures";
import { apiResult, makeApiClientMock } from "~~/tests/helpers/mockApi";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as ReturnType<typeof makeApiClientMock> | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);

beforeEach(() => {
  vi.resetAllMocks();
  apiState.current = makeApiClientMock();
});

describe("useModelCard", () => {
  it("calls /api/v1/models/{id}/card and exposes the data", async () => {
    apiState.current!.GET.mockResolvedValueOnce(apiResult.ok(makeModelCard({ id: "card-A" })));

    const { data } = await useModelCard("card-A");

    expect(apiState.current!.GET).toHaveBeenCalledWith("/api/v1/models/{id}/card", {
      params: { path: { id: "card-A" } },
    });
    expect((data.value as { id: string } | null)?.id).toBe("card-A");
  });

  it("refetches when the id ref changes", async () => {
    apiState
      .current!.GET.mockResolvedValueOnce(apiResult.ok(makeModelCard({ id: "card-B" })))
      .mockResolvedValueOnce(apiResult.ok(makeModelCard({ id: "card-C" })));

    const id = ref("card-B");
    const { refresh } = await useModelCard(id);

    id.value = "card-C";
    await nextTick();
    await refresh();

    const paths = apiState.current!.GET.mock.calls.map((c) => c[1]?.params?.path?.id);
    expect(paths).toContain("card-B");
    expect(paths).toContain("card-C");
  });
});
