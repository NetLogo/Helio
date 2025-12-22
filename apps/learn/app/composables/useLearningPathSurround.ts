import { surround } from '@repo/utils/std/array';

type LearningPathSurroundLink = Omit<LearningPathNavigationChild, 'class'> & {
  title: string;
  path: string;
};
export function useLearningPathSurround(
  navigation: Ref<LearningPathNavigation>,
  path: string,
): Array<LearningPathSurroundLink> {
  const allArticles = navigation.value
    .filter((sections) => 'children' in sections)
    .flatMap((sections) => sections.children)
    .map((article) => ({ ...article, class: '' }));

  return surround(allArticles, (article) => article.articlePath === path) as Array<LearningPathSurroundLink>;
}
