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

const streamUrl = (...topics: Array<StreamTopic>) =>
  `${useRuntimeConfig().public.apiBase}${serverStreamRules.path}?topics=${topics
    .map((topic) => `${topic.type}:${topic.id}`)
    .join(",")}`;

let scope: EffectScope | null = null;

const api = () => apiState.current!;
function mountConnection(): ServerStreamConnection {
  scope = effectScope();
  return scope.run(() => useServerStreamConnection())!;
}

function subscribe(connection: ServerStreamConnection, topic: StreamTopic) {
  const handler = vi.fn();
  const unsubscribe = scope!.run(() => connection.subscribe(topic, handler))!;
  return { handler, unsubscribe };
}

async function openConnection() {
  latestEventSource()!.simulateOpen();
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  installFakeEventSource();
  apiState.current = makeRecordingApi();
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
    expect(latestEventSource()!.url).toBe(streamUrl(modelA));
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

describe("useServerStreamConnection topics", () => {
  it("types a handler's signal by its topic type and refuses an undeclared topic type", () => {
    const connection = mountConnection();
    scope!.run(() => {
      connection.subscribe(modelA, (signal) => {
        expectTypeOf(signal).toEqualTypeOf<StreamEvent<"model"> | "resync">();
      });
      // @ts-expect-error "project" is not a StreamTopic type in the shared package
      connection.subscribe({ type: "project", id: "p-1" }, () => {});
    });
  });

  it("puts every held topic in one stream URL and sends no subscription request", async () => {
    const connection = mountConnection();
    subscribe(connection, userTopic);
    subscribe(connection, modelA);
    subscribe(connection, modelA);
    await nextTick();

    expect(openEventSources()).toHaveLength(1);
    expect(latestEventSource()!.url).toBe(streamUrl(modelA, userTopic));
    expect(api().requests).toHaveLength(0);
  });

  it("keeps the stream while a second handler of a topic still holds it", async () => {
    const connection = mountConnection();
    const first = subscribe(connection, modelA);
    subscribe(connection, modelA);
    await nextTick();

    first.unsubscribe();
    await nextTick();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(openEventSources()).toHaveLength(1);
  });

  it("sends resync to every held topic once the stream opens, then each event to its topic only", async () => {
    const connection = mountConnection();
    const a = subscribe(connection, modelA);
    const b = subscribe(connection, modelB);
    await nextTick();
    await openConnection();

    expect(a.handler.mock.calls).toEqual([["resync"]]);
    expect(b.handler.mock.calls).toEqual([["resync"]]);
    latestEventSource()!.simulateMessage(commentOn(modelA));

    expect(a.handler.mock.calls).toEqual([["resync"], ["model_comment.created"]]);
    expect(b.handler.mock.calls).toEqual([["resync"]]);
  });

  it("sends a resync message to every held topic", async () => {
    const connection = mountConnection();
    const a = subscribe(connection, modelA);
    const user = subscribe(connection, userTopic);
    await nextTick();
    await openConnection();

    latestEventSource()!.simulateMessage({ event: "resync" });

    expect(a.handler.mock.calls).toEqual([["resync"], ["resync"]]);
    expect(user.handler.mock.calls).toEqual([["resync"], ["resync"]]);
  });

  it("reopens the stream with the new model when the page moves to another model", async () => {
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
    await openConnection();

    modelId.value = modelB.id;
    await nextTick();

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(openEventSources()).toHaveLength(1);
    expect(latestEventSource()!.url).toBe(streamUrl(modelB, userTopic));
    expect(connection.status.value).toBe("connecting");
  });
});

describe("useServerStreamConnection reconnect", () => {
  it("leaves reconnecting to the browser and resyncs every held topic on each open", async () => {
    const connection = mountConnection();
    const { handler } = subscribe(connection, modelA);
    await nextTick();
    await openConnection();

    latestEventSource()!.simulateDrop();
    expect(connection.status.value).toBe("connecting");
    await openConnection();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(connection.status.value).toBe("open");
    expect(handler.mock.calls).toEqual([["resync"], ["resync"]]);
  });

  it("stays closed with no timer after the browser gives up, and opens again when allowed again", async () => {
    const connection = mountConnection();
    subscribe(connection, modelA);
    await nextTick();
    latestEventSource()!.simulateGiveUp();

    expect(connection.status.value).toBe("closed");
    expect(vi.getTimerCount()).toBe(0);
    expect(FakeEventSource.instances).toHaveLength(1);

    offline.value = true;
    await nextTick();
    offline.value = false;
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(openEventSources()).toHaveLength(1);
  });

  it("ignores events from a stream it already replaced", async () => {
    const connection = mountConnection();
    const { handler } = subscribe(connection, modelA);
    await nextTick();
    const stale = latestEventSource()!;
    setDocumentVisibility("hidden");
    await nextTick();
    setDocumentVisibility("visible");
    await nextTick();

    stale.simulateOpen();
    stale.simulateMessage(commentOn(modelA));
    await flushPromises();

    expect(handler).not.toHaveBeenCalled();
    expect(connection.status.value).toBe("connecting");
  });
});
