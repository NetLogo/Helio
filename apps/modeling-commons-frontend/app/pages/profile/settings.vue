<template>
  <UContainer>
    <div class="profile-settings-page">
      <UPageHero
        title="Profile Settings"
        description="Manage the account details, visibility, and sign-in preferences tied to your Modeling Commons profile."
        :ui="{
          root: 'profile-settings-page__hero-root',
          container: 'profile-settings-page__hero-container',
        }"
      >
        <template #body>
          <div class="profile-settings-page__hero-actions">
            <UButton to="/models/upload" icon="i-lucide-upload">Upload a Model</UButton>
            <UButton to="/models" color="neutral" variant="outline" icon="i-lucide-box">
              Browse Models
            </UButton>
          </div>
        </template>
      </UPageHero>

      <div v-if="status === 'pending'" class="profile-settings-page__skeleton">
        <div class="profile-settings-page__main-column">
          <div class="profile-settings-page__skeleton-block profile-settings-page__skeleton-block--large" />
          <div class="profile-settings-page__skeleton-block profile-settings-page__skeleton-block--large" />
        </div>
        <div class="profile-settings-page__sidebar-column">
          <div class="profile-settings-page__skeleton-block" />
          <div class="profile-settings-page__skeleton-block" />
        </div>
      </div>

      <div v-else-if="!profile" class="profile-settings-page__error">
        <UIcon name="i-lucide-circle-alert" class="profile-settings-page__error-icon" />
        <div class="profile-settings-page__error-copy">
          <h2 class="profile-settings-page__error-title">We couldn't load your profile</h2>
          <p class="profile-settings-page__error-description">
            Refresh the page and try again. If the problem persists, sign out and sign back in.
          </p>
        </div>
        <UButton color="neutral" variant="outline" @click="refresh()">Try again</UButton>
      </div>

      <div v-else class="profile-settings-page__content">
        <div class="profile-settings-page__main-column">
          <ProfileSettingsAccountCard
            :created-at="profile.createdAt"
            :display-name="displayName"
            :display-email="displayEmail"
            :display-image="displayImage"
            :email-verified="emailVerified"
            :system-role-label="systemRoleLabel"
          />

          <ProfileSettingsPreferencesCard
            :is-profile-public="isProfilePublic"
            :user-kind="userKind"
            :user-kind-options="userKindOptions"
            :is-dirty="isDirty"
            :is-saving="isSaving"
            :visibility-label="visibilityLabel"
            :visibility-badge-color="visibilityBadgeColor"
            @update:is-profile-public="isProfilePublic = $event"
            @update:user-kind="userKind = $event"
            @reset="resetProfileSettings"
            @save="saveSettings"
          />
        </div>

        <div class="profile-settings-page__sidebar-column">
          <ProfileSettingsPasskeysCard />

          <ProfileSettingsPasswordCard />

          <ProfileSettingsCard
            eyebrow="Roadmap"
            title="What’s next?"
            description="This page currently saves visibility and profile type. Richer editing can plug into the same structure without a redesign."
          >
            <ul class="profile-settings-page__roadmap">
              <li class="profile-settings-page__roadmap-item">
                <UIcon name="i-lucide-image" />
                Avatar uploads can be slotted into the account summary section once the backend flow exists.
              </li>
              <li class="profile-settings-page__roadmap-item">
                <UIcon name="i-lucide-pen-square" />
                Display name and profile bio editing can sit beside the current visibility controls.
              </li>
              <li class="profile-settings-page__roadmap-item">
                <UIcon name="i-lucide-shield-plus" />
                Additional account recovery and device controls can expand the security column.
              </li>
            </ul>
          </ProfileSettingsCard>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

useSeoMeta({
  title: "Profile Settings",
  description: "Manage your Modeling Commons profile settings and sign-in preferences.",
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const {
  profile,
  refresh,
  status,
  displayName,
  displayEmail,
  displayImage,
  emailVerified,
  systemRoleLabel,
  isProfilePublic,
  userKind,
  userKindOptions,
  isDirty,
  isSaving,
  resetProfileSettings,
  saveProfileSettings,
} = useProfileSettings();

const visibilityLabel = computed(() => (isProfilePublic.value ? "Public profile" : "Private profile"));
const visibilityBadgeColor = computed(() => (isProfilePublic.value ? "success" : "neutral"));

onMounted(() => {
  if (route.query.password !== "1") {
    return;
  }

  toast.add({
    title: "Password updated",
    description: "Your password has been reset successfully.",
    icon: "i-lucide-badge-check",
    color: "success",
  });

  const nextQuery = { ...route.query };
  delete nextQuery.password;
  void router.replace({ query: nextQuery });
});

async function saveSettings() {
  const response = await saveProfileSettings();

  if (response.error) {
    toast.add({
      title: "Couldn't save profile settings",
      description: (response.error as { message?: string }).message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Profile updated",
    description: "Your visibility and profile type have been saved.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}
</script>

<style scoped>
.profile-settings-page {
  display: grid;
  gap: 2rem;
}

.profile-settings-page :deep(.profile-settings-page__hero-root) {
  border-radius: 0.75rem;
}

.profile-settings-page :deep(.profile-settings-page__hero-container) {
  padding-block: 3rem;
}

.profile-settings-page__hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.profile-settings-page__content,
.profile-settings-page__skeleton {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.85fr);
  gap: 1.5rem;
  align-items: start;
}

.profile-settings-page__main-column,
.profile-settings-page__sidebar-column {
  display: grid;
  gap: 1.5rem;
}

.profile-settings-page__skeleton-block {
  min-height: 16rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 70%, transparent);
  animation: pulse 1.2s ease-in-out infinite alternate;
}

.profile-settings-page__skeleton-block--large {
  min-height: 20rem;
}

.profile-settings-page__error {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  border: 1px solid color-mix(in srgb, var(--ui-color-error-500) 20%, transparent);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--ui-color-error-500) 6%, transparent);
  text-align: center;
}

.profile-settings-page__error-icon {
  font-size: 2.5rem;
  color: var(--ui-color-error-500);
}

.profile-settings-page__error-copy {
  display: grid;
  gap: 0.5rem;
}

.profile-settings-page__error-title,
.profile-settings-page__error-description {
  margin: 0;
}

.profile-settings-page__error-title {
  color: var(--ui-text-highlighted);
  font-size: 1.125rem;
  font-weight: 500;
}

.profile-settings-page__error-description {
  color: var(--ui-text-muted);
}

.profile-settings-page__roadmap {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-settings-page__roadmap-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 65%, transparent);
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
}

.profile-settings-page__roadmap-item :deep(svg) {
  flex: none;
  margin-top: 0.1rem;
  color: var(--ui-color-primary-500);
}

@keyframes pulse {
  from {
    opacity: 0.55;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 960px) {
  .profile-settings-page__content,
  .profile-settings-page__skeleton {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
