import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import type { Options as RehypeSlugOptions } from "rehype-slug";
import rehypeSlug from "rehype-slug";
import remarkSmartypants from "remark-smartypants";
import type { Options as RemarkTocOptions } from "remark-toc";
import remarkToc from "remark-toc";
import remarkTocInline from "remark-toc-inline";
import { autoLinkHeadingsConfig, tocConfig, wikiLinkConfig } from "./configs";
import { remarkHighlightNL } from "./plugins/highlight-nl";
import { remarkRehypeQuestion } from "./plugins/question";
import rehypeTableWrapper from "./plugins/table-wrapper";
import { rehypeTocWrapper } from "./plugins/toc";
import { remarkWikiLink } from "./plugins/wikilink";

type MarkdownPlugin = Record<string, { instance?: unknown; options?: unknown; src?: string }>;

const getDefaultRehypePluginsObject = (): MarkdownPlugin => {
  return {
    "rehype-slug": { instance: rehypeSlug, options: {} as RehypeSlugOptions, src: "rehype-slug" },
    "rehype-autolink-headings": {
      instance: rehypeAutolinkHeadings,
      options: autoLinkHeadingsConfig,
      src: "rehype-autolink-headings",
    },
    "rehype-raw": { instance: rehypeRaw, options: {}, src: "rehype-raw" },
    "@repo/markdown/plugins/toc": {
      instance: rehypeTocWrapper,
      options: {},
      src: "@repo/markdown/plugins/toc",
    },
    "@repo/markdown/plugins/table-wrapper": {
      instance: rehypeTableWrapper,
      options: {},
      src: "@repo/markdown/plugins/table-wrapper",
    },
  };
};

const getDefaultRemarkPluginsObject = (): MarkdownPlugin => {
  return {
    "@repo/markdown/plugins/wikilink": {
      instance: remarkWikiLink,
      options: wikiLinkConfig,
    },
    "remark-gfm": {},
    "remark-smartypants": {
      instance: remarkSmartypants as unknown,
      options: {},
      src: "remark-smartypants",
    },
    "@repo/markdown/plugins/question": {
      instance: remarkRehypeQuestion,
      options: {},
      src: "@repo/markdown/plugins/question",
    },
    "@repo/markdown/plugins/highlight-nl": {
      instance: remarkHighlightNL,
      options: {},
      src: "@repo/markdown/plugins/highlight-nl",
    },
    "remark-toc": {
      instance: remarkToc,
      options: tocConfig as RemarkTocOptions,
      src: "remark-toc",
    },
    "remark-toc-inline": {
      instance: remarkTocInline,
      options: { normalizeQuotes: true },
      src: "remark-toc-inline",
    },
  };
};

export { getDefaultRehypePluginsObject, getDefaultRemarkPluginsObject };

export type * as Hast from "hast";
export type * as Hastscript from "hastscript";
export type * as Mdast from "mdast";
export type * as Remark from "remark";
export type * as Retext from "retext";
export * as Utilities from "./plugins/utils";
export * as NetLogoRemarkWikiLink from "./plugins/wikilink";
