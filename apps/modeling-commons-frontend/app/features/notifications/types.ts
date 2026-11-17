export type NotificationResponse = ResponseData<"GET", "/api/v1/me/notifications">;
export type UserNotification = NotificationResponse["data"][number];
