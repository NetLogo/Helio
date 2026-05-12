// Per Phase 2b's finding: ModelBottomBar.vue itself only emits `toggleLike` — the
// network call + optimistic state live on the parent ModelDetail.vue. Mounting
// ModelDetail directly drags in a long tail of heavy children (ModelHeader,
// NetlogoWebEmbed, all four tab panels, useModelCard/useModelVersions/etc.),
// so this file uses a focused harness that mirrors the like-handler's contract:
//   - flip optimistically before awaiting the mutation
//   - on rejection, restore the original state and surface a toast
//   - guard re-entry while a request is in flight
// If the day comes that ModelDetail mounts cleanly under test, this can be
// converted to mount ModelDetail and click the real ModelBottomBar Like button.

import { reactive, ref, defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ModelBottomBar from "./ModelBottomBar.vue";

type Stats = { likes: number; likedByMe: boolean };

function createHarness(opts: {
  like: () => Promise<void>;
  unlike: () => Promise<void>;
  toast: (msg: { title: string; color?: string }) => void;
  initial?: Partial<Stats>;
}) {
  return defineComponent({
    components: { ModelBottomBar },
    setup() {
      const stats = reactive<Stats>({
        likes: opts.initial?.likes ?? 5,
        likedByMe: opts.initial?.likedByMe ?? false,
      });
      const busy = ref(false);

      async function handleToggleLike() {
        if (busy.value) return;
        busy.value = true;
        const wasLiked = stats.likedByMe;
        stats.likedByMe = !wasLiked;
        stats.likes += wasLiked ? -1 : 1;
        try {
          if (wasLiked) await opts.unlike();
          else await opts.like();
        } catch {
          stats.likedByMe = wasLiked;
          stats.likes += wasLiked ? 1 : -1;
          opts.toast({ title: "Failed to update like", color: "error" });
        } finally {
          busy.value = false;
        }
      }

      return { stats, busy, handleToggleLike };
    },
    render() {
      return h(ModelBottomBar, {
        likes: this.stats.likes,
        downloads: 0,
        views: 0,
        runs: 0,
        likedByMe: this.stats.likedByMe,
        busy: this.busy,
        onToggleLike: this.handleToggleLike,
      });
    },
  });
}

let likeMock: ReturnType<typeof vi.fn>;
let unlikeMock: ReturnType<typeof vi.fn>;
let toastMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  likeMock = vi.fn();
  unlikeMock = vi.fn();
  toastMock = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function clickLike(wrapper: ReturnType<typeof mount>) {
  const likeBtn = wrapper.findAll("button").find((b) => b.text().includes("Like"));
  expect(likeBtn).toBeTruthy();
  return likeBtn!.trigger("click");
}

describe("ModelDetail like-handler rollback (focused harness)", () => {
  function likedLabel(wrapper: ReturnType<typeof mount>): string {
    const btn = wrapper.findAll("button").find((b) => /\b(Like|Liked)\b/.test(b.text()));
    return btn?.text() ?? "";
  }

  it("flips UI optimistically and persists on success", async () => {
    let resolve!: () => void;
    likeMock.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolve = r;
      }),
    );
    const Harness = createHarness({ like: likeMock, unlike: unlikeMock, toast: toastMock });

    const wrapper = mount(Harness);
    expect(likedLabel(wrapper)).toBe("Like");

    await clickLike(wrapper);
    expect(likedLabel(wrapper)).toBe("Liked");
    expect(wrapper.text()).toContain("6");

    resolve();
    await flushPromises();
    expect(likedLabel(wrapper)).toBe("Liked");
    expect(wrapper.text()).toContain("6");
    expect(likeMock).toHaveBeenCalledTimes(1);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("rolls back UI and shows a toast when the like network call rejects", async () => {
    let reject!: (err: unknown) => void;
    likeMock.mockReturnValueOnce(
      new Promise<void>((_, r) => {
        reject = r;
      }),
    );
    const Harness = createHarness({ like: likeMock, unlike: unlikeMock, toast: toastMock });

    const wrapper = mount(Harness);

    await clickLike(wrapper);
    expect(likedLabel(wrapper)).toBe("Liked");
    expect(wrapper.text()).toContain("6");

    reject(new Error("boom"));
    await flushPromises();

    expect(likedLabel(wrapper)).toBe("Like");
    expect(wrapper.text()).toContain("5");
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock.mock.calls[0]![0].title).toMatch(/like/i);
  });

  it("rolls back unlike when the network call rejects (already-liked → liked)", async () => {
    let reject!: (err: unknown) => void;
    unlikeMock.mockReturnValueOnce(
      new Promise<void>((_, r) => {
        reject = r;
      }),
    );
    const Harness = createHarness({
      like: likeMock,
      unlike: unlikeMock,
      toast: toastMock,
      initial: { likes: 5, likedByMe: true },
    });

    const wrapper = mount(Harness);
    expect(likedLabel(wrapper)).toBe("Liked");

    await clickLike(wrapper);
    expect(likedLabel(wrapper)).toBe("Like");
    expect(wrapper.text()).toContain("4");

    reject(new Error("boom"));
    await flushPromises();

    expect(likedLabel(wrapper)).toBe("Liked");
    expect(wrapper.text()).toContain("5");
    expect(toastMock).toHaveBeenCalledTimes(1);
  });

  it("ignores rapid re-entry while a like request is in flight", async () => {
    let resolve!: () => void;
    likeMock.mockReturnValueOnce(
      new Promise<void>((r) => {
        resolve = r;
      }),
    );
    const Harness = createHarness({ like: likeMock, unlike: unlikeMock, toast: toastMock });

    const wrapper = mount(Harness);

    await clickLike(wrapper);
    await clickLike(wrapper);
    await clickLike(wrapper);

    expect(likeMock).toHaveBeenCalledTimes(1);

    resolve();
    await flushPromises();

    expect(wrapper.text()).toContain("Liked");
    expect(wrapper.text()).toContain("6");
  });

  it.todo(
    "mount ModelDetail.vue end-to-end and click the real Like button — currently blocked by heavy child + composable dependencies (ModelHeader, NetlogoWebEmbed, useModelCard/useModelVersions, etc.)",
  );
});
