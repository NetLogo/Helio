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
              v-text="`A thumbnail will be auto-generated after upload if you don't upload one.`"
            />
          </div>

          <div class="flex items-center gap-10">
            <div class="flex flex-col gap-2">
              <div class="aspect-square w-46 h-46 flex">
                <ImageUploader
                  ref="imageUploader"
                  v-model="state.imageFile"
                  :initial-preview-url="previewUrl || undefined"
                  class="aspect-square"
                />
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                icon="i-lucide-image-up"
                class="w-fit"
                @click="imageUploader?.openFilePicker()"
              >
                Change
              </UButton>
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                icon="i-lucide-fullscreen"
                class="w-fit"
              >
                Generate from Model
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
const props = defineProps<{
  initialPreviewUrl?: string | null;
}>();
const imageUploader = useTemplateRef("imageUploader");

const tags = reactive(useTags());

const previewUrl = ref<string | null>(props.initialPreviewUrl || null);

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
