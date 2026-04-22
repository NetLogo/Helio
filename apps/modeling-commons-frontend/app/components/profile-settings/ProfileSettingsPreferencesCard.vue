<template>
  <ProfileSettingsCard
    eyebrow="Preferences"
    title="Profile visibility"
    description="Choose how visible your author profile is across public model pages."
  >
    <div class="profile-preferences-card__status">
      <UBadge :color="visibilityBadgeColor" variant="subtle" size="sm">
        {{ visibilityLabel }}
      </UBadge>
    </div>

    <section class="profile-preferences-card__panel">
      <div class="profile-preferences-card__panel-copy">
        <h3 class="profile-preferences-card__panel-title">Public author profile</h3>
        <p class="profile-preferences-card__panel-description">
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

    <section class="profile-preferences-card__radio-group">
      <div class="profile-preferences-card__radio-copy">
        <h3 class="profile-preferences-card__panel-title">How do you use Modeling Commons?</h3>
        <p class="profile-preferences-card__panel-description">
          This helps us describe your profile more clearly across the app.
        </p>
      </div>

      <URadioGroup
        :model-value="userKind"
        variant="card"
        :items="userKindOptions"
        color="primary"
        @update:model-value="$emit('update:userKind', $event as EditableUserKind)"
      />
    </section>

    <footer class="profile-preferences-card__footer">
      <p class="profile-preferences-card__footnote">
        {{ isDirty ? "You have unsaved changes." : "Your profile settings are up to date." }}
      </p>

      <div class="profile-preferences-card__actions">
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
import type { EditableUserKind } from "~/composables/useProfileSettings";

defineProps<{
  isProfilePublic: boolean;
  userKind: EditableUserKind;
  userKindOptions: Array<RadioGroupItem>;
  isDirty: boolean;
  isSaving: boolean;
  visibilityLabel: string;
  visibilityBadgeColor: "success" | "neutral";
}>();

defineEmits<{
  "update:isProfilePublic": [value: boolean];
  "update:userKind": [value: EditableUserKind];
  reset: [];
  save: [];
}>();
</script>

<style scoped>
.profile-preferences-card__status {
  display: flex;
  justify-content: flex-end;
}

.profile-preferences-card__panel,
.profile-preferences-card__radio-group {
  display: grid;
  gap: 1.25rem;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 65%, transparent);
}

.profile-preferences-card__panel {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.profile-preferences-card__panel-copy,
.profile-preferences-card__radio-copy {
  display: grid;
  gap: 0.35rem;
}

.profile-preferences-card__panel-title {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: 1rem;
  font-weight: 500;
}

.profile-preferences-card__panel-description {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
}

.profile-preferences-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
}

.profile-preferences-card__footnote {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

.profile-preferences-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .profile-preferences-card__status {
    justify-content: flex-start;
  }

  .profile-preferences-card__panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-preferences-card__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .profile-preferences-card__actions {
    width: 100%;
  }

  .profile-preferences-card__actions :deep(button) {
    flex: 1 1 auto;
  }
}
</style>
