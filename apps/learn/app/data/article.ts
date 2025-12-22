import type { ContentCollectionItem } from '@nuxt/content';
import { products, type Product } from '~/assets/products';
import { MetadataSchema, type DocumentMetadata } from '~~/lib/docs/schema';

namespace Utility {
  export namespace Article {
    export type FilterLogicalStrategy = 'some' | 'every';
    export type FilterOptions = {
      tags?: Array<string>;
      excludeTags?: Array<string>;
      filterStrategy?: FilterLogicalStrategy;
    };
    export const filterByTags =
      (strategy: FilterLogicalStrategy) =>
      (tags: Array<string>) =>
      <T extends { meta?: DocumentMetadata | null }>(items: Array<T>): Array<T> => {
        if (!tags.length) return items;
        return items.filter((item) => tags[strategy]((tag: string) => item.meta?.tags.includes(tag)));
      };

    export const filterTags =
      (strategy: 'some' | 'every') =>
      (excludeTags: Array<string>) =>
      <T extends { meta?: DocumentMetadata | null }>(items: Array<T>): Array<T> => {
        if (!excludeTags.length) return items;
        return items.filter((item) => !excludeTags[strategy]((tag: string) => item.meta?.tags.includes(tag)));
      };
  }
}

namespace ObjectModel {
  export class Article {
    public readonly meta: DocumentMetadata;
    constructor(public readonly item: Partial<ContentCollectionItem>) {
      this.meta = MetadataSchema.parse(item.meta ?? {});
    }

    get path(): string | undefined {
      return this.item.path;
    }

    get title(): string | undefined {
      return this.item.title;
    }
    get description(): string | undefined {
      return this.item.description;
    }
    get thumbnail(): string {
      const meta: DocumentMetadata | undefined = this.meta;
      if (meta && meta.thumbnail) return meta.thumbnail;
      return '/images/default-thumbnail.png';
    }

    get createdDate(): string {
      return this.meta.createdDate;
    }

    get badge(): string {
      if (this.meta.tags.includes('Video Tutorial')) {
        return 'Video Tutorial';
      } else if (this.meta.tags.includes('Tutorial')) {
        return 'Tutorial';
      } else if (this.meta.tags.includes('Getting Started')) {
        return 'Getting Started';
      }
      return this.meta.badge;
    }

    get badgeClassName(): string {
      if (this.badge === 'Video Tutorial') {
        return 'bg-primary ring-0 text-white';
      } else if (this.badge === 'Tutorial') {
        return 'bg-accent ring-0 text-white';
      } else if (this.badge === 'Getting Started') {
        return 'bg-secondary ring-0 text-white';
      }
      return '';
    }

    get productTags(): Array<Product> {
      return products.aggregate((prod) => prod).filter((prod) => this.meta.tags.includes(prod.name));
    }

    get<K extends keyof Partial<ContentCollectionItem>>(key: K): Partial<ContentCollectionItem>[K] {
      return this.item[key];
    }
  }
}

namespace Service {
  export namespace Article {
    /**
     * @param tags - Tags to include
     * @param excludeTags - Tags to exclude
     * @param options - Options for filtering
     * @param options.count - Maximum number of articles to return
     * @param options.filterStrategy - Logical strategy for combining tags ('some' | 'every')
     * @param options.includeHidden - Whether to include hidden articles (via .meta.hideFromList)
     * @returns A promise that resolves to an array of articles matching the criteria
     */
    export const getArticlesInfoByTags = async (
      tags: Array<string>,
      excludeTags: Array<string>,
      {
        count,
        filterStrategy = 'some',
        includeHidden = false,
      }: { count?: number; filterStrategy?: Utility.Article.FilterLogicalStrategy; includeHidden?: boolean } = {},
    ): Promise<Array<Partial<ContentCollectionItem>>> => {
      return queryCollection('content')
        .select('path', 'meta', 'title', 'description')
        .all()
        .then((items) => items.map((item) => ({ ...item, meta: MetadataSchema.parse(item.meta ?? {}) })))
        .then((items) => Utility.Article.filterByTags(filterStrategy)(tags)(items))
        .then((items) => Utility.Article.filterTags(filterStrategy)(excludeTags)(items))
        .then((items) => (includeHidden ? items : items.filter((item) => !(item.meta?.hideFromList ?? false))))
        .then((items) => (count ? items.slice(0, count) : items));
    };

    export const getArticleByPath = async (path: string): Promise<ContentCollectionItem | null> => {
      return queryCollection('content').path(path).first();
    };

    export const getArticleInfoByPath = async (path: string): Promise<Partial<ContentCollectionItem> | null> => {
      return queryCollection('content').select('path', 'meta', 'title', 'description').path(path).first();
    };
  }
}

export { ObjectModel, Service, Utility };
