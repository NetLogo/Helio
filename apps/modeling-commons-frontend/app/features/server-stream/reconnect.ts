import { serverStreamRules } from "~/features/server-stream/rules";

export function computeReconnectDelay(attempt: number, random: () => number): number {
  const { reconnectBaseMs, reconnectMaxMs, reconnectJitter } = serverStreamRules;
  const base = Math.min(reconnectBaseMs * 2 ** attempt, reconnectMaxMs);
  return base * (1 + reconnectJitter * (2 * random() - 1));
}

export type SubscriptionOutcome = "live" | "retry" | "drop";

export function classifySubscriptionResponse(status: number | null): SubscriptionOutcome {
  if (status === null || status === 429 || status >= 500) return "retry";
  return status >= 200 && status < 300 ? "live" : "drop";
}
