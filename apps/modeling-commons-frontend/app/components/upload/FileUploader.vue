<template>
  <UFileUpload
    ref="fileUploadRef"
    v-model="modelValue"
    icon="i-lucide-file-up"
    layout="list"
    :multiple="multiple"
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

<script lang="ts">
import * as z from "zod";

export const makeFileSchema = ({
  maxFileSize,
  acceptedFileTypes,
  deniedFileTypes,
}: {
  maxFileSize: number;
  acceptedFileTypes?: string[];
  deniedFileTypes?: string[];
}) =>
  z
    .instanceof(File, { message: "Please upload a valid file." })
    .refine((file) => file.size <= maxFileSize, {
      message: `The image is too large. Please choose an image smaller than ${formatBytes(maxFileSize)}.`,
    })
    .refine(
      (file) =>
        !acceptedFileTypes ||
        acceptedFileTypes.includes(`.${file.name.split(".").pop()?.toLowerCase()}`),
      {
        message: `Unsupported file type. Please upload a file of one of the supported types.`,
      },
    )
    .refine(
      (file) =>
        !deniedFileTypes ||
        !deniedFileTypes.includes(`.${file.name.split(".").pop()?.toLowerCase()}`),
      {
        message: `Unsupported file type. Please upload a file of one of the supported types.`,
      },
    );
</script>

<script setup lang="ts" generic="T extends File | File[] | null | undefined">
withDefaults(
  defineProps<{
    includeBrowseButton?: boolean;
    multiple?: boolean;
  }>(),
  {
    includeBrowseButton: false,
    multiple: false,
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
