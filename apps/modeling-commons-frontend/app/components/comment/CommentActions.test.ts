import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { UDropdownMenu } from "#components";
import type { DropdownMenuItem } from "#ui/types";
import CommentActions from "./CommentActions.vue";

type DropdownConstructor = new () => { $props: { items: Array<DropdownMenuItem> } };
const DropdownMenu = UDropdownMenu as unknown as DropdownConstructor;

describe("CommentActions", () => {
  it("shows the like count", async () => {
    const wrapper = await mountSuspended(CommentActions, { props: { likes: 24 } });
    expect(wrapper.find("[title='Like']").text()).toContain("24");
  });

  it("shows the reply count on the reply button when positive", async () => {
    const wrapper = await mountSuspended(CommentActions, {
      props: { likes: 0, replyCount: 3 },
    });
    expect(wrapper.find("[title='Reply']").text()).toContain("3");
  });

  it("shows no count on the reply button when there are no replies", async () => {
    const wrapper = await mountSuspended(CommentActions, {
      props: { likes: 0, replyCount: 0 },
    });
    expect(wrapper.find("[title='Reply']").text()).not.toMatch(/\d/);
  });

  it("emits like and reply when the buttons are clicked", async () => {
    const wrapper = await mountSuspended(CommentActions, { props: { likes: 0 } });
    await wrapper.find("[title='Like']").trigger("click");
    await wrapper.find("[title='Reply']").trigger("click");

    expect(wrapper.emitted("like")).toHaveLength(1);
    expect(wrapper.emitted("reply")).toHaveLength(1);
  });

  it("renders the like button differently when liked by me", async () => {
    const wrapper = await mountSuspended(CommentActions, {
      props: { likes: 1, likedByMe: true },
    });
    const liked = wrapper.find("[title='Like']").classes();

    const unlikedWrapper = await mountSuspended(CommentActions, {
      props: { likes: 1, likedByMe: false },
    });
    const unliked = unlikedWrapper.find("[title='Like']").classes();

    expect(liked.length).toBeGreaterThan(0);
    expect(liked).not.toEqual(unliked);
  });

  it("hides the actions dropdown without permissions", async () => {
    const wrapper = await mountSuspended(CommentActions, { props: { likes: 0 } });
    expect(wrapper.find("[title='More actions']").exists()).toBe(false);
  });

  it("exposes edit and delete actions when permitted", async () => {
    const wrapper = await mountSuspended(CommentActions, {
      props: { likes: 0, canEdit: true, canDelete: true },
    });

    const items = wrapper.findComponent(DropdownMenu).props("items");
    expect(items).toHaveLength(2);

    items[0]!.onSelect?.(new Event("select"));
    items[1]!.onSelect?.(new Event("select"));

    expect(wrapper.emitted("edit")).toHaveLength(1);
    expect(wrapper.emitted("delete")).toHaveLength(1);
  });

  it("only exposes the delete action without edit permission", async () => {
    const wrapper = await mountSuspended(CommentActions, {
      props: { likes: 0, canDelete: true },
    });

    const items = wrapper.findComponent(DropdownMenu).props("items");
    expect(items).toHaveLength(1);

    items[0]!.onSelect?.(new Event("select"));

    expect(wrapper.emitted("delete")).toHaveLength(1);
    expect(wrapper.emitted("edit")).toBeUndefined();
  });
});
