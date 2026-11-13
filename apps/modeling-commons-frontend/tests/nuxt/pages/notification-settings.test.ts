import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationPreferenceCategory } from "~/features/notification-preferences/types";
import { notificationPreferenceLiterals as strings } from "~/features/notification-preferences/literals";
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
const IN_APP = 0;
const EMAIL = 1;
const radio = (
  wrapper: Awaited<ReturnType<typeof mountSettings>>,
  row: number,
  group: number,
  option: number,
) => rows(wrapper)[row]!.findAll('[role="radiogroup"]')[group]!.findAll('[role="radio"]')[option]!;

describe("pages/settings/notifications.vue", () => {
  it("renders a row per category with its label and description", async () => {
    const wrapper = await mountSettings();

    expect(rows(wrapper)).toHaveLength(2);
    expect(rows(wrapper)[0]!.text()).toContain("Comments on your models");
    expect(rows(wrapper)[0]!.text()).toContain("Someone comments on a model you own.");
    expect(rows(wrapper)[1]!.text()).toContain("Replies to you");
  });

  const button = (wrapper: Awaited<ReturnType<typeof mountSettings>>, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;

  it("sends nothing until Save changes, then one PATCH with only the changed fields", async () => {
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await radio(wrapper, 1, EMAIL, 1).trigger("click");
    await flushPromises();
    expect(patches()).toHaveLength(0);
    expect(wrapper.text()).toContain(strings.unsavedMessage);

    await button(wrapper, strings.saveLabel).trigger("click");
    await flushPromises();

    expect(patches()).toHaveLength(1);
    expect(patches()[0]!.url.pathname).toBe("/api/v1/me/notification-preferences");
    expect(patches()[0]!.body).toEqual({
      preferences: [
        { category: "comment.on_your_model", inApp: false },
        { category: "comment.reply_to_you", email: "daily" },
      ],
    });
    expect(wrapper.text()).toContain(strings.savedMessage);
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: "success" }));
  });

  it("leaves a choice changed back to its saved value out of the PATCH", async () => {
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await radio(wrapper, 0, IN_APP, 0).trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain(strings.savedMessage);
    expect(button(wrapper, strings.saveLabel).attributes("disabled")).toBeDefined();
  });

  it("keeps the edits and reports when the save fails", async () => {
    patchStatus = 500;
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await button(wrapper, strings.saveLabel).trigger("click");
    await flushPromises();

    expect(patches()).toHaveLength(1);
    expect(radio(wrapper, 0, IN_APP, 1).attributes("aria-checked")).toBe("true");
    expect(wrapper.text()).toContain(strings.unsavedMessage);
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: "error" }));
  });

  it("keeps the edits and unlocks the controls when the request rejects", async () => {
    apiState.current!.respondWith((request: RecordedRequest) =>
      request.method === "PATCH"
        ? Promise.reject(new TypeError("Failed to fetch"))
        : jsonResponse({ categories }),
    );
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await button(wrapper, strings.saveLabel).trigger("click");
    await flushPromises();

    expect(radio(wrapper, 0, IN_APP, 1).attributes("aria-checked")).toBe("true");
    expect(radio(wrapper, 0, IN_APP, 0).attributes("disabled")).toBeUndefined();
    expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ color: "error" }));
  });

  it("Reset puts back the saved values without a request", async () => {
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await button(wrapper, strings.resetLabel).trigger("click");
    await flushPromises();

    expect(radio(wrapper, 0, IN_APP, 0).attributes("aria-checked")).toBe("true");
    expect(wrapper.text()).toContain(strings.savedMessage);
    expect(patches()).toHaveLength(0);
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

  it("sends one PATCH when Save changes is clicked twice while saving", async () => {
    apiState.current!.respondWith((request: RecordedRequest) =>
      request.method === "PATCH" ? new Promise<Response>(() => {}) : jsonResponse({ categories }),
    );
    const wrapper = await mountSettings();

    await radio(wrapper, 0, IN_APP, 1).trigger("click");
    await button(wrapper, strings.saveLabel).trigger("click");
    await button(wrapper, strings.saveLabel).trigger("click");
    await flushPromises();

    expect(patches()).toHaveLength(1);
  });
});
