<template>
  <ModelDraftEditor
    mode="edit"
    title="Edit Model"
    :seed-model-id="modelId"
    @published="onPublished"
    @discarded="onDiscarded"
    @deleted="onDeleted"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useSeoMeta({
  title: "Edit Model",
  description: "Edit an existing NetLogo model on Modeling Commons",
  robots: "noindex, nofollow",
});

const route = useRoute();
const modelId = computed(() => route.params.id as string);
const slug = computed(() => (route.params.slug as string | undefined) ?? undefined);

const modelPath = computed(() =>
  slug.value ? `/models/${slug.value}/${modelId.value}` : `/models/${modelId.value}`,
);

async function onPublished() {
  await navigateTo(modelPath.value);
}

async function onDiscarded() {
  await navigateTo(modelPath.value);
}

async function onDeleted() {
  await navigateTo("/models");
}
</script>
