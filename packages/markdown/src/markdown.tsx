import React from 'react';
import Markdown from 'react-markdown';
import type { Options as rehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { Options as rehypeRawOptions } from 'rehype-raw';
import rehypeRaw from 'rehype-raw';
import type { Options as rehypeSlugOptions } from 'rehype-slug';
import rehypeSlug from 'rehype-slug';
import type { Options as remarkGfmOptions } from 'remark-gfm';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import type { Options as remarkTocOptions } from 'remark-toc';
import remarkToc from 'remark-toc';
import type { Options as remarkSmartypantsOptions } from 'retext-smartypants';
import Anchor from './components/Anchor';
import Image from './components/Image';
import { autoLinkHeadingsConfig, tocConfig, wikiLinkConfig } from './configs';
import { remarkHighlightNL } from './plugins/highlight-nl';
import { remarkRehypeQuestion } from './plugins/question';
import rehypeTableWrapper from './plugins/table-wrapper';
import { rehypeTocWrapper } from './plugins/toc';
import { remarkWikiLink } from './plugins/wikilink';
import type { WikiLinkOptions } from './plugins/wikilink.options';

/**
 * Shared NetLogo Markdown configuration.
 */
const NetLogoMarkdown = React.memo(
  (props: React.ComponentProps<typeof Markdown>) => {
    return (
      <Markdown
        rehypePlugins={getDefaultRehypePlugins()}
        remarkPlugins={getDefaultRemarkPlugins()}
        components={defaultComponents}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => {
    return prevProps.children === nextProps.children;
  }
);
NetLogoMarkdown.displayName = 'NetLogoMarkdown';

export const getDefaultRehypePlugins = (
  options: {
    autoLinkHeadingsOptions?: rehypeAutolinkHeadingsOptions;
    rehypeRawOptions?: rehypeRawOptions;
    rehypeSlugOptions?: rehypeSlugOptions;
  } = {
    autoLinkHeadingsOptions: autoLinkHeadingsConfig,
  }
): NonNullable<React.ComponentProps<typeof Markdown>['rehypePlugins']> => [
  rehypeSlug,
  [rehypeAutolinkHeadings, options.autoLinkHeadingsOptions],
  rehypeRaw,
  rehypeTocWrapper,
  rehypeTableWrapper,
];

export const getDefaultRemarkPlugins = (
  options: {
    wikiLinkOptions?: WikiLinkOptions;
    remarkGfmOptions?: remarkGfmOptions;
    remarkSmartypantsOptions?: remarkSmartypantsOptions;
    remarkTocOptions?: remarkTocOptions;
  } = {
    wikiLinkOptions: wikiLinkConfig,
    remarkTocOptions: tocConfig,
  }
): NonNullable<React.ComponentProps<typeof Markdown>['remarkPlugins']> => [
  [remarkWikiLink, options.wikiLinkOptions],
  [remarkGfm, options.remarkGfmOptions],
  [remarkSmartypants, options.remarkSmartypantsOptions],
  remarkRehypeQuestion,
  remarkHighlightNL,
  [remarkToc, options.remarkTocOptions],
];

export const defaultComponents: NonNullable<React.ComponentProps<typeof Markdown>['components']> = {
  a: Anchor,
  img: Image,
};

export type NetLogoMarkdownProps = React.ComponentProps<typeof NetLogoMarkdown>;

export default NetLogoMarkdown;
