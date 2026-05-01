<template>
  <div class="grid gap-8">
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

    <section v-else class="grid items-start gap-6 lg:grid-cols-6 mt-1">
      <section class="space-y-10 col-span-4">
        <UForm>
          <UFormField label="Name">
            <UInput :value="displayName" size="md" />
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
                :model-value="{ label: 'Public', value: true }"
                title="Visible to other users"
                color="primary"
                :items="[
                  { label: 'Public', value: true },
                  { label: 'Private', value: false },
                ]"
                @update:model-value="$emit('update:isProfilePublic', Boolean($event))"
              />
            </section>
          </UFormField>

          <UFormField label="Bio">
            <UTextarea size="md" />
            <span class="text-xs text-muted"
              >A short description about you. This appears on your profile and author details.</span
            >
          </UFormField>

          <UFormField label="Date of Birth">
            <UInputDate size="md" />
          </UFormField>

          <UFormField label="Country">
            <USelectMenu
              class="w-full"
              leading-icon="flag-us-4x3"
              :items="countries.map((c) => ({ ...c, icon: `flag:${c.value.toLowerCase()}-4x3` }))"
            />
          </UFormField>

          <UFormField label="Affiliation">
            <UInput :value="displayEmail" size="md" />
            <span class="text-xs text-muted"
              >An affiliated organization like a university, company, or non-profit.</span
            >
          </UFormField>

          <!-- Social Links -->
          <UFormField label="Social Links">
            <SocialLinksInput v-model="links" one-per-kind />
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
              :model-value="userKind"
              variant="card"
              :items="userKindOptions"
              color="primary"
              @update:model-value="$emit('update:userKind', $event as EditableUserKind)"
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
                @click="$emit('reset')"
              >
                Reset
              </UButton>
              <UButton
                color="primary"
                :loading="isSaving"
                :disabled="!isDirty"
                @click="$emit('save')"
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
          @select="onAvatarSelected"
          @remove="onAvatarRemoved"
        />
        <USeparator />
        <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
          <p class="m-0 text-xs uppercase tracking-widest text-muted">Member since</p>
          <p class="m-0 font-medium text-highlighted">{{ formatDate(profile.createdAt) }}</p>
        </article>
      </div>

      <div class="grid gap-6 col-span-6">
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
              Avatar uploads can be slotted into the account summary section once the backend flow
              exists.
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
    </section>
  </div>
</template>

<script setup lang="ts">
import countries from "~/assets/countries";

const links = ref([]);
definePageMeta({
  middleware: "auth",
  layout: "profile",
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
  userKind,
  userKindOptions,
  isDirty,
  isSaving,
  saveProfileSettings,
} = useProfileSettings();

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
