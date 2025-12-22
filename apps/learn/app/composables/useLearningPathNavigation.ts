import type { ContentNavigationItem } from '@nuxt/content';
import { ObjectModel } from '~/data/article';

const getLinkProgressIcon = (completed: boolean) => {
  return completed ? 'i-lucide-circle-check' : 'i-lucide-circle-minus';
};

const getLinkProgressColor = (completed: boolean) => {
  return completed
    ? '[&_.iconify]:text-green-600 hover:[&_.iconify]:text-green-600'
    : '[&_.iconify]:text-gray-400 hover:[&_.iconify]:text-gray-400';
};

type LearningPathNavigationChild = ContentNavigationItem & {
  title: string;
  path: string;
  articlePath: string;
  lp: LearningPathData;
  description?: string;
  completed?: boolean;
  trailingIcon?: string;
  class?: string;
  page?: boolean;
  active?: boolean;
};

type LearningPathNavigationItem = Omit<ContentNavigationItem, 'children'> & {
  title: string;
  path: string;
  children?: Array<LearningPathNavigationChild>;
};

type LearningPathNavigation = Array<LearningPathNavigationItem>;

export function useLearningPathNavigation(
  lp: Ref<LearningPathData>,
  articleRoute?: string,
): ComputedRef<LearningPathNavigation> {
  const lpProgress = useLearningPathsProgress();

  const navHeader = computed<LearningPathNavigationItem>(() => ({
    title: lp.value.title,
    path: addLeadingSlash(lp.value.stem),
    icon: lp.value.icon,
    active: false,
  }));

  const navigation = computed(() => [
    navHeader.value,
    ...lp.value.sections.map(
      (section) =>
        ({
          title: section.title,
          path: '',
          icon: section.icon,
          children: section.articles
            .filter((a) => a !== null)
            .map((a) => new ObjectModel.Article(a))
            .filter((a) => typeof a.path === 'string')
            .map((a) => ({
              title: a.title,
              lp: lp.value,
              description: a.description,
              path: addLeadingSlash(lp.value.stem + a.path),
              articlePath: a.path,
              completed: lpProgress.articleCompletionMap[a.path!]?.completed,
              trailingIcon: getLinkProgressIcon(lpProgress.articleCompletionMap[a.path!]?.completed ?? false),
              class: getLinkProgressColor(lpProgress.articleCompletionMap[a.path!]?.completed ?? false),
              active: articleRoute === a.path,
            })),
        }) as LearningPathNavigationItem,
    ),
  ]);

  return navigation;
}

export type { LearningPathNavigation, LearningPathNavigationChild, LearningPathNavigationItem };
