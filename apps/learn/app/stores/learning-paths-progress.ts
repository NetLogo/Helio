import { defineStore } from 'pinia';

export const useLearningPathsProgress = defineStore(
  'learningPath',
  () => {
    const articleCompletionMap = ref<Record<string, { completed: boolean }>>({});
    const version = ref(2);

    const ensurePath = (path: LearningPathData): void => {
      const articles = path.sections.flatMap((section) => section.articles);
      const articleIds = articles.map((a) => a.path).filter((path) => typeof path === 'string');

      articleIds.forEach((id) => {
        if (!articleCompletionMap.value[id]) {
          articleCompletionMap.value[id] = { completed: false };
        }
      });
    };

    const markArticleComplete = (articlePath: string, completed = true) => {
      console.log('Setting article @ ', articlePath, 'to ', completed);
      articleCompletionMap.value[articlePath] = { completed };
    };

    return { articleCompletionMap, version, ensurePath, markArticleComplete };
  },
  { persist: true },
);
type LearningPathProgressStore = ReturnType<typeof useLearningPathsProgress>;
type LearningPathProgress = ReturnType<typeof storeToRefs<LearningPathProgressStore>>;

export type { LearningPathProgress, LearningPathProgressStore };
