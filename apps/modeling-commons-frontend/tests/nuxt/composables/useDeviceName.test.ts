import { afterEach, describe, expect, it, vi } from "vitest";
import useDeviceName from "~/composables/auth/useDeviceName";

afterEach(() => {
  vi.unstubAllGlobals();
  clearNuxtState();
});

describe("useDeviceName", () => {
  it("returns a non-empty device name string", () => {
    const { deviceName } = useDeviceName();
    expect(typeof deviceName.value).toBe("string");
    expect(deviceName.value.length).toBeGreaterThan(0);
  });

  it("exposes a writable ref so callers can override the parsed value", () => {
    const { deviceName } = useDeviceName();
    deviceName.value = "Test device";
    expect(deviceName.value).toBe("Test device");
  });

  it("shares state across invocations (useState key 'device-name')", () => {
    const a = useDeviceName();
    const b = useDeviceName();
    a.deviceName.value = "Shared device";
    expect(b.deviceName.value).toBe("Shared device");
  });
});
