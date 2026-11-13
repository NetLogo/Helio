import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readonly, ref } from "vue";
import { FakeEventSource, installFakeEventSource } from "~~/tests/helpers/browser";

beforeEach(() => {
  vi.resetModules();
  installFakeEventSource();
  vi.stubGlobal("ref", ref);
  vi.stubGlobal("readonly", readonly);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useServerStreamConnection on the server", () => {
  it("opens no stream, keeps a closed status and subscribes as a no-op", async () => {
    const { useServerStreamConnection } = await import(
      "~/composables/shared/useServerStreamConnection"
    );
    const connection = useServerStreamConnection();
    const handler = vi.fn();

    const unsubscribe = connection.subscribe({ type: "model", id: "m-1" }, handler);
    unsubscribe();

    expect(connection.status.value).toBe("closed");
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(handler).not.toHaveBeenCalled();
  });
});
