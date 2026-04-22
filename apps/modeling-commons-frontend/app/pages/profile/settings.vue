<template>
  <UContainer>
    <div class="grid gap-8">
      <UPageHero
        title="Profile Settings"
        description="Manage the account details, visibility, and sign-in preferences tied to your Modeling Commons profile."
        :ui="{
          root: 'rounded-xl',
          container: 'py-12',
        }"
      >
        <template #body>
          <div class="mt-6 flex flex-wrap justify-center gap-3">
            <UButton to="/models/upload" icon="i-lucide-upload">Upload a Model</UButton>
            <UButton to="/models" color="neutral" variant="outline" icon="i-lucide-box">
              Browse Models
            </UButton>
          </div>
        </template>
      </UPageHero>

      <div
        v-if="status === 'pending'"
        class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]"
      >
        <div class="grid gap-6">
          <div class="min-h-80 animate-pulse rounded-xl bg-neutral-darkest/5" />
          <div class="min-h-80 animate-pulse rounded-xl bg-neutral-darkest/5" />
        </div>
        <div class="grid gap-6">
          <div class="min-h-64 animate-pulse rounded-xl bg-neutral-darkest/5" />
          <div class="min-h-64 animate-pulse rounded-xl bg-neutral-darkest/5" />
        </div>
      </div>

      <div v-else-if="!profile" class="grid gap-4">
        <UAlert
          title="We couldn't load your profile"
          description="Refresh the page and try again. If the problem persists, sign out and sign back in."
          icon="i-lucide-circle-alert"
          color="error"
          variant="subtle"
          :closable="false"
        />
        <UButton class="justify-center" color="neutral" variant="outline" @click="refresh()">
          Try again
        </UButton>
      </div>

      <div
        v-else
        class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]"
      >
        <div class="grid gap-6">
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

        <div class="grid gap-6">
          <ProfileSettingsPasskeysCard />

          <ProfileSettingsPasswordCard />

          <ProfileSettingsCard
            eyebrow="Roadmap"
            title="What’s next?"
            description="This page currently saves visibility and profile type. Richer editing can plug into the same structure without a redesign."
          >
            <ul class="grid list-none gap-3 p-0">
              <li class="flex gap-3 rounded-md bg-neutral-darkest/5 p-4 text-sm text-muted">
                <UIcon name="i-lucide-image" class="mt-0.5 shrink-0 text-primary" />
                Avatar uploads can be slotted into the account summary section once the backend flow exists.
              </li>
              <li class="flex gap-3 rounded-md bg-neutral-darkest/5 p-4 text-sm text-muted">
                <UIcon name="i-lucide-pen-square" class="mt-0.5 shrink-0 text-primary" />
                Display name and profile bio editing can sit beside the current visibility controls.
              </li>
              <li class="flex gap-3 rounded-md bg-neutral-darkest/5 p-4 text-sm text-muted">
                <UIcon name="i-lucide-shield-plus" class="mt-0.5 shrink-0 text-primary" />
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
