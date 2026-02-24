<template>
  <div class="py-8">
    <h1 class="text-3xl lg:text-4xl font-semibold mb-4">Thanks for downloading!</h1>
    <p v-if="downloadUrl" class="text-start pt-5">
      If your download didn't work,
      <a :href="downloadUrl" class="text-blue-600 hover:text-blue-800 underline">click here</a>
    </p>
    <p v-else class="text-start pt-5">
      You may not have downloaded before coming to this page.
      <NuxtLink to="/download" class="text-blue-600 hover:text-blue-800 underline">
        Click here
      </NuxtLink>
      to go to the download page.
    </p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const downloadUrl = ref<string | null>(null);

onMounted(() => {
  const encodedUrl = route.query.download_url as string | undefined;
  if (encodedUrl) {
    try {
      const decoded = atob(encodedUrl);
      downloadUrl.value = decoded;

      const link = document.createElement("a");
      link.href = decoded;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Invalid download URL:", error);
    }
  }
});
</script>
