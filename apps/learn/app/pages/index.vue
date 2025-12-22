<template>
  <main class="mb-10 px-2 mx-auto nl-container-width mt-[3rem] lg:mt-[3rem] relative">
    <h1 class="flex items-center gap-[0.2em] no-stylized-heading text-3xl md:text-(length:--h1-size) mt-0">
      <span>Learn</span>
      <RotatingText
        ref="rotatingTextRef"
        :texts="productNames"
        :main-class-name="textClassname"
        stagger-from="first"
        :initial="{ y: '100%' }"
        :animate="{ y: 0 }"
        :exit="{ y: '-120%' }"
        :stagger-duration="0.025"
        split-level-class-name="overflow-hidden pb-0.5 sm:pb-1 md:pb-1 select-none"
        :transition="{ type: 'spring', damping: 30, stiffness: 400 }"
        split-by="characters"
        :auto="false"
      />
    </h1>
    <p class="max-w-[90ch]">
      Learn how to create computational models with the NetLogo agent-based modeling environment, use extensions to
      expand its capabilities, utilize NetLogo in classroom settings, and use various NetLogo products.
    </p>

    <UPageGrid class="mt-10">
      <div v-for="(card, index) in cards" :key="index" class="flex">
        <UPageCard v-bind="card" />
      </div>
    </UPageGrid>
  </main>
</template>

<script setup lang="ts">
import { products } from '~/assets/products';
import { useWebsite } from '~/composables/useWebsite';

const website = useWebsite();

const textClassname =
  'px-2 sm:px-2 md:px-3 bg-accent text-white overflow-hidden justify-center font-maven-pro whitespace-nowrap';

const rotatingTextRef = useTemplateRef('rotatingTextRef');

const productNames = products.aggregate((p) => p.name);
const currentProductName = ref(productNames[0]);
const intervalId = ref<number | null>(null);

const jumpToProduct = (productName: string) => {
  const index = productNames.indexOf(productName);
  jumpToIndex(index);
};

const jumpToIndex = (index: number) => {
  if (index >= 0 && index < productNames.length) {
    const productName = productNames[index];
    currentProductName.value = productName;
    rotatingTextRef.value?.jumpTo(index);
  }
};

const rotateProducts = () => {
  const indexOfCurrent = productNames.indexOf(currentProductName.value ?? '');
  let currentIndex = indexOfCurrent >= 0 ? indexOfCurrent : 0;
  intervalId.value = setInterval(() => {
    currentIndex = (currentIndex + 1) % productNames.length;
    const nextProductName = productNames[currentIndex];
    if (nextProductName) {
      jumpToProduct(nextProductName);
    }
  }, 3000) as unknown as number;
};

const cards = computed(() =>
  products.aggregate((p) => ({
    title: p.name,
    description: p.description,
    icon: h('img', {
      src: p.iconUrl,
      alt: `${p.name} Logo`,
      width: 80,
      height: 80,
    }),
    to: `/product/${p.id}`,
    variant: 'outline' as const,
    highlight: p.name === currentProductName.value,
  })),
);

onMounted(() => {
  rotateProducts();
});

// Meta setup
useSeoMeta({
  robots: 'index, follow',
  description: website.value.longDescription,
  keywords: website.value.keywords.join(', '),
});

defineOgImageComponent('DocsSeo', {
  title: website.value.name,
  description: website.value.longDescription,
  theme: '#f31500',
  siteLogo: '/turtles.png',
  siteName: website.value.name,
});
</script>

<style>
.font-maven-pro {
  font-family: 'Maven Pro', 'sans-serif';
}
</style>
