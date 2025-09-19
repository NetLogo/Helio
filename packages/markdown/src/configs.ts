import { isNonEmptyString } from '@repo/utils/std/string';

import type { Text } from 'hast';
import type { Options as AutolinkHeadingsOptions } from 'rehype-autolink-headings';
import type { LinkType, WikiLinkOptions } from './plugins/wikilink.options';

export const tocConfig = {
  maxDepth: 2,
  heading: 'Table of Contents',
} as const;

export const wikiLinkConfig: WikiLinkOptions = {
  hrefTemplate: (permalink: string, linkType: LinkType, anchor?: string | null) => {
    const sanitizeWikilink = (s0: string): string => s0.replace(/^__|[?]$/g, '');

    if (['wikiLink', 'missingLink'].includes(linkType)) {
      if (isNonEmptyString(anchor)) {
        permalink = permalink.startsWith('/') ? permalink.slice(1) : permalink;
        // This means permalink is a page and anchor is the # within that page
        return `/${permalink}#${sanitizeWikilink(anchor)}`;
      }
      const dictionaryPermalink = sanitizeWikilink(permalink);
      return `/dictionary.html#${dictionaryPermalink}`;
    } else if (linkType === 'externalLink') {
      const encodedAnchor = isNonEmptyString(anchor) ? `#${encodeURIComponent(anchor)}` : '';
      return `${permalink}${encodedAnchor}`;
    } else if (linkType === 'imageLink') {
      return `/images/${permalink}`;
    }
    // Fallback
    return `#${encodeURIComponent(permalink).replace(/%20/g, '+')}`;
  },
  htmlOptions: {
    wikiLink: {
      parentNode: { tagName: 'code', properties: { class: 'netlogo-command' } },
      target: '_self',
      rel: undefined,
      titleTemplate: (permalink: string, displayText?: string) => {
        if (typeof displayText === 'string') {
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
    accessor: (node: { type: string }) => {
      switch (node.type) {
        case 'text':
          return (node as Text).value;
        case 'html':
          return (node as { type: 'html'; value: string }).value;
        case 'link':
          return (node as { type: 'link'; url: string }).url;
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
