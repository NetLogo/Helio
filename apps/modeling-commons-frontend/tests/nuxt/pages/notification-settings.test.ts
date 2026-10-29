import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPreferenceCategory } from "~/composables/notifications/useNotificationPreferences";
import strings from "~/data/notification-preferences.json";
import { toastAddMock, useToastMock } from "~~/tests/helpers";
import {
  jsonResponse,
  makeRecordingApi,
  type RecordedRequest,
  type RecordingApi,
} from "~~/tests/helpers/notifications";

const { apiState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useToast", () => () => useToastMock());

const categories = [
  {
    category: "comment.on_your_model",
    label: "Comments on your models",
    description: "Someone comments on a model you own.",
    inApp: true,
    email: "immediate",
  },
  {
    category: "comment.reply_to_you",
    label: "Replies to you",
    description: "Someone replies to your comment.",
    inApp: false,
    email: "off",
  },
] satisfies NotificationPreferenceCategory[];

let patchStatus = 204;

beforeEach(() => {
  clearNuxtData("notification-preferences");
  toastAddMock.mockClear();
  patchStatus = 204;
  apiState.current = makeRecordingApi();
  apiState.current.respondWith((request: RecordedRequest) =>
    request.method === "PATCH"
      ? patchStatus === 204
        ? new Response(null, { status: 204 })
        : jsonResponse({ message: "nope" }, patchStatus)
      : jsonResponse({ categories }),
  );
});

const mounted: Array<{ unmount: () => void }> = [];

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountSettings() {
  const Page = (await import("~/pages/settings/notifications.vue")).default;
  const wrapper = await mountSuspended(Page);
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

const patches = () => apiState.current!.requests.filter((r) => r.method === "PATCH");
const rows = (wrapper: Awaited<ReturnType<typeof mountSettings>>) => wrapper.findAll("li");

describe("pages/settings/notifications.vue", () => {
  it("renders a row per category with its label and description", async () => {
    const wrapper = await mountSettings();

    expect(rows(wrapper)).toHaveLength(2);
    expect(rows(wrapper)[0]!.text()).toContain("Comments on your models");
    expect(rows(wrapper)[0]!.text()).toContain("Someone comments on a model you own.");
    expect(rows(wrapper)[1]!.text()).toContain("Replies to you");
  });

  it("saves only inApp when the in-app switch is toggled", async () => {
    const wrapper = await mountSettings();

    await rows(wrapper)[0]!.find('[role="switch"]').trigger("click");
    await flushPromises();

    expect(patches()).toHaveLength(1);
    expect(patches()[0]!.url.pathname).toBe("/api/v1/me/notification-preferences");
    expect(patches()[0]!.body).toEqual({
      preferences: [{ category: "comment.on_your_model", inApp: false }],
    });
  });

  it("saves only email when an email mode is picked", async () => {
    const wrapper = await mountSettings();

    const select = wrapper.findAllComponents({ name: "USelectMenu" })[1]!;
    select.vm.$emit("update:modelValue", "daily");
    await flushPromises();

    expect(patches()[0]!.body).toEqual({
      preferences: [{ category: "comment.reply_to_you", email: "daily" }],
    });
  });

  it("restores the previous value and reports when the save fails", async () => {
    patchStatus = 500;
    const wrapper = await mountSettings();
    const toggle = () => rows(wrapper)[0]!.find('[role="switch"]');
    expect(toggle().attributes("aria-checked")).toBe("true");

    await toggle().trigger("click");
    await flushPromises();

    expect(patches()).toHaveLength(1);
    expect(toggle().attributes("aria-checked")).toBe("true");
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: "error" }));
  });

  it("shows the load error and retries the GET from Try again", async () => {
    apiState.current!.respondWith(() => jsonResponse({ message: "boom" }, 500));
    const wrapper = await mountSettings();
    const gets = () => apiState.current!.requests.filter((r) => r.method === "GET");

    expect(wrapper.text()).toContain(strings.loadErrorTitle);
    const getsBeforeRetry = gets().length;

    const retry = wrapper.findAll("button").find((button) => button.text() === "Try again")!;
    await retry.trigger("click");
    await flushPromises();

    expect(gets()).toHaveLength(getsBeforeRetry + 1);
  });

  it("sends one PATCH while a save for the same category is in flight", async () => {
    apiState.current!.respondWith((request: RecordedRequest) =>
      request.method === "PATCH" ? new Promise<Response>(() => {}) : jsonResponse({ categories }),
    );
    const wrapper = await mountSettings();
    const toggle = wrapper.findAllComponents({ name: "USwitch" })[0]!;

    toggle.vm.$emit("update:modelValue", false);
    await flushPromises();
    toggle.vm.$emit("update:modelValue", true);
    await flushPromises();

    expect(patches()).toHaveLength(1);
  });
});
