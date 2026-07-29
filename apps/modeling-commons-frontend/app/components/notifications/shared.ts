export type Notification = ResponseData<"GET", "/api/v1/me/notifications">["data"][number];
export type NotificationResponse = ResponseData<"GET", "/api/v1/me/notifications">;

export const POLL_INTERVAL_ACTIVE_MS = 60000;

export const IDLE_TIMEOUT_MS = 5 * 60_000;
export const MIN_POLL_GAP_MS = 5_000;
export const MAX_BACKOFF_FACTOR = 8;

export const notificationIcons: Partial<Record<Notification["category"], string>> = {
  "comment.on_your_model": "lucide:message-circle",
  "comment.reply_to_you": "lucide:message-circle",
  "general.daily_digest": "lucide:bell",
};

export const FALLBACK_ICON = "lucide:bell";

export function iconFor(category: Notification["category"]): string {
  return notificationIcons[category] ?? FALLBACK_ICON;
}

export async function fetchNotifications(
  page: number,
  limit: number,
): Promise<NotificationResponse> {
  const api = useApi();
  const res = await api.GET("/api/v1/me/notifications", { query: { page, limit } });
  return handleApiError(res.data, res.error, "fetching user notifications");
}

export async function pollNotifications(since: DateInput): Promise<NotificationResponse> {
  const api = useApi();
  const res = await api.GET("/api/v1/me/notifications", { query: { since, limit: 100 } });
  return handleApiError(res.data, res.error, "polling user notifications");
}
