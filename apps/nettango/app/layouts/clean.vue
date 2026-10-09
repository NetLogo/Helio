<template>
  <main>
    <ClientNavbar />
    <PageBoundary>
      <UMain class="relative">
        <slot />
      </UMain>
    </PageBoundary>
    <ClientFooter />
  </main>
</template>

<script setup lang="ts">

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
