import type { ElementContent, Root, RootContent } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isNonEmptyString } from "../utils";
import type { Content } from "./utils";
import { next } from "./utils";
import type { LinkType, WikiLinkOptions } from "./wikilink.options";
import {
  greedyAccessor as defaultGreedyAccessor,
  getDefaultWikiLinkOptions,
} from "./wikilink.options";

const createWikilinkRegex = (): RegExp => {
  // Possibilities include
  // - [[permalink]] -> displayText = permalink
  // - [[displayText|permalink]]
  // - [[displayText|permalink#anchor]]
  // - [[permalink#anchor]] -> displayText = permalink#anchor
  // - ![[permalink]] (image)
  // - [[displayText|#anchor]] -> permalink = "", anchor = anchor, displayText = displayText
  return new RegExp(/(!?\[\[([^\]|]+)(?:\|([^\]#]+)?)?(#[^\]]+)?\]\])/g);
};

const remarkWikiLink: Plugin<[WikiLinkOptions?], Root> = (options = undefined) => {
  const opts = getDefaultWikiLinkOptions(options);

  return (tree) => {
    let hasChanges = true;
    let iterations = 0;
    const maxIterations = opts.greedyMatch.maxIterations ?? 10; // Prevent infinite loops
    const greedyAccessor = opts.greedyMatch.accessor ?? defaultGreedyAccessor;

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;

      const regex = createWikilinkRegex();

      // eslint-disable-next-line @typescript-eslint/no-loop-func
      visit(tree, "text", (node, index, parent) => {
        const children: Array<RootContent | ElementContent> = [];

        let value = node.value;
        let match: RegExpExecArray | null = null;
        let lastIndex = 0;
        let nChildren = 1;
        let nNodesVisited = 0;

        if (!value.includes("[[")) {
          return;
        }

        if (value.includes("[[") && !value.includes("]]")) {
          // If there's an opening [[ without a closing ]], we can't process it correctly
          // unless the greedy matching is enabled.
          if (opts.integration.greedyMatch === true && typeof index === "number") {
            let currentNodeIndex = index;
            let tempValue = value;
            let tmpNChildren = 0;
            while (currentNodeIndex !== -1) {
              const consumableTypes = opts.greedyMatch.consumableTypes ?? [];
              const [nextNode, nextIndex] = next(parent, currentNodeIndex, (n) =>
                consumableTypes.includes(n?.type ?? ""),
              );

              if (!nextNode) break;
              const nodeValue = greedyAccessor(nextNode);
              tempValue += nodeValue;
              currentNodeIndex = nextIndex;
              tmpNChildren++;

              if (nodeValue.includes("]]")) {
                value = tempValue;
                nChildren += tmpNChildren;
                break;
              }

              nNodesVisited += 1;
              if (nNodesVisited >= (opts.greedyMatch.maxNodes ?? 25)) {
                break;
              }
            }
          }
        }

        while ((match = regex.exec(value))) {
          const [full, , displayText, permalinkRaw, heading] = match;
          const isEmbed = full.startsWith("![[");
          const before = value.slice(lastIndex, match.index);
          if (before) children.push({ type: "text", value: before });

          let display: string | null = null;
          let permalink: string = "";
          let anchor: string | null = null;

          const isPermalinkDefined = isNonEmptyString(permalinkRaw);
          const isHeadingDefined = isNonEmptyString(heading);
          if (!isPermalinkDefined && !isHeadingDefined) {
            display = displayText?.trim() ?? "";
            const parts = display.split("#");
            permalink = parts[0] ?? "";
            anchor = parts[1] ?? null;
          } else if (isHeadingDefined) {
            permalink = permalinkRaw?.trim() ?? "";
            anchor = heading.slice(1); // Remove the '#' if present
            display = displayText?.trim() ?? anchor;
          } else {
            permalink = (permalinkRaw ?? displayText ?? "").trim();
            anchor = null;
            display = displayText?.trim() ?? permalink;
          }

          if ([display, permalink, anchor].every((s) => !(typeof s === "string") || s === "")) {
            // If all are empty, skip this match
            continue;
          }

          const wikiLink = new WikiLink(full, isEmbed, permalink, anchor, display, opts);

          children.push(wikiLink.toElement() as RootContent | ElementContent);
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < value.length) {
          children.push({ type: "text", value: value.slice(lastIndex) });
        }

        if (children.length > 0 && parent && typeof index === "number") {
          parent.children.splice(index, nChildren, ...children);
          hasChanges = true;
          // eslint-disable-next-line @typescript-eslint/consistent-return
          return index + children.length;
        }

        // eslint-disable-next-line @typescript-eslint/consistent-return
        return undefined;
      });
    }
  };
};

class WikiLink {
  public constructor(
    public raw: string,
    public isImage: boolean,
    public permalink: string,
    public anchor: string | null,
    public displayText: string | null,
    private readonly options: WikiLinkOptions,
  ) {}

  public href(linkType: LinkType): string {
    const { hrefTemplate, integration } = this.options;
    const encode =
      integration?.encode ??
      ((str: string): string => encodeURIComponent(str).replace(/%20/g, "+"));

    const anchor = encode(this.anchor ?? "");
    const permalink = encode(this.permalink || "");
    return hrefTemplate
      ? hrefTemplate(permalink, linkType, anchor)
      : `#${permalink}${anchor ? `#${anchor}` : ""}`;
  }

  public get text(): string {
    return this.displayText ?? this.permalink + (this.anchor ?? "");
  }

  public toElement(): Content {
    const { imageOptions, classNames, htmlOptions, validation } = this.options;

    let el: Content | undefined = undefined;
    let linkType: LinkType = "wikiLink";
    let href: string = "";

    // Decide type
    if (this.isImage) {
      linkType = "imageLink";
      href = this.href(linkType);
      const alt = this.text || this.permalink;
      const imageLinkClass =
        typeof classNames?.imageLink === "string" ? [classNames.imageLink] : classNames?.imageLink;
      el = {
        type: "image",
        url: href,
        alt: alt,
        data: {
          hName: "img",
          hProperties: {
            className: imageLinkClass,
            width: imageOptions?.defaultSize?.width,
            height: imageOptions?.defaultSize?.height,
            src: href,
            alt: imageOptions?.altTemplate?.(alt) ?? alt,
          },
        },
      };
    } else {
      const isMissingLink =
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        validation?.missingLinkBehavior === "mark" && !validation.linkExists?.(this.permalink);
      linkType = isMissingLink ? "missingLink" : "wikiLink";

      const isExternalLink =
        this.permalink.startsWith("http://") ||
        this.permalink.startsWith("https://") ||
        this.permalink.startsWith("www.");
      linkType = isExternalLink ? "externalLink" : linkType;

      const titleTemplate =
        htmlOptions?.[linkType]?.titleTemplate ??
        ((permalink: string, displayText?: string): string => displayText ?? permalink);

      href = this.href(linkType);

      el = {
        type: "link",
        url: href,
        children: [{ type: "text", value: this.text }],
        data: {
          hName: "a",
          hProperties: {
            className: [
              classNames?.wikiLink,
              isMissingLink ? classNames?.missingLink : "",
              isExternalLink ? classNames?.externalLink : "",
            ].filter(Boolean) as Array<string>,
            title: titleTemplate(this.permalink, this.displayText ?? undefined),
            target: htmlOptions?.[linkType]?.target ?? "_self",
            rel: htmlOptions?.[linkType]?.rel ?? "noopener",
            href: href,
            ...{ "data-display-text": this.displayText ?? undefined },
          },
        },
      };
    }

    if (htmlOptions?.[linkType]?.parentNode) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const parentNode = htmlOptions[linkType]!.parentNode!;
      el = {
        // @ts-expect-error hast types missing containerDirective
        // because it is supplied by a rehype plugin
        type: "containerDirective",
        data: {
          hName: parentNode.tagName,
          hProperties: {
            permalink: this.permalink,
            displayText: this.displayText ?? undefined,
            ...(parentNode.properties ?? {}),
          },
        },
        children: [el],
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return el!;
  }
}

export default remarkWikiLink;
export { createWikilinkRegex, remarkWikiLink as plugin, remarkWikiLink };
export type { LinkType, WikiLinkOptions as Options };
