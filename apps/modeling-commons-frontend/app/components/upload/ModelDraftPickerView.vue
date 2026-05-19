<template>
  <div class="flex items-center justify-center min-h-[70vh]">
    <div class="upload-modal">
      <div class="flex flex-col w-full">
        <h5>{{ title }}</h5>
        <p class="text-base text-muted">The file name must end with ".nlogox"</p>
      </div>
      <NetlogoFileUpload v-model="pickedFile" class="w-full h-100" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();

const pickedFile = defineModel<File | null>("pickedFile", { default: null });
</script>

<style lang="scss" scoped>
.upload-modal {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  max-width: 768px;
  width: 100%;
  padding: 2rem;
  background: var(--color-background);
  border-radius: 1rem;

  h5 {
    font-family: var(--font-heading);
    font-weight: 500;
    line-height: var(--line-height-subheading);
    letter-spacing: -0.28px;
  }
}
</style>
