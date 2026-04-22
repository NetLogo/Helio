<template>
  <UCard
    :ui="{
      root: 'rounded-2xl shadow-none',
      body: 'p-8 sm:p-8',
    }"
  >
    <div class="flex flex-col gap-8">
      <div class="flex flex-col gap-1.5">
        <h5
          class="font-(family-name:--font-heading) font-medium leading-(--line-height-subheading) tracking-[-0.28px]"
        >
          Ask for Peer Review
        </h5>
        <p class="text-base text-text">
          Are you currently working on a model and want to seek help? Post a question with your
          model to invite other to help you!
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <UFormField>
          <template #label>
            <span class="font-sans text-base font-medium leading-normal text-text"
              >Select what you want help with</span
            >
          </template>
          <UFormField>
            <template #label>
              <span class="font-sans text-base font-medium leading-normal text-text"
                >Best Usecases</span
              >
            </template>
            <UCheckboxGroup v-model="state.peerReviewKinds" :items="peerReviewKindOptions" />
          </UFormField>
        </UFormField>

        <UFormField>
          <template #label>
            <span class="text-md leading-normal text-text">Description</span>
          </template>
          <UTextarea
            v-model="state.peerReviewDescription"
            placeholder="Write 1-2 lines to help others understand what you are trying to resolve"
            :rows="6"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { UploadFormInput } from "./form";
import { peerReviewKindOptions } from "./form";

const state = defineModel<UploadFormInput>({ required: true });
</script>
