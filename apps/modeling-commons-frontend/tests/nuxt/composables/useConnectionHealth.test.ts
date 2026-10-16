import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
  backoffDelay,
  connectionMiddleware,
  isNetworkError,
  useConnectionHealth,
} from "~/composables/shared/useConnectionHealth";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("~/composables/api/useApi", () => ({
  useApi: () => ({ GET: getMock }),
}));

const request = { request: new Request("http://api.test/x"), options: {}, schemaPath: "/x" };
const middlewareParams = {
  ...request,
  params: {},
  id: "test",
} as unknown as Parameters<NonNullable<typeof connectionMiddleware.onResponse>>[0];

async function settle(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function markOffline(): Promise<void> {
  getMock.mockRejectedValue(new TypeError("Failed to fetch"));
  await connectionMiddleware.onError?.({
    ...middlewareParams,
    error: new TypeError("Failed to fetch"),
  });
  await settle();
}

beforeEach(async () => {
  getMock.mockReset();
  await connectionMiddleware.onResponse?.({ ...middlewareParams, response: new Response("ok") });
  await settle();
});

describe("isNetworkError", () => {
  it("is true for the TypeError fetch throws on a transport failure", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("is false for aborts, HTTP responses and plain errors", () => {
    expect(isNetworkError(new DOMException("aborted", "AbortError"))).toBe(false);
    expect(isNetworkError(new Response(null, { status: 503 }))).toBe(false);
    expect(isNetworkError(new Error("boom"))).toBe(false);
  });
});

describe("backoffDelay", () => {
  it("doubles from the base and caps, with at most 25% jitter either way", () => {
    for (const [attempt, base] of [
      [0, 5_000],
      [1, 10_000],
      [3, 40_000],
      [4, 60_000],
      [10, 60_000],
    ] as const) {
      expect(backoffDelay(attempt, () => 0)).toBe(base * 0.75);
      expect(backoffDelay(attempt, () => 0.5)).toBe(base);
      expect(backoffDelay(attempt, () => 1)).toBe(base * 1.25);
    }
  });
});

describe("connectionMiddleware", () => {
  it("flips to offline on a transport failure and back on any response", async () => {
    const { isOffline } = useConnectionHealth();
    expect(isOffline.value).toBe(false);

    await markOffline();
    expect(isOffline.value).toBe(true);

    await connectionMiddleware.onResponse?.({
      ...middlewareParams,
      response: new Response(null, { status: 503 }),
    });
    await nextTick();
    expect(isOffline.value).toBe(false);
  });

  it("ignores errors that are not transport failures", async () => {
    const { isOffline } = useConnectionHealth();
    await connectionMiddleware.onError?.({ ...middlewareParams, error: new Error("parse") });
    await nextTick();
    expect(isOffline.value).toBe(false);
  });
});

describe("checkNow", () => {
  it("treats any answer from the health route as reachable, even a 503", async () => {
    const { isOffline, checkNow, lastCheckedAt } = useConnectionHealth();
    await markOffline();
    getMock.mockResolvedValue({ response: new Response(null, { status: 503 }), error: {} });

    await expect(checkNow()).resolves.toBe(true);
    expect(isOffline.value).toBe(false);
    expect(lastCheckedAt.value).not.toBeNull();
  });

  it("marks offline when the health request throws", async () => {
    const { isOffline, checkNow } = useConnectionHealth();
    getMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(checkNow()).resolves.toBe(false);
    expect(isOffline.value).toBe(true);
  });

  it("shares one in-flight request", async () => {
    const { checkNow } = useConnectionHealth();
    getMock.mockResolvedValue({ response: new Response("ok") });

    await Promise.all([checkNow(), checkNow()]);
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
