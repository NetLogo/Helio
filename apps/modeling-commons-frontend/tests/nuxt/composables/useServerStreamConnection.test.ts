import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import type { StreamEvent } from "@repo/modeling-commons-shared";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import { useServerStreamConnection } from "~/composables/shared/useServerStreamConnection";
import { useStreamTopic } from "~/composables/shared/useStreamTopic";
import { serverStreamRules } from "~/features/server-stream/rules";
import type { ServerStreamConnection, StreamTopic } from "~/features/server-stream/types";
import {
  FakeEventSource,
  installFakeEventSource,
  latestEventSource,
  openEventSources,
  resetDocumentVisibility,
  setDocumentVisibility,
  setLoggedIn,
  useUserMock,
} from "~~/tests/helpers";
import { makeRecordingApi, type RecordingApi } from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({ apiState: { current: null as RecordingApi | null } }));
const offline = ref(false);

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useConnectionHealth", () => () => ({ isOffline: offline }));

const modelA = { type: "model", id: "m-a" } as const;
const modelB = { type: "model", id: "m-b" } as const;
const userTopic = { type: "user", id: "user-1" } as const;
const commentOn = (topic: typeof modelA | typeof modelB) =>
  ({ topic, event: "model_comment.created" }) as const;

const subscriptionsPath = "/api/v1/events/subscriptions";
const streamUrl = () => `${useRuntimeConfig().public.apiBase}${serverStreamRules.path}`;

let scope: EffectScope | null = null;

const api = () => apiState.current!;
const subscriptionCalls = () =>
  api()
    .requests.filter((request) => request.url.pathname === subscriptionsPath)
    .map((request) => ({
      method: request.method,
      ...(request.body as { connectionId: string; topic: StreamTopic }),
    }));

function answerSubscriptions(statusFor: (topic: StreamTopic) => number = () => 204) {
  api().respondWith((request) => {
    const { topic } = request.body as { topic: StreamTopic };
    return new Response(null, { status: request.method === "POST" ? statusFor(topic) : 204 });
  });
}

function mountConnection(): ServerStreamConnection {
  scope = effectScope();
  return scope.run(() => useServerStreamConnection())!;
}

function subscribe(connection: ServerStreamConnection, topic: StreamTopic) {
  const handler = vi.fn();
  const unsubscribe = scope!.run(() => connection.subscribe(topic, handler))!;
  return { handler, unsubscribe };
}

async function openConnection(connectionId = "conn-1") {
  latestEventSource()!.simulateOpen(connectionId);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  installFakeEventSource();
  apiState.current = makeRecordingApi();
  answerSubscriptions();
  setLoggedIn(true);
  offline.value = false;
});

afterEach(() => {
  scope?.stop();
  scope = null;
  resetDocumentVisibility();
  setLoggedIn(true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useServerStreamConnection stream lifetime", () => {
  it("opens no stream until a topic is held and closes it when the last topic is released", async () => {
    const connection = mountConnection();
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(0);

    const { unsubscribe } = subscribe(connection, modelA);
    await nextTick();
    expect(openEventSources()).toHaveLength(1);
    expect(latestEventSource()!.url).toBe(streamUrl());
    expect(latestEventSource()!.withCredentials).toBe(true);
    expect(connection.status.value).toBe("connecting");

    await openConnection();
    expect(connection.status.value).toBe("open");

    unsubscribe();
    await nextTick();
    expect(openEventSources()).toHaveLength(0);
    expect(connection.status.value).toBe("closed");
  });

  it("opens nothing while signed out and closes on sign-out", async () => {
    setLoggedIn(false);
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(0);

    setLoggedIn(true);
    await nextTick();
    expect(openEventSources()).toHaveLength(1);

    setLoggedIn(false);
    await nextTick();
    expect(openEventSources()).toHaveLength(0);
  });

  it("closes while the tab is hidden and opens a new stream when it is visible", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();
    await openConnection();

    setDocumentVisibility("hidden");
    await nextTick();
    expect(openEventSources()).toHaveLength(0);
    expect(connection.status.value).toBe("closed");

    setDocumentVisibility("visible");
    await nextTick();
    expect(openEventSources()).toHaveLength(1);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("is a no-op with a closed status where EventSource is missing", async () => {
    vi.stubGlobal("EventSource", undefined);
    const connection = mountConnection();
    const { handler, unsubscribe } = subscribe(connection, modelA);
    await flushPromises();

    expect(connection.status.value).toBe("closed");
    expect(api().requests).toHaveLength(0);
    unsubscribe();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("useServerStreamConnection subscriptions", () => {
  it("types a handler's signal by its topic type and refuses an undeclared topic type", () => {
    const connection = mountConnection();
    scope!.run(() => {
      connection.subscribe(modelA, (signal) => {
        expectTypeOf(signal).toEqualTypeOf<StreamEvent<"model"> | "live" | "resync">();
      });
      // @ts-expect-error "project" is not a StreamTopic type in the shared package
      connection.subscribe({ type: "project", id: "p-1" }, () => {});
    });
  });

  it("sends one POST for two handlers of one topic and the DELETE only after the last leaves", async () => {
    const connection = mountConnection();
    subscribe(connection, userTopic);
    const first = subscribe(connection, modelA);
    const second = subscribe(connection, modelA);
    await nextTick();
    await openConnection("conn-1");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));

    first.unsubscribe();
    await flushPromises();
    expect(subscriptionCalls()).toHaveLength(2);

    second.unsubscribe();
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(3));

    expect(subscriptionCalls()).toEqual([
      { method: "POST", connectionId: "conn-1", topic: userTopic },
      { method: "POST", connectionId: "conn-1", topic: modelA },
      { method: "DELETE", connectionId: "conn-1", topic: modelA },
    ]);
  });

  it("posts a topic held after the connection opened at once", async () => {
    const connection = mountConnection();
    subscribe(connection, userTopic);
    await nextTick();
    await openConnection("conn-1");

    subscribe(connection, modelA);
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));

    expect(subscriptionCalls()[1]).toEqual({
      method: "POST",
      connectionId: "conn-1",
      topic: modelA,
    });
  });

  it("calls onChange with live once the POST returns, then on each event for its topic only", async () => {
    const connection = mountConnection();
    const a = subscribe(connection, modelA);
    const b = subscribe(connection, modelB);
    await nextTick();
    await openConnection();
    await vi.waitFor(() => expect(b.handler).toHaveBeenCalledTimes(1));

    expect(a.handler.mock.calls).toEqual([["live"]]);
    latestEventSource()!.simulateMessage(commentOn(modelA));

    expect(a.handler.mock.calls).toEqual([["live"], ["model_comment.created"]]);
    expect(b.handler.mock.calls).toEqual([["live"]]);
  });

  it("sends resync to every held topic", async () => {
    const connection = mountConnection();
    const a = subscribe(connection, modelA);
    const user = subscribe(connection, userTopic);
    await nextTick();
    await openConnection();
    await vi.waitFor(() => expect(user.handler).toHaveBeenCalledTimes(1));

    latestEventSource()!.simulateMessage({ event: "resync" });

    expect(a.handler).toHaveBeenLastCalledWith("resync");
    expect(user.handler).toHaveBeenLastCalledWith("resync");
  });

  it("sends an unsubscribe followed at once by a subscribe in that order", async () => {
    const connection = mountConnection();
    subscribe(connection, userTopic);
    const first = subscribe(connection, modelA);
    await nextTick();
    await openConnection("conn-1");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));
    let releaseDelete = () => {};
    api().respondWith((request) =>
      request.method === "DELETE"
        ? new Promise(
            (resolve) => (releaseDelete = () => resolve(new Response(null, { status: 204 }))),
          )
        : new Response(null, { status: 204 }),
    );

    first.unsubscribe();
    subscribe(connection, modelA);
    await flushPromises();
    expect(subscriptionCalls().map((call) => call.method)).toEqual(["POST", "POST", "DELETE"]);

    releaseDelete();
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(4));
    expect(subscriptionCalls().slice(2)).toEqual([
      { method: "DELETE", connectionId: "conn-1", topic: modelA },
      { method: "POST", connectionId: "conn-1", topic: modelA },
    ]);
  });

  it.each([403, 404])(
    "leaves a topic refused with %i without live and without a retry, and keeps the others working",
    async (status) => {
      answerSubscriptions((topic) => (topic.id === modelA.id ? status : 204));
      const connection = mountConnection();
      const refused = subscribe(connection, modelA);
      const allowed = subscribe(connection, modelB);
      await nextTick();
      await openConnection();
      await vi.waitFor(() => expect(allowed.handler).toHaveBeenCalledWith("live"));
      await vi.advanceTimersByTimeAsync(serverStreamRules.reconnectMaxMs * 2);
      latestEventSource()!.simulateMessage(commentOn(modelB));

      expect(subscriptionCalls()).toHaveLength(2);
      expect(refused.handler).not.toHaveBeenCalled();
      expect(allowed.handler).toHaveBeenLastCalledWith("model_comment.created");
    },
  );

  it("swaps the model topic on one open stream when the page moves to another model", async () => {
    const modelId = ref<string>(modelA.id);
    const connection = mountConnection();
    scope!.run(() => {
      useStreamTopic(userTopic, () => {});
      useStreamTopic(
        () => ({ type: "model", id: modelId.value }),
        () => {},
      );
    });
    await nextTick();
    await openConnection("conn-1");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));

    modelId.value = modelB.id;
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(4));

    expect(subscriptionCalls().slice(2)).toEqual([
      { method: "DELETE", connectionId: "conn-1", topic: modelA },
      { method: "POST", connectionId: "conn-1", topic: modelB },
    ]);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(connection.status.value).toBe("open");
  });
});

describe("useServerStreamConnection reconnect", () => {
  it("requests every held topic again with the new connection id after the browser reconnects", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    subscribe(connection, userTopic);
    await nextTick();
    await openConnection("conn-1");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));

    latestEventSource()!.simulateDrop();
    subscribe(connection, modelB);
    await flushPromises();
    expect(subscriptionCalls()).toHaveLength(2);

    latestEventSource()!.simulateOpen("conn-2");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(5));

    expect(subscriptionCalls().slice(2)).toEqual([
      { method: "POST", connectionId: "conn-2", topic: modelA },
      { method: "POST", connectionId: "conn-2", topic: userTopic },
      { method: "POST", connectionId: "conn-2", topic: modelB },
    ]);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("drops requests queued for a connection that was lost before they went out", async () => {
    let releaseFirst = () => {};
    api().respondWith(
      () =>
        new Promise(
          (resolve) => (releaseFirst = () => resolve(new Response(null, { status: 204 }))),
        ),
    );
    const connection = mountConnection();
    subscribe(connection, modelA);
    subscribe(connection, modelB);
    await nextTick();
    await openConnection("conn-1");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(1));

    latestEventSource()!.simulateDrop();
    answerSubscriptions();
    releaseFirst();
    await flushPromises();
    latestEventSource()!.simulateOpen("conn-2");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(3));

    expect(subscriptionCalls().map((call) => call.connectionId)).toEqual([
      "conn-1",
      "conn-2",
      "conn-2",
    ]);
  });

  it("opens a new stream after the browser gives up and subscribes there with its connection id", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();
    await openConnection("conn-1");

    latestEventSource()!.simulateGiveUp();
    expect(connection.status.value).toBe("closed");
    await vi.advanceTimersByTimeAsync(serverStreamRules.reconnectBaseMs);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.peakOpen).toBe(1);

    await openConnection("conn-2");
    await vi.waitFor(() => expect(subscriptionCalls()).toHaveLength(2));
    expect(subscriptionCalls()[1]).toEqual({
      method: "POST",
      connectionId: "conn-2",
      topic: modelA,
    });
  });

  it("backs off 5 s, 10 s, 20 s while the browser keeps giving up and starts over after a connection", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();

    const giveUpAndWait = async (delay: number) => {
      const before = FakeEventSource.instances.length;
      latestEventSource()!.simulateGiveUp();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeEventSource.instances).toHaveLength(before);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeEventSource.instances).toHaveLength(before + 1);
    };

    await giveUpAndWait(5_000);
    await giveUpAndWait(10_000);
    await giveUpAndWait(20_000);
    await openConnection();
    await giveUpAndWait(5_000);
  });

  it("does not reopen while offline and reopens at once when back online", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();
    latestEventSource()!.simulateGiveUp();

    offline.value = true;
    await nextTick();
    await vi.advanceTimersByTimeAsync(serverStreamRules.reconnectMaxMs * 2);
    expect(FakeEventSource.instances).toHaveLength(1);

    offline.value = false;
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(openEventSources()).toHaveLength(1);
  });

  it("ignores messages from a stream it already replaced", async () => {
    const connection = mountConnection();
    const { handler } = subscribe(connection, modelA);
    await nextTick();
    const stale = latestEventSource()!;
    setDocumentVisibility("hidden");
    await nextTick();
    setDocumentVisibility("visible");
    await nextTick();

    stale.simulateOpen("conn-stale");
    stale.simulateMessage(commentOn(modelA));
    await flushPromises();

    expect(handler).not.toHaveBeenCalled();
    expect(subscriptionCalls()).toHaveLength(0);
  });
});
