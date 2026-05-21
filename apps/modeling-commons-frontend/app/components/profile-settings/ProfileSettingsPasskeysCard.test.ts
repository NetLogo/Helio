import { describe, expect, it, vi, beforeEach } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { ref } from "vue";
import ProfileSettingsPasskeysCard from "./ProfileSettingsPasskeysCard.vue";

const { addPasskeyMock, renamePasskeyMock, revokePasskeyMock, toastAddMock } = vi.hoisted(() => ({
  addPasskeyMock: vi.fn(),
  renamePasskeyMock: vi.fn(),
  revokePasskeyMock: vi.fn(),
  toastAddMock: vi.fn(),
}));

const passkeysMock = {
  isPasskeySupported: ref(true),
  isPasskeySupportResolved: ref(true),
  passkeys: ref<Array<Record<string, unknown>>>([]),
  passkeyCountLabel: ref("0 passkeys"),
  isPending: ref(false),
  isRefetching: ref(false),
};

mockNuxtImport("usePasskeys", () => {
  return () => {
    return {
      ...passkeysMock,
      addPasskey: addPasskeyMock,
      renamePasskey: renamePasskeyMock,
      revokePasskey: revokePasskeyMock,
    };
  };
});

mockNuxtImport("useToast", () => {
  return () => ({ add: toastAddMock });
});

mockNuxtImport("useDeviceName", () => {
  return () => ({ deviceName: ref("This device") });
});

function makePasskey(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "pk-1",
    name: "iPhone",
    deviceType: "platform",
    createdAt: new Date("2026-02-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  passkeysMock.isPasskeySupported.value = true;
  passkeysMock.isPasskeySupportResolved.value = true;
  passkeysMock.passkeys.value = [];
  passkeysMock.passkeyCountLabel.value = "0 passkeys";
  passkeysMock.isPending.value = false;
  passkeysMock.isRefetching.value = false;
  addPasskeyMock.mockReset().mockResolvedValue({ error: null });
  renamePasskeyMock.mockReset().mockResolvedValue({ error: null });
  revokePasskeyMock.mockReset().mockResolvedValue({ error: null });
  toastAddMock.mockReset();
});

describe("ProfileSettingsPasskeysCard", () => {
  it("renders the empty state when there are no passkeys", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    expect(wrapper.text()).toContain("No passkeys yet");
  });

  it("renders the passkey count label from the composable", async () => {
    passkeysMock.passkeys.value = [makePasskey()];
    passkeysMock.passkeyCountLabel.value = "1 passkey";
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    expect(wrapper.text()).toContain("1 passkey");
  });

  it("renders a list of passkeys when present", async () => {
    passkeysMock.passkeys.value = [
      makePasskey({ id: "pk-1", name: "iPhone" }),
      makePasskey({ id: "pk-2", name: "YubiKey" }),
    ];
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    expect(wrapper.text()).toContain("iPhone");
    expect(wrapper.text()).toContain("YubiKey");
  });

  it("renders an unsupported-browser alert when passkeys are not available", async () => {
    passkeysMock.isPasskeySupported.value = false;
    passkeysMock.isPasskeySupportResolved.value = true;
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    expect(wrapper.text()).toContain("Passkeys aren't available in this browser");
  });

  it("disables 'Add passkey' when the browser does not support passkeys", async () => {
    passkeysMock.isPasskeySupported.value = false;
    passkeysMock.isPasskeySupportResolved.value = true;
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const addButton = wrapper.findAll("button").find((b) => b.text().includes("Add passkey"));
    expect(addButton).toBeTruthy();
    expect(addButton!.attributes("disabled")).toBeDefined();
  });

  it("calls addPasskey with the trimmed name when 'Add passkey' is clicked", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const addButton = wrapper.findAll("button").find((b) => b.text().includes("Add passkey"));
    expect(addButton).toBeTruthy();
    await addButton!.trigger("click");

    expect(addPasskeyMock).toHaveBeenCalledTimes(1);
    expect(addPasskeyMock).toHaveBeenCalledWith({ name: "This device" });
  });

  it("surfaces a success toast after a successful add", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const addButton = wrapper.findAll("button").find((b) => b.text().includes("Add passkey"));
    await addButton!.trigger("click");

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Passkey added", color: "success" }),
    );
  });

  it("surfaces an error toast when addPasskey fails", async () => {
    addPasskeyMock.mockResolvedValueOnce({
      error: { code: "GENERIC", message: "Something went wrong" },
    });
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const addButton = wrapper.findAll("button").find((b) => b.text().includes("Add passkey"));
    await addButton!.trigger("click");

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Passkey setup failed", color: "error" }),
    );
  });

  it("calls revokePasskey with the passkey id when 'Revoke' is clicked", async () => {
    passkeysMock.passkeys.value = [makePasskey({ id: "pk-99", name: "Old phone" })];
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const revokeBtn = wrapper.findAll("button").find((b) => b.text().includes("Revoke"));
    expect(revokeBtn).toBeTruthy();
    await revokeBtn!.trigger("click");

    expect(revokePasskeyMock).toHaveBeenCalledWith("pk-99");
  });

  it("wraps the new-passkey-name input in <ClientOnly> so deviceName-driven UA differences don't cause hydration mismatch", async () => {
    const wrapper = await mountSuspended(ProfileSettingsPasskeysCard);
    const clientOnly = wrapper.findAllComponents({ name: "ClientOnly" });
    expect(clientOnly.length).toBeGreaterThan(0);
    const wrapsInput = clientOnly.some((c) => c.find("input").exists());
    expect(wrapsInput).toBe(true);
  });

  it.todo(
    "Source has no confirmation modal before revoke — revoke fires immediately. Add a confirmation step in the component before testing it here.",
  );
});
