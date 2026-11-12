import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, iconFor, toInAppLink } from "~/components/notifications/shared";
import type { UserNotification } from "~/features/notifications/types";

describe("iconFor", () => {
  it("maps comment categories to the comment icon", () => {
    expect(iconFor("comment.on_your_model")).toBe("lucide:message-circle");
    expect(iconFor("comment.reply_to_you")).toBe("lucide:message-circle");
  });

  it("falls back to the bell for an unknown category", () => {
    expect(iconFor("model.liked" as UserNotification["category"])).toBe(FALLBACK_ICON);
  });
});

const appUrl = "https://mc.test";

describe("toInAppLink", () => {
  it("turns a same-origin url into a path with its query and hash", () => {
    expect(toInAppLink("https://mc.test/models/m-1/comments/c-1?page=2#c-1", appUrl)).toBe(
      "/models/m-1/comments/c-1?page=2#c-1",
    );
  });

  it("ignores a path on the app url when comparing origins", () => {
    expect(toInAppLink("https://mc.test/users/ada", "https://mc.test/app/")).toBe("/users/ada");
  });

  it("keeps a url from another origin absolute", () => {
    expect(toInAppLink("https://other.test/models/m-1", appUrl)).toBe(
      "https://other.test/models/m-1",
    );
  });

  it("treats a different scheme or port as another origin", () => {
    expect(toInAppLink("http://mc.test/models/m-1", appUrl)).toBe("http://mc.test/models/m-1");
    expect(toInAppLink("https://mc.test:8443/models/m-1", appUrl)).toBe(
      "https://mc.test:8443/models/m-1",
    );
  });
});
