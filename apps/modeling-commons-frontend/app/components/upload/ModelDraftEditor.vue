<template>
  <div class="bg-page-bg min-h-screen">
    <UContainer class="py-8">
      <Banner
        color="info"
        :visible="isEdit && willCreateNewVersion"
        icon="i-lucide-info"
        class="mb-6"
      >
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

      <ModelDraftPickerView
        v-else-if="showPicker"
        v-model:picked-file="pickedFile"
        :title="title"
      />

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
                  <AddDetailsCard
                    v-model="formState"
                    :preview-image-url="previewImageUrl"
                    :has-primary-file="hasPrimaryFile"
                    :generating-preview="generatingPreview"
                    :uploading-preview="uploadingPreview"
                    @generate-preview="generatePreview"
                  />
                </UForm>
              </template>
              <template #permissions>
                <SetPermissionsCard v-model="formState" />
              </template>
            </UStepper>

            <ModelDraftActionBar
              :is-edit="isEdit"
              :publishing="publishing"
              :reverting="reverting"
              :deleting-model="deletingModel"
              :is-dirty="isDirty"
              :draft-id="draftId"
              :save-status-label="saveStatusLabel"
              :submit-label="submitLabel"
              :discard-label="discardLabel"
              @delete="confirmDelete = true"
              @revert="onRevert"
              @discard="onDiscard"
              @submit="onSubmit"
            />
          </UForm>
        </UCard>

        <ModelDraftSidebar
          v-model:picked-file="pickedFile"
          :current-file-name="currentNetlogoFileName"
          :has-primary-file="hasPrimaryFile"
          :preview-card="previewCard"
        />
      </div>
    </UContainer>

    <ConfirmDeleteModelDialog
      v-model:open="confirmDelete"
      :deleting="deletingModel"
      @confirm="onDelete"
    />

    <ConfirmDiscardDraftDialog
      v-model:open="confirmDiscard"
      :is-edit="isEdit"
      :publishing="publishing"
      @confirm="onDiscard"
    />
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
  generatingPreview,
  uploadingPreview,
  previewImageUrl,
  init,
  generatePreview,
  submit,
  discard,
  revert,
  deleteModel,
} = useModelDraftForm({
  mode: props.mode,
  initialDraftId: props.initialDraftId,
  seedModelId: props.seedModelId,
});

const currentNetlogoFileName = computed(
  () => pickedFile.value?.name ?? primaryFile.value?.filename ?? null,
);

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

onMounted(() => {
  void init();
});

// const { unlock } = useUnloadGuard(isDirty);

async function onSubmit(): Promise<void> {
  // unlock();

  const visibility = formState.value.permission ?? "public";
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

async function onDiscard(): Promise<void> {
  if (!draftId.value) return;
  // unlock();

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

async function onRevert(): Promise<void> {
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

async function onDelete(): Promise<void> {
  // unlock();

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
</script>
