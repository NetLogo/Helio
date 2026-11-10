import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import { useActivePoll } from "~/composables/shared/useActivePoll";

const INTERVAL_MS = 1_000;

let scope: EffectScope | null = null;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  scope?.stop();
  scope = null;
  vi.useRealTimers();
});

describe("useActivePoll enabled gate", () => {
  it("stops polling while disabled and resumes once enabled again", async () => {
    const enabled = ref(true);
    const run = vi.fn();
    scope = effectScope();
    scope.run(() => useActivePoll(run, INTERVAL_MS, { enabled }));

    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(1);

    enabled.value = false;
    await nextTick();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);
    expect(run).toHaveBeenCalledTimes(1);

    enabled.value = true;
    await nextTick();
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
