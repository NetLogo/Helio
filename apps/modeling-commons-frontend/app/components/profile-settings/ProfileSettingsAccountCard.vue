<template>
  <ProfileSettingsCard eyebrow="Account" title="Profile overview">
    <div class="border-b border-neutral-darkest/10 pb-6">
      <UUser :name="displayName" :avatar="{ src: displayImage, alt: displayName, size: 'xl' }">
        <template #description>
          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-mail" />
              {{ displayEmail }}
            </span>
            <UBadge :color="emailVerified ? 'primary' : 'warning'" variant="subtle" size="sm">
              {{ emailVerified ? "Verified" : "Verification pending" }}
            </UBadge>
          </div>
        </template>
      </UUser>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
        <p class="m-0 text-xs uppercase tracking-widest text-muted">Member since</p>
        <p class="m-0 font-medium text-highlighted">{{ formatDate(createdAt) }}</p>
      </article>
      <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
        <p class="m-0 text-xs uppercase tracking-widest text-muted">System role</p>
        <p class="m-0 font-medium text-highlighted">{{ systemRoleLabel }}</p>
      </article>
      <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
        <p class="m-0 text-xs uppercase tracking-widest text-muted">Display name</p>
        <p class="m-0 font-medium text-highlighted">{{ displayName }}</p>
        <p class="m-0 text-sm text-muted">Name editing is not available in this app yet.</p>
      </article>
      <article class="grid gap-2 rounded-md bg-neutral-darkest/5 p-4">
        <p class="m-0 text-xs uppercase tracking-widest text-muted">Email</p>
        <p class="m-0 break-words font-medium text-highlighted">{{ displayEmail }}</p>
        <p class="m-0 text-sm text-muted">
          Email changes still go through the auth service rather than this settings page.
        </p>
      </article>
    </div>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
defineProps<{
  createdAt: string;
  displayName: string;
  displayEmail: string;
  displayImage?: string;
  emailVerified: boolean;
  systemRoleLabel: string;
}>();
</script>
