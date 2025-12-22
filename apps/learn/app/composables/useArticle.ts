import { ObjectModel, Service } from '~/data';

export async function useArticle(path: string): Promise<ComputedRef<ObjectModel.Article>> {
  const { data, error } = await useAsyncData(path, () => Service.Article.getArticleByPath(path));

  if (error.value) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' });
  }

  const article = computed(() => new ObjectModel.Article(data.value!));

  return article;
}
