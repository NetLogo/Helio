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
                  :disabled="stepIndex === 0 || publishing"
                  @click="prev"
                >
                </UButton>
                <UButton
                  square
                  icon="i-lucide-chevron-right"
                  title="Next Step"
                  :disabled="stepIndex === stepperItems.length - 1 || publishing"
                  @click="next"
                >
                </UButton>
              </UFieldGroup>

              <div class="flex items-center gap-3">
                <span class="text-sm text-muted" aria-live="polite">
                  {{ saveStatusLabel }}
                </span>
                <UButton
                  variant="outline"
                  color="neutral"
                  :disabled="publishing || !draftId"
                  @click="onDiscard"
                >
                  Discard draft
                </UButton>
                <UButton
                  :loading="publishing"
                  :disabled="publishing"
                  variant="solid"
                  color="primary"
                  @click="onPublish(formState.permission === 'private' ? 'private' : 'public')"
                >
                  Publish
                </UButton>
              </div>
            </div>
          </UForm>
        </UCard>
        <div
          class="hidden md:flex flex-col flex-0 gap-5 sticky top-[calc(1.5rem+var(--ui-header-height))] self-start"
        >
          <div class="flex flex-col gap-5">
            <h6>Netlogo File <span class="text-coral">*</span></h6>
            <NetlogoFileUpload
              v-model="formState.nlogoxFile"
              class="w-full"
              :ui="{
                base: 'hidden',
              }"
            />
          </div>

          <USeparator />

          <h6>Upload Preview</h6>
          <ModelCard v-if="formState.nlogoxFile" class="w-60 h-fit" :card="previewCard" />
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
import type { ModelCard } from "~/composables/useModelCard";
import type { Visibility } from "~/composables/useModelDraft";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useSeoMeta({
  title: "Upload Model",
  description: "Upload a new NetLogo model to Modeling Commons",
});

const toast = useToast();
const route = useRoute();
const initialDraftId = (route.query.draft as string | undefined) ?? undefined;

const {
  draftId,
  saving,
  publishing,
  ensureDraft,
  load,
  patch,
  uploadPrimaryFile,
  uploadAttachment,
  removeFile,
  publish,
  abandon,
} = useModelDraft(initialDraftId);

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
  formState.value.imageFile ? URL.createObjectURL(formState.value.imageFile) : null,
);

const currentUser = useUser();

const previewCard = computed<ModelCard>(() => {
  const now = new Date().toISOString();
  const file = formState.value.nlogoxFile;
  const me = currentUser.value;
  return {
    model: {
      id: "",
      createdAt: now,
      updatedAt: now,
      latestVersionNumber: 1,
      parentModelId: null,
      parentVersionNumber: null,
      visibility: (formState.value.permission ?? "private") as "public" | "private" | "unlisted",
      isEndorsed: false,
    },
    latestVersion: {
      modelId: "",
      versionNumber: 1,
      title: formState.value.title || file?.name || "Untitled Model",
      description: formState.value.description || null,
      netlogoFileKey: null,
      netlogoVersion: null,
      infoTab: null,
      createdAt: now,
      isFinalized: false,
      netlogoFileDownloadUrl: null,
      previewImageUrl: previewImageUrl.value,
    },
    authors: me.isLoggedIn
      ? [
          {
            modelId: "",
            userId: me.user.id,
            role: "owner",
            createdAt: now,
            userName: me.user.name ?? null,
            userImage: me.user.image ?? null,
          },
        ]
      : [],
    tagsOnLatestVersion: [],
    previewImageUrl: previewImageUrl.value,
    counts: { versions: 0, children: 0 },
    stats: { likes: 0, views: 0, runs: 0, downloads: 0, shares: 0, likedByMe: false },
  };
});

const modelFiles = ref<File[]>([]);
const additionalFiles = ref<File[]>([]);

const stagedPrimary = ref<{ fileId: string; filename: string } | null>(null);
const stagedAttachments = ref<Array<{ fileId: string; filename: string }>>([]);

const saveStatusLabel = computed(() => {
  if (!draftId.value) return "";
  if (saving.value) return "Saving…";
  return "Saved";
});

onMounted(async () => {
  if (!initialDraftId) return;
  try {
    await load(initialDraftId);
  } catch {
    toast.add({
      title: "Draft not found",
      description: "We could not load that draft. Starting fresh.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
});

watch(
  () => formState.value.nlogoxFile,
  async (file) => {
    if (!file) {
      formState.value = { ...defaultFormValues };
      return;
    }
    if (formState.value.title === "") {
      formState.value.title = file.name.replace(/\.nlogox$/i, "");
      try {
        const infoTab = await readInfoTabFromNlogox(await file.text());
        if (infoTab && formState.value.description === "") {
          formState.value.description = await getFirstParagraphTextFromMarkdown(infoTab);
        }
      } catch {
        // Ignore info-tab parse failures; description stays blank.
      }
    }
    try {
      await ensureDraft();
      const staged = await uploadPrimaryFile(file);
      stagedPrimary.value = { fileId: staged.fileId, filename: staged.filename };
      await patch({
        title: formState.value.title,
        description: formState.value.description,
      });
    } catch (err) {
      toast.add({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not stage the model file.",
        icon: "i-lucide-circle-alert",
        color: "error",
      });
    }
  },
);

watch(
  () => formState.value.title,
  (v) => {
    void patch({ title: v });
  },
);
watch(
  () => formState.value.description,
  (v) => {
    void patch({ description: v });
  },
);
watch(
  () => [
    ...(formState.value.tags ?? []),
    ...(formState.value.subjects ?? []),
    ...(formState.value.usecases ?? []),
  ],
  () => {
    void patch({ tags: collectTagNames(formState.value) });
  },
);

async function syncAttachments(files: File[] | undefined, prev: File[] | undefined): Promise<void> {
  const current = files ?? [];
  const previous = prev ?? [];
  const added = current.filter((f) => !previous.includes(f));
  for (const file of added) {
    try {
      const staged = await uploadAttachment(file);
      stagedAttachments.value.push({ fileId: staged.fileId, filename: staged.filename });
    } catch (err) {
      toast.add({
        title: "Upload failed",
        description: err instanceof Error ? err.message : `Failed to upload ${file.name}.`,
        icon: "i-lucide-circle-alert",
        color: "error",
      });
    }
  }
  const removed = previous.filter((f) => !current.includes(f));
  for (const file of removed) {
    const match = stagedAttachments.value.find((s) => s.filename === file.name);
    if (match) {
      stagedAttachments.value = stagedAttachments.value.filter((s) => s !== match);
      await removeFile(match.fileId).catch(() => null);
    }
  }
}

watch(modelFiles, (files, prev) => {
  void syncAttachments(files, prev);
});

watch(additionalFiles, (files, prev) => {
  void syncAttachments(files, prev);
});

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

function collectTagNames(form: UploadFormInput): string[] {
  return [
    ...(form.tags ?? []).map((t) => t.trim()).filter(Boolean),
    ...(form.subjects ?? []).map((s) => s.trim()).filter(Boolean),
    ...(form.usecases ?? []).map((u) => `usecase:${u}`),
  ];
}

async function onPublish(visibility: Visibility) {
  if (publishing.value) return;
  if (!stagedPrimary.value) {
    toast.add({
      title: "Missing model file",
      description: "Upload a .nlogox before publishing.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }
  if (!formState.value.title.trim()) {
    toast.add({
      title: "Missing title",
      description: "Add a title before publishing.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  try {
    await patch.flush();
    await patch({ visibility, tags: collectTagNames(formState.value) });
    await patch.flush();

    const result = await publish();

    toast.add({
      title: "Model published",
      description: "Your model is now available on Modeling Commons.",
      icon: "i-lucide-badge-check",
      color: "success",
    });

    await navigateTo(`/models/${result.id}`);
  } catch (err) {
    toast.add({
      title: "Publish failed",
      description:
        err instanceof Error ? err.message : "Something went wrong while publishing your model.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
  }
}

async function onDiscard() {
  if (!draftId.value) return;
  try {
    await abandon();
    toast.add({
      title: "Draft discarded",
      icon: "i-lucide-trash-2",
      color: "neutral",
    });
    await navigateTo("/models");
  } catch (err) {
    toast.add({
      title: "Could not discard",
      description: err instanceof Error ? err.message : "Something went wrong.",
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
