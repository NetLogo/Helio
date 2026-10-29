import { clearApiPagination } from "~/composables/api/useApiPagination";

export type Notification = ResponseData<"GET", "/api/v1/me/notifications">["data"][number];
export type NotificationResponse = ResponseData<"GET", "/api/v1/me/notifications">;

export const NOTIFICATION_STATE_KEYS = {
  unreadCount: "unread-notifications-count",
  lastPolled: "last-notifications-poll",
  aggregated: "aggregated-notifications",
  cursor: "notifications-cursor",
  resetEpoch: "notifications-reset-epoch",
  unreadOnly: "notifications-unread-only",
} as const;

export const NOTIFICATION_PAGINATION_KEY = "user-notifications";

export function resetNotificationState() {
  useState<number>(NOTIFICATION_STATE_KEYS.unreadCount).value = 0;
  useState<number>(NOTIFICATION_STATE_KEYS.lastPolled).value = 0;
  useState<Notification[]>(NOTIFICATION_STATE_KEYS.aggregated).value = [];
  useState<string | null>(NOTIFICATION_STATE_KEYS.cursor).value = null;
  useState<boolean>(NOTIFICATION_STATE_KEYS.unreadOnly).value = false;
  useState<number>(NOTIFICATION_STATE_KEYS.resetEpoch, () => 0).value++;
  clearApiPagination(NOTIFICATION_PAGINATION_KEY);
}

export const POLL_INTERVAL_ACTIVE_MS = 60000;

export const IDLE_TIMEOUT_MS = 5 * 60_000;
export const MIN_POLL_GAP_MS = 5_000;
export const POLL_SINCE_OVERLAP_MS = 5_000;
export const MAX_BACKOFF_FACTOR = 8;

export const notificationIcons: Partial<Record<Notification["category"], string>> = {
  "comment.on_your_model": "lucide:message-circle",
  "comment.reply_to_you": "lucide:message-circle",
};

export const FALLBACK_ICON = "lucide:bell";

export function iconFor(category: Notification["category"]): string {
  return notificationIcons[category] ?? FALLBACK_ICON;
}

export async function fetchNotifications(
  page: number,
  limit: number,
  unreadOnly = false,
): Promise<NotificationResponse> {
  const api = useApi();
  const query = unreadOnly ? { page, limit, unreadOnly } : { page, limit };
  const res = await api.GET("/api/v1/me/notifications", { params: { query } });
  return handleApiError(res.data, res.error, "fetching user notifications");
}

export async function pollNotifications(since?: string): Promise<NotificationResponse> {
  const api = useApi();
  const query = since === undefined ? { limit: 100 } : { since, limit: 100 };
  const res = await api.GET("/api/v1/me/notifications", { params: { query } });
  return handleApiError(res.data, res.error, "polling user notifications");
}
