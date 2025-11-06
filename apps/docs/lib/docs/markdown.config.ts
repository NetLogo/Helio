import type { MarkdownPlugin, ModuleOptions } from '@nuxt/content';

import { isNonEmptyString } from '@repo/utils/std/string';

import {
  getDefaultRehypePluginsObject,
  getDefaultRemarkPluginsObject,
  type Hast,
  NetLogoRemarkWikiLink,
  Utilities,
} from '@repo/markdown';
import { slugifyOptions, toSlug } from '@repo/netlogo-docs/helpers';

import rehypeAutolinkHeadings, { type Options as RehypeAutolinkHeadingsOptions } from 'rehype-autolink-headings';
import remarkToc from 'remark-toc';

const { hasNoChild, isNodeElement } = Utilities;

const tocConfig = {
  maxDepth: 2,
  heading: 'Table of Contents',
} as const;

class WikiLinkWrapper {
  private _internalType:
    | 'absolute'
    | 'absolute-anchor'
    | 'relative'
    | 'relative-anchor'
    | 'dictionary'
    | 'external'
    | 'external-anchor'
    | 'image'
    | 'unknown' = 'unknown';
  constructor(
    public permalink: string,
    public linkType: NetLogoRemarkWikiLink.LinkType,
    public anchor?: string | null,
  ) {
    this._setInternalType();
    this._normalize();
  }

  private _setInternalType() {
    const hasAnchor = isNonEmptyString(this.anchor);
    const isRelative = this.permalink.startsWith('./');
    const isAbsoluteWithoutSlashes = !this.permalink.includes('/') && !isRelative && hasAnchor;
    const isAbsolute = this.permalink.startsWith('/') || isAbsoluteWithoutSlashes;
    if (['wikiLink', 'missingLink'].includes(this.linkType)) {
      // Absolute Anchor: /Page#Anchor, /Page# or Page#Anchor   <== Common.
      // Absolute: /Page (not Page)
      // Relative Anchor: ./Page#Anchor or ./Page#              <== Not common. Only one relative case supported.
      // Relative: ./Page
      // Dictionary: Page (no slashes) or Page/                 <== Most common.
      if (isAbsolute && hasAnchor) {
        this._internalType = 'absolute-anchor';
      } else if (isAbsolute) {
        this._internalType = 'absolute';
      } else if (isRelative && hasAnchor) {
        this._internalType = 'relative-anchor';
      } else if (isRelative) {
        this._internalType = 'relative';
      } else {
        this._internalType = 'dictionary';
      }
    } else if (this.linkType === 'externalLink' && isNonEmptyString(this.anchor)) {
      this._internalType = 'external-anchor';
    } else if (this.linkType === 'externalLink') {
      this._internalType = 'external';
    } else if (this.linkType === 'imageLink') {
      this._internalType = 'image';
    }
  }

  private _normalize() {
    if (this._internalType.startsWith('absolute') && this.permalink.startsWith('/')) {
      this.permalink = this.permalink.slice(1);
    }

    if (this._internalType.startsWith('relative') && this.permalink.startsWith('./')) {
      this.permalink = this.permalink.slice(2);
    }

    if (isNonEmptyString(this.anchor) && this.anchor!.startsWith('#')) {
      this.anchor = this.anchor!.slice(1);
    }
  }

  // Read both markdown/plugins/wikilink.options and
  // nuxt-content-assets source before modifying this method.
  // The way wikilink options does not, on purpose, provide enough
  // types to distinguish between link types here. On the other hand,
  // nuxt-content-assets needs link to be specified relative to the
  // assets root (e.g., images/... -> autogen/images/... -> generated src)
  // - Omar I (Oct 23 2025)
  toString(): string {
    switch (this._internalType) {
      case 'absolute-anchor':
        return `/${this.permalink}#${encodeURIComponent(toSlug(this.anchor as string))}`;
      case 'absolute':
        return `/${this.permalink}`;
      case 'relative-anchor':
        return `${this.permalink}#${encodeURIComponent(toSlug(this.anchor as string))}`;
      case 'relative':
        return `${this.permalink}`;
      case 'dictionary':
        return `/dictionary#${encodeURIComponent(toSlug(this.permalink))}`;
      case 'external-anchor':
        return `${this.permalink}#${encodeURIComponent(this.anchor as string)}`;
      case 'external':
        return `${this.permalink}`;
      case 'image':
        return `images/${this.permalink}`;
      default:
        return `#${encodeURIComponent(toSlug(this.permalink))}`;
    }
  }
}

const wikiLinkConfig: NetLogoRemarkWikiLink.Options = {
  hrefTemplate: (permalink: string, linkType: NetLogoRemarkWikiLink.LinkType, anchor?: string | null) => {
    const wrapper = new WikiLinkWrapper(permalink, linkType, anchor);
    return wrapper.toString();
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
          return (node as Hast.Text).value;
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

const autoLinkHeadingsConfig: RehypeAutolinkHeadingsOptions = {
  headingProperties: {
    className: ['section-heading'],
  },
  properties: {
    className: ['section-anchor'],
  },
  behavior: 'wrap',
  test: hasNoChild((node) => isNodeElement(node) && node.tagName === 'a', { recursive: true }),
};

const buildOptions: Partial<ModuleOptions>['build'] = {
  markdown: {
    remarkPlugins: {
      ...(getDefaultRemarkPluginsObject() as MarkdownPluginCollection),
      remarkToc: { instance: remarkToc, options: tocConfig },
      remarkWikiLink: { instance: NetLogoRemarkWikiLink.plugin, options: wikiLinkConfig },
    },
    rehypePlugins: {
      ...(getDefaultRehypePluginsObject() as MarkdownPluginCollection),
      rehypeAutolinkHeadings: { instance: rehypeAutolinkHeadings, options: autoLinkHeadingsConfig },
    },
    toc: {
      depth: 3,
      searchDepth: 5,
    },
  },
  pathMeta: {
    slugifyOptions,
  },
};

const externalImports: Array<string> = Array.from(
  new Set([...Object.keys(getDefaultRemarkPluginsObject()), ...Object.keys(getDefaultRehypePluginsObject())]),
);

type MarkdownPluginCollection = Record<string, false | object | MarkdownPlugin>;

export { buildOptions, externalImports };
