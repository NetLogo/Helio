import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { beforeEach, describe, expect, it } from 'vitest';
import { remarkWikiLink } from './wikilink';
import { WikiLinkOptions } from './wikilink.options';

describe('remarkWikiLink', () => {
  let processor: any;

  beforeEach(() => {
    processor = unified().use(remarkParse).use(remarkStringify);
  });

  describe('basic wikilink parsing', () => {
    it('should parse simple wikilinks', async () => {
      const markdown = 'This is a [[simple link]] in text.';
      const result = await processor().use(remarkWikiLink).process(markdown);

      // Check that the AST contains a link node
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode).toBeDefined();
      expect(linkNode.url).toBe('#simple+link');
      expect(linkNode.children[0].value).toBe('simple link');
    });

    it('should parse wikilinks with display text', async () => {
      const markdown = 'Check out [[Display Text|permalink]] for more info.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode).toBeDefined();
      expect(linkNode.url).toBe('#permalink');
      expect(linkNode.children[0].value).toBe('Display Text');
    });

    it('should parse wikilinks with anchors', async () => {
      const markdown = 'See [[page#section]] for details.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode).toBeDefined();
      expect(linkNode.url).toBe('#page#section');
      expect(linkNode.children[0].value).toBe('page#section');
    });

    it('should parse wikilinks with display text and anchors', async () => {
      const markdown = 'Visit [[Custom Text|page#section]] now.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode).toBeDefined();
      expect(linkNode.url).toBe('#page#section');
      expect(linkNode.children[0].value).toBe('Custom Text');
    });

    it('should handle multiple wikilinks in the same text', async () => {
      const markdown = 'Links: [[first]] and [[Second Link|second]] are here.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNodes = findAllNodesByType(tree, 'link');
      expect(linkNodes).toHaveLength(2);

      expect(linkNodes[0].url).toBe('#first');
      expect(linkNodes[0].children[0].value).toBe('first');

      expect(linkNodes[1].url).toBe('#second');
      expect(linkNodes[1].children[0].value).toBe('Second Link');
    });
  });

  describe('image wikilinks', () => {
    it('should parse image wikilinks with ![[]]', async () => {
      const markdown = 'Here is an image: ![[image.png]]';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const imageNode = findNodeByType(tree, 'image');
      expect(imageNode).toBeDefined();
      expect(imageNode.url).toBe('image.png');
      expect(imageNode.alt).toBe('image.png');
    });

    it('should parse image wikilinks with display text', async () => {
      const markdown = 'Image: ![[Alt Text|image.png]]';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const imageNode = findNodeByType(tree, 'image');
      expect(imageNode).toBeDefined();
      expect(imageNode.url).toBe('image.png');
      expect(imageNode.alt).toBe('Alt Text');
    });
  });

  describe('custom options', () => {
    it('should use custom href template', async () => {
      const options: WikiLinkOptions = {
        hrefTemplate: (permalink) => `/wiki/${permalink}`,
      };

      const markdown = 'Link to [[test page]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.url).toBe('/wiki/test+page');
    });

    it('should use custom href template with anchor', async () => {
      const options: WikiLinkOptions = {
        hrefTemplate: (permalink, linkType, anchor) =>
          `/wiki/${permalink}#${anchor || ''}`,
      };

      const markdown = 'Link to [[test page#section]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.url).toBe('/wiki/test+page#section');
    });

    it('should apply custom CSS classes', async () => {
      const options: WikiLinkOptions = {
        classNames: {
          wikiLink: 'custom-wiki-link',
          imageLink: 'custom-image-link',
        },
      };

      const markdown = 'Text with [[link]] and ![[image.png]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.data.hProperties.className).toContain('custom-wiki-link');

      const imageNode = findNodeByType(tree, 'image');
      expect(imageNode.data.hProperties.className).toContain(
        'custom-image-link'
      );
    });

    it('should use custom image options', async () => {
      const options: WikiLinkOptions = {
        imageOptions: {
          altTemplate: (filename) => `Image: ${filename}`,
          defaultSize: { width: 800, height: 600 },
        },
        hrefTemplate: (permalink, linkType, anchor) => {
          anchor = Boolean(anchor) ? `#${anchor}` : '';
          if (linkType === 'imageLink') {
            return `/images/${permalink}${anchor}`;
          } else {
            return `#${permalink}${anchor}`;
          }
        },
      };

      const markdown = 'Image: ![[photo.jpg]]';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const imageNode = findNodeByType(tree, 'image');
      expect(imageNode.data.hProperties.src).toBe('/images/photo.jpg');
      expect(imageNode.alt).toBe('Image: photo.jpg');
      expect(imageNode.data.hProperties.width).toBe(800);
      expect(imageNode.data.hProperties.height).toBe(600);
    });
  });

  describe('validation options', () => {
    it('should mark missing links when validation is enabled', async () => {
      const existingPages = new Set(['existing-page']);
      const options: WikiLinkOptions = {
        validation: {
          linkExists: (permalink) => existingPages.has(permalink),
          missingLinkBehavior: 'mark',
        },
        classNames: {
          missingLink: 'missing-link',
        },
      };

      const markdown = 'Links: [[existing-page]] and [[missing-page]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNodes = findAllNodesByType(tree, 'link');
      expect(linkNodes).toHaveLength(2);

      // Existing page should not have missing class
      expect(linkNodes[0].data.hProperties.className).not.toContain(
        'missing-link'
      );

      // Missing page should have missing class
      expect(linkNodes[1].data.hProperties.className).toContain('missing-link');
    });
  });

  describe('HTML options', () => {
    it('should apply custom HTML attributes', async () => {
      const options: WikiLinkOptions = {
        htmlOptions: {
          wikiLink: {
            target: '_blank',
            rel: 'noopener noreferrer',
            titleTemplate: (permalink, displayText) =>
              `Go to ${displayText || permalink}`,
          },
        },
      };

      const markdown = 'Visit [[Example Page|example]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.data.hProperties.target).toBe('_blank');
      expect(linkNode.data.hProperties.rel).toBe('noopener noreferrer');
      expect(linkNode.data.hProperties.title).toBe('Go to Example Page');
    });

    it('should wrap links in parent nodes when specified', async () => {
      const options: WikiLinkOptions = {
        htmlOptions: {
          wikiLink: {
            parentNode: {
              tagName: 'span',
              properties: { className: 'link-wrapper' },
            },
          },
        },
      };

      const markdown = 'Text with [[wrapped link]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const containerNode = findNodeByType(tree, 'containerDirective');
      expect(containerNode).toBeDefined();
      expect(containerNode.data.hName).toBe('span');
      expect(containerNode.data.hProperties.className).toBe('link-wrapper');

      const linkNode = containerNode.children[0];
      expect(linkNode.type).toBe('link');
    });
  });

  describe('integration options', () => {
    it('should use custom encoding', async () => {
      const options: WikiLinkOptions = {
        integration: {
          encode: (permalink) => permalink.toLowerCase().replace(/\s+/g, '-'),
        },
        hrefTemplate: (encoded) => `/pages/${encoded}`,
      };

      const markdown = 'Link to [[My Test Page]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink, options).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.url).toBe('/pages/my-test-page');
    });
  });

  describe('edge cases', () => {
    it('should handle empty wikilinks', async () => {
      const markdown = 'Empty link: [[]] should be ignored.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNodes = findAllNodesByType(tree, 'link');
      expect(linkNodes).toHaveLength(0);
    });

    it('should handle wikilinks with only whitespace', async () => {
      const markdown = 'Whitespace link: [[   ]] should be ignored.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNodes = findAllNodesByType(tree, 'link');
      expect(linkNodes).toHaveLength(0);
    });

    it('should preserve surrounding text', async () => {
      const markdown = 'Before [[link]] after.';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const paragraph = tree.children[0];
      expect(paragraph.children).toHaveLength(3);
      expect(paragraph.children[0].value).toBe('Before ');
      expect(paragraph.children[1].type).toBe('link');
      expect(paragraph.children[2].value).toBe(' after.');
    });

    it('should handle links at the beginning and end of text', async () => {
      const markdown = '[[start]] middle [[end]]';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const paragraph = tree.children[0];
      expect(paragraph.children).toHaveLength(3);
      expect(paragraph.children[0].type).toBe('link');
      expect(paragraph.children[1].value).toBe(' middle ');
      expect(paragraph.children[2].type).toBe('link');
    });

    it('should handle wikilinks with special characters', async () => {
      const markdown = 'Special chars: [[café & résumé]].';
      const tree = processor.parse(markdown);
      await processor().use(remarkWikiLink).run(tree);

      const linkNode = findNodeByType(tree, 'link');
      expect(linkNode.url).toBe(
        '#' + encodeURIComponent('café & résumé').replace(/%20/g, '+')
      );
      expect(linkNode.children[0].value).toBe('café & résumé');
    });
  });
});

// Helper functions
function findNodeByType(tree: any, type: string): any {
  let found: any = null;

  function visit(node: any) {
    if (node.type === type && !found) {
      found = node;
      return;
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return found;
}

function findAllNodesByType(tree: any, type: string): any[] {
  const found: any[] = [];

  function visit(node: any) {
    if (node.type === type) {
      found.push(node);
    }
    if (node.children) {
      node.children.forEach(visit);
    }
  }

  visit(tree);
  return found;
}
