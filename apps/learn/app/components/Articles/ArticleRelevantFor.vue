<template>
  <div
    role="banner"
    aria-label="This page is relevant for the following products"
    class="flex gap-3 items-center w-fit ml-auto italic opacity-80 mb-6 px-4"
  >
    <span>Relevant for: </span>
    <UAvatarGroup>
      <PageTag v-for="tag in productTags" :key="tag.id" v-bind="tag.props" />
    </UAvatarGroup>
  </div>
</template>

<script setup lang="ts">
import type { ObjectModel } from '~/data';

type Props = {
  article: ObjectModel.Article;
};

const props = defineProps<Props>();

const productTags = computed(() =>
  props.article.productTags.map((prod) => ({
    id: prod.id,
    props: {
      src: prod.iconUrl,
      alt: prod.name,
      title: prod.name,
      href: getProductHome(prod.id),
    },
  })),
);
</script>
