export type Notification = ResponseData<"GET", "/api/v1/me/notifications">["data"][number];
export type NotificationResponse = ResponseData<"GET", "/api/v1/me/notifications">;

export const POLL_INTERVAL_ACTIVE_MS = 60000;

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
