export async function fetchNotificationPreferences(): Promise<NotificationPreferences | undefined> {
  const { data, error } = await useApi().GET("/api/v1/me/notification-preferences");
  if (error) throw error;
  return data;
}

export function updateNotificationPreference(
  category: NotificationCategoryKey,
  patch: NotificationPreferencePatch,
) {
  return useApi().PATCH("/api/v1/me/notification-preferences", {
    body: { preferences: [{ category, ...patch }] },
  });
}
