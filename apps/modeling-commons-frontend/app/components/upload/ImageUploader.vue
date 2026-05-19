<template>
  <FileUploader
    ref="fileUploader"
    v-model="modelValue"
    accept="image/*"
    icon="i-lucide-image-up"
    layout="grid"
    :disabled="disabled"
  />
</template>

<script setup lang="ts">
const FileUploader = resolveComponent("FileUploader");

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const modelValue = defineModel<File | null | undefined>();

const fileUploader = useTemplateRef<InstanceType<typeof FileUploader>>("fileUploader");
defineExpose({
  openFilePicker: () => {
    fileUploader.value?.openFilePicker();
  },
});
</script>
