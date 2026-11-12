import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { useRuntimeConfig } from "#imports";
import { notificationLiterals as labels } from "~/features/notifications/literals";
import { makeNotification } from "~~/tests/helpers/notifications";
import NotificationsItemAvatar from "~/components/notifications/NotificationsItemAvatar.vue";
import type { UserNotification } from "~/features/notifications/types";

const mountAvatar = (notification: UserNotification) =>
  mountSuspended(NotificationsItemAvatar, { props: { notification } });

describe("NotificationsItemAvatar", () => {
  it("links the actor thumbnail to the actor with a labelled anchor", async () => {
    const wrapper = await mountAvatar(makeNotification());

    const link = wrapper.find(
      `a[aria-label="${labels.viewNamedLabel.replace("{name}", "Ada Lovelace")}"]`,
    );
    expect(link.attributes("href")).toBe("https://mc.test/users/ada");
    expect(link.find("img").attributes("alt")).toBe("Ada Lovelace");
  });

  it("falls back to the generic actor label when the actor has no name", async () => {
    const wrapper = await mountAvatar(
      makeNotification({
        actor: {
          name: null,
          thumbnailUrl: "http://cdn.test/ada.png",
          url: "https://mc.test/users/ada",
        },
      }),
    );

    const link = wrapper.find(`a[aria-label="${labels.actorFallbackLabel}"]`);
    expect(link.attributes("href")).toBe("https://mc.test/users/ada");
  });

  it("renders no link when the actor has no thumbnail", async () => {
    const wrapper = await mountAvatar(
      makeNotification({
        actor: { name: "Ada", thumbnailUrl: null, url: "https://mc.test/users/ada" },
      }),
    );

    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("swaps an actor thumbnail that fails to load for the category icon", async () => {
    const wrapper = await mountAvatar(makeNotification());

    await wrapper.find("img").trigger("error");

    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("links a same-origin actor url in-app and emits read on click", async () => {
    const appUrl = useRuntimeConfig().public.appUrl as string;
    const wrapper = await mountAvatar(
      makeNotification({
        actor: {
          name: "Ada",
          thumbnailUrl: "http://cdn.test/ada.png",
          url: new URL("/users/ada", appUrl).href,
        },
      }),
    );

    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("/users/ada");
    await link.trigger("click");

    expect(wrapper.emitted("read")).toHaveLength(1);
  });
});
