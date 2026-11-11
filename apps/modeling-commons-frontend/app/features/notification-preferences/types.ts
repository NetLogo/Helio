export type NotificationPreferences = ResponseSuccessData<
  "GET",
  "/api/v1/me/notification-preferences"
>;
export type NotificationPreferenceCategory = NotificationPreferences["categories"][number];
export type NotificationCategoryKey = NotificationPreferenceCategory["category"];
export type NotificationEmailMode = NotificationPreferenceCategory["email"];
export type NotificationPreferencePatch = Partial<
  Pick<NotificationPreferenceCategory, "email" | "inApp">
>;
