<template>
  <UContainer>
    <!-- <div class="max-w-4xl p-10 mx-auto"><NlogoxDropZone /></div>
    <div class="max-w-4xl p-10 mx-auto"><ImageDropZone /></div>
    <div class="max-w-2xl max-h-2xl aspect-square p-10 mx-auto">
      <ImageDropZone initial-preview-url="https://picsum.photos/200" class="aspect-square" />
    </div> -->

    <section id="buttons" class="flex gap-15 flex-col">
      <h2>Buttons</h2>
      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md">Button</UButton>
          <UButton variant="outline" color="primary" size="md">Button</UButton>
          <UButton variant="ghost" color="primary" size="md">Button</UButton>
          <UButton variant="link" color="primary" size="md">Button</UButton>
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm">Button</UButton>
          <UButton variant="outline" color="primary" size="sm">Button</UButton>
          <UButton variant="ghost" color="primary" size="sm">Button</UButton>
          <UButton variant="link" color="primary" size="sm">Button</UButton>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="outline" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="ghost" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="link" color="primary" size="md" icon="i-lucide-box">Button</UButton>
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="outline" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="ghost" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="link" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="outline" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="ghost" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="link" color="primary" size="md" square icon="i-lucide-box" />
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="outline" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="ghost" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="link" color="primary" size="sm" square icon="i-lucide-box" />
        </div>
      </div>
    </section>

    <section id="inputs" class="flex gap-15 flex-col mt-10">
      <h2>Inputs</h2>

      <h3>Text Inputs</h3>
      <div class="flex flex-col gap-5">
        <UInput placeholder="Placeholder" />
        <UInput placeholder="Placeholder" trailing-icon="i-lucide-circle-question-mark" />
        <UInput
          placeholder="Placeholder"
          icon="i-lucide-credit-card"
          trailing-icon="i-lucide-circle-question-mark"
        />
        <UInput placeholder="Search" icon="i-lucide-search" />
        <UInput placeholder="Disabled input" disabled />

        <UFieldGroup>
          <USelectMenu v-model="USD" :items="['USD', 'EUR']" />
          <UInput placeholder="Placeholder" />
        </UFieldGroup>

        <UFieldGroup>
          <UInput disabled placeholder="http://" class="w-20" />
          <UInput placeholder="Placeholder" />
        </UFieldGroup>
      </div>

      <h3>Textarea</h3>
      <div class="flex flex-col gap-5">
        <UTextarea placeholder="Placeholder" />
        <UTextarea placeholder="Placeholder" :rows="10">
          <template #default>
            <UButton
              variant="solid"
              size="sm"
              icon="i-lucide-send"
              class="absolute bottom-2 right-2"
              >Post</UButton
            >
          </template>
        </UTextarea>
      </div>

      <h3>Select Menu</h3>
      <div class="flex flex-col gap-5">
        <USelectMenu v-model="USD" :items="['USD', 'EUR']" />
        <USelectMenu v-model="USD" :items="['USD', 'EUR']" icon="i-lucide-euro" />
        <UInputMenu v-model="USD" :items="['USD', 'EUR']" icon="i-lucide-euro" />
      </div>

      <h3>Checkbox</h3>
      <div class="flex flex-col gap-5">
        <UCheckbox label="Checkbox" />
        <UCheckbox
          variant="card"
          label="Checkbox"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        />
      </div>

      <h3>Radio</h3>
      <div class="flex flex-col gap-5">
        <URadioGroup v-model="USD" :items="['USD', 'EUR']" />
        <URadioGroup
          v-model="USD"
          variant="card"
          :items="[
            {
              label: 'USD',
              value: 'USD',
              description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            },
            {
              label: 'EUR',
              value: 'EUR',
              description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            },
          ]"
        />
      </div>

      <h3>Toggle</h3>
      <div class="flex flex-col gap-5">
        <USwitch label="Toggle" />
        <USwitch v-model="TRUE" label="Toggle" />
      </div>
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Tooltips</h3>
      <UTooltip>
        <UButton
          variant="outline"
          color="primary"
          size="md"
          square
          icon="i-lucide-circle-question-mark"
          class="w-fit"
        />
        <template #content>
          <p class="text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </template>
      </UTooltip>
    </section>
  </UContainer>
</template>

<script lang="ts" setup>
if (!import.meta.dev) {
  navigateTo("/");
}

const USD = ref("USD");
const TRUE = ref(true);
</script>
