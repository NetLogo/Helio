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

    <section v-else class="grid items-start space-y-10 my-5">
      <ProfileSecurityEmails :current-email="displayEmail" :email-verified="emailVerified" />
      <ProfileSecurityPassword />
      <ProfileSettingsPasskeysCard />
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
  robots: "noindex, nofollow",
});

const { profile, displayEmail, refresh, emailVerified } = useProfileSettings();
</script>
