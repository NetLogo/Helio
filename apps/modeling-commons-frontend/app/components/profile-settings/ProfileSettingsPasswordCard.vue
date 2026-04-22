<template>
  <ProfileSettingsCard
    eyebrow="Security"
    title="Password"
    description="Reset your password if you want to rotate credentials or recover access."
  >
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-key-round"
      :to="authRoutes.resetPassword"
    >
      Reset password
    </UButton>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
import { authRoutes } from "~/utils/auth";
</script>
