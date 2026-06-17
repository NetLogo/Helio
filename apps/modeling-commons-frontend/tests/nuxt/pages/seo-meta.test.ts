import { ref, computed } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime";

const {
  useSeoMetaSpy,
  useHeadSpy,
  useModelsMock,
  useModelCardMock,
  useModelVersionCardMock,
  useProfileSettingsMock,
  useAuthActionsMock,
  usePasskeysMock,
  useWebsiteMock,
  apiMock,
} = vi.hoisted(() => ({
  useSeoMetaSpy: vi.fn(),
  useHeadSpy: vi.fn(),
  useModelsMock: vi.fn(),
  useModelCardMock: vi.fn(),
  useModelVersionCardMock: vi.fn(),
  useProfileSettingsMock: vi.fn(),
  useAuthActionsMock: vi.fn(),
  usePasskeysMock: vi.fn(),
  useWebsiteMock: vi.fn(),
  apiMock: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

mockNuxtImport("useSeoMeta", () => useSeoMetaSpy);
mockNuxtImport("useHead", () => useHeadSpy);

mockNuxtImport("useApi", () => () => apiMock);

mockNuxtImport("useForumModels", () => useModelsMock);
mockNuxtImport("useModelCard", () => useModelCardMock);
mockNuxtImport("useModelVersionCard", () => useModelVersionCardMock);
mockNuxtImport("useProfileSettings", () => useProfileSettingsMock);
mockNuxtImport("useAuthActions", () => useAuthActionsMock);
mockNuxtImport("usePasskeys", () => usePasskeysMock);
mockNuxtImport("useWebsite", () => useWebsiteMock);

function emptyAsyncData() {
  return {
    data: ref(null),
    error: ref(null),
    pending: ref(false),
    status: ref("idle"),
    refresh: vi.fn(),
    execute: vi.fn(),
  };
}

beforeEach(() => {
  useSeoMetaSpy.mockClear();
  useHeadSpy.mockClear();
  apiMock.GET.mockResolvedValue({ data: { data: [] } });

  useModelsMock.mockReturnValue({
    rows: ref([]),
    totalCount: ref(0),
    filters: ref({ keyword: "", isEndorsed: null }),
    pending: ref(false),
    error: ref(null),
    hasMore: ref(false),
    isEmpty: ref(true),
    refresh: vi.fn(),
    setFilter: vi.fn(),
    nextPage: vi.fn(),
    resetFilters: vi.fn(),
  });

  useModelCardMock.mockReturnValue(emptyAsyncData());
  useModelVersionCardMock.mockReturnValue(emptyAsyncData());

  useProfileSettingsMock.mockReturnValue({
    profile: ref(null),
    refresh: vi.fn(),
    status: ref("pending"),
    displayName: ref("Test"),
    displayEmail: ref("test@example.com"),
    displayImage: ref(null),
    emailVerified: ref(false),
    systemRoleLabel: ref(""),
    isProfilePublic: ref(false),
    userKind: ref(""),
    userKindOptions: ref([]),
    isDirty: ref(false),
    isSaving: ref(false),
    resetProfileSettings: vi.fn(),
    saveProfileSettings: vi.fn(),
  });

  useAuthActionsMock.mockReturnValue({
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
  });

  usePasskeysMock.mockReturnValue({
    isPasskeySupported: computed(() => false),
    signInWithPasskey: vi.fn(),
  });

  useWebsiteMock.mockReturnValue(
    ref({
      name: "Modeling Commons",
      fullName: "Modeling Commons",
      logo: "",
      description: "Browse simulations from the NetLogo community.",
      longDescription: "",
      url: "https://modelingcommons.example",
      keywords: [],
    }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

function lastSeoCall() {
  const calls = useSeoMetaSpy.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1]![0] as Record<string, unknown>;
}

function resolveMaybe(value: unknown): unknown {
  return typeof value === "function" ? (value as () => unknown)() : value;
}

describe("Page SEO meta", () => {
  it("index.vue sets title and description via useSeoMeta", async () => {
    const Page = (await import("~/pages/index.vue")).default;
    await mountSuspended(Page);
    const meta = lastSeoCall();
    expect(meta).not.toBeNull();
    const title = String(resolveMaybe(meta!.title) ?? "");
    const description = String(resolveMaybe(meta!.description) ?? "");
    expect(title.length).toBeGreaterThan(0);
    expect(description.length).toBeGreaterThan(0);
  });

  it.todo(
    "models/index.vue sets title containing 'Explore' and a description — page mounts a NetLogoVersionSelectMenu fed by a search controller that doesn't initialize cleanly in mountSuspended; cover via an E2E test instead",
  );

  it("models/[id]/index.vue sets title and description via useSeoMeta (resolves via getter)", async () => {
    const Page = (await import("~/pages/models/[id]/index.vue")).default;
    await mountSuspended(Page);
    const meta = lastSeoCall();
    expect(meta).not.toBeNull();
    const title = String(resolveMaybe(meta!.title) ?? "");
    const description = String(resolveMaybe(meta!.description) ?? "");
    expect(title.length).toBeGreaterThan(0);
    expect(description.length).toBeGreaterThan(0);
  });

  it("profile/(edit)/settings.vue sets 'Profile Settings' title and description", async () => {
    const Page = (await import("~/pages/profile/(edit)/settings.vue")).default;
    await mountSuspended(Page);
    const meta = lastSeoCall();
    expect(meta).not.toBeNull();
    expect(String(resolveMaybe(meta!.title))).toContain("Profile Settings");
    expect(String(resolveMaybe(meta!.description) ?? "").length).toBeGreaterThan(0);
  });

  it("(auth)/login.vue sets 'Login' title and a description", async () => {
    const Page = (await import("~/pages/(auth)/login.vue")).default;
    await mountSuspended(Page);
    const meta = lastSeoCall();
    expect(meta).not.toBeNull();
    expect(String(resolveMaybe(meta!.title))).toContain("Log In");
    expect(String(resolveMaybe(meta!.description) ?? "").length).toBeGreaterThan(0);
  });

  it("(auth)/signup.vue sets 'Sign up' title and a description", async () => {
    const Page = (await import("~/pages/(auth)/signup.vue")).default;
    await mountSuspended(Page);
    const meta = lastSeoCall();
    expect(meta).not.toBeNull();
    expect(String(resolveMaybe(meta!.title)).toLowerCase()).toContain("sign");
    expect(String(resolveMaybe(meta!.description) ?? "").length).toBeGreaterThan(0);
  });
});
