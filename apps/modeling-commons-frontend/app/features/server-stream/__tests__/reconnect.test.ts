import { describe, expect, it } from "vitest";
import { computeReconnectDelay } from "~/features/server-stream/reconnect";
import { serverStreamRules } from "~/features/server-stream/rules";

describe("computeReconnectDelay", () => {
  it("doubles from the base up to the cap with a centred random source", () => {
    const delays = [0, 1, 2, 3, 4, 5, 10].map((attempt) =>
      computeReconnectDelay(attempt, () => 0.5),
    );
    expect(delays).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
  });

  it("stays within the jitter band around the uncapped and the capped step", () => {
    const { reconnectBaseMs, reconnectMaxMs, reconnectJitter } = serverStreamRules;
    for (const [attempt, step] of [
      [0, reconnectBaseMs],
      [9, reconnectMaxMs],
    ] as const) {
      expect(computeReconnectDelay(attempt, () => 0)).toBe(step * (1 - reconnectJitter));
      const top = computeReconnectDelay(attempt, () => 0.999_999);
      expect(top).toBeLessThan(step * (1 + reconnectJitter));
      expect(top).toBeGreaterThan(step * (1 + reconnectJitter) - 1);
    }
  });
});
