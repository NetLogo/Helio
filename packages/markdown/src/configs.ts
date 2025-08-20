import type { Options as AutolinkHeadingsOptions } from 'rehype-autolink-headings';
import { LinkType, WikiLinkOptions } from './plugins/wikilink.options';

export const tocConfig = {
  maxDepth: 3,
  heading: 'Table of Contents',
};

export const wikiLinkConfig: WikiLinkOptions = {
  hrefTemplate: (
    permalink: string,
    linkType: LinkType,
    anchor?: string | null
  ) => {
    const dictionaryPermalink = permalink.replace(/^__|[\?]$/g, '');
    const anchorQuery = anchor ? `?anchor=${encodeURIComponent(anchor)}` : '';
    switch (linkType) {
      case 'wikiLink':
        return `dictionary.html#${dictionaryPermalink}${anchorQuery}`;
      case 'imageLink':
        return `images/${permalink}${anchorQuery}`;
      case 'missingLink':
        return `dictionary.html#${dictionaryPermalink}${anchorQuery}`;
      case 'externalLink':
        return permalink + (anchor ? `#${encodeURIComponent(anchor)}` : '');
      default:
        return (
          `#${encodeURIComponent(permalink).replace(/%20/g, '+')}` + anchorQuery
        );
    }
  },
  htmlOptions: {
    wikiLink: {
      parentNode: { tagName: 'code', properties: { class: 'netlogo-command' } },
      target: '_self',
      rel: undefined,
      titleTemplate: (permalink: string, displayText?: string) => {
        if (displayText) {
          return displayText;
        }
        return permalink;
      },
    },
  },
  classNames: {
    wikiLink: 'netlogo-wiki-link',
    missingLink: 'missing-wiki-link',
    imageLink: 'netlogo-image',
  },
  integration: {
    encode: (permalink: string) => permalink,
    greedyMatch: true,
  },
  greedyMatch: {
    maxIterations: 15,
    consumableTypes: ['text', 'html', 'link'],
    accessor: (node: any) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'html':
          return node.value;
        case 'link':
          return node.url;
        default:
          return '';
      }
    },
  },
};

export const autoLinkHeadingsConfig: AutolinkHeadingsOptions = {
  headingProperties: {
    className: ['section-heading'],
  },
  properties: {
    className: ['section-anchor'],
  },
  behavior: 'wrap',
};
