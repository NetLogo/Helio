<template>
  <UContainer class="my-(--block-top) flex flex-col gap-8">
    <UBreadcrumb v-if="breadcrumb.length" :items="breadcrumb" class="[&_li]:m-0" />

    <UPageHero
      v-if="page === 1"
      :title="title"
      :description="subtitle"
      class="no-stylized-heading"
      :ui="{
        container: 'py-8! pb-10 prose-tight prose-margin-tight',
      }"
    />

    <div v-else>
      <Heading id="title" as="h1" class="no-stylized-heading mt-0">{{ title }}</Heading>
      <p class="text-lg text-base-content/70 mt-2 mb-6 text-slate-500">{{ subtitle }}</p>
    </div>

    <UContentSearchButton :collapsed="false" size="lg" />

    <div class="no-stylized-heading flex flex-col gap-10">
      <UBlogPost
        v-for="article in section.items"
        :key="article.meta.source"
        :title="article.title"
        :description="article.description"
        :date="article.createdDate"
        :badge="article.badge"
        :image="article.thumbnail"
        variant="outline"
        orientation="horizontal"
        :authors="productsWrapper(article.productTags)"
        :to="article.path"
        :ui="{
          title: 'my-3',
          badge: article.badgeClassName,
          root: 'lg:grid-cols-4 [&>div:has(>img)]:lg:h-full',
          body: 'lg:col-span-2 h-full',
          description: 'lg:line-clamp-3  text-ellipsis overflow-hidden',
        }"
      />
    </div>

    <UEmpty
      v-if="section.items.length === 0"
      class="mx-auto no-stylized-heading [&_h2]:m-0 mb-20"
      icon="i-lucide-file-search"
      :title="`No ${section.title} Available`"
      :description="noItemsMessage"
      variant="naked"
    />

    <UPagination
      v-model:page="page"
      :total="data?.count ?? 0"
      :items-per-page="pageSize"
      color="primary"
      variant="ghost"
      show-edges
      class="mx-auto"
      :to="(page) => props.to(page)"
    />
  </UContainer>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import type { Product } from '~/assets/products';
import type { Utility } from '~/data';
import { ObjectModel, Service } from '~/data';

type Props = {
  page?: number;

  includeTags?: string[];
  excludeTags?: string[];
  filterStrategy?: Utility.Article.FilterLogicalStrategy;

  title?: string;
  subtitle?: string;
  parentName?: string;

  pageSize?: number;
  breadcrumb?: Array<{ label: string; to: string; icon?: string }>;

  to: (n: number) => RouteLocationRaw;
};

const props = withDefaults(defineProps<Props>(), {
  page: 1,
  pageSize: 6,
  title: '',
  subtitle: '',
  parentName: '',
  includeTags: () => [],
  excludeTags: () => [],
  filterStrategy: 'some',
  breadcrumb: () => [],
});

function createCacheKey(): string {
  return [props.page, props.pageSize, props.includeTags?.join(','), props.excludeTags?.join(','), props.filterStrategy]
    .filter((v) => v != null)
    .join('-');
}

const { title, subtitle, parentName, page, pageSize, includeTags, excludeTags, filterStrategy } = toRefs(props);

const noItemsMessage = computed(() => {
  if (parentName.value) {
    return `It looks like we don't have any ${title.value.toLowerCase()} for ${parentName.value} at this time.`;
  }
  return `It looks like we don't have any ${title.value.toLowerCase()} at this time.`;
});

const { data } = await useAsyncData(
  `post-list-page-${createCacheKey()}`,
  () => {
    return Service.Article.getArticlesInfoByTags(includeTags.value, excludeTags.value, {
      count: undefined,
      filterStrategy: filterStrategy.value,
    });
  },
  {
    watch: [page, pageSize, parentName, includeTags, excludeTags, filterStrategy],
    transform: (data) => ({
      articles: data
        .sort(
          (a, b) =>
            new Date(new ObjectModel.Article(b).createdDate).getTime() -
            new Date(new ObjectModel.Article(a).createdDate).getTime(),
        )
        .slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
      count: data.length,
    }),
  },
);

const section = computed(() => ({
  title: title.value,
  pageCount: Math.ceil((data.value?.count ?? 0) / pageSize.value),
  items: data.value?.articles?.map((item) => new ObjectModel.Article(item)) ?? [],
}));

function productsWrapper(products: Array<Product>) {
  return products.map(productToUserProps);
}

function checkValidPageNumber(n: number): void | never {
  if (n < 1 || n > section.value.pageCount) {
    throw createError({ statusCode: 404, statusMessage: `Requested page number ${n} is out of range` });
  }
}

watch(
  () => props.page,
  (newPage) => {
    checkValidPageNumber(newPage ?? 1);
  },
);

checkValidPageNumber(props.page);
</script>
