<template>
  <div class="grid gap-8">
    <div v-if="!profile" class="grid gap-4">
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

    <section v-else class="grid items-start gap-6 lg:grid-cols-6 mt-1">
      <section class="space-y-10 col-span-4">
        <UForm>
          <UFormField label="Name">
            <UInput v-model="name" size="md" />
            <span class="text-xs text-muted"
              >Your name appears on your profile, model pages, and across the app.</span
            >
          </UFormField>

          <UFormField label="Profile Visibility">
            <section class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div class="grid gap-1.5">
                <p class="m-0 text-xs text-muted max-w-[80%]">
                  When enabled, other people can see your name and author details on public-facing
                  pages.
                </p>
              </div>

              <USelectMenu
                :model-value="visibilityItem"
                title="Visible to other users"
                color="primary"
                :items="visibilityItems"
                @update:model-value="onVisibilityChange"
              />
            </section>
          </UFormField>

          <UFormField label="Bio">
            <UTextarea v-model="bio" size="md" />
            <span class="text-xs text-muted"
              >A short description about you. This appears on your profile and author details.</span
            >
          </UFormField>

          <UFormField label="Date of Birth">
            <UInputDate v-model="dob" size="md" />
          </UFormField>

          <UFormField label="Country">
            <USelectMenu
              v-model="country"
              class="w-full"
              leading-icon="i-lucide-earth"
              placeholder="Select your country"
              value-key="value"
              :items="
                countries.map((c) => ({
                  ...c,
                  icon: c.icon ?? `flag:${c.value.toLowerCase()}-4x3`,
                }))
              "
            />
          </UFormField>

          <UFormField label="Affiliation">
            <UInput v-model="affiliation" size="md" placeholder="e.g. Northwestern University" />
            <span class="text-xs text-muted"
              >An affiliated organization like a university, company, or non-profit.</span
            >
          </UFormField>

          <UFormField label="Social Links">
            <SocialLinksInput v-model="socialLinks" one-per-kind />
          </UFormField>

          <section class="grid gap-5">
            <div class="grid gap-1.5">
              <h3 class="m-0 text-base font-medium text-highlighted">
                How do you use Modeling Commons?
              </h3>
              <p class="m-0 text-sm text-muted">
                This helps us describe your profile more clearly across the app.
              </p>
            </div>

            <URadioGroup
              v-model="userKind"
              variant="card"
              :items="userKindOptions"
              color="primary"
            />
          </section>

          <footer
            class="flex flex-col gap-4 border-t border-neutral-darkest/10 pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="m-0 text-sm text-muted">
              {{ isDirty ? "You have unsaved changes." : "Your profile settings are up to date." }}
            </p>

            <div class="flex w-full flex-wrap gap-3 sm:w-auto">
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!isDirty || isSaving"
                @click="resetProfileSettings"
              >
                Reset
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                :loading="isSaving"
                :disabled="!isDirty"
                @click="saveSettings"
              >
                Save changes
              </UButton>
            </div>
          </footer>
        </UForm>
      </section>

      <div class="col-span-2 space-y-5">
        <AvatarUpload
          :src="displayImage"
          :alt="displayName"
          :pending="isAvatarUploading"
          :can-remove="hasCustomAvatar"
          :optimistic="false"
          @select="onAvatarSelected"
          @remove="onAvatarRemoved"
        />
        <USeparator />
        <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
          <p class="m-0 text-xs uppercase tracking-widest text-muted">Member since</p>
          <p class="m-0 font-medium text-highlighted">{{ formatDate(profile.createdAt) }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import countries from "~/assets/countries";

definePageMeta({
  middleware: "auth",
  layout: "profile",
});

useSeoMeta({
  title: "Profile Settings",
  description: "Manage your Modeling Commons profile settings and sign-in preferences.",
});

const route = useRoute();
const toast = useToast();
const {
  profile,
  refresh,
  displayName,
  displayImage,
  isProfilePublic,
  userKind,
  userKindOptions,
  name,
  bio,
  country,
  dob,
  affiliation,
  socialLinks,
  isAvatarUploading,
  hasCustomAvatar,
  isDirty,
  isSaving,
  resetProfileSettings,
  saveProfileSettings,
  uploadAvatar,
  removeAvatar,
} = useProfileSettings();

const visibilityItems = [
  { label: "Public", value: true },
  { label: "Private", value: false },
];
const visibilityItem = computed(
  () => visibilityItems.find((item) => item.value === isProfilePublic.value) ?? visibilityItems[1],
);
function onVisibilityChange(next: { label: string; value: boolean }) {
  isProfilePublic.value = Boolean(next.value);
}

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
  void navigateTo({ query: nextQuery });
});

async function saveSettings() {
  const response = await saveProfileSettings();

  if (response.error) {
    toast.add({
      title: "Couldn't save profile settings",
      description: response.error.message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Profile updated",
    description: "Your details have been saved.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}

async function onAvatarSelected(file: File) {
  const response = await uploadAvatar(file);
  if (response.error) {
    toast.add({
      title: "Couldn't update avatar",
      description: response.error.message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Avatar updated",
    description: "Your new profile picture is live.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}

async function onAvatarRemoved() {
  const response = await removeAvatar();
  if (response.error) {
    toast.add({
      title: "Couldn't remove avatar",
      description: response.error.message ?? "Please try again.",
      icon: "i-lucide-circle-alert",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Avatar removed",
    description: "Your profile picture has been cleared.",
    icon: "i-lucide-badge-check",
    color: "success",
  });
}
</script>
