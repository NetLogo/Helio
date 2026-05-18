<template>
  <UCard
    :ui="{
      root: 'rounded-2xl shadow-none',
      body: 'p-8 sm:p-8 ',
    }"
  >
    <div class="flex flex-col gap-10">
      <UploadCardTitle title="Upload Files" />

      <div class="flex flex-col gap-5">
        <h6>Model Files</h6>

        <FileUploader
          v-model="modelFiles"
          description="Upload files required to run the model, such as datasets or extensions."
          class="w-fill min-h-80"
          multiple
        />
      </div>
      <div class="flex flex-col gap-5">
        <h6>Additional Files</h6>

        <div v-if="existingAttachments.length > 0" class="flex flex-col gap-2">
          <p class="text-sm text-muted">
            Existing files
            <span v-if="lockExisting">(cannot be removed)</span>
          </p>
          <ul class="flex flex-col gap-1">
            <li
              v-for="att in existingAttachments"
              :key="att.id"
              class="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-(--ui-bg-muted)"
            >
              <UIcon name="i-lucide-paperclip" class="size-4 text-muted shrink-0" />
              <span class="flex-1 truncate">{{ att.filename }}</span>
              <span class="text-xs text-muted shrink-0">{{ formatBytes(att.sizeBytes) }}</span>
            </li>
          </ul>
        </div>

        <FileUploader
          v-model="additionalFiles"
          description="Upload any additional files, such as documentation, related paper, or license."
          class="w-fill min-h-80"
          multiple
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface ExistingAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  s3Key: string;
}

withDefaults(
  defineProps<{
    existingAttachments?: ExistingAttachment[];
    lockExisting?: boolean;
  }>(),
  { existingAttachments: () => [], lockExisting: false },
);

const modelFiles = defineModel<Array<File>>("modelFiles", { required: true });
const additionalFiles = defineModel<Array<File>>("additionalFiles", { required: true });
</script>
