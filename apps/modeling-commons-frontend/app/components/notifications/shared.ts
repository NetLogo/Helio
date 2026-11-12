import { clearApiPagination } from "~/composables/api/useApiPagination";

export const NOTIFICATION_STATE_KEYS = {
  unreadCount: "unread-notifications-count",
  lastPolled: "last-notifications-poll",
  aggregated: "aggregated-notifications",
  cursor: "notifications-cursor",
  resetEpoch: "notifications-reset-epoch",
  unreadOnly: "notifications-unread-only",
  ownerId: "notifications-owner-id",
} as const;

export function toInAppLink(url: string, appUrl: string): string {
  const parsed = new URL(url, appUrl);
  if (parsed.origin !== new URL(appUrl).origin) return url;
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function useNotificationLink() {
  const appUrl = useRuntimeConfig().public.appUrl as string;
  return (url: string) => toInAppLink(url, appUrl);
}

export const NOTIFICATION_PAGINATION_KEY = "user-notifications";

export function resetNotificationState() {
  useState<number>(NOTIFICATION_STATE_KEYS.unreadCount).value = 0;
  useState<number>(NOTIFICATION_STATE_KEYS.lastPolled).value = 0;
  useState<UserNotification[]>(NOTIFICATION_STATE_KEYS.aggregated).value = [];
  useState<string | null>(NOTIFICATION_STATE_KEYS.cursor).value = null;
  useState<boolean>(NOTIFICATION_STATE_KEYS.unreadOnly).value = false;
  useState<string | null>(NOTIFICATION_STATE_KEYS.ownerId).value = null;
  useState<number>(NOTIFICATION_STATE_KEYS.resetEpoch, () => 0).value++;
  clearApiPagination(NOTIFICATION_PAGINATION_KEY);
}

export const POLL_INTERVAL_ACTIVE_MS = 60000;

export const IDLE_TIMEOUT_MS = 5 * 60_000;
export const MIN_POLL_GAP_MS = 5_000;
export const POLL_SINCE_OVERLAP_MS = 5_000;
export const MAX_BACKOFF_FACTOR = 8;

export const notificationIcons: Partial<Record<UserNotification["category"], string>> = {
  "comment.on_your_model": "lucide:message-circle",
  "comment.reply_to_you": "lucide:message-circle",
};

export const FALLBACK_ICON = "lucide:bell";

export function iconFor(category: UserNotification["category"]): string {
  return notificationIcons[category] ?? FALLBACK_ICON;
}
