<template>
  <UCard
    :ui="{
      root: 'rounded-2xl ring-0 border-0 shadow-none',
      body: 'p-8 sm:p-8',
    }"
  >
    <div class="flex flex-col gap-8">
      <div class="flex flex-col gap-0.5">
        <h5
          class="font-(family-name:--font-heading) font-medium leading-(--line-height-subheading) tracking-[-0.28px]"
        >
          Add Details
        </h5>
        <p class="text-sm text-neutral-darkest-60">
          Required fields are marked with an asterisk (<span class="text-coral">*</span>)
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3">
          <label class="font-sans text-base font-medium leading-normal text-text">
            Model Preview Image <span class="text-coral">*</span>
          </label>
          <div class="flex items-center gap-10">
            <div class="aspect-square w-46 h-46 flex">
              <ImageDropZone
                ref="ImageDropZone"
                :initial-preview-url="previewUrl || undefined"
                class="aspect-square"
                @select="onImageSelect($event)"
              />
            </div>
            <div class="flex flex-col gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                icon="i-lucide-image-up"
                @click="imageDropZoneRef?.openFilePicker()"
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
          <UInput v-model="modelName" placeholder="Ex: COVID 19 spread" size="lg" class="w-full" />
        </UFormField>

        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Description</span
            >
          </template>
          <UTextarea
            v-model="description"
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
          <UInput
            v-model="tagInput"
            placeholder="Ex: Biology"
            size="lg"
            class="w-full"
            @keydown.enter.prevent="addTag"
          />
          <div v-if="tags.length" class="flex flex-wrap gap-2.5 pt-2">
            <UBadge
              v-for="tag in tags"
              :key="tag"
              variant="subtle"
              color="neutral"
              size="md"
              class="gap-2"
            >
              {{ tag }}
              <UIcon name="i-lucide-x" class="size-3.5 cursor-pointer" @click="removeTag(tag)" />
            </UBadge>
          </div>
        </UFormField>

        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Best Usecases</span
            >
          </template>
          <UCheckboxGroup v-model="useCases" :items="useCasesOptions" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type ImageDropZone from "./ImageDropZone.vue";

const modelName = ref("");
const description = ref("");
const tagInput = ref("");
const tags = ref<string[]>([]);

const useCases = ref([]);
const useCasesOptions = ref([
  {
    label: "Good for research",
    value: "research",
  },
  {
    label: "Good for teaching",
    value: "teaching",
  },
]);

const props = defineProps<{
  initialPreviewUrl?: string | null;
}>();

const previewUrl = ref<string | null>(props.initialPreviewUrl || null);

const emit = defineEmits<{
  changeImage: [];
}>();

const imageDropZoneRef = useTemplateRef<InstanceType<typeof ImageDropZone>>("ImageDropZone");

function addTag() {
  const value = tagInput.value.trim();
  if (value && !tags.value.includes(value)) {
    tags.value.push(value);
  }
  tagInput.value = "";
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag);
}

function onImageSelect(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
  emit("changeImage");
}
</script>
