<template>
  <div class="bg-page-bg min-h-screen">
    <UContainer class="py-8">
      <div v-if="step === 'file'" class="flex items-center justify-center min-h-[70vh]">
        <div class="upload-modal">
          <div class="flex flex-col gap-4 w-full">
            <h5>Upload Model File</h5>
            <p class="text-base text-text">The file name must end with ".nlogox"</p>
          </div>
          <NlogoxDropZone @select="onFileSelected" />
        </div>
      </div>

      <div v-else class="flex gap-12">
        <!-- <UploadStepper
          :steps="['Add Details', 'Set Permissions', 'Ask for Peer Review']"
          :active-step="0"
          :refs="stepsRefs"
        /> -->

        <div class="flex flex-col gap-8 max-w-3xl w-full">
          <AddDetailsCard ref="AddDetailsCard" @change-image="onChangeImage" />
          <SetPermissionsCard ref="SetPermissionsCard" />
          <PeerReviewCard ref="PeerReviewCard" />
          <UploadActions @save-draft="onSaveDraft" @publish="onPublish" />
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

const step = ref<"file" | "details">("file");

const addDetailsCardRef = useTemplateRef<InstanceType<typeof AddDetailsCard>>("AddDetailsCard");
const setPermissionsCardRef =
  useTemplateRef<InstanceType<typeof SetPermissionsCard>>("SetPermissionsCard");
const peerReviewCardRef = useTemplateRef<InstanceType<typeof PeerReviewCard>>("PeerReviewCard");
const stepsRefs = [addDetailsCardRef, setPermissionsCardRef, peerReviewCardRef];

function onFileSelected(_file: File) {
  step.value = "details";
}

function onChangeImage() {
  // placeholder
}

function onSaveDraft() {
  // placeholder
}

function onPublish() {
  // placeholder
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
