<template>
  <ProfileSettingsCard
    eyebrow="Preferences"
    title="Profile visibility"
    description="Choose how visible your author profile is across public model pages."
  >
    <div class="flex justify-start sm:justify-end">
      <UBadge :color="visibilityBadgeColor" variant="subtle" size="sm">
        {{ visibilityLabel }}
      </UBadge>
    </div>

    <section
      class="grid gap-5 rounded-md border border-neutral-darkest/10 bg-neutral-darkest/5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div class="grid gap-1.5">
        <h3 class="m-0 text-base font-medium text-highlighted">Public author profile</h3>
        <p class="m-0 text-sm text-muted">
          When enabled, other people can see your name and author details on public-facing pages.
        </p>
      </div>

      <USwitch
        :model-value="isProfilePublic"
        title="Visible to other users"
        color="primary"
        @update:model-value="$emit('update:isProfilePublic', Boolean($event))"
      />
    </section>

    <section class="grid gap-5 rounded-md border border-neutral-darkest/10 bg-neutral-darkest/5 p-5">
      <div class="grid gap-1.5">
        <h3 class="m-0 text-base font-medium text-highlighted">How do you use Modeling Commons?</h3>
        <p class="m-0 text-sm text-muted">
          This helps us describe your profile more clearly across the app.
        </p>
      </div>

      <URadioGroup
        :model-value="userKind"
        variant="card"
        :items="userKindOptions"
        color="primary"
        @update:model-value="$emit('update:userKind', $event as UserKind)"
      />
    </section>

    <footer class="flex flex-col gap-4 border-t border-neutral-darkest/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p class="m-0 text-sm text-muted">
        {{ isDirty ? "You have unsaved changes." : "Your profile settings are up to date." }}
      </p>

      <div class="flex w-full flex-wrap gap-3 sm:w-auto">
        <UButton color="neutral" variant="outline" :disabled="!isDirty || isSaving" @click="$emit('reset')">
          Reset
        </UButton>
        <UButton color="primary" :loading="isSaving" :disabled="!isDirty" @click="$emit('save')">
          Save changes
        </UButton>
      </div>
    </footer>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
import type { RadioGroupItem } from "@nuxt/ui";
import type { UserKind } from '~/forms/auth';

defineProps<{
  isProfilePublic: boolean;
  userKind: UserKind;
  userKindOptions: Array<RadioGroupItem>;
  isDirty: boolean;
  isSaving: boolean;
  visibilityLabel: string;
  visibilityBadgeColor: "success" | "neutral";
}>();

defineEmits<{
  "update:isProfilePublic": [value: boolean];
  "update:userKind": [value: UserKind];
  reset: [];
  save: [];
}>();
</script>
