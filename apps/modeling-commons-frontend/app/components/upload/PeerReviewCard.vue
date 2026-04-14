<template>
  <UCard
    :ui="{
      root: 'rounded-2xl ring-0 border-0 shadow-none',
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
          <div class="flex flex-col gap-2">
            <UCheckbox
              v-model="helpTypes.visualization"
              label="I want suggestions to improve the visualization"
            />
            <UCheckbox v-model="helpTypes.code" label="I want suggestions to improve the code" />
            <UCheckbox v-model="helpTypes.open" label="I am open to all suggestions" />
          </div>
        </UFormField>

        <UFormField>
          <template #label>
            <span
              class="font-[family-name:var(--font-sans)] text-base font-medium leading-normal text-text"
              >Description</span
            >
          </template>
          <UTextarea
            v-model="reviewDescription"
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
const helpTypes = ref({
  visualization: false,
  code: false,
  open: false,
});

const reviewDescription = ref("");
</script>
