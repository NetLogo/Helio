import {
  fetchNotifications,
  pollNotifications,
  POLL_INTERVAL_ACTIVE_MS,
  IDLE_TIMEOUT_MS,
  MIN_POLL_GAP_MS,
  POLL_SINCE_OVERLAP_MS,
  MAX_BACKOFF_FACTOR,
  NOTIFICATION_STATE_KEYS,
  NOTIFICATION_PAGINATION_KEY,
  type Notification,
} from "~/components/notifications/shared";

import { createSharedComposable } from "@vueuse/core";

function useNotificationsImpl() {
  const api = useApi();

  const unreadCount = useState<number>(NOTIFICATION_STATE_KEYS.unreadCount, () => 0);
  const lastPolled = useState<number>(NOTIFICATION_STATE_KEYS.lastPolled, () => 0);
  const aggregatedNotifications = useState<Notification[]>(
    NOTIFICATION_STATE_KEYS.aggregated,
    () => [],
  );
  const cursor = useState<string | null>(NOTIFICATION_STATE_KEYS.cursor, () => null);
  const resetEpoch = useState<number>(NOTIFICATION_STATE_KEYS.resetEpoch, () => 0);
  const unreadOnly = useState<boolean>(NOTIFICATION_STATE_KEYS.unreadOnly, () => false);
  const user = useUser();

  const {
    data: paginatedNotifications,
    error,
    pending,
    refresh,
    loadNextPage: nextPage,
    canLoadMore: hasMore,
    reset: resetPagination,
  } = useApiPagination(
    NOTIFICATION_PAGINATION_KEY,
    async (page) => {
      const startedAt = Date.now();
      const epoch = resetEpoch.value;
      const data = await fetchNotifications(page, 20, unreadOnly.value);
      if (resetEpoch.value !== epoch) return { ...data, data: [], count: 0, unreadCount: 0 };
      unreadCount.value = data.unreadCount;
      if (page <= 0) lastPolled.value = startedAt;
      return data;
    },
    { lazy: true, enabled: () => user.value.isLoggedIn },
  );

  watch(resetEpoch, () => resetPagination());

  const setUnreadOnly = (value: boolean) => {
    if (unreadOnly.value === value) return;
    unreadOnly.value = value;
    resetPagination();
  };

  // A response fetched before a local markRead still carries the older readAt; keep the newer local one.
  const reconcileReadAt = (incoming: Notification, known: Notification | undefined) => {
    if (!known?.readAt) return incoming;
    if (incoming.readAt && new Date(incoming.readAt) >= new Date(known.readAt)) return incoming;
    return { ...incoming, readAt: known.readAt };
  };

  const aggregate = (incoming: Notification[]) => {
    if (!incoming?.length) return;
    const byId = new Map<string, Notification>();
    for (const n of toRaw(aggregatedNotifications.value)) byId.set(n.id, n);
    const reconciled = incoming.map((n) => reconcileReadAt(n, byId.get(n.id)));
    const hasNewOrChangedRow = reconciled.some((n) => {
      const known = byId.get(n.id);
      return !known || known.readAt !== n.readAt;
    });
    if (hasNewOrChangedRow) {
      for (const n of reconciled) byId.set(n.id, n);
      aggregatedNotifications.value = [...byId.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    advanceCursor(incoming);
  };

  const advanceCursor = (incoming: Notification[]) => {
    let newest = cursor.value;
    for (const n of incoming) {
      if (newest === null || new Date(n.createdAt).getTime() > new Date(newest).getTime()) {
        newest = n.createdAt;
      }
    }
    cursor.value = newest;
  };

  watch(
    paginatedNotifications,
    (val) => {
      if (val?.length) aggregate(val);
    },
    { deep: true, immediate: true },
  );

  const failures = ref(0);
  const pollError = ref<unknown>(null);

  const backoffInterval = computed(
    () => POLL_INTERVAL_ACTIVE_MS * Math.min(2 ** failures.value, MAX_BACKOFF_FACTOR),
  );

  // Rows can commit after a newer createdAt was already seen; re-reading a short window behind the cursor catches them and aggregate dedupes by id.
  const computePollSince = () =>
    cursor.value === null
      ? undefined
      : new Date(new Date(cursor.value).getTime() - POLL_SINCE_OVERLAP_MS).toISOString();

  const poll = async () => {
    if (!user.value.isLoggedIn) return;
    const startedAt = Date.now();
    if (startedAt - lastPolled.value < MIN_POLL_GAP_MS) return;
    const epoch = resetEpoch.value;
    try {
      const res = await pollNotifications(computePollSince());
      if (resetEpoch.value !== epoch) return;
      unreadCount.value = res.unreadCount;
      lastPolled.value = startedAt;
      aggregate(res.data);
      failures.value = 0;
      pollError.value = null;
    } catch (err) {
      failures.value++;
      pollError.value = err;
    }
  };

  const polling = ref(false);
  let pausePolling = () => {};

  if (import.meta.client) {
    const { isActive, pause } = useActivePoll(poll, backoffInterval, {
      idleTimeout: IDLE_TIMEOUT_MS,
      requireFocus: false, // deliver while visible even if another app has focus
    });
    polling.value = isActive.value;
    watch(isActive, (v) => (polling.value = v));
    pausePolling = pause;
    onScopeDispose(pause);
  }

  const markRead = async (notificationId: string) => {
    const target = aggregatedNotifications.value.find((n) => n.id === notificationId);
    if (!target || target.readAt) return; // guard double-decrement

    const res = await api.PATCH(`/api/v1/me/notifications/{id}/read`, {
      params: { path: { id: notificationId } },
    });
    if (res.error) {
      showActionFailedToast("Failed to mark notification as read");
      return;
    }
    aggregatedNotifications.value = aggregatedNotifications.value.map((n) =>
      n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
    );
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    if (unreadOnly.value) resetPagination();
  };

  return {
    notifications: aggregatedNotifications,
    unreadCount,
    lastPolled,
    error,
    pollError,
    pending,
    polling,
    refresh,
    markRead,
    nextPage,
    hasMore,
    unreadOnly,
    setUnreadOnly,
    stopPolling: () => pausePolling(),
  };
}

export const useNotifications = import.meta.server
  ? useNotificationsImpl
  : /* @__PURE__ */ createSharedComposable(useNotificationsImpl);
