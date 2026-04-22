<template>
  <UFileUpload icon="i-lucide-file-up" layout="list" @update:model-value="(f) => emit('select', f)">
    <template #actions="{ open }">
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
}: {
  maxFileSize: number;
  acceptedFileTypes: string[];
}) =>
  z
    .instanceof(File, { message: "Please upload a valid file." })
    .refine((file) => file.size <= maxFileSize, {
      message: `The image is too large. Please choose an image smaller than ${formatBytes(maxFileSize)}.`,
    })
    .refine((file) => acceptedFileTypes.includes(`.${file.name.split(".").pop()?.toLowerCase()}`), {
      message: `Unsupported file type. Please upload a file of one of the supported types.`,
    });
</script>

<script setup lang="ts">
const emit = defineEmits<{
  select: [file: File | null | undefined];
}>();
</script>
