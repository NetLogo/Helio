<template>
  <FileUploader
    ref="fileUploader"
    v-model="model"
    label="Drag and drop a NetLogo model here"
    accept=".nlogox,.nlogox3d"
    :description="`Supported file types: .nlogox, .nlogox3d (max. ${formattedMaxFileSize})`"
    include-browse-button
  />
</template>

<script setup lang="ts">

const model = defineModel<File | null>();

const formattedMaxFileSize = formatBytes(draftRules.netlogoFile.maxSize);

const fileUploader = useTemplateRef("fileUploader");

defineExpose({
  openFilePicker: () => fileUploader.value?.openFilePicker(),
});
</script>
