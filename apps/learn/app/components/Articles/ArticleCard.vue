<template>
  <UCard :ui="ui">
    <NuxtLink :to="article.path">
      <img
        :src="article.thumbnail"
        class="aspect-square hover:scale-[1.05] transition-transform object-cover"
        v-bind="attributes.image"
      />
    </NuxtLink>
    <template #footer>
      <NuxtLink
        :to="article.path"
        :class="[
          'py-2 rounded-md group-hover:underline hover:underline focus:underline w-full whitespace-break-spaces block',
          'text-(length:--h5-size) bold text-black line-clamp-3',
        ]"
        v-bind="attributes.title"
      >
        {{ article.title }}
      </NuxtLink>
      <p class="max-w-full whitespace-break-spaces line-clamp-5" v-bind="attributes.description">
        {{ article.description }}
      </p>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'vue';
import type { ObjectModel } from '~/data';

const ui = {
  body: 'sm:p-0 p-0 overflow-hidden',
  footer: 'sm:px-4 p-2 h-[15rem] overflow-hidden text-ellipsis',
};

type Props = {
  article: ObjectModel.Article;
  attributes?: {
    image?: ImgHTMLAttributes;
    title?: AnchorHTMLAttributes;
    description?: AnchorHTMLAttributes;
  };
};

withDefaults(defineProps<Props>(), {
  attributes: () => ({
    image: {},
    title: {},
    description: {},
  }),
});
</script>
