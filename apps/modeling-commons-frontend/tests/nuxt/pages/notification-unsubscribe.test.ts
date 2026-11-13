import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notificationUnsubscribeLiterals as strings } from "~/features/notification-unsubscribe/literals";
import { jsonResponse, makeRecordingApi, type RecordingApi } from "~~/tests/helpers/notifications";

const { apiState, routeState } = vi.hoisted(() => ({
  apiState: { current: null as RecordingApi | null },
  routeState: { query: {} as Record<string, string> },
}));

mockNuxtImport("useApi", () => () => apiState.current!.client);
mockNuxtImport("useRoute", () => () => ({
  name: "unsubscribe",
  path: "/unsubscribe",
  fullPath: "/unsubscribe",
  params: {},
  query: routeState.query,
  hash: "",
  matched: [],
  meta: {},
}));

const mounted: Array<{ unmount: () => void }> = [];

beforeEach(() => {
  routeState.query = { token: "signed.token" };
  apiState.current = makeRecordingApi();
  apiState.current.respondWith(() => new Response(null, { status: 204 }));
});

afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

async function mountPage() {
  const Page = (await import("~/pages/unsubscribe.vue")).default;
  const wrapper = await mountSuspended(Page);
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

type PageWrapper = Awaited<ReturnType<typeof mountPage>>;

function findButton(wrapper: PageWrapper, label: string) {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === label);
  if (!button) throw new Error(`No button labelled ${label}`);
  return button;
}

async function confirm(wrapper: PageWrapper, label: string = strings.confirmButton) {
  await findButton(wrapper, label).trigger("click");
  await flushPromises();
}

const requests = () => apiState.current!.requests;

describe("pages/unsubscribe.vue", () => {
  it("asks for confirmation and sends nothing on load", async () => {
    const wrapper = await mountPage();

    expect(wrapper.text()).toContain(strings.intros.confirm.title);
    expect(requests()).toHaveLength(0);
  });

  it("posts the token from the link and shows the confirmed state", async () => {
    const wrapper = await mountPage();

    await confirm(wrapper);

    expect(requests()).toHaveLength(1);
    expect(requests()[0]!.method).toBe("POST");
    expect(requests()[0]!.url.pathname).toBe("/api/v1/notification-unsubscribe");
    expect(requests()[0]!.url.searchParams.get("token")).toBe("signed.token");
    expect(wrapper.text()).toContain(strings.intros.done.title);
    expect(wrapper.findAll("button").map((button) => button.text())).not.toContain(
      strings.confirmButton,
    );
  });

  it("shows the invalid link state when the server refuses the token", async () => {
    apiState.current!.respondWith(() => jsonResponse({ message: "invalid" }, 400));
    const wrapper = await mountPage();

    await confirm(wrapper);

    expect(wrapper.text()).toContain(strings.intros.invalid.title);
    expect(wrapper.text()).not.toContain(strings.intros.done.title);
    expect(wrapper.findAll("button").map((button) => button.text())).not.toContain(
      strings.confirmButton,
    );
  });

  it("shows the invalid link state without a request when the link has no token", async () => {
    routeState.query = {};
    const wrapper = await mountPage();

    expect(wrapper.text()).toContain(strings.intros.invalid.title);
    expect(requests()).toHaveLength(0);
  });

  it("offers a retry after a server failure and confirms once it succeeds", async () => {
    apiState.current!.respondWith(() => jsonResponse({ message: "down" }, 500));
    const wrapper = await mountPage();

    await confirm(wrapper);
    expect(wrapper.text()).toContain(strings.intros.failed.title);

    apiState.current!.respondWith(() => new Response(null, { status: 204 }));
    await confirm(wrapper, strings.retryButton);

    expect(requests()).toHaveLength(2);
    expect(wrapper.text()).toContain(strings.intros.done.title);
  });

  it("offers a retry after a network failure and confirms once it succeeds", async () => {
    apiState.current!.respondWith(() => {
      throw new TypeError("Failed to fetch");
    });
    const wrapper = await mountPage();

    await confirm(wrapper);
    expect(wrapper.text()).toContain(strings.intros.failed.title);
    expect(wrapper.text()).toContain(strings.intros.failed.description);
    const retry = findButton(wrapper, strings.retryButton);
    expect(retry.attributes("disabled")).toBeUndefined();

    apiState.current!.respondWith(() => new Response(null, { status: 204 }));
    await confirm(wrapper, strings.retryButton);

    expect(requests()).toHaveLength(2);
    expect(wrapper.text()).toContain(strings.intros.done.title);
  });

  it("links to the notification settings", async () => {
    const wrapper = await mountPage();

    const link = wrapper.find('a[href="/settings/notifications"]');
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe(strings.settingsLink);
  });
});
