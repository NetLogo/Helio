import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import NetlogoWebEmbed, { NLWEmbedState } from "./NetlogoWebEmbed.vue";
import { getNetlogoWebEmbedUrl } from "~/utils/netlogo-web";

const modelUrl = "https://example.com/wolf-sheep.nlogo";
const modelTitle = "Wolf Sheep";

describe("NetlogoWebEmbed", () => {
  it("starts in the preview state and renders the click-to-run affordance", async () => {
    const wrapper = await mountSuspended(NetlogoWebEmbed, {
      props: { modelUrl, modelTitle },
    });
    expect(wrapper.text()).toContain("Click to run model");
    expect(wrapper.find(`[data-model-url="${modelUrl}"]`).exists()).toBe(true);
    expect(wrapper.find("iframe").exists()).toBe(false);
  });

  it("transitions into the running state and renders an iframe with the NetLogo Web URL on click", async () => {
    const wrapper = await mountSuspended(NetlogoWebEmbed, {
      props: { modelUrl, modelTitle },
    });
    const trigger = wrapper.find(`[data-model-url="${modelUrl}"]`);
    await trigger.trigger("click");

    const iframe = wrapper.find("iframe");
    expect(iframe.exists()).toBe(true);
    const expectedSrc = getNetlogoWebEmbedUrl(modelUrl, modelTitle);
    expect(iframe.attributes("src")).toBe(expectedSrc);
  });

  it("emits run when the preview is clicked", async () => {
    const wrapper = await mountSuspended(NetlogoWebEmbed, {
      props: { modelUrl, modelTitle },
    });
    const trigger = wrapper.find(`[data-model-url="${modelUrl}"]`);
    await trigger.trigger("click");
    expect(wrapper.emitted("run")).toBeTruthy();
  });

  it("renders a preview image in preview state when previewImageUrl is provided", async () => {
    const wrapper = await mountSuspended(NetlogoWebEmbed, {
      props: {
        modelUrl,
        modelTitle,
        previewImageUrl: "https://example.com/preview.png",
      },
    });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
  });

  it("falls back to the default title when modelTitle is omitted", async () => {
    const wrapper = await mountSuspended(NetlogoWebEmbed, {
      props: { modelUrl },
    });
    const trigger = wrapper.find(`[data-model-url="${modelUrl}"]`);
    await trigger.trigger("click");
    const iframe = wrapper.find("iframe");
    expect(iframe.attributes("src")).toBe(getNetlogoWebEmbedUrl(modelUrl, undefined));
  });

  it("exposes the NLWEmbedState enum with expected keys", () => {
    expect(NLWEmbedState.Preview).toBe("preview");
    expect(NLWEmbedState.Running).toBe("running");
    expect(NLWEmbedState.Error).toBe("error");
  });
});
