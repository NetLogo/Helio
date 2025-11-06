import type { Options as RehypeAutolinkHeadingsOptions } from "rehype-autolink-headings";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import type { Options as RehypeRawOptions } from "rehype-raw";
import rehypeRaw from "rehype-raw";
import type { Options as RehypeSlugOptions } from "rehype-slug";
import rehypeSlug from "rehype-slug";
import type { Options as RemarkGfmOptions } from "remark-gfm";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import type { Options as RemarkTocOptions } from "remark-toc";
import remarkToc from "remark-toc";
import remarkTocInline from "remark-toc-inline";
import type { Options as RemarkSmartypantsOptions } from "retext-smartypants";
import { autoLinkHeadingsConfig, tocConfig, wikiLinkConfig } from "./configs";
import { remarkHighlightNL } from "./plugins/highlight-nl";
import { remarkRehypeQuestion } from "./plugins/question";
import rehypeTableWrapper from "./plugins/table-wrapper";
import { rehypeTocWrapper } from "./plugins/toc";
import { remarkWikiLink } from "./plugins/wikilink";
import type { WikiLinkOptions } from "./plugins/wikilink.options";

const getDefaultRehypePluginsObject = () => {
  return {
    rehypeSlug: { instance: rehypeSlug, options: {} as RehypeSlugOptions },
    rehypeAutolinkHeadings: {
      instance: rehypeAutolinkHeadings,
      options: autoLinkHeadingsConfig as RehypeAutolinkHeadingsOptions,
    },
    rehypeRaw: { instance: rehypeRaw, options: {} as RehypeRawOptions },
    rehypeTocWrapper: { instance: rehypeTocWrapper, options: {} },
    rehypeTableWrapper: { instance: rehypeTableWrapper, options: {} },
  };
};

const getDefaultRemarkPluginsObject = () => {
  return {
    remarkWikiLink: { instance: remarkWikiLink, options: wikiLinkConfig as WikiLinkOptions },
    remarkGfm: { instance: remarkGfm, options: {} as RemarkGfmOptions },
    remarkSmartypants: { instance: remarkSmartypants, options: {} as RemarkSmartypantsOptions },
    remarkRehypeQuestion: { instance: remarkRehypeQuestion, options: {} },
    remarkHighlightNL: { instance: remarkHighlightNL, options: {} },
    remarkToc: { instance: remarkToc, options: tocConfig as RemarkTocOptions },
    remarkTocInline: { instance: remarkTocInline, options: { normalizeQuotes: true } },
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
