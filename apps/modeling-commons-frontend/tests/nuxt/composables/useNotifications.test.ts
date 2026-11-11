import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, toValue, type EffectScope, type MaybeRefOrGetter, type Ref } from "vue";
import {
  MAX_BACKOFF_FACTOR,
  MIN_POLL_GAP_MS,
  NOTIFICATION_PAGINATION_KEY,
  NOTIFICATION_STATE_KEYS,
  POLL_INTERVAL_ACTIVE_MS,
  POLL_SINCE_OVERLAP_MS,
  resetNotificationState,
} from "~/components/notifications/shared";
import type { UserNotification } from "~/features/notifications/types";
import { STREAM_EVENTS } from "~/components/shared/event-stream";
import useApiPagination, { DEFAULT_INITIAL_PAGE } from "~/composables/api/useApiPagination";
import { useNotifications } from "~/composables/notifications/useNotifications";
import {
  installFakeEventSource,
  latestEventSource,
  setLoggedIn,
  useToastMock,
  useUserMock,
  toastAddMock,
} from "~~/tests/helpers";
import {
  jsonResponse,
  makeNotification,
  makeNotificationPage,
  makeRecordingApi,
  type RecordingApi,
} from "~~/tests/helpers/notifications";

const { apiState, poller } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
  poller: {
    run: null as null | (() => Promise<void> | void),
    interval: null as null | Ref<number>,
    enabled: undefined as MaybeRefOrGetter<boolean> | undefined,
  },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useToast", () => () => useToastMock());
mockNuxtImport("useConnectionHealth", () => () => ({ isOffline: ref(false) }));
mockNuxtImport(
  "useActivePoll",
  () =>
    (
      run: () => Promise<void>,
      interval: Ref<number>,
      opts: { enabled?: MaybeRefOrGetter<boolean> } = {},
    ) => {
      poller.run = run;
      poller.interval = interval;
      poller.enabled = opts.enabled;
      return { isActive: ref(false), pause: () => {} };
    },
);

let scope: EffectScope | null = null;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-28T12:00:00.000Z"));
  apiState.current = makeRecordingApi();
  toastAddMock.mockClear();
});

afterEach(() => {
  scope?.stop();
  scope = null;
  resetNotificationState();
  setLoggedIn(true);
  vi.useRealTimers();
});

const api = () => apiState.current!;
const lastRequest = () => api().requests.at(-1)!;
const lastQuery = () => Object.fromEntries(lastRequest().url.searchParams);

async function mountWith(page: ReturnType<typeof makeNotificationPage>) {
  api().respondWith(() => jsonResponse(page));
  scope = effectScope();
  const state = scope.run(() => useNotifications())!;
  await vi.waitFor(() => expect(api().requests).toHaveLength(1));
  await flushPromises();
  return state;
}

async function pollWith(response: Response) {
  vi.setSystemTime(Date.now() + MIN_POLL_GAP_MS + 1);
  api().respondWith(() => response);
  await poller.run!();
  await flushPromises();
}

const ids = (list: UserNotification[]) => list.map((n) => n.id);
const shiftBack = (iso: string) =>
  new Date(new Date(iso).getTime() - POLL_SINCE_OVERLAP_MS).toISOString();

describe("useNotifications polling cursor", () => {
  it("polls with only the limit before any notification was seen", async () => {
    await mountWith(makeNotificationPage([]));

    await pollWith(jsonResponse(makeNotificationPage([])));

    expect(lastQuery()).toEqual({ limit: "100" });
  });

  it("polls with since set to the newest createdAt seen minus the overlap, as an ISO string", async () => {
    await mountWith(
      makeNotificationPage([
        makeNotification({ id: "a", createdAt: "2026-10-01T12:00:00.000Z" }),
        makeNotification({ id: "b", createdAt: "2026-10-02T08:30:00.000Z" }),
      ]),
    );

    await pollWith(
      jsonResponse(
        makeNotificationPage([
          makeNotification({ id: "c", createdAt: "2026-10-03T09:15:00.000Z" }),
        ]),
      ),
    );
    expect(lastQuery().since).toBe(shiftBack("2026-10-02T08:30:00.000Z"));

    await pollWith(jsonResponse(makeNotificationPage([])));
    expect(lastQuery()).toEqual({ since: shiftBack("2026-10-03T09:15:00.000Z"), limit: "100" });
  });

  it("picks up a row committed late with a createdAt just behind the newest seen", async () => {
    const newest = "2026-10-02T08:30:00.000Z";
    const lateCreatedAt = "2026-10-02T08:29:58.000Z";
    const { notifications } = await mountWith(
      makeNotificationPage([makeNotification({ id: "newest", createdAt: newest })]),
    );
    const late = makeNotification({ id: "late", createdAt: lateCreatedAt });
    api().respondWith((request) => {
      const since = request.url.searchParams.get("since")!;
      const rows = [late].filter((n) => n.createdAt >= since);
      return jsonResponse(makeNotificationPage(rows));
    });

    vi.setSystemTime(Date.now() + MIN_POLL_GAP_MS + 1);
    await poller.run!();
    await flushPromises();

    expect(ids(notifications.value)).toEqual(["newest", "late"]);
  });
});

describe("useNotifications poll backoff", () => {
  it("doubles the interval per failure up to the cap and resets on success", async () => {
    await mountWith(makeNotificationPage([]));
    expect(poller.interval!.value).toBe(POLL_INTERVAL_ACTIVE_MS);

    await pollWith(jsonResponse({ message: "boom" }, 500));
    expect(poller.interval!.value).toBe(POLL_INTERVAL_ACTIVE_MS * 2);

    for (let i = 0; i < 5; i++) await pollWith(jsonResponse({ message: "boom" }, 500));
    expect(poller.interval!.value).toBe(POLL_INTERVAL_ACTIVE_MS * MAX_BACKOFF_FACTOR);

    await pollWith(jsonResponse(makeNotificationPage([])));
    expect(poller.interval!.value).toBe(POLL_INTERVAL_ACTIVE_MS);
  });

  it("exposes the poll failure and clears it after a success", async () => {
    const { pollError } = await mountWith(makeNotificationPage([]));

    await pollWith(jsonResponse({ message: "boom" }, 500));
    expect(pollError.value).toBeTruthy();

    await pollWith(jsonResponse(makeNotificationPage([])));
    expect(pollError.value).toBeNull();
  });
});

describe("useNotifications poll while signed out", () => {
  it("sends nothing and leaves state untouched, then polls once signed in", async () => {
    const { notifications, unreadCount, lastPolled, pollError } = await mountWith(
      makeNotificationPage([makeNotification({ id: "a", createdAt: "2026-10-01T12:00:00.000Z" })], {
        unreadCount: 2,
      }),
    );
    const before = {
      notifications: notifications.value,
      unreadCount: unreadCount.value,
      lastPolled: lastPolled.value,
    };

    setLoggedIn(false);
    await pollWith(
      jsonResponse(
        makeNotificationPage(
          [makeNotification({ id: "b", createdAt: "2026-10-02T12:00:00.000Z" })],
          { unreadCount: 7 },
        ),
      ),
    );

    expect(api().requests).toHaveLength(1);
    expect(notifications.value).toBe(before.notifications);
    expect(unreadCount.value).toBe(before.unreadCount);
    expect(lastPolled.value).toBe(before.lastPolled);
    expect(pollError.value).toBeNull();

    setLoggedIn(true);
    await pollWith(
      jsonResponse(
        makeNotificationPage(
          [makeNotification({ id: "b", createdAt: "2026-10-02T12:00:00.000Z" })],
          { unreadCount: 7 },
        ),
      ),
    );

    expect(api().requests).toHaveLength(2);
    expect(unreadCount.value).toBe(7);
    expect(ids(notifications.value)).toEqual(["b", "a"]);
  });
});

describe("useNotifications aggregation", () => {
  it("dedupes by id with the incoming copy winning and orders newest first", async () => {
    const { notifications } = await mountWith(
      makeNotificationPage([
        makeNotification({ id: "a", title: "old", createdAt: "2026-10-01T12:00:00.000Z" }),
        makeNotification({ id: "b", createdAt: "2026-10-02T12:00:00.000Z" }),
      ]),
    );
    expect(ids(notifications.value)).toEqual(["b", "a"]);

    await pollWith(
      jsonResponse(
        makeNotificationPage([
          makeNotification({ id: "a", title: "edited", createdAt: "2026-10-01T12:00:00.000Z" }),
          makeNotification({ id: "c", createdAt: "2026-10-03T12:00:00.000Z" }),
        ]),
      ),
    );

    expect(ids(notifications.value)).toEqual(["c", "b", "a"]);
    expect(notifications.value.find((n) => n.id === "a")?.title).toBe("edited");
  });

  it("keeps one copy of a seen row that the poll overlap window returns again", async () => {
    const newest = makeNotification({ id: "newest", createdAt: "2026-10-02T08:30:00.000Z" });
    const seen = makeNotification({ id: "seen", createdAt: "2026-10-02T08:29:59.000Z" });
    const { notifications } = await mountWith(makeNotificationPage([newest, seen]));
    const returned: string[] = [];
    api().respondWith((request) => {
      const since = request.url.searchParams.get("since")!;
      const rows = [newest, seen].filter((n) => n.createdAt >= since);
      returned.push(...ids(rows));
      return jsonResponse(makeNotificationPage(rows));
    });

    vi.setSystemTime(Date.now() + MIN_POLL_GAP_MS + 1);
    await poller.run!();
    await flushPromises();

    expect(returned).toContain("seen");
    expect(ids(notifications.value)).toEqual(["newest", "seen"]);
  });

  describe("poll returning rows", () => {
    const older = makeNotification({ id: "older", createdAt: "2026-10-01T12:00:00.000Z" });
    const newer = makeNotification({ id: "newer", createdAt: "2026-10-02T12:00:00.000Z" });

    it("leaves the list reference and order untouched when every row was already seen", async () => {
      const { notifications } = await mountWith(makeNotificationPage([older, newer]));
      const before = notifications.value;

      await pollWith(jsonResponse(makeNotificationPage([older, newer])));

      expect(notifications.value).toBe(before);
      expect(ids(notifications.value)).toEqual(["newer", "older"]);
    });

    it("replaces the list when a seen row comes back with a changed readAt", async () => {
      const { notifications } = await mountWith(makeNotificationPage([older, newer]));
      const before = notifications.value;
      const readAt = "2026-10-03T12:00:00.000Z";

      await pollWith(jsonResponse(makeNotificationPage([{ ...older, readAt }, newer])));

      expect(notifications.value).not.toBe(before);
      expect(notifications.value.find((n) => n.id === "older")?.readAt).toBe(readAt);
    });

    it("replaces the list when a row has an unseen id", async () => {
      const { notifications } = await mountWith(makeNotificationPage([older, newer]));
      const before = notifications.value;
      const fresh = makeNotification({ id: "fresh", createdAt: "2026-10-03T12:00:00.000Z" });

      await pollWith(jsonResponse(makeNotificationPage([older, fresh])));

      expect(notifications.value).not.toBe(before);
      expect(ids(notifications.value)).toEqual(["fresh", "newer", "older"]);
    });
  });

  it("takes unreadCount from the server on fetch and on poll", async () => {
    const { unreadCount } = await mountWith(
      makeNotificationPage([makeNotification()], { unreadCount: 7 }),
    );
    expect(unreadCount.value).toBe(7);

    await pollWith(jsonResponse(makeNotificationPage([], { unreadCount: 2 })));
    expect(unreadCount.value).toBe(2);
  });
});

describe("useNotifications markRead", () => {
  it("marks the item read and decrements the count once per item", async () => {
    const { notifications, unreadCount, markRead } = await mountWith(
      makeNotificationPage([makeNotification({ id: "a" })], { unreadCount: 3 }),
    );
    api().respondWith(() => new Response(null, { status: 204 }));

    await markRead("a");
    expect(unreadCount.value).toBe(2);
    expect(notifications.value[0]!.readAt).not.toBeNull();
    expect(lastRequest().method).toBe("PATCH");
    expect(lastRequest().url.pathname).toBe("/api/v1/me/notifications/a/read");

    await markRead("a");
    expect(unreadCount.value).toBe(2);
    expect(api().requests.filter((r) => r.method === "PATCH")).toHaveLength(1);
  });

  it("refetches page 0 under the unread-only filter after a successful mark-read", async () => {
    const page = makeNotificationPage([makeNotification({ id: "a" })]);
    const { markRead, setUnreadOnly } = await mountWith(page);
    setUnreadOnly(true);
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    await flushPromises();
    api().respondWith((request) =>
      request.method === "PATCH" ? new Response(null, { status: 204 }) : jsonResponse(page),
    );

    await markRead("a");
    await vi.waitFor(() => expect(api().requests).toHaveLength(4));

    expect(api().requests[2]!.method).toBe("PATCH");
    expect(lastRequest().method).toBe("GET");
    expect(lastQuery()).toEqual({ page: "0", limit: "20", unreadOnly: "true" });
  });

  it("does not refetch after a successful mark-read when the filter is off", async () => {
    const { markRead } = await mountWith(makeNotificationPage([makeNotification({ id: "a" })]));
    api().respondWith(() => new Response(null, { status: 204 }));

    await markRead("a");
    await flushPromises();

    expect(api().requests.map((r) => r.method)).toEqual(["GET", "PATCH"]);
  });

  it("keeps the item read when a poll fetched before the mark-read resolves with it unread", async () => {
    const row = makeNotification({ id: "a" });
    const { notifications, markRead } = await mountWith(makeNotificationPage([row]));
    let resolvePoll!: (response: Response) => void;
    const deferredPoll = new Promise<Response>((resolve) => (resolvePoll = resolve));
    api().respondWith((request) =>
      request.method === "PATCH" ? new Response(null, { status: 204 }) : deferredPoll,
    );
    vi.setSystemTime(Date.now() + MIN_POLL_GAP_MS + 1);

    const inFlight = poller.run!();
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    await markRead("a");
    const afterMarkRead = notifications.value;
    const localReadAt = afterMarkRead[0]!.readAt;
    resolvePoll(jsonResponse(makeNotificationPage([row])));
    await inFlight;
    await flushPromises();

    expect(localReadAt).not.toBeNull();
    expect(notifications.value[0]!.readAt).toBe(localReadAt);
    expect(notifications.value).toBe(afterMarkRead);
  });

  it("takes a server readAt newer than the local one", async () => {
    const row = makeNotification({ id: "a" });
    const { notifications, markRead } = await mountWith(makeNotificationPage([row]));
    api().respondWith(() => new Response(null, { status: 204 }));
    await markRead("a");
    const serverReadAt = new Date(Date.now() + 60_000).toISOString();

    await pollWith(jsonResponse(makeNotificationPage([{ ...row, readAt: serverReadAt }])));

    expect(notifications.value[0]!.readAt).toBe(serverReadAt);
  });

  it("keeps the item unread and the count unchanged when the PATCH fails", async () => {
    const { notifications, unreadCount, markRead } = await mountWith(
      makeNotificationPage([makeNotification({ id: "a" })], { unreadCount: 3 }),
    );
    api().respondWith(() => jsonResponse({ message: "nope" }, 500));

    await markRead("a");

    expect(unreadCount.value).toBe(3);
    expect(notifications.value[0]!.readAt).toBeNull();
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "error",
        title: expect.stringContaining("mark notification as read"),
      }),
    );
  });
});

describe("useNotifications unread-only filter", () => {
  it("refetches when switched on and does nothing when set to its current value", async () => {
    const { unreadOnly, setUnreadOnly } = await mountWith(
      makeNotificationPage([makeNotification()]),
    );

    setUnreadOnly(false);
    await flushPromises();
    expect(api().requests).toHaveLength(1);

    setUnreadOnly(true);
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    expect(unreadOnly.value).toBe(true);
  });

  it("refetches page 0 with the unreadOnly flag", async () => {
    const { setUnreadOnly } = await mountWith(makeNotificationPage([makeNotification()]));

    setUnreadOnly(true);
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));

    expect(lastQuery()).toEqual({ page: "0", limit: "20", unreadOnly: "true" });
  });
});

describe("resetNotificationState", () => {
  it("empties the list, zeroes the count and sends no request once signed out", async () => {
    const { notifications, unreadCount } = await mountWith(
      makeNotificationPage([makeNotification()], { unreadCount: 4 }),
    );
    api().respondWith(() =>
      jsonResponse(makeNotificationPage([makeNotification({ id: "b" })], { unreadCount: 9 })),
    );

    setLoggedIn(false);
    resetNotificationState();
    await flushPromises();

    expect(api().requests).toHaveLength(1);
    expect(notifications.value).toEqual([]);
    expect(unreadCount.value).toBe(0);
  });

  it("clears the poll cursor so the next poll omits since", async () => {
    await mountWith(makeNotificationPage([makeNotification()]));
    api().respondWith(() => jsonResponse(makeNotificationPage([])));

    resetNotificationState();
    await flushPromises();
    await pollWith(jsonResponse(makeNotificationPage([])));

    expect(lastQuery()).toEqual({ limit: "100" });
  });

  it("returns the notification pagination to its defaults", async () => {
    const { nextPage, notifications } = await mountWith(
      makeNotificationPage([makeNotification({ id: "a" })], { count: 40 }),
    );
    api().respondWith(() =>
      jsonResponse(makeNotificationPage([makeNotification({ id: "b" })], { count: 40, page: 1 })),
    );
    nextPage();
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    await flushPromises();
    expect(ids(notifications.value)).toEqual(["a", "b"]);
    scope!.stop();

    resetNotificationState();
    scope = effectScope();
    const fresh = scope.run(() =>
      useApiPagination(NOTIFICATION_PAGINATION_KEY, vi.fn(), { immediate: false }),
    )!;
    await flushPromises();

    expect(fresh.page.value).toBe(DEFAULT_INITIAL_PAGE);
    expect(fresh.data.value).toEqual([]);
    expect(fresh.count.value).toBeUndefined();
  });
});

describe("useNotifications after a reset", () => {
  it("drops a poll that resolves after resetNotificationState", async () => {
    const { notifications, unreadCount } = await mountWith(makeNotificationPage([]));
    api().respondWith((request) =>
      request.url.searchParams.get("limit") === "100"
        ? jsonResponse(
            makeNotificationPage([makeNotification({ id: "stale" })], { unreadCount: 5 }),
          )
        : jsonResponse(makeNotificationPage([])),
    );
    vi.setSystemTime(Date.now() + MIN_POLL_GAP_MS + 1);

    const inFlight = poller.run!();
    resetNotificationState();
    await inFlight;
    await flushPromises();

    expect(notifications.value).toEqual([]);
    expect(unreadCount.value).toBe(0);
    expect(useState(NOTIFICATION_STATE_KEYS.cursor).value).toBeNull();
  });
});

describe("useNotifications with the event stream", () => {
  const seen = makeNotification({ id: "seen", createdAt: "2026-10-02T08:30:00.000Z" });

  beforeEach(() => {
    installFakeEventSource();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const timerPollEnabled = () => toValue(poller.enabled ?? true);

  it("pauses the timer poll while the stream is open and resumes it when it is not", async () => {
    await mountWith(makeNotificationPage([]));
    expect(timerPollEnabled()).toBe(true);

    latestEventSource()!.simulateOpen();
    expect(timerPollEnabled()).toBe(false);

    latestEventSource()!.simulateDrop();
    expect(timerPollEnabled()).toBe(true);
  });

  it.each([STREAM_EVENTS.resync, STREAM_EVENTS.notifications])(
    "polls on %s inside the poll gap and keeps the overlap cursor",
    async (event) => {
      await mountWith(makeNotificationPage([seen]));
      latestEventSource()!.simulateOpen();
      await flushPromises();
      const before = api().requests.length;
      api().respondWith(() => jsonResponse(makeNotificationPage([])));

      latestEventSource()!.simulateEvent(event);
      await vi.waitFor(() => expect(api().requests).toHaveLength(before + 1));

      expect(lastQuery()).toEqual({ since: shiftBack(seen.createdAt), limit: "100" });
    },
  );

  it("fires one poll when the stream opens", async () => {
    await mountWith(makeNotificationPage([seen]));
    api().respondWith(() => jsonResponse(makeNotificationPage([])));

    latestEventSource()!.simulateOpen();
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    await flushPromises();

    expect(api().requests).toHaveLength(2);
    expect(lastQuery().since).toBe(shiftBack(seen.createdAt));
  });

  async function openStreamWithHeldPoll(first: Promise<Response>, rest: () => Response) {
    const state = await mountWith(makeNotificationPage([seen]));
    api().respondWith(() => jsonResponse(makeNotificationPage([])));
    latestEventSource()!.simulateOpen();
    await vi.waitFor(() => expect(api().requests).toHaveLength(2));
    await flushPromises();
    let held = false;
    api().respondWith(() => {
      if (held) return rest();
      held = true;
      return first;
    });
    return state;
  }

  it("coalesces stream events during an in-flight poll into one follow-up that sets the newer count", async () => {
    let releaseFirst = (_: Response) => {};
    const first = new Promise<Response>((resolve) => (releaseFirst = resolve));
    const { unreadCount } = await openStreamWithHeldPoll(first, () =>
      jsonResponse(makeNotificationPage([], { unreadCount: 3 })),
    );

    latestEventSource()!.simulateEvent(STREAM_EVENTS.notifications);
    await vi.waitFor(() => expect(api().requests).toHaveLength(3));
    latestEventSource()!.simulateEvent(STREAM_EVENTS.notifications);
    latestEventSource()!.simulateEvent(STREAM_EVENTS.resync);
    await flushPromises();
    expect(api().requests).toHaveLength(3);

    releaseFirst(jsonResponse(makeNotificationPage([], { unreadCount: 1 })));
    await vi.waitFor(() => expect(api().requests).toHaveLength(4));
    await flushPromises();

    expect(api().requests).toHaveLength(4);
    expect(unreadCount.value).toBe(3);
  });

  it("runs the pending follow-up after the in-flight poll fails", async () => {
    let releaseFirst = (_: Response) => {};
    const first = new Promise<Response>((resolve) => (releaseFirst = resolve));
    const { unreadCount, pollError } = await openStreamWithHeldPoll(first, () =>
      jsonResponse(makeNotificationPage([], { unreadCount: 2 })),
    );

    latestEventSource()!.simulateEvent(STREAM_EVENTS.notifications);
    await vi.waitFor(() => expect(api().requests).toHaveLength(3));
    latestEventSource()!.simulateEvent(STREAM_EVENTS.notifications);

    releaseFirst(jsonResponse({ message: "boom" }, 500));
    await vi.waitFor(() => expect(api().requests).toHaveLength(4));
    await flushPromises();

    expect(api().requests).toHaveLength(4);
    expect(unreadCount.value).toBe(2);
    expect(pollError.value).toBeNull();
  });

  it("still skips a timer-driven poll inside the poll gap", async () => {
    await mountWith(makeNotificationPage([seen]));
    latestEventSource()!.simulateDrop();

    await poller.run!();
    await flushPromises();

    expect(api().requests).toHaveLength(1);
  });
});
