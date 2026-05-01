<template>
  <FileUploader ref="fileUploader" accept="image/*" icon="i-lucide-image-up" layout="grid" />
</template>

<script setup lang="ts">
const FileUploader = resolveComponent("FileUploader");

const fileUploader = useTemplateRef<InstanceType<typeof FileUploader>>("fileUploader");
defineExpose({
  openFilePicker: () => {
    fileUploader.value?.openFilePicker();
  },
});
</script>
