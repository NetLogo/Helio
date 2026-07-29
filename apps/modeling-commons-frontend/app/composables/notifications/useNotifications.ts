import {
  fetchNotifications,
  pollNotifications,
  POLL_INTERVAL_ACTIVE_MS,
  type Notification,
} from "@/components/notifications/shared";

import { createSharedComposable } from "@vueuse/core";

const IDLE_TIMEOUT_MS = 5 * 60_000;
const MIN_POLL_GAP_MS = 5_000;
const MAX_BACKOFF_FACTOR = 8;

function useNotificationsImpl() {
  const api = useApi();

  const unreadCount = useState<number>("unread-notifications-count", () => 0);
  const lastPolled = useState<number>("last-notifications-poll", () => 0);
  const aggregatedNotifications = useState<Notification[]>("aggregated-notifications", () => []);

  const {
    data: paginatedNotifications,
    error,
    pending,
    refresh,
    loadNextPage: nextPage,
    canLoadMore: hasMore,
  } = useApiPagination(
    "user-notifications",
    async (page) => {
      const startedAt = Date.now();
      const data = await fetchNotifications(page, 20);
      unreadCount.value = data.unreadCount;
      if (page <= 0) lastPolled.value = startedAt;
      return data;
    },
    { lazy: true },
  );

  const aggregate = (incoming: Notification[]) => {
    if (!incoming?.length) return;
    const byId = new Map<string, Notification>();
    for (const n of toRaw(aggregatedNotifications.value)) byId.set(n.id, n);
    for (const n of incoming) byId.set(n.id, n); // incoming wins
    aggregatedNotifications.value = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
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

  const poll = async () => {
    const startedAt = Date.now();
    if (startedAt - lastPolled.value < MIN_POLL_GAP_MS) return;
    try {
      const res = await pollNotifications(new Date(lastPolled.value));
      unreadCount.value = res.unreadCount;
      lastPolled.value = startedAt; // window START — avoids dropping in-flight arrivals
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
    stopPolling: () => pausePolling(),
  };
}

export const useNotifications = import.meta.server
  ? useNotificationsImpl
  : /* @__PURE__ */ createSharedComposable(useNotificationsImpl);
