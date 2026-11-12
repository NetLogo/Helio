import { mockComponent, mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { notificationLiterals as labels } from "~/features/notifications/literals";
import { makeNotification } from "~~/tests/helpers/notifications";
import NotificationsMenu from "~/components/notifications/NotificationsMenu.vue";
import type { UserNotification } from "~/features/notifications/types";

function makeState() {
  return {
    notifications: ref<UserNotification[]>([]),
    unreadCount: ref(0),
    pending: ref(false),
    error: ref<unknown>(null),
    hasMore: ref(false),
    markRead: vi.fn(),
  };
}

let state = makeState();

mockNuxtImport("useNotifications", () => () => state);

// The real popover only renders its content after a pointer-driven open inside a portal.
mockComponent("UPopover", async () => {
  const { defineComponent, h } = await import("vue");
  return defineComponent({
    props: { open: Boolean },
    emits: ["update:open"],
    setup(props, { slots, emit }) {
      return () =>
        h("div", { "data-testid": "popover", "data-open": String(props.open) }, [
          h("button", { "data-testid": "popover-open", onClick: () => emit("update:open", true) }),
          slots.default?.(),
          slots.content?.(),
        ]);
    },
  });
});

beforeEach(() => {
  state = makeState();
});

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>;

const seeAll = (wrapper: Wrapper) => wrapper.find('a[href="/notifications"]');

const isOpen = (wrapper: Wrapper) =>
  wrapper.find('[data-testid="popover"]').attributes("data-open") === "true";

async function mountOpenMenu() {
  const wrapper = await mountSuspended(NotificationsMenu);
  await wrapper.find('[data-testid="popover-open"]').trigger("click");
  expect(isOpen(wrapper)).toBe(true);
  return wrapper;
}

describe("NotificationsMenu", () => {
  it("shows the empty state and no feed link when there are no notifications", async () => {
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.text()).toContain("Nothing to see here.");
    expect(seeAll(wrapper).exists()).toBe(false);
  });

  it("shows a fixed error message instead of the raw error when loading failed", async () => {
    state.error.value = new Error("Backend down");
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.text()).toContain(labels.loadErrorTitle);
    expect(wrapper.text()).toContain(labels.loadErrorMessage);
    expect(wrapper.text()).not.toContain("Backend down");
  });

  it("keeps the loaded list and flags the failure inline when loading more fails", async () => {
    state.notifications.value = [makeNotification()];
    state.error.value = new Error("Backend down");
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain(labels.loadErrorTitle);
    expect(wrapper.find('[role="alert"]').text()).toBe(labels.loadErrorMessage);
  });

  it("shows no inline failure while the loaded list is healthy", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("keeps the loaded list while refreshing", async () => {
    state.notifications.value = [makeNotification()];
    state.pending.value = true;
    const wrapper = await mountSuspended(NotificationsMenu);

    expect(wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]').exists()).toBe(true);
  });

  it("names the bell with the unread count only when unreadCount is above zero", async () => {
    const bell = (wrapper: Wrapper) => wrapper.find("button[aria-label]").attributes("aria-label");

    const none = await mountSuspended(NotificationsMenu);
    expect(bell(none)).toBe(labels.bellLabel);

    state.unreadCount.value = 2;
    const some = await mountSuspended(NotificationsMenu);
    expect(bell(some)).toBe(labels.bellUnreadLabel.replace("{count}", "2"));
    expect(bell(some)).toContain("2");
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

  it("caps row text at the menu width", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountSuspended(NotificationsMenu);

    const row = wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]');
    expect(row.classes()).toContain("max-w-60");
  });

  it("closes when a notification is opened", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountOpenMenu();

    await wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]').trigger("click");

    expect(isOpen(wrapper)).toBe(false);
  });

  it("closes when the full feed link is clicked", async () => {
    state.notifications.value = [makeNotification()];
    const wrapper = await mountOpenMenu();

    await seeAll(wrapper).trigger("click");

    expect(isOpen(wrapper)).toBe(false);
  });
});
