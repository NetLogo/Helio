import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useModelInteractions from "~/composables/model/useModelInteractions";

let apiBase: string;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  apiBase = useRuntimeConfig().public.apiBase as string;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useModelInteractions.like / unlike", () => {
  it("POSTs to /api/v1/models/{id}/like with credentials: include", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const interactions = useModelInteractions();
    await interactions.like("model-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/models/model-1/like`);
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("DELETEs the same path on unlike", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const interactions = useModelInteractions();
    await interactions.unlike("model-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/models/model-1/like`);
    expect((init as RequestInit).method).toBe("DELETE");
    expect((init as RequestInit).credentials).toBe("include");
  });
});

describe("useModelInteractions.recordView", () => {
  it("POSTs body { versionNumber } when version is provided", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const interactions = useModelInteractions();
    await interactions.recordView("model-1", 5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${apiBase}/api/v1/models/model-1/views`);
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ versionNumber: 5 });
  });

  it("POSTs body {} when versionNumber is undefined", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const interactions = useModelInteractions();
    await interactions.recordView("model-1");

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({});
  });
});

describe("useModelInteractions failure path", () => {
  it("resolves silently when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const interactions = useModelInteractions();

    await expect(interactions.like("model-1")).resolves.toBeUndefined();
    await expect(interactions.unlike("model-1")).resolves.toBeUndefined();
    await expect(interactions.recordRun("model-1", 2)).resolves.toBeUndefined();
  });
});
