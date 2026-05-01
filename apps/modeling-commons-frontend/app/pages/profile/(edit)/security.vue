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

    <section v-else class="grid items-start gap-6 mt-1">
      <div class="grid gap-6 col-span-4">
        <ProfileSecurityEmails :current-email="displayEmail" :email-verified="emailVerified" />
        <ProfileSecurityPassword />
        <ProfileSettingsPasskeysCard />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "profile",
});

useSeoMeta({
  title: "Profile Settings",
  description: "Manage your Modeling Commons profile settings and sign-in preferences.",
});

const { profile, displayEmail, refresh, status, emailVerified } = useProfileSettings();
</script>
