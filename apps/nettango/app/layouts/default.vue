<template>
  <main>
    <ClientNavbar />
    <PageBoundary>
      <UMain class="relative">
        <HeroBackground
          class="absolute w-full -top-px transition-all text-primary shrink-0 -z-10"
          :class="[
            isLoading ? 'animate-pulse' : appear ? heroBackgroundClass : 'opacity-0',
            appeared ? 'duration-[400ms]' : 'duration-1000',
          ]"
        />

        <slot />
      </UMain>
    </PageBoundary>
    <ClientFooter />
  </main>
</template>

<script setup lang="ts">

const heroBackgroundClass = ref(
  "pointer-events-none absolute w-full -top-px transition-all text-primary shrink-0 -z-10 -z-10 duration-[400ms]",
);
const { isLoading } = useLoadingIndicator();

const appear = ref(false);
const appeared = ref(false);
onMounted(() => {
  setTimeout(() => {
    appear.value = true;
    setTimeout(() => {
      appeared.value = true;
    }, 1000);
  }, 0);
});

useProductHead();

useHead({
  link: () => [
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
  ],
});
</script>

<style>
body {
  font-family: "Inter", sans-serif;
}
</style>
