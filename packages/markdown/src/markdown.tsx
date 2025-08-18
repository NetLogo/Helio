import React from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';

/**
 * Shared NetLogo Markdown configuration.
 */
const NetLogoMarkdown = React.memo(
  (props: React.ComponentProps<typeof Markdown>) => {
    return (
      <Markdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[
          remarkDirective,
          remarkDirectiveRehype,
          remarkGfm,
          [
            remarkToc,
            {
              heading: 'Table of Contents',
              maxDepth: 3,
            },
          ],
        ]}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => {
    return prevProps.children === nextProps.children;
  }
);

export default NetLogoMarkdown;
