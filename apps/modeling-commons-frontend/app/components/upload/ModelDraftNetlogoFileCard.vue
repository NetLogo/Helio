<template>
  <div class="flex flex-col gap-3" data-testid="primary-file-uploader">
    <h6>Netlogo File <span class="text-coral">*</span></h6>
    <div
      v-if="currentFileName"
      class="flex items-center gap-2 py-1.5 px-2 rounded bg-(--ui-bg-muted) text-sm"
    >
      <UIcon name="i-lucide-file" class="size-4 text-muted shrink-0" />
      <span class="flex-1 truncate">{{ currentFileName }}</span>
    </div>
    <UButton
      icon="i-lucide-upload"
      variant="outline"
      color="neutral"
      size="sm"
      block
      @click="netlogoUploader?.openFilePicker()"
    >
      {{ currentFileName ? "Replace file" : "Choose file" }}
    </UButton>
    <NetlogoFileUpload
      ref="netlogoUploader"
      v-model="pickedFile"
      class="sr-only"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ currentFileName: string | null }>();

const pickedFile = defineModel<File | null>("pickedFile", { default: null });

const netlogoUploader = useTemplateRef("netlogoUploader");
</script>
