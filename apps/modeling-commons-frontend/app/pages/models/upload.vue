<template>
  <ModelDraftEditor
    mode="create"
    :initial-draft-id="initialDraftId"
    @published="onPublished"
    @discarded="onDiscarded"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
  ssr: false,
});

useSeoMeta({
  title: "Upload Model",
  description: "Upload a new NetLogo model to Modeling Commons",
  robots: "noindex, nofollow",
});

const route = useRoute();
const initialDraftId = (route.query.draft as string | undefined) ?? undefined;

async function onPublished(modelId: string) {
  await navigateTo(`/models/${modelId}`);
}

async function onDiscarded() {
  await navigateTo("/models");
}
</script>
