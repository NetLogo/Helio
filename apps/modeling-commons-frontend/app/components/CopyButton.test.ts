import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import CopyButton from "./CopyButton.vue";

const { copyTextToClipboardMock, toastAdd } = vi.hoisted(() => ({
  copyTextToClipboardMock: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock("~/utils/navigator", () => ({
  copyTextToClipboard: copyTextToClipboardMock,
}));

mockNuxtImport("useToast", () => () => ({ add: toastAdd }));

describe("CopyButton", () => {
  beforeEach(() => {
    copyTextToClipboardMock.mockReset();
    toastAdd.mockReset();
  });

  it("calls copyTextToClipboard with the text on click", async () => {
    copyTextToClipboardMock.mockResolvedValue(undefined);
    const wrapper = await mountSuspended(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    expect(copyTextToClipboardMock).toHaveBeenCalledWith("hello");
  });

  it("shows an error toast when copy fails", async () => {
    copyTextToClipboardMock.mockRejectedValue(new Error("nope"));
    const wrapper = await mountSuspended(CopyButton, { props: { text: "hello" } });
    await wrapper.find("button").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(toastAdd.mock.calls[0]![0]).toMatchObject({
      color: "error",
    });
  });

  it("disables the button while copying so re-clicks are gated", async () => {
    let resolveCopy: () => void = () => {};
    copyTextToClipboardMock.mockImplementation(
      () => new Promise<void>((resolve) => (resolveCopy = resolve)),
    );
    const wrapper = await mountSuspended(CopyButton, { props: { text: "hello" } });
    const button = wrapper.find("button");
    await button.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(button.attributes("disabled")).toBeDefined();
    resolveCopy();
  });

  it("disables the button when text is missing", async () => {
    const wrapper = await mountSuspended(CopyButton, { props: { text: "" } });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});
