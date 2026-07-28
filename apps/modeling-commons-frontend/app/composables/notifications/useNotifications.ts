type Notification = ResponseData<"GET", "/api/v1/me/notifications">["data"][number];
type NotificationResponse = ResponseData<"GET", "/api/v1/me/notifications">;

async function fetchNotifications(page: number, limit: number): Promise<NotificationResponse> {
  const api = useApi();
  const res = await api.GET("/api/v1/me/notifications", { query: { page, limit } });
  return handleApiError(res.data, res.error, "fetching user notifications");
}

async function pollNotifications(since: DateInput): Promise<NotificationResponse> {
  const api = useApi();
  const res = await api.GET("/api/v1/me/notifications", { query: { since, limit: 100 } });
  return handleApiError(res.data, res.error, "polling user notifications");
}

export function useNotifications() {
  const unreadCount = useState<number | null>("unread-notifications-count", () => null);
  const lastPolled = useState<number>("last-notifications-poll", () => 0);
  const aggregatedNotifications = useState<Notification[]>("aggregated-notifications", () => []);

  const {
    data,
    error,
    pending,
    refresh,
    loadNextPage: nextPage,
    canLoadMore: hasMore,
  } = useApiPagination(
    "user-notifications",
    async (page) => {
      const data = await fetchNotifications(page, 20);
      unreadCount.value = data.unreadCount;
      lastPolled.value = Date.now();
      return data;
    },
    {
      lazy: true,
    },
  );

  const aggregate = (newNotifications: Notification[]) => {
    const existing = aggregatedNotifications.value;
    const combined = [...newNotifications, ...existing];
    // Remove duplicates based on notification ID
    const unique = combined.filter(
      (notif, index, self) => index === self.findIndex((n) => n.id === notif.id),
    );
    aggregatedNotifications.value = unique.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };

  const poll = async () => {
    const res = await pollNotifications(new Date(lastPolled.value));
    unreadCount.value = res.unreadCount;
    lastPolled.value = Date.now();
    aggregate(res.data);
  };

  const pollInterval = useState<ReturnType<typeof setInterval> | null>(
    "notifications-poll-interval",
    () => null,
  );

  const startPolling = (intervalMs: number) => {
    if (pollInterval.value) return; // already polling
    pollInterval.value = setInterval(async () => {
      try {
        await poll();
      } catch (err) {
        console.error("Error polling notifications:", err);
      }
    }, intervalMs);
  };

  const stopPolling = () => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value);
      pollInterval.value = null;
    }
  };

  watchEffect(() => {
    if (data.value) {
      aggregate(data.value);
    }
  });

  onBeforeMount(() => {
    startPolling(60000); // poll every 60 seconds
  });

  onUnmounted(() => {
    stopPolling();
  });

  const markRead = async (notificationId: string) => {
    const api = useApi();
    const res = await api.PATCH(`/api/v1/me/notifications/{id}/read`, {
      params: { path: { id: notificationId } },
    });
    if (res.error) {
      showActionFailedToast("Failed to mark notification as read");
      return;
    }
    aggregatedNotifications.value = aggregatedNotifications.value.map((notif) =>
      notif.id === notificationId ? { ...notif, read: true } : notif,
    );
    unreadCount.value = Math.max(0, (unreadCount.value ?? 0) - 1);
  };

  return {
    unreadCount,
    lastPolled,
    aggregatedNotifications,
    error,
    pending,
    refresh,
    markRead,
    nextPage,
    hasMore,
  };
}
