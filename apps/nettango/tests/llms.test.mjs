import assert from "node:assert/strict";
import { test } from "node:test";

import { toAbsoluteUrl, buildLlmsText, buildModelSections } from "../shared/utils/llms.ts";
import { clampDescription, buildRobotsText } from "../shared/utils/seo.ts";

const document = {
  title: "NetTango",
  summary: "Block-based  NetLogo\nmodels.",
  sections: [
    {
      title: "Models: Ant foraging",
      description: "Rules one ant follows.",
      links: [
        { title: "Ants", url: "https://example.org/models/ants", description: "A colony\n forages." },
        { title: "Bare", url: "https://example.org/models/bare", description: "" },
      ],
    },
    { title: "Empty", links: [] },
  ],
};

test("buildLlmsText follows the llms.txt layout: H1, blockquote, H2 sections with link lists", () => {
  assert.equal(
    buildLlmsText(document),
    [
      "# NetTango",
      "",
      "> Block-based NetLogo models.",
      "",
      "## Models: Ant foraging",
      "",
      "Rules one ant follows.",
      "",
      "- [Ants](https://example.org/models/ants): A colony forages.",
      "- [Bare](https://example.org/models/bare)",
      "",
    ].join("\n"),
  );
});

test("buildLlmsText drops sections with no links", () => {
  assert.doesNotMatch(buildLlmsText(document), /## Empty/);
});

test("toAbsoluteUrl joins a path onto the site url", () => {
  assert.equal(toAbsoluteUrl("https://example.org", "/models/ants"), "https://example.org/models/ants");
  assert.equal(toAbsoluteUrl("https://example.org/", "/"), "https://example.org/");
});

test("clampDescription keeps short text and cuts long text at a word under the limit", () => {
  assert.equal(clampDescription("  two  words "), "two words");
  const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
  const clamped = clampDescription(long);
  assert.ok(clamped.length <= 160, clamped.length);
  assert.ok(clamped.endsWith("…"));
  assert.match(clamped, /word\d+…$/);
});

test("buildRobotsText allows everything and names the sitemap", () => {
  assert.equal(
    buildRobotsText("https://example.org/sitemap.xml"),
    "User-agent: *\nAllow: /\n\nSitemap: https://example.org/sitemap.xml\n",
  );
});

test("buildModelSections keeps curated order, lists each model once and leaves out models in no group", () => {
  const curation = {
    groups: [
      { title: "Ants", description: "Ant rules.", models: ["ants", "missing", "ants"] },
      { title: "Empty", description: "", models: [] },
    ],
    models: { ants: { description: "Curated ants." } },
  };
  const models = [
    { id: "fire", title: "Fire", description: "Fire spreads." },
    { id: "ants", title: "Ants", description: "Raw ants." },
  ];
  const sections = buildModelSections(curation, models, (path) => `https://example.org${path}`);
  assert.deepEqual(
    sections.map(({ title, links }) => [title, links.map(({ url, description }) => [url, description])]),
    [
      ["Models: Ants", [["https://example.org/models/ants", "Curated ants."]]],
      ["Models: Empty", []],
    ],
  );
});

test("buildModelSections uses the curated title over the library name", () => {
  // Would catch: llms.txt naming a model differently from the site.
  const curation = {
    groups: [{ title: "Gases", description: "", models: ["two"] }],
    models: { two: { title: "Two Particles in a Box" } },
  };
  const models = [{ id: "two", title: "Two Particle Sandbox", description: "Raw." }];
  const [section] = buildModelSections(curation, models, (path) => `https://example.org${path}`);
  assert.equal(section.links[0].title, "Two Particles in a Box");
});
