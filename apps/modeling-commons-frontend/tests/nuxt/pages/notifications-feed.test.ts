import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { Notification } from "~/components/notifications/shared";
import labels from "~/data/notifications.json";
import { makeNotification } from "~~/tests/helpers/notifications";

function makeState() {
  const unreadOnly = ref(false);
  return {
    notifications: ref<Notification[]>([]),
    unreadCount: ref(0),
    unreadOnly,
    setUnreadOnly: vi.fn((value: boolean) => {
      unreadOnly.value = value;
    }),
    pending: ref(false),
    error: ref<unknown>(null),
    hasMore: ref(false),
    markRead: vi.fn(),
    nextPage: vi.fn(),
  };
}

let state = makeState();

mockNuxtImport("useNotifications", () => () => state);

beforeEach(() => {
  state = makeState();
});

async function mountFeed() {
  const Page = (await import("~/pages/notifications.vue")).default;
  const wrapper = await mountSuspended(Page);
  await flushPromises();
  return wrapper;
}

const loadMore = (wrapper: Awaited<ReturnType<typeof mountFeed>>) =>
  wrapper.findAll("button").find((b) => b.text() === labels.loadMore);

const unread = makeNotification({ id: "u", title: "Unread one", url: "/models/m-1/comments/u" });
const read = makeNotification({
  id: "r",
  title: "Read one",
  url: "/models/m-1/comments/r",
  readAt: "2026-10-02T00:00:00.000Z",
});

describe("pages/notifications.vue", () => {
  it("renders every notification", async () => {
    state.notifications.value = [unread, read];
    const wrapper = await mountFeed();

    expect(wrapper.text()).toContain("Unread one");
    expect(wrapper.text()).toContain("Read one");
  });

  it("stretches rows to the page width instead of the menu width", async () => {
    state.notifications.value = [unread];
    const wrapper = await mountFeed();

    const row = wrapper.find('a[href="/models/m-1/comments/u"]');
    expect(row.classes()).toContain("flex-1");
    expect(row.classes()).not.toContain("w-60");
  });

  it("shows Load more only while there are more pages and loads the next page on click", async () => {
    state.notifications.value = [unread];
    const done = await mountFeed();
    expect(loadMore(done)).toBeUndefined();

    state.hasMore.value = true;
    const more = await mountFeed();
    await loadMore(more)!.trigger("click");

    expect(state.nextPage).toHaveBeenCalled();
  });

  it("switches to unread only and hides read notifications", async () => {
    state.notifications.value = [unread, read];
    const wrapper = await mountFeed();

    await wrapper.find('[role="switch"]').trigger("click");
    await flushPromises();

    expect(state.setUnreadOnly).toHaveBeenCalledWith(true);
    expect(wrapper.text()).toContain("Unread one");
    expect(wrapper.text()).not.toContain("Read one");
  });

  it("shows the unread empty message when unread only has nothing to show", async () => {
    state.notifications.value = [read];
    state.unreadOnly.value = true;
    const wrapper = await mountFeed();

    expect(wrapper.text()).toContain(labels.emptyUnread);
  });
});
