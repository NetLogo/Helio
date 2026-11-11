export function unsubscribeFromNotificationEmails(token: string) {
  return useApi().POST("/api/v1/notification-unsubscribe", { params: { query: { token } } });
}
