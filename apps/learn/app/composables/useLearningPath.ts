import type { ContentCollectionItem, LearningPathsCollectionItem } from '@nuxt/content';
import { Service } from '~/data/article';

type LearningPathSections = LearningPathsCollectionItem['sections'];
type LearningPathData = Omit<LearningPathsCollectionItem, 'sections'> & {
  sections: Array<
    Omit<LearningPathSections[number], 'articles'> & {
      articles: Array<Partial<ContentCollectionItem> & { path: string }>;
    }
  >;
};

export async function useLearningPath(route: string): Promise<Ref<LearningPathData>> {
  const { data, error } = await useAsyncData(`learning-path-${route}`, async () => {
    const lp = await queryCollection('learningPaths').where('stem', '=', route.replace(/^\//, '')).first();

    if (!lp) return null;

    const sections = await Promise.all(
      (lp.sections ?? []).map(async (section) => ({
        ...section,
        articles: section.articles
          ? await Promise.all(section.articles.map((a) => Service.Article.getArticleByPath(a)))
          : [],
      })),
    );

    return { ...lp, sections };
  });

  if (error.value || !data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch learning path data for route: ${route}. Error: ${error.value?.message || 'Unknown error'}`,
    });
  }

  return data as Ref<LearningPathData>;
}

export type { LearningPathData };
