<template>
  <UContainer>
    <div class="py-4 text-start pb-8">
      <h1 class="font-semibold text-start text-4xl mb-4">Download on a Different Device</h1>
      <p class="text-lg mb-3">Choose which platform to download:</p>
      <div class="flex flex-row gap-4">
        <NuxtLink
          to="/downloads/windows"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
        >
          Windows
        </NuxtLink>
        <NuxtLink
          to="/downloads/mac"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
        >
          Mac
        </NuxtLink>
        <NuxtLink
          to="/downloads/linux"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
        >
          Linux
        </NuxtLink>
      </div>
      <div class="pt-4">
        <a href="https://netlogoweb.org/" class="underline text-blue-600">
          You can also run NetLogo Web in the browser
        </a>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: "NetLogo Downloads",
  titleTemplate: "%s",
  meta: [{ name: "description", content: "NetLogo download page" }],
});
</script>
