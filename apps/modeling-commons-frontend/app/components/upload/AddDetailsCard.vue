<template>
  <UCard
    :ui="{
      root: 'rounded-2xl shadow-none',
      body: 'p-8 sm:p-8',
    }"
  >
    <div class="flex flex-col gap-8">
      <UploadCardTitle title="Add Details" />

      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <div class="flex flex-col">
            <UFormField name="previewImage" label="Model Preview Image" />

            <p
              class="text-sm text-muted max-w-120"
              v-text="
                `If you don't pick a preview image, one will be generated automatically when you publish.`
              "
            />
          </div>

          <div class="flex items-center gap-10">
            <div class="flex flex-col gap-2">
              <div
                class="aspect-square w-46 h-46 flex items-center justify-center bg-neutral-lighter rounded-md overflow-hidden"
              >
                <img
                  v-if="previewImageUrl"
                  :src="previewImageUrl"
                  alt="Model preview"
                  class="w-full h-full object-cover"
                />
                <UIcon v-else name="i-lucide-image" class="size-10 text-muted" />
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <UFormField name="imageFile">
                <UButton
                  variant="outline"
                  color="neutral"
                  size="md"
                  icon="i-lucide-image-up"
                  class="w-fit"
                  :disabled="!hasPrimaryFile || generatingPreview || uploadingPreview"
                  data-testid="upload-thumbnail-button"
                  @click="$refs.imageFileInput?.openFilePicker()"
                >
                  Upload thumbnail
                </UButton>
                <ImageUploader
                  ref="imageFileInput"
                  v-model="state.imageFile"
                  :disabled="generatingPreview || uploadingPreview"
                  data-testid="preview-image-uploader"
                  class="hidden"
                />
              </UFormField>
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                icon="i-lucide-fullscreen"
                class="w-fit"
                :disabled="!hasPrimaryFile || generatingPreview || uploadingPreview"
                :loading="generatingPreview"
                data-testid="generate-preview-button"
                @click="$emit('generate-preview')"
              >
                Generate preview
              </UButton>
            </div>
          </div>
        </div>

        <UFormField required name="title" label="Model Title">
          <UInput
            v-model="state.title"
            placeholder="Ex: COVID 19 spread"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField required name="description" label="Description">
          <UTextarea
            v-model="state.description"
            placeholder="Write 1-2 lines to give a brief overview of your model"
            :rows="6"
            class="w-full"
          />
        </UFormField>

        <UFormField name="tags" label="Tags">
          <TagSelectMenu
            v-model="selectedTags"
            :tags="tags.tags"
            :loading="tags.pending"
            :load-next-page="tags.loadNextPage"
            :can-load-more="tags.canLoadMore"
            class="w-full mt-2"
            can-create-new-tags
          />
        </UFormField>

        <UFormField name="usecases" label="Best Usecases">
          <UCheckboxGroup v-model="state.usecases" :items="modelUsecases" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { toTagSelectMenuItem, type TagItem } from "~/components/tag/TagSelectMenu.vue";
import { modelUsecases, type UploadFormInput } from "~/forms/upload";

const state = defineModel<UploadFormInput>({ required: true });
const props = withDefaults(
  defineProps<{
    previewImageUrl?: string | null;
    hasPrimaryFile?: boolean;
    generatingPreview?: boolean;
    uploadingPreview?: boolean;
  }>(),
  {
    previewImageUrl: null,
    hasPrimaryFile: false,
    generatingPreview: false,
    uploadingPreview: false,
  },
);
defineEmits<{ "generate-preview": [] }>();

const tags = reactive(useTags());

const { previewImageUrl, hasPrimaryFile, generatingPreview, uploadingPreview } = toRefs(props);

const selectedTags = ref<TagItem[]>([]);

watch(
  () => state.value.tags,
  (next) => {
    const nextNames = next ?? [];
    const currentNames = selectedTags.value.map((t) => t.value);
    if (
      currentNames.length === nextNames.length &&
      currentNames.every((n, i) => n === nextNames[i])
    ) {
      return;
    }
    selectedTags.value = nextNames.map((name) => {
      const known = tags.tags?.find((t) => t.name === name);
      return toTagSelectMenuItem(known ?? { name });
    });
  },
  { immediate: true },
);

watch(selectedTags, (items) => {
  state.value.tags = items.map((t) => t.value);
});
</script>
