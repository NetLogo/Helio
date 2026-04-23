<template>
  <div class="bg-page-bg min-h-screen">
    <UContainer class="py-8">
      <div v-if="!formState.nlogoxFile" class="flex items-center justify-center min-h-[70vh]">
        <div class="upload-modal">
          <div class="flex flex-col w-full">
            <h5>Upload Model File</h5>
            <p class="text-base text-muted">The file name must end with ".nlogox"</p>
          </div>
          <NetlogoFileUpload v-model="formState.nlogoxFile" class="w-full h-100" />
        </div>
      </div>

      <div v-else class="flex justify-between gap-10 relative">
        <UCard class="ring-0 border-0 md:px-5 md:py-3 flex-1 shrink-0">
          <UForm :state="formState">
            <UStepper
              v-model="stepIndex"
              :items="stepperItems"
              :linear="false"
              :ui="{
                header: 'basis-[25%] ',
                item: 'min-h-20',
                content: 'mt-5',
                trigger:
                  'bg-(--color-foreground) text-text ring ring-(--color-border) rounded-full hover:bg-neutral-lighter group-data-[state=active]:hover:bg-royal-blue',
              }"
            >
              <template #files>
                <FileUploadCard
                  v-model:nlogox-file="formState.nlogoxFile"
                  v-model:model-files="modelFiles"
                  v-model:additional-files="additionalFiles"
                />
              </template>
              <template #details>
                <UForm :schema="AddDetailsCardSchema" nested :validate-on-input-delay="100">
                  <AddDetailsCard v-model="formState" />
                </UForm>
              </template>
              <template #permissions>
                <SetPermissionsCard v-model="formState" />
              </template>
              <template #peer-review>
                <PeerReviewCard v-model="formState" />
              </template>
            </UStepper>

            <div class="flex gap-4 items-start justify-between w-full">
              <UFieldGroup>
                <UButton
                  square
                  icon="i-lucide-chevron-left"
                  title="Previous Step"
                  :disabled="stepIndex === 0 || submitting"
                  @click="prev"
                >
                </UButton>
                <UButton
                  square
                  icon="i-lucide-chevron-right"
                  title="Next Step"
                  :disabled="stepIndex === stepperItems.length - 1 || submitting"
                  @click="next"
                >
                </UButton>
              </UFieldGroup>

              <div class="flex gap-4">
                <UButton
                  variant="outline"
                  color="neutral"
                  :disabled="submitting"
                  @click="submit('private')"
                >
                  Save as Draft
                </UButton>
                <UButton
                  :loading="submitting"
                  :disabled="submitting"
                  variant="solid"
                  color="primary"
                  @click="submit(formState.permission === 'private' ? 'private' : 'public')"
                >
                  Publish
                </UButton>
              </div>
            </div>
          </UForm>
        </UCard>
        <div
          class="hidden md:flex flex-col gap-5 sticky top-[calc(1.5rem+var(--ui-header-height))] self-start"
        >
          <h5>Upload Preview</h5>
          <ModelCard
            v-if="formState.nlogoxFile"
            class="w-60 h-fit"
            to="#"
            :model="{
              id: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              latestVersionNumber: 1,
              parentModelId: null,
              parentVersionNumber: null,
              visibility: formState.permission ?? 'private',
              isEndorsed: false,
              title: formState.title || formState.nlogoxFile.name,
              description: formState.description,
            }"
            :image-url="previewImageUrl"
          />
          <UInput
            readonly
            label="Model URL"
            :model-value="modelUrl ? withSiteUrl(modelUrl).value : '...'"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { StepperItem } from "#ui/types";
import type AddDetailsCard from "~/components/upload/AddDetailsCard.vue";
import type PeerReviewCard from "~/components/upload/PeerReviewCard.vue";
import SetPermissionsCard from "~/components/upload/SetPermissionsCard.vue";
import type { UploadFormInput } from "~/components/upload/form";
import { AddDetailsCardSchema } from "~/components/upload/form";
import type { Visibility } from "~/composables/useUploadModel";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useSeoMeta({
  title: "Upload Model",
  description: "Upload a new NetLogo model to Modeling Commons",
});

const toast = useToast();
const { submit: uploadModel, submitting, submitDraft, modelUrl } = useUploadModel();

const stepIndex = ref(0);

const defaultFormValues: UploadFormInput = {
  nlogoxFile: null,
  imageFile: null,
  title: "",
  description: "",
  tags: [],
  usecases: [],
  subjects: [],
  permission: "private",
  groupId: null,
  collaboratorEmails: [],
  askForCollaborators: false,
  askForPeerReview: false,
  peerReviewKinds: [],
};
const formState = ref<UploadFormInput>({ ...defaultFormValues });
const previewImageUrl = computed(() =>
  formState.value.imageFile ? URL.createObjectURL(formState.value.imageFile) : undefined,
);
watch(
  () => formState.value.nlogoxFile,
  async (newValue) => {
    if (formState.value.title === "" && newValue) {
      formState.value.title = newValue.name.replace(/\.nlogox$/i, "");
      const infoTab = await readInfoTabFromNlogox(await newValue.text());
      if (infoTab && formState.value.description === "") {
        formState.value.description = infoTab.firstParagraphText;
      }
      submitDraft({
        title: formState.value.title,
        description: formState.value.description,
      });
    }
    if (!newValue) {
      formState.value = { ...defaultFormValues };
    }
  },
  { immediate: true },
);

const modelFiles = ref<File[]>([]);
const additionalFiles = ref<File[]>([]);

const stepperItems = [
  {
    slot: "details",
    icon: "i-lucide-file-text",
    title: "Add Details",
  },
  {
    slot: "files",
    icon: "i-lucide-file-up",
    title: "Add Files",
  },
  {
    slot: "permissions",
    icon: "i-lucide-lock",
    title: "Set Permissions",
  },
  {
    slot: "peer-review",
    icon: "i-lucide-users",
    title: "Ask for Peer Review",
  },
] satisfies Array<StepperItem>;

function goToStep(index: number) {
  stepIndex.value = index;
  if (index < 0 || index > stepperItems.length - 1) return;
  if (import.meta.client) {
    window.scrollTo({ top: 0 });
  }
}
const next = () => goToStep(stepIndex.value + 1);
const prev = () => goToStep(stepIndex.value - 1);

async function submit(visibility: Visibility) {
  if (submitting.value) return;

  try {
    const { id } = await uploadModel({
      form: formState.value,
      modelFiles: modelFiles.value,
      additionalFiles: additionalFiles.value,
      visibility,
    });

    toast.add({
      title: visibility === "private" ? "Draft saved" : "Model published",
      description:
        visibility === "private"
          ? "Your model is saved privately."
          : "Your model is now available on Modeling Commons.",
      icon: "i-lucide-badge-check",
      color: "success",
    });

    await navigateTo(`/models/${id}`);
  } catch (err) {
    toast.add({
      title: "Upload failed",
      description:
        err instanceof Error ? err.message : "Something went wrong while uploading your model.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}
</script>

<style lang="scss" scoped>
.upload-modal {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  max-width: 768px;
  width: 100%;
  padding: 2rem;
  background: var(--color-background);
  border-radius: 1rem;

  h5 {
    font-family: var(--font-heading);
    font-weight: 500;
    line-height: var(--line-height-subheading);
    letter-spacing: -0.28px;
  }
}
</style>
