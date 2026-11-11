export const serverStreamRules = {
  path: "/api/v1/events",
  reconnectBaseMs: 5_000,
  reconnectMaxMs: 60_000,
  reconnectJitter: 0.25,
  subscriptionRetryMs: 5_000,
} as const;
