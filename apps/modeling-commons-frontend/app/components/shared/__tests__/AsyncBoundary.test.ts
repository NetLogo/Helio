import { describe, expect, it, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import AsyncBoundary from "~/components/shared/AsyncBoundary.vue";

const slots = {
  loading: () => "loading",
  empty: () => "empty",
  default: () => "content",
};

describe("AsyncBoundary", () => {
  it("holds the loading slot back until the delay elapses", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = await mountSuspended(AsyncBoundary, {
        props: { pending: true, empty: true, loadingDelay: 200 },
        slots,
      });
      expect(wrapper.text()).toBe("");

      vi.advanceTimersByTime(200);
      await nextTick();
      expect(wrapper.text()).toBe("loading");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never paints the loading slot for a fetch that settles within the delay", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = await mountSuspended(AsyncBoundary, {
        props: { pending: true, empty: true, loadingDelay: 200 },
        slots,
      });
      vi.advanceTimersByTime(50);
      await wrapper.setProps({ pending: false, empty: false });
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(wrapper.text()).toBe("content");
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the empty slot when idle without rows", async () => {
    const wrapper = await mountSuspended(AsyncBoundary, {
      props: { pending: false, empty: true },
      slots,
    });
    expect(wrapper.text()).toBe("empty");
  });
});
