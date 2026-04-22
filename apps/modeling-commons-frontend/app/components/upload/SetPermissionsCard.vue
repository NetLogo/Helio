<template>
  <UCard
    :ui="{
      root: 'rounded-2xl shadow-none',
      body: 'p-8 sm:p-8',
    }"
  >
    <div class="flex flex-col gap-8">
      <div>
        <h5>Set Permissions</h5>
        <p class="text-sm text-neutral-darkest-60">
          Required fields are marked with an asterisk (<span class="text-coral">*</span>)
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-8">
        <UFormField class="flex-1">
          <template #label>
            <span class="text-md">Model Permissions <span class="text-coral">*</span></span>
          </template>
          <URadioGroup v-model="state.permission" :items="permissionOptions" class="mt-2" />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { UploadFormInput } from "./form";
import { permissionOptions } from "./form";

const state = defineModel<UploadFormInput>({ required: true });
</script>
