import {
  POLL_INTERVAL_ACTIVE_MS,
  IDLE_TIMEOUT_MS,
  MIN_POLL_GAP_MS,
  POLL_SINCE_OVERLAP_MS,
  MAX_BACKOFF_FACTOR,
  NOTIFICATION_STATE_KEYS,
  NOTIFICATION_PAGINATION_KEY,
  resetNotificationState,
} from "~/components/notifications/shared";

import {
  createSharedComposable,
  useDocumentVisibility,
  useIdle,
  useOnline,
  useTimeoutPoll,
} from "@vueuse/core";
import { notificationLiterals } from "~/features/notifications/literals";

function useNotificationsImpl() {
  const unreadCount = useState<number>(NOTIFICATION_STATE_KEYS.unreadCount, () => 0);
  const lastPolled = useState<number>(NOTIFICATION_STATE_KEYS.lastPolled, () => 0);
  const aggregatedNotifications = useState<UserNotification[]>(
    NOTIFICATION_STATE_KEYS.aggregated,
    () => [],
  );
  const cursor = useState<string | null>(NOTIFICATION_STATE_KEYS.cursor, () => null);
  const resetEpoch = useState<number>(NOTIFICATION_STATE_KEYS.resetEpoch, () => 0);
  const unreadOnly = useState<boolean>(NOTIFICATION_STATE_KEYS.unreadOnly, () => false);
  const ownerId = useState<string | null>(NOTIFICATION_STATE_KEYS.ownerId, () => null);
  const user = useUser();

  watch(
    () => user.value.user?.id ?? null,
    (userId) => {
      if (userId === null || userId === ownerId.value) return;
      if (ownerId.value !== null) resetNotificationState();
      ownerId.value = userId;
    },
    { immediate: true },
  );

  const {
    data: paginatedNotifications,
    error,
    pending,
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

  const keepNewestReadAt = (incoming: UserNotification, known: UserNotification | undefined) => {
    if (!known?.readAt) return incoming;
    if (incoming.readAt && new Date(incoming.readAt) >= new Date(known.readAt)) return incoming;
    return { ...incoming, readAt: known.readAt };
  };

  const aggregate = (incoming: UserNotification[]) => {
    if (!incoming?.length) return;
    const byId = new Map<string, UserNotification>();
    for (const n of toRaw(aggregatedNotifications.value)) byId.set(n.id, n);
    const reconciled = incoming.map((n) => keepNewestReadAt(n, byId.get(n.id)));
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

  const advanceCursor = (incoming: UserNotification[]) => {
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
    (val) => aggregate(val),
    { deep: true, immediate: true },
  );

  const failures = ref(0);

  const backoffInterval = computed(
    () => POLL_INTERVAL_ACTIVE_MS * Math.min(2 ** failures.value, MAX_BACKOFF_FACTOR),
  );

  const getPollSinceWithOverlap = () =>
    cursor.value === null
      ? undefined
      : new Date(new Date(cursor.value).getTime() - POLL_SINCE_OVERLAP_MS).toISOString();

  let pollInFlight = false;
  let rerunPending = false;

  const requestPoll = (startedAt: number) => {
    const epoch = resetEpoch.value;
    return pollNotifications(getPollSinceWithOverlap())
      .then((res) => {
        if (resetEpoch.value !== epoch) return;
        unreadCount.value = res.unreadCount;
        lastPolled.value = startedAt;
        aggregate(res.data);
        failures.value = 0;
      })
      .catch(() => failures.value++);
  };

  const poll = async ({ force = false }: { force?: boolean } = {}): Promise<void> => {
    if (!user.value.isLoggedIn) return;
    const startedAt = Date.now();
    if (pollInFlight) {
      rerunPending ||= force;
      return;
    }
    if (!force && startedAt - lastPolled.value < MIN_POLL_GAP_MS) return;
    pollInFlight = true;
    await requestPoll(startedAt);
    pollInFlight = false;
    if (!rerunPending) return;
    rerunPending = false;
    return poll({ force: true });
  };

  if (import.meta.client) {
    const pollNow = () => void poll({ force: true });
    const stream = useStreamTopic(
      () => (user.value.isLoggedIn ? { type: "user", id: user.value.user.id } : null),
      pollNow,
    );

    const visibility = useDocumentVisibility();
    const online = useOnline();
    const { idle } = useIdle(IDLE_TIMEOUT_MS);
    const timerPollActive = computed(
      () =>
        stream.status.value !== "open" &&
        visibility.value === "visible" &&
        !idle.value &&
        online.value,
    );
    const { pause, resume } = useTimeoutPoll(() => poll(), backoffInterval, { immediate: false });
    watch(timerPollActive, (on) => (on ? resume() : pause()), { immediate: true });
  }

  const markRead = async (notificationId: string) => {
    const target = aggregatedNotifications.value.find((n) => n.id === notificationId);
    if (!target || target.readAt) return; // guard double-decrement

    const res = await markNotificationRead(notificationId);
    if (res.error) {
      showActionFailedToast(notificationLiterals.markReadFailed);
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
    error,
    pending,
    markRead,
    nextPage,
    hasMore,
    unreadOnly,
    setUnreadOnly,
  };
}

export const useNotifications = import.meta.server
  ? useNotificationsImpl
  : /* @__PURE__ */ createSharedComposable(useNotificationsImpl);
