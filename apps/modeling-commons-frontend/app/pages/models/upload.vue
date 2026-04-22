<template>
  <div class="bg-page-bg min-h-screen">
    <UContainer class="py-8">
      <div v-if="step === 'file'" class="flex items-center justify-center min-h-[70vh]">
        <div class="upload-modal">
          <div class="flex flex-col gap-4 w-full">
            <h5>Upload Model File</h5>
            <p class="text-base text-text">The file name must end with ".nlogox"</p>
          </div>
          <NetlogoFileUpload v-model="formState.file" class="w-full h-100" />
        </div>
      </div>

      <div v-else class="flex gap-12">
        <!-- <UploadStepper
          :steps="['Add Details', 'Set Permissions', 'Ask for Peer Review']"
          :active-step="0"
          :refs="stepsRefs"
        /> -->
        <div class="flex flex-col gap-10 max-w-sm">
          <div class="flex flex-col gap-5">
            <h5>Model File</h5>
            <NetlogoFileUpload
              v-model="formState.file"
              class="w-50"
              :ui="{
                base: 'hidden',
              }"
            />
          </div>
          <div class="flex flex-col gap-5">
            <h5>Model Files</h5>
            <UAlert
              variant="subtle"
              color="neutral"
              icon="i-lucide-info"
              description="Allowed file types include .csv, .txt, .xlsx, .zip, and more. These files will be included in the model version and can be accessed by the model at runtime, for example using the file primitives in NetLogo."
            />
            <FileUploader
              v-model="modelFiles"
              description="Upload files required to run the model, such as datasets or extensions."
              class="w-fill"
            />
          </div>
          <div class="flex flex-col gap-5">
            <h5>Additional Files</h5>
            <UAlert
              variant="subtle"
              color="neutral"
              icon="i-lucide-info"
              description="Upload any additional files, such as documentation, license, or supplementary materials."
            />
            <FileUploader
              v-model="additionalFiles"
              class="w-50"
              :ui="{
                base: 'hidden',
              }"
            />
          </div>
        </div>

        <div class="flex flex-col gap-8 max-w-3xl w-full">
          <AddDetailsCard ref="AddDetailsCard" @change-image="onChangeImage" />
          <SetPermissionsCard ref="SetPermissionsCard" />
          <PeerReviewCard ref="PeerReviewCard" />
          <UploadActions
            :publish-disabled="submitting"
            @save-draft="onSaveDraft"
            @publish="onPublish"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type AddDetailsCard from "~/components/upload/AddDetailsCard.vue";
import type PeerReviewCard from "~/components/upload/PeerReviewCard.vue";
import type SetPermissionsCard from "~/components/upload/SetPermissionsCard.vue";

definePageMeta({
  layout: "default",
});

useSeoMeta({
  title: "Upload Model",
  description: "Upload a new NetLogo model to Modeling Commons",
});

const modelFile = ref<File | null>(null);
const submitting = ref(false);

const formState = ref({
  file: new File([], "file.nlogox") as File | null,
});
const modelFiles = ref<File[]>([]);
const additionalFiles = ref<File[]>([]);

const step = computed<"file" | "details">(() => (formState.value.file ? "details" : "file"));

const addDetailsCardRef = useTemplateRef<InstanceType<typeof AddDetailsCard>>("AddDetailsCard");
const setPermissionsCardRef =
  useTemplateRef<InstanceType<typeof SetPermissionsCard>>("SetPermissionsCard");
const peerReviewCardRef = useTemplateRef<InstanceType<typeof PeerReviewCard>>("PeerReviewCard");
const stepsRefs = [addDetailsCardRef, setPermissionsCardRef, peerReviewCardRef];

const toast = useToast();
const router = useRouter();

function onFileSelected(file: File | null | undefined) {
  if (!file) {
    toast.add({ title: "No file selected", color: "warning" });
    return;
  }
  modelFile.value = file;
  step.value = "details";
}

function onChangeImage(_file: File) {}

function onSaveDraft() {
  void submit("private");
}

function onPublish() {
  const read = setPermissionsCardRef.value?.readPermission;
  void submit(read === "everyone" ? "public" : "private");
}

async function submit(visibility: "public" | "private") {
  if (submitting.value) return;

  const details = addDetailsCardRef.value;
  const permissions = setPermissionsCardRef.value;
  if (!details || !permissions) return;

  const title = details.modelName.trim();
  if (!title) {
    toast.add({ title: "Model name is required", color: "error" });
    return;
  }
  if (!modelFile.value) {
    toast.add({ title: "Please select a .nlogox file", color: "error" });
    return;
  }

  submitting.value = true;
  try {
    const api = useApi();
    const description = details.description.trim() || undefined;

    const { data: created, error: createError } = await api.POST("/api/v1/models", {
      body: { title, description, visibility },
    });
    if (createError || !created) {
      throw new Error((createError as { message?: string })?.message ?? "Failed to create model");
    }
    const modelId = created.id;

    const formData = new FormData();
    formData.append("file", modelFile.value, modelFile.value.name);
    formData.append("title", title);
    if (description) formData.append("description", description);

    const apiBase = useRuntimeConfig().public.apiBase;
    try {
      await $fetch(`${apiBase}/api/v1/models/${modelId}/versions`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { data?: { message?: string } })?.data?.message;
      throw new Error(message ?? "Failed to upload model version");
    }

    for (const tag of details.tags) {
      const { error } = await api.POST("/api/v1/models/{id}/tags", {
        params: { path: { id: modelId } },
        body: { name: tag },
      });
      if (error) {
        toast.add({ title: `Failed to add tag "${tag}"`, color: "warning" });
      }
    }

    if (permissions.invitedPeople.length) {
      toast.add({
        title: "Email invites not yet supported",
        description: "The permissions API requires user IDs; invited emails were skipped.",
        color: "warning",
      });
    }

    toast.add({ title: "Model uploaded", color: "success" });
    await router.push(`/models/${modelId}`);
  } catch (err) {
    toast.add({
      title: "Upload failed",
      description: err instanceof Error ? err.message : String(err),
      color: "error",
    });
  } finally {
    submitting.value = false;
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
