<template>
  <UCard
    :ui="{
      root: 'rounded-2xl shadow-none',
      body: 'p-8 sm:p-8 ',
    }"
  >
    <div class="flex flex-col gap-10">
      <UploadCardTitle title="Upload Files" />

      <div class="flex flex-col gap-5">
        <h6>Netlogo File <span class="text-coral">*</span></h6>
        <NetlogoFileUpload
          v-model="nlogoxFile"
          class="w-full"
          :ui="{
            base: 'hidden',
          }"
        />
      </div>
      <div class="flex flex-col gap-5">
        <h6>Model Files</h6>

        <FileUploader
          v-model="modelFiles"
          description="Upload files required to run the model, such as datasets or extensions."
          class="w-fill min-h-80"
        />
      </div>
      <div class="flex flex-col gap-5">
        <h6>Additional Files</h6>

        <FileUploader
          v-model="additionalFiles"
          description="Upload any additional files, such as documentation, related paper, or license."
          class="w-fill min-h-80"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const nlogoxFile = defineModel<File | null>("nlogoxFile", { required: true });
const modelFiles = defineModel<Array<File>>("modelFiles", { required: true });
const additionalFiles = defineModel<Array<File>>("additionalFiles", { required: true });
</script>
