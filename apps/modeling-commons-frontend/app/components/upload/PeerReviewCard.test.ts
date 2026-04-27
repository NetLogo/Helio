import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import PeerReviewCard from "./PeerReviewCard.vue";
import type { UploadFormInput } from "./form";

function makeState(overrides: Partial<UploadFormInput> = {}): UploadFormInput {
  return {
    nlogoxFile: null,
    imageFile: null,
    title: "",
    description: "",
    tags: [],
    usecases: [],
    subjects: [],
    permission: "private",
    groupId: null,
    collaboratorEmails: [],
    askForCollaborators: false,
    askForPeerReview: false,
    peerReviewKinds: [],
    peerReviewDescription: null,
    ...overrides,
  } as UploadFormInput;
}

describe("PeerReviewCard", () => {
  it("renders the peer-review intro copy", async () => {
    const wrapper = await mountSuspended(PeerReviewCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("Ask for Peer Review");
  });

  it("renders the peer-review kind options", async () => {
    const wrapper = await mountSuspended(PeerReviewCard, {
      props: { modelValue: makeState() },
    });
    expect(wrapper.text()).toContain("visualization");
    expect(wrapper.text()).toContain("code");
  });

  it("renders a textarea bound to the peer-review description", async () => {
    const wrapper = await mountSuspended(PeerReviewCard, {
      props: { modelValue: makeState() },
    });

    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);
    await textarea.setValue("Help me improve the visualization");
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      "Help me improve the visualization",
    );
  });

  it.todo(
    "askForPeerReview toggle — current template renders no top-level switch; revisit when the template adds one",
  );
});
