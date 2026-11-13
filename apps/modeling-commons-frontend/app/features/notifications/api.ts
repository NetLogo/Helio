const POLL_LIMIT = 100;

export async function fetchNotifications(
  page: number,
  limit: number,
  unreadOnly = false,
): Promise<NotificationResponse> {
  const query = unreadOnly ? { page, limit, unreadOnly } : { page, limit };
  const res = await useApi().GET("/api/v1/me/notifications", { params: { query } });
  return handleApiError(res.data, res.error, "fetching user notifications");
}

export async function pollNotifications(since?: string): Promise<NotificationResponse> {
  const query = since === undefined ? { limit: POLL_LIMIT } : { since, limit: POLL_LIMIT };
  const res = await useApi().GET("/api/v1/me/notifications", { params: { query } });
  return handleApiError(res.data, res.error, "polling user notifications");
}

export function markNotificationRead(id: string) {
  return useApi().PATCH("/api/v1/me/notifications/{id}/read", { params: { path: { id } } });
}
