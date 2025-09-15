import React from 'react';
import Markdown from 'react-markdown';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import remarkToc from 'remark-toc';
import Anchor from './components/Anchor';
import Image from './components/Image';
import { autoLinkHeadingsConfig, tocConfig, wikiLinkConfig } from './configs';
import { remarkHighlightNL } from './plugins/highlight-nl';
import { remarkRehypeQuestion } from './plugins/question';
import rehypeTableWrapper from './plugins/table-wrapper';
import { rehypeTocWrapper } from './plugins/toc';
import { remarkWikiLink } from './plugins/wikilink';

/**
 * Shared NetLogo Markdown configuration.
 */
const NetLogoMarkdown = React.memo(
  (props: React.ComponentProps<typeof Markdown>) => {
    return (
      <Markdown
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, autoLinkHeadingsConfig],
          rehypeRaw,
          rehypeTocWrapper,
          rehypeTableWrapper,
        ]}
        remarkPlugins={[
          [remarkWikiLink, wikiLinkConfig],
          remarkGfm,
          remarkSmartypants,
          remarkRehypeQuestion,
          remarkHighlightNL,
          [remarkToc, tocConfig],
        ]}
        components={{
          a: Anchor,
          img: Image,
        }}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => {
    return prevProps.children === nextProps.children;
  }
);

export default NetLogoMarkdown;
