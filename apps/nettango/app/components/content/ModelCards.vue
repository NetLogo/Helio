<template>
  <div class="not-prose no-stylized-heading my-10">
    <UPageGrid>
      <ModelCard v-for="model in cards" :key="model.id" :model="model" />
    </UPageGrid>
    <p class="mt-6 text-center">
      <UButton variant="ghost" to="/models-library" icon="lucide:arrow-right" label="Browse the Models Library" />
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ ids: string }>();

const models = useModels();
const cards = computed(() =>
  props.ids
    .split(",")
    .map((id) => models.find((model) => model.id === id.trim()))
    .filter((model) => model !== undefined),
);
</script>
