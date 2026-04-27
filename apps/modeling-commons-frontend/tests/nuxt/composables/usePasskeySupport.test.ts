import { afterEach, describe, expect, it, vi } from "vitest";
import usePasskeySupport from "~/composables/usePasskeySupport";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePasskeySupport", () => {
  it("does not crash when there is no PublicKeyCredential global yet", () => {
    const support = usePasskeySupport();
    expect(typeof support.isPasskeySupportResolved.value).toBe("boolean");
    expect(typeof support.isPasskeySupported.value).toBe("boolean");
  });

  it("returns booleans for the resolved/supported computeds", () => {
    vi.stubGlobal("PublicKeyCredential", class {});
    const support = usePasskeySupport();
    expect(typeof support.isPasskeySupported.value).toBe("boolean");
  });

  it.todo(
    "isPasskeySupported flips to true after onMounted runs in a real component context — exercise via mountSuspended in the component tier",
  );
});
