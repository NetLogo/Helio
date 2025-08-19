import { describe, expect, it } from 'vitest';
import {
  getDefaultWikiLinkOptions,
  LinkType,
  WikiLinkOptions,
} from './wikilink.options';

describe('wikilink.options', () => {
  describe('getDefaultWikiLinkOptions', () => {
    it('should return default options when no options provided', () => {
      const options = getDefaultWikiLinkOptions();

      expect(options.hrefTemplate).toBeDefined();
      expect(options.hrefTemplate!('test', 'wikiLink')).toBe('#test');

      expect(options.classNames).toEqual({
        wikiLink: 'wikilink',
        imageLink: 'wikilink-image',
        missingLink: 'wikilink-missing',
      });

      expect(options.validation).toEqual({
        missingLinkBehavior: 'ignore',
      });

      expect(options.imageOptions).toEqual({
        altTemplate: expect.any(Function),
        defaultSize: {},
      });

      expect(options.integration).toEqual({
        fileExtension: '.md',
        encode: expect.any(Function),
      });
    });

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<WikiLinkOptions> = {
        classNames: {
          wikiLink: 'custom-link',
        },
        validation: {
          missingLinkBehavior: 'mark',
        },
        imageOptions: {},
      };

      const options = getDefaultWikiLinkOptions(customOptions);

      expect(options.classNames!.wikiLink).toBe('custom-link');
      expect(options.classNames!.imageLink).toBe('wikilink-image'); // Default preserved
      expect(options.classNames!.missingLink).toBe('wikilink-missing'); // Default preserved

      expect(options.validation!.missingLinkBehavior).toBe('mark');

      expect(options.imageOptions!.altTemplate).toBeDefined(); // Default preserved
    });

    it('should create HTML options for all link types', () => {
      const options = getDefaultWikiLinkOptions();

      const linkTypes: LinkType[] = ['wikiLink', 'imageLink', 'missingLink'];
      linkTypes.forEach((type) => {
        expect(options.htmlOptions[type]).toBeDefined();
        expect(options.htmlOptions[type].target).toBe('_self');
        expect(options.htmlOptions[type].titleTemplate).toBeDefined();
      });
    });

    it('should use custom HTML options when provided', () => {
      const customOptions: Partial<WikiLinkOptions> = {
        htmlOptions: {
          wikiLink: {
            target: '_blank',
            rel: 'noopener',
            titleTemplate: (permalink) => `Custom title for ${permalink}`,
          },
        },
      };

      const options = getDefaultWikiLinkOptions(customOptions);

      expect(options.htmlOptions.wikiLink.target).toBe('_blank');
      expect(options.htmlOptions.wikiLink.rel).toBe('noopener');
      expect(options.htmlOptions.wikiLink.titleTemplate!('test')).toBe(
        'Custom title for test'
      );

      // Other types should still have defaults
      expect(options.htmlOptions.imageLink.target).toBe('_self');
      expect(options.htmlOptions.missingLink.target).toBe('_self');
    });
  });

  describe('default functions', () => {
    it('should have working default href template', () => {
      const options = getDefaultWikiLinkOptions();
      expect(options.hrefTemplate!('my-page', 'wikiLink')).toBe('#my-page');
      expect(options.hrefTemplate!('my-page', 'wikiLink', 'section')).toBe(
        '#my-page#section'
      );
    });

    it('should have working default alt template for images', () => {
      const options = getDefaultWikiLinkOptions();
      expect(options.imageOptions!.altTemplate!('image.png')).toBe('image.png');
    });

    it('should have working default encode function', () => {
      const options = getDefaultWikiLinkOptions();
      expect(options.integration!.encode!('hello world')).toBe('hello+world');
      expect(options.integration!.encode!('café & résumé')).toBe(
        'caf%C3%A9+%26+r%C3%A9sum%C3%A9'
      );
    });

    it('should have working default title template', () => {
      const options = getDefaultWikiLinkOptions();
      const titleTemplate = options.htmlOptions.wikiLink.titleTemplate!;

      expect(titleTemplate('my-page')).toBe('Link to my-page');
      expect(titleTemplate('my-page', 'Custom Display')).toBe(
        'Link to Custom Display (my-page)'
      );
    });
  });

  describe('deep merge behavior', () => {
    it('should not override unspecified nested properties', () => {
      const customOptions: Partial<WikiLinkOptions> = {};

      const options = getDefaultWikiLinkOptions(customOptions);

      expect(options.imageOptions!.altTemplate).toBeDefined(); // Should keep default
      expect(options.imageOptions!.defaultSize).toEqual({}); // Should keep default
    });

    it('should handle partial validation options', () => {
      const customOptions: Partial<WikiLinkOptions> = {
        validation: {
          linkExists: (permalink) => permalink === 'exists',
        },
      };

      const options = getDefaultWikiLinkOptions(customOptions);

      expect(options.validation!.linkExists!('exists')).toBe(true);
      expect(options.validation!.linkExists!('missing')).toBe(false);
      expect(options.validation!.missingLinkBehavior).toBe('ignore'); // Should keep default
    });

    it('should handle partial class name options', () => {
      const customOptions: Partial<WikiLinkOptions> = {
        classNames: {
          wikiLink: 'custom-wiki',
          // missingLink and imageLink not specified
        },
      };

      const options = getDefaultWikiLinkOptions(customOptions);

      expect(options.classNames!.wikiLink).toBe('custom-wiki');
      expect(options.classNames!.imageLink).toBe('wikilink-image'); // Default
      expect(options.classNames!.missingLink).toBe('wikilink-missing'); // Default
    });
  });

  describe('LinkType enum behavior', () => {
    it('should support all expected link types', () => {
      const linkTypes: LinkType[] = [
        'wikiLink',
        'imageLink',
        'missingLink',
        'externalLink',
      ];

      linkTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });
});
