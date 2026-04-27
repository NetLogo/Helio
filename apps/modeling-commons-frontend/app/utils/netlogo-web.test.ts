// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  getNetlogoWebEmbedUrl,
  getNetlogoWebIframeCode,
  getNetlogoWebMarkdownPreviewCode,
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

describe("getNetlogoWebIframeCode", () => {
  it("renders an iframe with correct attributes and src matching the embed URL", () => {
    const modelUrl = "http://files.test/model.nlogo";
    const title = "Cool Model";
    const code = getNetlogoWebIframeCode(modelUrl, title);
    expect(code).toContain(`<iframe`);
    expect(code).toContain(`src="${getNetlogoWebEmbedUrl(modelUrl, title)}"`);
    expect(code).toContain(`title="${title}"`);
    expect(code).toContain(`allowfullscreen`);
  });
});

describe("getNetlogoWebMarkdownPreviewCode", () => {
  const modelUrl = "http://files.test/model.nlogo";

  it("uses an image link when a preview image is provided", () => {
    const md = getNetlogoWebMarkdownPreviewCode(modelUrl, "Title", "http://img.test/p.png");
    expect(md).toContain(`[![Title](http://img.test/p.png)](`);
    expect(md).toContain(getNetlogoWebEmbedUrl(modelUrl, "Title"));
  });

  it("uses a plain text link when no preview image is provided", () => {
    const md = getNetlogoWebMarkdownPreviewCode(modelUrl, "Title");
    expect(md).toContain(`[Title](`);
    expect(md).not.toContain("![Title]");
    expect(md).toContain(getNetlogoWebEmbedUrl(modelUrl, "Title"));
  });

  it("includes both markdown link and HTML iframe comment", () => {
    const md = getNetlogoWebMarkdownPreviewCode(modelUrl, "Title", "http://img.test/p.png");
    expect(md).toContain("[![Title](http://img.test/p.png)](");
    expect(md).toContain("<iframe");
    expect(md).toContain("<!-- or via NetLogo Web Iframe Code (uncomment to embed) -->");
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
