// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  getModelEmbedIframeCode,
  getModelEmbedMarkdownCode,
  getModelEmbedUrl,
  getNetlogoWebEmbedUrl,
  NLWHost,
  readInfoTabFromNlogox,
} from "./netlogo-web";

describe("getNetlogoWebEmbedUrl", () => {
  it("builds a URL pointing at NLWHost with url and title query params", () => {
    const result = getNetlogoWebEmbedUrl("http://files.test/model.nlogo", "My Model");
    const url = new URL(result);
    expect(result.startsWith(`${NLWHost}/web`)).toBe(true);
    expect(url.searchParams.get("url")).toBe("http://files.test/model.nlogo");
    expect(url.searchParams.get("title")).toBe("My Model");
  });

  it("defaults the title to 'NetLogo Model'", () => {
    const url = new URL(getNetlogoWebEmbedUrl("http://files.test/model.nlogo"));
    expect(url.searchParams.get("title")).toBe("NetLogo Model");
  });
});

describe("getModelEmbedUrl", () => {
  const appUrl = "https://modelingcommons.example";

  it("builds a /models/:id/embed URL when no slug is provided", () => {
    const result = getModelEmbedUrl({ modelId: "abc123", appUrl });
    expect(result).toBe(`${appUrl}/models/abc123/embed`);
  });

  it("inserts the slug into the path when provided", () => {
    const result = getModelEmbedUrl({ modelId: "abc123", slug: "wolf-sheep", appUrl });
    expect(result).toBe(`${appUrl}/models/wolf-sheep/abc123/embed`);
  });

  it("treats null/empty slugs as absent", () => {
    expect(getModelEmbedUrl({ modelId: "x", slug: null, appUrl })).toBe(`${appUrl}/models/x/embed`);
    expect(getModelEmbedUrl({ modelId: "x", slug: "", appUrl })).toBe(`${appUrl}/models/x/embed`);
  });
});

describe("getModelEmbedIframeCode", () => {
  const appUrl = "https://modelingcommons.example";

  it("renders an iframe with src pointing at the proxy URL", () => {
    const code = getModelEmbedIframeCode({ modelId: "abc", appUrl }, "Cool Model");
    expect(code).toContain(`<iframe`);
    expect(code).toContain(`src="${getModelEmbedUrl({ modelId: "abc", appUrl })}"`);
    expect(code).toContain(`title="Cool Model"`);
    expect(code).toContain("allowfullscreen");
  });
});

describe("getModelEmbedMarkdownCode", () => {
  const appUrl = "https://modelingcommons.example";
  const target = { modelId: "abc", appUrl };

  it("uses an image link when a preview image is provided", () => {
    const md = getModelEmbedMarkdownCode(target, "Title", "http://img.test/p.png");
    expect(md).toContain(`[![Title](http://img.test/p.png)](`);
    expect(md).toContain(getModelEmbedUrl(target));
  });

  it("uses a plain text link when no preview image is provided", () => {
    const md = getModelEmbedMarkdownCode(target, "Title");
    expect(md).toContain(`[Title](`);
    expect(md).not.toContain("![Title]");
    expect(md).toContain(getModelEmbedUrl(target));
  });

  it("includes markdown link with preview image", () => {
    const md = getModelEmbedMarkdownCode(target, "Title", "http://img.test/p.png");
    expect(md).toContain("[![Title](http://img.test/p.png)](");
  });
});

describe("readInfoTabFromNlogox", () => {
  it("returns the info tab text when present", async () => {
    const xml = `<?xml version="1.0"?><nlogox><info>some info text</info></nlogox>`;
    expect(await readInfoTabFromNlogox(xml)).toBe("some info text");
  });

  it("returns null when no info tab exists", async () => {
    const xml = `<?xml version="1.0"?><nlogox><other>x</other></nlogox>`;
    expect(await readInfoTabFromNlogox(xml)).toBeNull();
  });
});
