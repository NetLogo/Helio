import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  getDefaultWikiLinkOptions,
  LinkType,
  WikiLinkOptions,
} from './wikilink.options';

export const remarkWikiLink: Plugin<[WikiLinkOptions?], Root> = (
  options = undefined
) => {
  const opts = getDefaultWikiLinkOptions(options);
  const regex = /(!?\[\[([^\]|]+)(?:\|([^\]#]+))?(#[^\]]+)?\]\])/g;

  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const value = node.value;
      let match;
      let lastIndex = 0;
      const children = [];

      while ((match = regex.exec(value))) {
        const [full, , displayText, permalinkRaw, heading] = match;
        const isEmbed = full.startsWith('![[');
        const before = value.slice(lastIndex, match.index);
        if (before) children.push({ type: 'text', value: before });

        let display: string;
        let permalink: string;
        let anchor: string | null;

        if (!permalinkRaw && !heading) {
          display = displayText?.trim() || '';
          const parts = display.split('#');
          permalink = parts[0] || '';
          anchor = parts[1] || null;
        } else {
          permalink = (permalinkRaw ?? displayText ?? '').trim();
          anchor = heading ? heading.slice(1) : null; // Remove the '#' if present
          display = displayText?.trim() ?? permalink;
        }

        if ([display, permalink, anchor].every((s) => Boolean(s) === false)) {
          // If all are empty, skip this match
          continue;
        }

        const wikiLink = new WikiLink(
          full,
          isEmbed,
          permalink,
          anchor || null,
          display || null,
          opts
        );

        children.push(wikiLink.toElement());
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < value.length) {
        children.push({ type: 'text', value: value.slice(lastIndex) });
      }

      if (children.length > 0 && parent && typeof index === 'number') {
        parent.children.splice(index, 1, ...children);
        return index + children.length;
      }
    });
  };
};

class WikiLink {
  constructor(
    public raw: string,
    public isImage: boolean,
    public permalink: string,
    public anchor: string | null,
    public displayText: string | null,
    private options: WikiLinkOptions
  ) {}

  href(linkType: LinkType): string {
    const { hrefTemplate, integration } = this.options;
    const encode =
      integration?.encode ||
      ((str: string) => encodeURIComponent(str).replace(/%20/g, '+'));

    const anchor = this.anchor ? encode(this.anchor) : '';
    const permalink = this.permalink ? encode(this.permalink) : '';
    return hrefTemplate
      ? hrefTemplate(permalink, linkType, anchor)
      : `#${permalink}${anchor ? `#${anchor}` : ''}`;
  }

  get text(): string {
    return this.displayText || this.permalink + (this.anchor || '');
  }

  toElement(): any {
    const { imageOptions, classNames, htmlOptions, validation } = this.options;

    let el;
    let linkType: LinkType;
    let href: string;

    // Decide type
    if (this.isImage) {
      linkType = 'imageLink';
      href = this.href(linkType);
      const alt = this.text || this.permalink;
      el = {
        type: 'image',
        url: href,
        alt: imageOptions?.altTemplate?.(alt) || alt,
        data: {
          hName: 'img',
          hProperties: {
            className: classNames?.imageLink ? [classNames.imageLink] : [],
            width: imageOptions?.defaultSize?.width,
            height: imageOptions?.defaultSize?.height,
            src: href,
          },
        },
      };
    } else {
      const isMissingLink =
        validation?.missingLinkBehavior === 'mark' &&
        !validation?.linkExists?.(this.permalink);
      linkType = isMissingLink ? 'missingLink' : 'wikiLink';

      const titleTemplate =
        htmlOptions?.[linkType]?.titleTemplate ||
        ((permalink: string, displayText?: string) => displayText || permalink);

      href = this.href(linkType);

      el = {
        type: 'link',
        url: href,
        children: [{ type: 'text', value: this.text }],
        data: {
          hName: 'a',
          hProperties: {
            className: [
              classNames?.wikiLink,
              isMissingLink ? classNames?.missingLink : '',
            ].filter(Boolean),
            title: titleTemplate(this.permalink, this.displayText ?? undefined),
            target: htmlOptions?.[linkType]?.target || '_self',
            rel: htmlOptions?.[linkType]?.rel || 'noopener',
            href: href,
          },
        },
      };
    }

    if (htmlOptions?.[linkType]?.parentNode) {
      const parentNode = htmlOptions[linkType]!.parentNode!;
      el.data = el.data || {};
      el = {
        type: 'containerDirective',
        data: {
          hName: parentNode.tagName,
          hProperties: parentNode.properties || {},
        },
        children: [el],
      };
    }

    return el;
  }
}
