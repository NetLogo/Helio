<template>
  <FileUploader
    label="Drag and drop a NetLogo model here"
    accept=".nlogox"
    :description="`Supported file types: .nlogox (max. ${formatBytes(MAX_FILE_SIZE)})`"
  />
</template>

<script lang="ts" setup>
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
</script>
