<template>
  <div class="flex gap-4 items-start justify-end w-full">
    <UButton variant="outline" color="neutral" size="lg" @click="$emit('saveDraft')">
      Save as Draft
    </UButton>
    <UButton size="lg" :disabled="publishDisabled" @click="$emit('publish')"> Publish </UButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  publishDisabled?: boolean;
}>();
defineEmits<{
  saveDraft: [];
  publish: [];
}>();
</script>
