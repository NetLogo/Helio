<template>
  <PostListPage
    :page="page"
    :title="getTagTitle(kindParam)"
    :subtitle="getTagSubtitle(kindParam, product.name)"
    :parent-name="product.name"
    :breadcrumb="breadcrumb"
    :include-tags="[product.name, ...tagNames]"
    filter-strategy="every"
    :to="
      (n) => ({
        name: 'product-id-kind-page',
        params: { id: productId, kind: kindParam, page: n },
      })
    "
  />
</template>

<script lang="ts">
const availableKinds = getTagsRecord();
</script>

<script setup lang="ts">
import { toSlug } from '@repo/netlogo-docs/helpers';
import { products } from '~/assets/products';

const route = useRoute();
const productId = toSlug(decodeURIComponent(route.params.id as string));

const product = products.getProductById(productId);
if (!product) {
  throw createError({ statusCode: 404, statusMessage: 'Product Not Found' });
}

const kindParam = route.params.kind as TagKey;

if (!Object.keys(availableKinds).includes(kindParam)) {
  throw createError({
    statusCode: 404,
    statusMessage: `Content Kind '${kindParam}' Not Found in ${Object.keys(availableKinds).join(', ')}`,
  });
}

const tagNames = computed(() => {
  return kindParam === 'all' ? [] : [getTagName(kindParam)!];
});

useSeoMeta({
  title: `${product.name} ${getTagTitle(kindParam)!} - NetLogo Learn`,
  description: `Explore ${getTagTitle(kindParam)!.toLowerCase()} for ${product.name} on NetLogo Learn.`,
});

const page = computed(() => Number(route.params.page) || 1);

const breadcrumb = useLearnBreadcrumb(
  ref([
    { label: product.name, to: getProductHome(productId), icon: product.iconName },
    { label: getTagTitle(kindParam)!, to: '', icon: getTagIcon(kindParam)! },
  ]),
);
</script>
