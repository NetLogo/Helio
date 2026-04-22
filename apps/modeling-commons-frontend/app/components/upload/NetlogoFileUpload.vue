<template>
  <FileUploader
    label="Drag and drop a NetLogo model here"
    accept=".nlogox"
    :description="`Supported file types: .nlogox (max. ${formattedMaxFileSize})`"
    include-browse-button
  />
</template>

<script setup lang="ts">
import { maxNetlogoFileSize } from "./form";

const formattedMaxFileSize = formatBytes(maxNetlogoFileSize);
</script>
