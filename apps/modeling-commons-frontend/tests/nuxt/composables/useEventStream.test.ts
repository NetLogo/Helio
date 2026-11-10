import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, shallowRef, type EffectScope } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import {
  computeReconnectDelay,
  resolveStreamPath,
  shouldOpenStream,
  STREAM_EVENTS,
  STREAM_RECONNECT_BASE_MS,
  STREAM_RECONNECT_JITTER,
  STREAM_RECONNECT_MAX_MS,
} from "~/components/shared/event-stream";
import { useEventStream } from "~/composables/shared/useEventStream";
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

const currentRoute = shallowRef<RouteLocationNormalizedLoaded>();
const offline = ref(false);

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useConnectionHealth", () => () => ({ isOffline: offline }));
mockNuxtImport("useRouter", (original) => () => {
  const router = (original as typeof useRouter)();
  return { ...router, currentRoute };
});

const resolveRoute = (path: string) =>
  useRouter().resolve(path) as unknown as RouteLocationNormalizedLoaded;
const navigate = async (path: string) => {
  currentRoute.value = resolveRoute(path);
  await nextTick();
};
const streamUrl = (path: string) => `${useRuntimeConfig().public.apiBase}${path}`;

let scope: EffectScope | null = null;

function mountStream() {
  scope = effectScope();
  return scope.run(() => useEventStream())!;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  installFakeEventSource();
  setLoggedIn(true);
  offline.value = false;
  currentRoute.value = resolveRoute("/");
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

describe("resolveStreamPath", () => {
  it.each([
    ["/models/m-1", "/api/v1/events/models/m-1"],
    ["/models/some-slug/m-1", "/api/v1/events/models/m-1"],
    ["/models/m-1/versions/2", "/api/v1/events/models/m-1"],
    ["/models/some-slug/m-1/versions/2", "/api/v1/events/models/m-1"],
    ["/models/m-1/comments/c-9", "/api/v1/events/models/m-1"],
    ["/models/some-slug/m-1/comments/c-9", "/api/v1/events/models/m-1"],
    ["/", "/api/v1/events"],
    ["/models", "/api/v1/events"],
    ["/models/m-1/edit", "/api/v1/events"],
    ["/notifications", "/api/v1/events"],
  ])("maps the real route for %s to %s", (path, expected) => {
    expect(resolveStreamPath(resolveRoute(path))).toBe(expected);
  });

  it.each(["/models/m-1/embed", "/models/some-slug/m-1/embed"])(
    "opens no stream on the embed route %s",
    (path) => {
      expect(resolveStreamPath(resolveRoute(path))).toBeNull();
    },
  );

  it("picks the general stream on a model page once its model stream was refused", () => {
    const refused = { modelStreamRefused: true };
    expect(resolveStreamPath(resolveRoute("/models/m-1"), refused)).toBe("/api/v1/events");
    expect(resolveStreamPath(resolveRoute("/models/m-1/embed"), refused)).toBeNull();
  });
});

describe("shouldOpenStream", () => {
  const open = { path: "/api/v1/events", visible: true, signedIn: true, online: true };

  it("opens only when every gate passes", () => {
    expect(shouldOpenStream(open)).toBe(true);
    expect(shouldOpenStream({ ...open, path: null })).toBe(false);
    expect(shouldOpenStream({ ...open, visible: false })).toBe(false);
    expect(shouldOpenStream({ ...open, signedIn: false })).toBe(false);
    expect(shouldOpenStream({ ...open, online: false })).toBe(false);
  });
});

describe("computeReconnectDelay", () => {
  it("doubles from the base up to the cap with a centred random source", () => {
    const delays = [0, 1, 2, 3, 4, 5, 10].map((attempt) =>
      computeReconnectDelay(attempt, () => 0.5),
    );
    expect(delays).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
  });

  it("stays within the jitter band around the uncapped and the capped step", () => {
    for (const [attempt, step] of [
      [0, STREAM_RECONNECT_BASE_MS],
      [9, STREAM_RECONNECT_MAX_MS],
    ] as const) {
      expect(computeReconnectDelay(attempt, () => 0)).toBe(step * (1 - STREAM_RECONNECT_JITTER));
      const top = computeReconnectDelay(attempt, () => 0.999_999);
      expect(top).toBeLessThan(step * (1 + STREAM_RECONNECT_JITTER));
      expect(top).toBeGreaterThan(step * (1 + STREAM_RECONNECT_JITTER) - 1);
    }
  });
});

describe("useEventStream connection", () => {
  it("opens one credentialed stream to the general route outside a model page", () => {
    const { status } = mountStream();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events"));
    expect(latestEventSource()!.withCredentials).toBe(true);
    expect(status.value).toBe("connecting");

    latestEventSource()!.simulateOpen();
    expect(status.value).toBe("open");
  });

  it("opens the model stream on a model page", async () => {
    await navigate("/models/m-1");
    mountStream();

    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events/models/m-1"));
  });

  it("opens nothing on the embed route", async () => {
    await navigate("/models/m-1/embed");
    const { status } = mountStream();

    expect(FakeEventSource.instances).toHaveLength(0);
    expect(status.value).toBe("closed");
  });

  it("opens nothing while signed out and closes the stream on sign-out", async () => {
    setLoggedIn(false);
    mountStream();
    expect(FakeEventSource.instances).toHaveLength(0);

    setLoggedIn(true);
    await nextTick();
    expect(openEventSources()).toHaveLength(1);

    setLoggedIn(false);
    await nextTick();
    expect(openEventSources()).toHaveLength(0);
  });

  it("swaps the model stream for the general one when leaving the model page, never holding two", async () => {
    await navigate("/models/m-1");
    mountStream();
    const modelStream = latestEventSource()!;

    await navigate("/models/m-1/comments/c-9");
    expect(FakeEventSource.instances).toHaveLength(1);

    await navigate("/");

    expect(modelStream.readyState).toBe(FakeEventSource.CLOSED);
    expect(openEventSources().map((source) => source.url)).toEqual([streamUrl("/api/v1/events")]);
    expect(FakeEventSource.peakOpen).toBe(1);
  });

  it("closes while the tab is hidden and reopens when it is visible", async () => {
    const { status } = mountStream();
    latestEventSource()!.simulateOpen();

    setDocumentVisibility("hidden");
    await nextTick();
    expect(openEventSources()).toHaveLength(0);
    expect(status.value).toBe("closed");

    setDocumentVisibility("visible");
    await nextTick();
    expect(openEventSources()).toHaveLength(1);
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("closes the stream when the last subscriber goes away", () => {
    mountStream();
    scope!.stop();
    scope = null;

    expect(openEventSources()).toHaveLength(0);
  });
});

describe("useEventStream events", () => {
  it("fires resync to every resync handler exactly once per open", async () => {
    const stream = mountStream();
    const first = vi.fn();
    const second = vi.fn();
    const pushed = vi.fn();
    scope!.run(() => {
      stream.on(STREAM_EVENTS.resync, first);
      stream.on(STREAM_EVENTS.resync, second);
      stream.on(STREAM_EVENTS.notifications, pushed);
    });

    latestEventSource()!.simulateOpen();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    setDocumentVisibility("hidden");
    await nextTick();
    setDocumentVisibility("visible");
    await nextTick();
    latestEventSource()!.simulateOpen();

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(pushed).not.toHaveBeenCalled();
  });

  it("routes each pushed event only to its own handlers", () => {
    const stream = mountStream();
    const notifications = vi.fn();
    const comments = vi.fn();
    scope!.run(() => {
      stream.on(STREAM_EVENTS.notifications, notifications);
      stream.on(STREAM_EVENTS.comments, comments);
    });
    latestEventSource()!.simulateOpen();

    latestEventSource()!.simulateEvent(STREAM_EVENTS.comments);

    expect(comments).toHaveBeenCalledTimes(1);
    expect(notifications).not.toHaveBeenCalled();
  });

  it("passes a server-sent resync to the resync handlers", () => {
    const stream = mountStream();
    const resync = vi.fn();
    latestEventSource()!.simulateOpen();
    scope!.run(() => stream.on(STREAM_EVENTS.resync, resync));

    latestEventSource()!.simulateEvent(STREAM_EVENTS.resync);

    expect(resync).toHaveBeenCalledTimes(1);
  });

  it("ignores events from a stream it already replaced", async () => {
    const stream = mountStream();
    const resync = vi.fn();
    scope!.run(() => stream.on(STREAM_EVENTS.resync, resync));
    const stale = latestEventSource()!;

    await navigate("/models/m-1");
    stale.simulateGiveUp();

    expect(stream.status.value).toBe("connecting");
    vi.advanceTimersByTime(STREAM_RECONNECT_MAX_MS * 2);
    expect(FakeEventSource.instances).toHaveLength(2);
  });
});

describe("useEventStream reconnect", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  const giveUpAndWait = (delay: number) => {
    const before = FakeEventSource.instances.length;
    latestEventSource()!.simulateGiveUp();
    vi.advanceTimersByTime(delay - 1);
    expect(FakeEventSource.instances).toHaveLength(before);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(before + 1);
  };

  it("reopens after 5 s, 10 s, 20 s, 40 s, then every 60 s while the browser keeps giving up", () => {
    const { status } = mountStream();

    latestEventSource()!.simulateGiveUp();
    expect(status.value).toBe("closed");
    vi.advanceTimersByTime(STREAM_RECONNECT_BASE_MS);
    expect(status.value).toBe("connecting");

    for (const delay of [10_000, 20_000, 40_000, 60_000, 60_000]) giveUpAndWait(delay);
    expect(FakeEventSource.peakOpen).toBe(1);
  });

  it("starts the sequence over after a stream opens", () => {
    mountStream();
    giveUpAndWait(5_000);
    giveUpAndWait(10_000);

    latestEventSource()!.simulateOpen();

    giveUpAndWait(5_000);
  });

  const modelStreamAttempts = (modelId: string) =>
    FakeEventSource.instances.filter(
      (source) => source.url === streamUrl(`/api/v1/events/models/${modelId}`),
    ).length;

  it("falls back to the general stream for the rest of the route when the model stream is refused", async () => {
    await navigate("/models/m-1");
    mountStream();

    latestEventSource()!.simulateGiveUp();
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events"));

    giveUpAndWait(10_000);
    giveUpAndWait(20_000);
    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events"));
    expect(modelStreamAttempts("m-1")).toBe(1);
    expect(FakeEventSource.peakOpen).toBe(1);
  });

  it("tries the next model's stream after navigating away from a refused one", async () => {
    await navigate("/models/m-1");
    mountStream();
    latestEventSource()!.simulateGiveUp();
    await nextTick();
    latestEventSource()!.simulateOpen();

    await navigate("/models/m-2");

    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events/models/m-2"));
    expect(openEventSources()).toHaveLength(1);
  });

  it("keeps retrying the model stream after one that opened is closed", async () => {
    await navigate("/models/m-1");
    mountStream();
    latestEventSource()!.simulateOpen();

    giveUpAndWait(5_000);
    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events/models/m-1"));
    giveUpAndWait(10_000);
    expect(latestEventSource()!.url).toBe(streamUrl("/api/v1/events/models/m-1"));
  });

  it("leaves a dropped stream to the browser's own retry while it is still connecting", () => {
    const { status } = mountStream();
    latestEventSource()!.simulateOpen();

    latestEventSource()!.simulateDrop();
    vi.advanceTimersByTime(STREAM_RECONNECT_MAX_MS * 2);

    expect(status.value).toBe("connecting");
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("does not reopen while offline and reopens at once when back online", async () => {
    mountStream();
    latestEventSource()!.simulateGiveUp();

    offline.value = true;
    await nextTick();
    vi.advanceTimersByTime(STREAM_RECONNECT_MAX_MS * 2);
    expect(FakeEventSource.instances).toHaveLength(1);

    offline.value = false;
    await nextTick();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(openEventSources()).toHaveLength(1);
  });
});
