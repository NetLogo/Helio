<template>
  <FileDropZoneBase
    v-slot="{ isDragging }"
    v-bind="$attrs"
    ref="FileDropZone"
    accept="image/*"
    class="py-4! px-4! group"
    @select="onSelect"
  >
    <template v-if="isDragging">
      <UIcon name="i-lucide-image-down" class="size-10" />
      <p class="font-semibold text-md leading-relaxed">Release to upload your image</p>
    </template>
    <template v-else-if="preview">
      <img
        :src="preview"
        alt="Preview of Uploaded Image"
        class="w-full h-full rounded-xl object-cover"
      />
    </template>
    <template v-else>
      <div
        class="flex flex-1 w-full h-full items-center justify-center rounded-xl bg-neutral-lightest group-hover:bg-royal-blue/10"
      >
        <UIcon name="i-lucide-image-up" class="size-10" />
      </div>
    </template>
  </FileDropZoneBase>
</template>

<script setup lang="ts">
import type FileDropZoneBase from "../FileDropZoneBase.vue";

const dropZoneRef = useTemplateRef<InstanceType<typeof FileDropZoneBase>>("FileDropZone");

const props = defineProps<{
  initialPreviewUrl?: string;
}>();

const preview = ref<string | null>(props.initialPreviewUrl || null);

const emit = defineEmits<{
  select: [file: File];
}>();

defineExpose({
  openFilePicker() {
    dropZoneRef.value?.openFilePicker();
  },
});

function onSelect(file: File) {
  preview.value = URL.createObjectURL(file);
  emit("select", file);
}

onBeforeUnmount(() => {
  if (preview.value) {
    URL.revokeObjectURL(preview.value);
  }
});
</script>
