export async function fetchNotificationPreferences(): Promise<NotificationPreferences | undefined> {
  const { data, error } = await useApi().GET("/api/v1/me/notification-preferences");
  if (error) throw error;
  return data;
}

export function updateNotificationPreferences(
  preferences: NotificationPreferenceChange[],
) {
  return useApi().PATCH("/api/v1/me/notification-preferences", {
    body: { preferences },
  });
}
