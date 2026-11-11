import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { cancelSubscription, requestSubscription } from "~/features/server-stream/api";
import { createDirectConnection } from "~/features/server-stream/direct-connection";
import { classifySubscriptionResponse } from "~/features/server-stream/reconnect";
import { serverStreamRules } from "~/features/server-stream/rules";
import type { StreamTopic } from "~/features/server-stream/types";

vi.mock("~/features/server-stream/api", () => ({
  requestSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
}));

class FakeEventSource {
  static readonly CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readyState = 0;
  private listeners = new Map<string, ((event: { data?: string }) => void)[]>();

  constructor() {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data?: string }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(data: object) {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data: JSON.stringify(data) });
    }
  }

  drop() {
    this.readyState = FakeEventSource.CLOSED;
    for (const listener of this.listeners.get("error") ?? []) listener({});
  }
}

const topic: StreamTopic = { type: "model", id: "m-1" };
const request = vi.mocked(requestSubscription);

async function connect() {
  const connection = createDirectConnection({ url: "/events", allowed: ref(true) });
  const onChange = vi.fn();
  const unsubscribe = connection.subscribe(topic, onChange);
  await nextTick();
  const source = FakeEventSource.instances.at(-1)!;
  source.emit({ event: "connection", connectionId: "c-1" });
  return { connection, onChange, unsubscribe, source };
}

async function waitForRetryWindow() {
  await vi.advanceTimersByTimeAsync(serverStreamRules.subscriptionRetryMs);
}

describe("classifySubscriptionResponse", () => {
  it.each([
    [200, "live"],
    [204, "live"],
    [null, "retry"],
    [429, "retry"],
    [500, "retry"],
    [503, "retry"],
    [400, "drop"],
    [403, "drop"],
    [404, "drop"],
  ] as const)("maps %s to %s", (status, outcome) => {
    expect(classifySubscriptionResponse(status)).toBe(outcome);
  });
});

describe("createDirectConnection subscription retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.instances = [];
    request.mockReset();
    vi.mocked(cancelSubscription).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ["a 5xx answer", () => request.mockResolvedValueOnce(503)],
    ["a 429 answer", () => request.mockResolvedValueOnce(429)],
    ["a network error", () => request.mockRejectedValueOnce(new TypeError("fetch failed"))],
  ])("retries once after %s and reports live", async (_, failFirst) => {
    failFirst();
    request.mockResolvedValue(200);
    const { onChange } = await connect();

    await vi.advanceTimersByTimeAsync(serverStreamRules.subscriptionRetryMs - 1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalledWith("live");

    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith("c-1", topic);
    expect(onChange).toHaveBeenCalledWith("live");
  });

  it("retries every topic that failed when the connection opened", async () => {
    const other: StreamTopic = { type: "model", id: "m-2" };
    request.mockResolvedValueOnce(500).mockResolvedValueOnce(500).mockResolvedValue(200);
    const connection = createDirectConnection({ url: "/events", allowed: ref(true) });
    connection.subscribe(topic, vi.fn());
    connection.subscribe(other, vi.fn());
    await nextTick();
    FakeEventSource.instances.at(-1)!.emit({ event: "connection", connectionId: "c-1" });

    await waitForRetryWindow();

    expect(request.mock.calls).toEqual([
      ["c-1", topic],
      ["c-1", other],
      ["c-1", topic],
      ["c-1", other],
    ]);
  });

  it("does not retry a 403", async () => {
    request.mockResolvedValue(403);
    const { onChange } = await connect();

    await waitForRetryWindow();
    await waitForRetryWindow();
    expect(request).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("gives up after the single retry fails", async () => {
    request.mockResolvedValue(500);
    await connect();

    await waitForRetryWindow();
    await waitForRetryWindow();
    await waitForRetryWindow();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("skips the retry when the connection id changed", async () => {
    request.mockResolvedValueOnce(500).mockResolvedValue(200);
    const { source } = await connect();
    await vi.advanceTimersByTimeAsync(0);

    source.emit({ event: "connection", connectionId: "c-2" });
    await waitForRetryWindow();

    expect(request.mock.calls).toEqual([
      ["c-1", topic],
      ["c-2", topic],
    ]);
  });

  it("skips the retry when the stream dropped", async () => {
    request.mockResolvedValue(500);
    const { source } = await connect();
    await vi.advanceTimersByTimeAsync(0);

    source.drop();
    await waitForRetryWindow();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("skips the retry when the topic was unsubscribed", async () => {
    request.mockResolvedValue(500);
    const { connection, unsubscribe } = await connect();
    connection.subscribe({ type: "model", id: "m-2" }, vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    request.mockClear();

    unsubscribe();
    await waitForRetryWindow();

    expect(request).not.toHaveBeenCalledWith("c-1", topic);
  });
});
