import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import labels from "~/data/notifications.json";
import { makeNotification } from "~~/tests/helpers/notifications";
import NotificationsItem from "~/components/notifications/NotificationsItem.vue";
import type { Notification } from "~/components/notifications/shared";

const mountItem = (notification: Notification, wide = false) =>
  mountSuspended(NotificationsItem, { props: { notification, wide } });

const targetLink = (wrapper: Awaited<ReturnType<typeof mountItem>>) =>
  wrapper.find('[data-testid="notification-target"]');

describe("NotificationsItem", () => {
  it("links the target thumbnail to the target with a labelled anchor", async () => {
    const wrapper = await mountItem(makeNotification());

    const link = wrapper.find(
      `a[aria-label="${labels.viewNamedLabel.replace("{name}", "Wolf Sheep")}"]`,
    );
    expect(link.attributes("href")).toBe("https://mc.test/models/m-1");
    expect(link.find("img").attributes("alt")).toBe("Wolf Sheep");
  });

  it("falls back to the generic target label when the target has no name", async () => {
    const wrapper = await mountItem(
      makeNotification({
        target: {
          name: null,
          thumbnailUrl: "http://cdn.test/wolf.png",
          url: "https://mc.test/models/m-1",
        },
      }),
    );

    const link = wrapper.find(`a[aria-label="${labels.targetFallbackLabel}"]`);
    expect(link.attributes("href")).toBe("https://mc.test/models/m-1");
  });

  it("links the body to the notification url and emits read on click", async () => {
    const wrapper = await mountItem(makeNotification());

    const main = wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]');
    expect(main.text()).toContain("New comment");
    await main.trigger("click");

    expect(wrapper.emitted("read")).toHaveLength(1);
  });

  it("renders flat sibling links inside a non-interactive root", async () => {
    const wrapper = await mountItem(makeNotification());

    expect(wrapper.findAll("a a")).toHaveLength(0);
    expect(wrapper.element.tagName).toBe("DIV");
  });

  // The unread highlight is only exposed as a background class.
  it("highlights the row only while unread", async () => {
    const unread = await mountItem(makeNotification({ readAt: null }));
    const read = await mountItem(makeNotification({ readAt: "2026-10-02T00:00:00.000Z" }));

    expect(unread.classes()).toContain("bg-royal-blue-lightest/90");
    expect(read.classes()).not.toContain("bg-royal-blue-lightest/90");
  });

  it("shows a fixed size placeholder when the target has no thumbnail", async () => {
    const wrapper = await mountItem(
      makeNotification({
        target: { name: "Wolf Sheep", thumbnailUrl: null, url: "https://mc.test/models/m-1" },
      }),
    );

    const link = targetLink(wrapper);
    expect(link.attributes("href")).toBe("https://mc.test/models/m-1");
    expect(link.classes()).toEqual(expect.arrayContaining(["size-10", "shrink-0"]));
    expect(link.find("img").exists()).toBe(false);
    expect(link.find(".iconify, svg, span").exists()).toBe(true);
  });

  it("swaps a thumbnail that fails to load for the placeholder", async () => {
    const wrapper = await mountItem(makeNotification());

    await targetLink(wrapper).find("img").trigger("error");

    expect(targetLink(wrapper).find("img").exists()).toBe(false);
  });

  // In the menu a fixed width text column pushed the thumbnail past the row edge.
  it("lets the menu text shrink and clamps it to whole lines", async () => {
    const menu = await mountItem(makeNotification());
    const feed = await mountItem(makeNotification(), true);
    const body = (wrapper: Awaited<ReturnType<typeof mountItem>>) =>
      wrapper.find('a[href="https://mc.test/models/m-1/comments/c-1"]');

    expect(body(menu).classes()).toEqual(
      expect.arrayContaining(["flex-1", "min-w-0", "max-w-60", "line-clamp-3"]),
    );
    expect(body(menu).classes()).not.toContain("w-60");
    expect(body(feed).classes()).toEqual(expect.arrayContaining(["flex-1", "min-w-0"]));
  });
});
