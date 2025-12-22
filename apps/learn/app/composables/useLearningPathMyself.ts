import { isValidIndex } from '@repo/utils/std/array';

type LearningPathSelf = LearningPathNavigationChild & {
  previous?: LearningPathSelf;
  next?: LearningPathSelf;
};
export function useLearningPathMyself(
  navigation: Ref<LearningPathNavigation>,
  route: { path: string },
): ComputedRef<LearningPathSelf> {
  return computed(() => {
    const articlesFromNavigation = navigation.value
      .filter((sections) => 'children' in sections)
      .flatMap((sections) => sections.children)
      .filter((a): a is LearningPathNavigationChild => a !== undefined);

    const myIndex = articlesFromNavigation.findIndex((a) => a.path === route.path);
    if (!isValidIndex(articlesFromNavigation, myIndex)) {
      throw new Error(`Article with path ${route.path} not found in learning path navigation.`);
    }

    const createSurroundProxy = (articleNavObj: LearningPathNavigationChild, index: number): LearningPathSelf => {
      return new Proxy(articleNavObj, {
        get(target, prop) {
          if (prop === 'previous' || prop === 'next') {
            const targetIndex = index + (prop === 'previous' ? -1 : 1);
            if (isValidIndex(articlesFromNavigation, targetIndex)) {
              return createSurroundProxy(articlesFromNavigation[targetIndex]!, targetIndex);
            }
          }
          return Reflect.get(target, prop);
        },
        ownKeys() {
          return [...Reflect.ownKeys(articleNavObj), 'previous', 'next'];
        },
        getOwnPropertyDescriptor(_, prop) {
          if (prop === 'previous' || prop === 'next') {
            return {
              enumerable: true,
              configurable: true,
            };
          }
          return Reflect.getOwnPropertyDescriptor(articleNavObj, prop);
        },
      });
    };

    return createSurroundProxy(articlesFromNavigation[myIndex]!, myIndex);
  });
}

export type { LearningPathSelf };
