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
          <label class="font-sans text-base font-medium leading-normal text-text">
            Model Preview Image <span class="text-coral">*</span>
          </label>
          <div class="flex items-center gap-10">
            <div class="aspect-square w-46 h-46 flex">
              <ImageUploader
                ref="imageUploader"
                v-model="state.imageFile"
                :initial-preview-url="previewUrl || undefined"
                class="aspect-square"
              />
            </div>
            <div class="flex flex-col gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                icon="i-lucide-image-up"
                @click="imageUploader?.openFilePicker()"
              >
                Change
              </UButton>
            </div>
          </div>
        </div>

        <UFormField
          :label-class="'font-[family-name:var(--font-sans)] text-base font-medium leading-normal text-text'"
          required
        >
          <template #label> Model Name </template>
          <UInput v-model="state.name" placeholder="Ex: COVID 19 spread" size="lg" class="w-full" />
        </UFormField>

        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Description</span
            >
          </template>
          <UTextarea
            v-model="state.description"
            placeholder="Write 1-2 lines to give a brief overview of your model"
            :rows="6"
            class="w-full"
          />
        </UFormField>

        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Tags <span class="text-coral">*</span></span
            >
          </template>

          <UInputTags v-model="state.tags" placeholder="e.g. Biology" size="lg" class="w-full" />
        </UFormField>

        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Best Usecases</span
            >
          </template>
          <UCheckboxGroup v-model="state.usecases" :items="modelUsecases" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { modelUsecases, type UploadFormInput } from "./form";

const state = defineModel<UploadFormInput>({ required: true });
const props = defineProps<{
  initialPreviewUrl?: string | null;
}>();
const imageUploader = useTemplateRef("imageUploader");

const previewUrl = ref<string | null>(props.initialPreviewUrl || null);
</script>
