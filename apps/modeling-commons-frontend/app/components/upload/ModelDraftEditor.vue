<template>
  <div class="bg-page-bg min-h-screen">
    <UContainer class="py-8">
      <Banner color="info" :visible="isEdit && willCreateNewVersion" icon="i-lucide-info"  class="mb-6" >
          Replacing the NetLogo file or changing model files will publish a new version of this model when you save.
      </Banner>

      <div
        v-if="initializing"
        class="flex items-center justify-center min-h-[70vh] text-muted"
        aria-live="polite"
      >
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 mr-2" />
        Loading draft…
      </div>


      <div v-else-if="showPicker" class="flex items-center justify-center min-h-[70vh]">
        <div class="upload-modal">
          <div class="flex flex-col w-full">
            <h5>{{ title }}</h5>
            <p class="text-base text-muted">The file name must end with ".nlogox"</p>
          </div>
          <NetlogoFileUpload v-model="pickedFile" class="w-full h-100" />
        </div>
      </div>

      <div v-else class="flex justify-between gap-10 relative">
        <UCard class="ring-0 border-0 md:px-5 md:py-3 flex-1 h-fit shrink-0">
          <div class="flex items-center justify-between mb-6 gap-4">
            <h4 class="m-0">{{ title }}</h4>
          </div>

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
                  v-model:model-files="modelFiles"
                  v-model:additional-files="additionalFiles"
                  :existing-attachments="existingAttachments"
                  :lock-existing="isEdit"
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
            </UStepper>

            <div class="flex gap-4 items-center justify-between w-full flex-wrap">
                <span class="text-sm text-muted " aria-live="polite">
                  {{ saveStatusLabel }}
                </span>
              <div class="flex items-center gap-3 flex-wrap">
                <UButton
                  v-if="isEdit"
                  variant="subtle"
                  color="error"
                  icon="i-lucide-trash-2"
                  :disabled="publishing || deletingModel"
                  @click="confirmDelete = true"
                >
                  Delete
                </UButton>
                <UButton
                  v-if="isEdit"
                  variant="outline"
                  color="neutral"
                  :disabled="publishing || reverting || !isDirty"
                  :loading="reverting"
                  @click="onRevert"
                >
                  Revert
                </UButton>
                <UButton
                  variant="outline"
                  color="neutral"
                  :disabled="publishing || !draftId"
                  @click="onDiscard"
                >
                  {{ discardLabel }}
                </UButton>
                <UButton
                  :loading="publishing"
                  :disabled="publishing"
                  variant="solid"
                  color="primary"
                  @click="onSubmit"
                >
                  {{ submitLabel }}
                </UButton>
              </div>
            </div>
          </UForm>
        </UCard>

        <div
          data-show-from="lg"
          class="flex-col flex-0 gap-5 sticky top-[calc(1.5rem+var(--ui-header-height))] self-start min-w-60"
        >
          <div class="flex flex-col gap-3">
            <h6>Netlogo File <span class="text-coral">*</span></h6>
            <div
              v-if="currentNetlogoFileName"
              class="flex items-center gap-2 py-1.5 px-2 rounded bg-(--ui-bg-muted) text-sm"
            >
              <UIcon name="i-lucide-file" class="size-4 text-muted shrink-0" />
              <span class="flex-1 truncate">{{ currentNetlogoFileName }}</span>
            </div>
            <UButton
              icon="i-lucide-upload"
              variant="outline"
              color="neutral"
              size="sm"
              block
              @click="netlogoUploader?.openFilePicker()"
            >
              {{ currentNetlogoFileName ? "Replace file" : "Choose file" }}
            </UButton>
            <NetlogoFileUpload
              ref="netlogoUploader"
              v-model="pickedFile"
              class="sr-only"
            />
          </div>

          <USeparator />

          <h6>Upload Preview</h6>
          <ModelCard v-if="hasPrimaryFile" class="w-60 h-fit" :card="previewCard" />
        </div>
      </div>
    </UContainer>

    <UModal v-model:open="confirmDelete" title="Delete Model" class="lg:max-w-2xl">
      <template #content>
        <div class="space-y-8 p-8">
          <h6 class="text-center">Are you sure you want to delete this model?</h6>
          <p class="text-center">
            This action cannot be undone. If this is the only copy of the model, the model file and
            all its versions will be permanently deleted.
          </p>
          <div class="flex justify-end gap-2 w-full mt-4">
            <UButton variant="outline" color="neutral" size="sm" @click="confirmDelete = false" >
              Cancel
            </UButton>
            <UButton
              variant="solid"
              color="error"
              icon="i-lucide-trash-2"
              size="sm"
              :loading="deletingModel"
              :disabled="deletingModel"
              @click="onDelete"
            >
              Delete model
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="confirmDiscard" class="lg:max-w-2xl">
      <template #content>
        <div class="space-y-8 p-8">
          <h6 class="text-center">
            You have unsaved changes. Are you sure you want to {{ isEdit ? "discard your edits" : "discard this draft" }}?
          </h6>
          <div class="flex justify-end gap-2 w-full mt-4">
            <UButton variant="outline" color="neutral" size="sm" @click="confirmDiscard = false" >
              Cancel
            </UButton>
            <UButton
              variant="solid"
              color="error"
              size="sm"
              :loading="publishing"
              :disabled="publishing"
              @click="onDiscard"
            >
              {{ isEdit ? "Discard edits" : "Discard draft" }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { StepperItem } from "#ui/types";
import { AddDetailsCardSchema } from "~/forms/upload";

type Mode = "create" | "edit";

const props = withDefaults(
  defineProps<{
    mode?: Mode;
    title?: string;
    initialDraftId?: string;
    seedModelId?: string;
  }>(),
  { mode: "create", title: "Upload", initialDraftId: undefined, seedModelId: undefined },
);

const emit = defineEmits<{
  published: [modelId: string];
  discarded: [];
  deleted: [];
}>();

const toast = useToast();

const {
  draftId,
  publishing,
  initializing,
  formState,
  pickedFile,
  primaryFile,
  modelFiles,
  additionalFiles,
  previewCard,
  saveStatusLabel,
  hasPrimaryFile,
  existingAttachments,
  primaryFileChanged,
  modelFilesAdded,
  isDirty,
  deletingModel,
  init,
  submit,
  discard,
  revert,
  deleteModel,
} = useModelDraftForm({
  initialDraftId: props.initialDraftId,
  seedModelId: props.seedModelId,
});

const netlogoUploader = useTemplateRef("netlogoUploader");

const currentNetlogoFileName = computed(
  () => pickedFile.value?.name ?? primaryFile.value?.filename ?? null,
);

onMounted(() => {
  void init();
});

const stepIndex = ref(0);
const reverting = ref(false);
const confirmDelete = ref(false);
const confirmDiscard = ref(false);

const isEdit = computed(() => props.mode === "edit");
const showPicker = computed(() => !isEdit.value && !hasPrimaryFile.value);
const submitLabel = computed(() => "Publish");
const discardLabel = computed(() => (isEdit.value ? "Discard edits" : "Discard draft"));
const willCreateNewVersion = computed(() => primaryFileChanged.value || modelFilesAdded.value);

const stepperItems = [
  { slot: "details", icon: "i-lucide-file-text", title: "Add Details" },
  { slot: "files", icon: "i-lucide-file-up", title: "Add Files" },
  { slot: "permissions", icon: "i-lucide-lock", title: "Set Permissions" },
] satisfies Array<StepperItem>;

async function onSubmit() {
  const visibility = formState.value.permission === "private" ? "private" : "public";
  try {
    const result = await submit(visibility);
    if (!result) return;
    toast.add({
      title: isEdit.value ? "Model updated" : "Model published",
      description: isEdit.value
        ? "Your changes are live on Modeling Commons."
        : "Your model is now available on Modeling Commons.",
      icon: "i-lucide-badge-check",
      color: "success",
    });
    emit("published", result.id);
  } catch (err) {
    toast.add({
      title: isEdit.value ? "Save failed" : "Publish failed",
      description:
        err instanceof Error
          ? err.message
          : isEdit.value
            ? "Something went wrong while saving your changes."
            : "Something went wrong while publishing your model.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

async function onDiscard() {
  if (!draftId.value) return;
  try {
    await discard();
    toast.add({
      title: isEdit.value ? "Edits discarded" : "Draft discarded",
      icon: "i-lucide-trash-2",
      color: "neutral",
    });
    emit("discarded");
  } catch (err) {
    toast.add({
      title: "Could not discard",
      description: err instanceof Error ? err.message : "Something went wrong.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

async function onRevert() {
  if (reverting.value) return;
  reverting.value = true;
  try {
    await revert();
    toast.add({
      title: "Reverted to original",
      icon: "i-lucide-rotate-ccw",
      color: "neutral",
    });
  } catch (err) {
    toast.add({
      title: "Could not revert",
      description: err instanceof Error ? err.message : "Something went wrong.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  } finally {
    reverting.value = false;
  }
}

async function onDelete() {
  try {
    await deleteModel();
    confirmDelete.value = false;
    toast.add({
      title: "Model deleted",
      icon: "i-lucide-trash-2",
      color: "neutral",
    });
    emit("deleted");
  } catch (err) {
    toast.add({
      title: "Could not delete model",
      description: err instanceof Error ? err.message : "Something went wrong.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

onMounted(() => {
  window.addEventListener("beforeunload", () => {
    if (isDirty.value) {
      return "You have unsaved changes. Are you sure you want to leave?";
    }
    return undefined;
  });
})
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
