import type { ObjectModel } from '~/data';

export function useArticleOgImage(article: ObjectModel.Article) {
  defineOgImageComponent('ThumbnailSeo', {
    title: article.title,
    description: article.description,
    theme: '#f31500',
    siteLogo: '/turtles.png',
    thumbnailUrl: article.thumbnail ?? '/images/default-thumbnail.png',
  });
}
