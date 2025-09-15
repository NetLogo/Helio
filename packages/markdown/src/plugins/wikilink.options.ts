/**
 * HTML element configuration for different link types
 */
interface LinkHtmlOptions {
  parentNode?: { tagName: string; properties?: Record<string, any> };
  target?: string;
  rel?: string;
  titleTemplate?: (permalink: string, displayText?: string) => string;
}

/**
 * Link type identifiers
 */
type LinkType = 'wikiLink' | 'imageLink' | 'missingLink' | 'externalLink';

/**
 * Configuration options for WikiLink processing
 */
interface WikiLinkOptions {
  /**
   * Template function for generating href URLs from permalinks
   * @param permalink - The extracted permalink from [[permalink]] or [[permalink|alias]]
   * @returns The final href URL
   * @default (permalink) => `#${permalink}`
   */
  hrefTemplate?: (
    permalink: string,
    linkType: LinkType,
    anchor?: string | null
  ) => string;

  /**
   * CSS classes to apply to generated elements
   */
  classNames?: Partial<Record<LinkType, string>>;

  validation?: {
    /** Function to check if a link target exists */
    linkExists?: (permalink: string) => boolean | Promise<boolean>;
    /** How to handle missing links: 'ignore', 'warn', 'error', or 'mark' */
    missingLinkBehavior?: 'ignore' | 'warn' | 'error' | 'mark';
  };

  /**
   * HTML options for different link types
   */
  htmlOptions?: Partial<Record<LinkType, LinkHtmlOptions>>;

  /**
   * Image-specific configuration (when allowImages is true)
   */
  imageOptions?: {
    /** Alt text template for images */
    altTemplate?: (filename: string) => string;
    /** Image size configuration */
    defaultSize?: {
      width?: number | string;
      height?: number | string;
    };
  };

  /**
   * Integration with external systems
   */
  integration?: {
    /** File extension for wiki pages */
    fileExtension?: string;
    /** URL encoding options */
    encode?: (permalink: string) => string;
    /** Whether to greedy match until it finds a closing ]] */
    greedyMatch?: boolean;
  };
  /**
   * Greedy matching options
   */
  greedyMatch?: {
    /** Maximum iterations to prevent infinite loops */
    maxIterations?: number;
    /** Maximum number of nodes to consume during greedy matching */
    maxNodes?: number;
    /** Node types that can be consumed during greedy matching */
    consumableTypes?: Array<string>;
    /** Function to access node value for greedy matching */
    accessor?: (node: any) => string;
  };
}

/**
 * Default greedy accessor
 */
export const greedyAccessor = (node: any): string => {
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
};

/**
 * Default values for WikiLink configuration
 */
const DEFAULT_OPTIONS = {
  hrefTemplate: (
    permalink: string,
    linkType: LinkType,
    anchor?: string | null
  ) => {
    switch (linkType) {
      case 'imageLink':
        return `${permalink}${anchor ? `#${anchor}` : ''}`;
      case 'missingLink':
        return `#${permalink}${anchor || ''}`;
      default:
        return `#${permalink}${anchor ? `#${anchor}` : ''}`;
    }
  },
  classNames: {
    wikiLink: 'wikilink',
    imageLink: 'wikilink-image',
    missingLink: 'wikilink-missing',
  } as Record<LinkType, string>,
  validation: {
    missingLinkBehavior: 'ignore' as const,
  },
  imageOptions: {
    altTemplate: (filename: string) => filename,
    defaultSize: {},
  },
  integration: {
    fileExtension: '.md',
    encode: (permalink: string) =>
      encodeURIComponent(permalink).replace(/%20/g, '+'),
    greedyMatch: false,
  },
  greedyMatch: {
    maxIterations: 10,
    maxNodes: 25,
    consumableTypes: ['text', 'html'],
    accessor: greedyAccessor,
  },
};

/**
 * Default HTML options shared across all link types
 */
const createDefaultHtmlOptions = (): LinkHtmlOptions => ({
  parentNode: undefined,
  target: '_self',
  rel: undefined,
  titleTemplate: (permalink: string, displayText?: string) =>
    displayText
      ? `Link to ${displayText} (${permalink})`
      : `Link to ${permalink}`,
});

/**
 * Creates default HTML options for all link types
 */
const createDefaultHtmlOptionsForAllTypes = (): Record<
  LinkType,
  LinkHtmlOptions
> => {
  const linkTypes: LinkType[] = ['wikiLink', 'imageLink', 'missingLink'];
  return linkTypes.reduce(
    (acc, type) => ({
      ...acc,
      [type]: createDefaultHtmlOptions(),
    }),
    {} as Record<LinkType, LinkHtmlOptions>
  );
};

/**
 * Merges user options with defaults using deep merge
 */
const getDefaultWikiLinkOptions = (
  providedOptions: Partial<WikiLinkOptions> = {}
): WikiLinkOptions & { htmlOptions: Record<LinkType, LinkHtmlOptions> } => {
  return {
    hrefTemplate: providedOptions.hrefTemplate ?? DEFAULT_OPTIONS.hrefTemplate,
    classNames: {
      ...DEFAULT_OPTIONS.classNames,
      ...providedOptions.classNames,
    },
    validation: {
      ...DEFAULT_OPTIONS.validation,
      ...providedOptions.validation,
    },
    htmlOptions: {
      ...createDefaultHtmlOptionsForAllTypes(),
      ...providedOptions.htmlOptions,
    },
    imageOptions: {
      ...DEFAULT_OPTIONS.imageOptions,
      ...providedOptions.imageOptions,
    },
    integration: {
      ...DEFAULT_OPTIONS.integration,
      ...providedOptions.integration,
    },
    greedyMatch: {
      ...DEFAULT_OPTIONS.greedyMatch,
      ...providedOptions.greedyMatch,
    },
  };
};

export { getDefaultWikiLinkOptions };
export type { LinkHtmlOptions, LinkType, WikiLinkOptions };
