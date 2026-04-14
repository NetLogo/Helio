<template>
  <FileDropZoneBase
    v-slot="{ isDragging }"
    accept=".nlogox"
    class="min-h-128"
    @select="emit('select', $event)"
  >
    <template v-if="isDragging">
      <UIcon name="i-lucide-paperclip" class="size-10" />
      <p class="font-semibold text-md leading-relaxed">Release to upload your .nlogox file</p>
    </template>
    <template v-else>
      <UIcon name="i-lucide-file-up" class="size-10" />
      <p class="font-semibold text-md leading-relaxed">
        Drag and drop a <span class="text-royal-blue">.nlogox file</span> here
      </p>
      <p class="text-base text-neutral-dark">or</p>
      <UButton variant="outline" color="neutral" size="md"> Browse Files </UButton>
    </template>
  </FileDropZoneBase>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  select: [file: File];
}>();
</script>
