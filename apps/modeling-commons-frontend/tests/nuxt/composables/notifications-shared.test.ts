import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, iconFor } from "~/components/notifications/shared";
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
