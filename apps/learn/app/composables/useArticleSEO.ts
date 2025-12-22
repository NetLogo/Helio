import type { ObjectModel } from '~/data';

export function useArticleSEO(article: ObjectModel.Article) {
  const description =
    article.description ??
    'Learn more about NetLogo and agent-based modeling with tutorials, articles, and learning paths from the Center for Connected Learning and Computer-Based Modeling.';
  const title = article.title ? `${article.title}` : 'Learn NetLogo and Agent-Based Modeling';
  const keywords: string = (
    (article.meta.keywords as Array<string>) ?? [
      'NetLogo',
      'Agent-Based Modeling',
      'ABM',
      'Modeling',
      'Simulations',
      'Tutorials',
      'Learning Paths',
      'Center for Connected Learning and Computer-Based Modeling',
    ]
  ).join(', ');

  useSeoMeta({
    robots: 'index, follow',
    author: 'Center for Connected Learning and Computer-Based Modeling',
    generator: 'Nuxt Content',
    ogDescription: description,
    ogTitle: title,
    ogType: 'article',
    title: `${title}`,
    description: description,
    keywords: keywords,
  });
}
