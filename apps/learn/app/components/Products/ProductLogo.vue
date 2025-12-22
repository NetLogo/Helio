<template>
  <NuxtLink
    class="flex gap-3 items-center justify-center w-fit"
    v-bind="containerLevelAttributes"
    role="img"
    :aria-label="`Logo and name of ${product.name}`"
    :to="`/product/${product.id}`"
  >
    <img
      :src="iconUrl"
      :alt="`${product.name} Logo`"
      class="my-4 object-contain"
      :class="dProps.img.class"
      v-bind="imageLevelAttributes"
    />
    <h1 class="text-5xl font-maven-pro no-stylized-heading m-0 select-none" v-bind="headingLevelAttributes">
      <span
        v-for="(part, index) in productLabel"
        :key="index"
        :class="[part.props.class, dProps.h1.class, 'block']"
        v-bind="spanLevelAttributes"
        >{{ part.text }}</span
      >
    </h1>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Product } from '~/assets/products';

type Props = {
  product: Product;
  containerLevelAttributes?: Record<string, unknown>;
  imageLevelAttributes?: Record<string, unknown>;
  headingLevelAttributes?: Record<string, unknown>;
  spanLevelAttributes?: Record<string, unknown>;
};

const props = withDefaults(defineProps<Props>(), {
  containerLevelAttributes: () => ({}),
  imageLevelAttributes: () => ({}),
  headingLevelAttributes: () => ({}),
  spanLevelAttributes: () => ({}),
});

const { product } = props;

const iconUrl = product.preferredIconUrl ?? product.iconUrl;
const productLabel = product.name.split(' ').map((word, index) => {
  if (index === 0) return { props: { class: 'font-bold' }, text: word };
  return { props: { class: 'font-normal' }, text: ` ${word}` };
});

const multiline = product.name.split(' ').length >= 2;
const dProps = {
  img: multiline ? { class: 'w-24 lg:w-26' } : { class: 'w-20 lg:w-18' },
  h1: multiline ? { class: 'text-5xl' } : { class: 'text-5xl lg:text-5xl' },
};
</script>
