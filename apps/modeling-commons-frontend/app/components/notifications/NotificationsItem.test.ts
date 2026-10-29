import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import labels from "~/data/notifications.json";
import { makeNotification } from "~~/tests/helpers/notifications";
import NotificationsItem from "./NotificationsItem.vue";
import type { Notification } from "./shared";

const mountItem = (notification: Notification) =>
  mountSuspended(NotificationsItem, { props: { notification } });

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
});
