import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import CommentInput from "./CommentInput.vue";
import { useProfileMock, useUserMock } from "~~/tests/helpers";

mockNuxtImport("useUser", () => () => useUserMock());
mockNuxtImport("useProfile", () => () => useProfileMock());

type CommentInputProps = {
  id?: string;
  target?: string;
  initialText?: string;
  isEditing?: boolean;
};

async function mountInput(props: CommentInputProps = {}) {
  return mountSuspended(CommentInput, { props });
}

function textareaValue(wrapper: Awaited<ReturnType<typeof mountInput>>) {
  return (wrapper.find("textarea").element as HTMLTextAreaElement).value;
}

async function placeholderOf(props: CommentInputProps = {}) {
  const wrapper = await mountInput(props);
  return wrapper.find("textarea").attributes("placeholder");
}

describe("CommentInput placeholder", () => {
  it("shows a default prompt without naming anyone", async () => {
    const placeholder = await placeholderOf();
    expect(placeholder).toBeTruthy();
    expect(placeholder).not.toContain("Jane Doe");
  });

  it("names the target author when replying", async () => {
    const placeholder = await placeholderOf({ target: "Jane Doe" });
    expect(placeholder).toContain("Jane Doe");
    expect(placeholder).not.toBe(await placeholderOf());
  });

  it("distinguishes editing from writing a new comment", async () => {
    const placeholder = await placeholderOf({ isEditing: true });
    expect(placeholder).toBeTruthy();
    expect(placeholder).not.toBe(await placeholderOf());
  });

  it("names the target and differs from a plain reply when editing a reply", async () => {
    const placeholder = await placeholderOf({ isEditing: true, target: "Jane Doe" });
    expect(placeholder).toContain("Jane Doe");
    expect(placeholder).not.toBe(await placeholderOf({ target: "Jane Doe" }));
    expect(placeholder).not.toBe(await placeholderOf({ isEditing: true }));
  });
});

describe("CommentInput submission", () => {
  it("emits submit with the typed text and keeps it until the parent clears", async () => {
    const wrapper = await mountInput();
    await wrapper.find("textarea").setValue("Hello there");
    await wrapper.find("[title='Post']").trigger("click");

    expect(wrapper.emitted("submit")).toEqual([["Hello there"]]);
    expect(textareaValue(wrapper)).toBe("Hello there");
  });

  it("empties the textarea via the exposed clear() method", async () => {
    const ClearHarness = defineComponent({
      setup() {
        const input = ref<{ clear: () => void } | null>(null);
        return () =>
          h("div", [
            h(CommentInput, { ref: input }),
            h("button", {
              "data-testid": "external-clear",
              onClick: () => input.value?.clear(),
            }),
          ]);
      },
    });

    const wrapper = await mountSuspended(ClearHarness);
    await wrapper.find("textarea").setValue("Hello there");

    await wrapper.find("[data-testid='external-clear']").trigger("click");

    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toBe("");
  });

  it("submits on enter", async () => {
    const wrapper = await mountInput();
    const textarea = wrapper.find("textarea");
    await textarea.setValue("Enter submit");
    await textarea.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("submit")).toEqual([["Enter submit"]]);
  });

  it("ignores whitespace-only submissions", async () => {
    const wrapper = await mountInput();
    await wrapper.find("textarea").setValue("   ");
    await wrapper.find("[title='Post']").trigger("click");

    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("seeds the textarea from initialText", async () => {
    const wrapper = await mountInput({ initialText: "Original text" });
    expect(textareaValue(wrapper)).toBe("Original text");
  });

  it("emits cancel when the cancel button is clicked", async () => {
    const wrapper = await mountInput();
    await wrapper.find("[title='Cancel']").trigger("click");

    expect(wrapper.emitted("cancel")).toEqual([[]]);
  });
});
