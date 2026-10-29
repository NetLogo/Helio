import { mockComponent, mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import labels from "~/data/notifications.json";
import { makeNotification } from "~~/tests/helpers/notifications";
import NotificationsMenu from "./NotificationsMenu.vue";
import type { Notification } from "./shared";

function makeState() {
  return {
    notifications: ref<Notification[]>([]),
    unreadCount: ref(0),
    pending: ref(false),
    error: ref<unknown>(null),
    hasMore: ref(false),
    markRead: vi.fn(),
  };
}

let state = makeState();

mockNuxtImport("useNotifications", () => () => state);

// The real dropdown only renders its content after a pointer-driven open inside a portal.
mockComponent("UDropdownMenu", async () => {
  const { defineComponent, h } = await import("vue");
  return defineComponent({
    setup(_, { slots }) {
      return () => h("div", [slots.default?.(), slots["content-top"]?.()]);
    },
  });
});

beforeEach(() => {
  state = makeState();
});

const seeAll = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.find('a[href="/notifications"]');

describe("NotificationsMenu", () => {
  it("shows the empty state and no feed link when there are no notifications", async () => {
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.text()).toContain("Nothing to see here.");
    expect(seeAll(wrapper).exists()).toBe(false);
  });

  it("shows the error state when loading failed", async () => {
    state.error.value = new Error("Backend down");
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.text()).toContain("Backend down");
  });

  it("shows the unread dot only when unreadCount is above zero", async () => {
    const none = await mountSuspended(NotificationsMenu);
    expect(none.text()).not.toContain("Unread notifications");

    state.unreadCount.value = 2;
    const some = await mountSuspended(NotificationsMenu);
    expect(some.text()).toContain("Unread notifications");
  });

  it("links to the full feed when there are notifications", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(seeAll(wrapper).text()).toBe(labels.menuSeeAll);
  });

  it("marks a notification read when its link is clicked", async () => {
    state.notifications.value = [makeNotification({ id: "n-42" })];
    const wrapper = await mountSuspended(NotificationsMenu);

    await wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]').trigger("click");

    expect(state.markRead).toHaveBeenCalledWith("n-42");
  });

  it("keeps rows at the fixed menu width", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountSuspended(NotificationsMenu);

    const row = wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]');
    expect(row.classes()).toContain("w-60");
  });
});
