<template>
  <UFileUpload
    ref="fileUploadRef"
    v-model="modelValue"
    icon="i-lucide-file-up"
    layout="list"
    :multiple="multiple"
    :disabled="disabled"
  >
    <template v-if="includeBrowseButton" #actions="{ open }">
      <USeparator label="or" orientation="horizontal" class="my-4" />
      <UButton
        label="Browse files"
        color="neutral"
        variant="outline"
        size="sm"
        class="w-full justify-center"
        @click="open()"
      />
    </template>
  </UFileUpload>
</template>

<script setup lang="ts" generic="T extends File | File[] | null | undefined">
withDefaults(
  defineProps<{
    includeBrowseButton?: boolean;
    multiple?: boolean;
    disabled?: boolean;
  }>(),
  {
    includeBrowseButton: false,
    multiple: false,
    disabled: false,
  },
);

const modelValue = defineModel<T>();

const fileUploadRef = useTemplateRef("fileUploadRef");
defineExpose({
  openFilePicker: () => {
    fileUploadRef.value?.inputRef.click();
  },
});
</script>
