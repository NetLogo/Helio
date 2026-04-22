<template>
  <ProfileSettingsCard eyebrow="Account" title="Profile overview">
    <div class="profile-account-card__summary">
      <UUser
        :name="displayName"
        :avatar="{ src: displayImage, alt: displayName, size: '3xl' }"
      >
        <template #description>
          <div class="profile-account-card__identity">
            <span class="profile-account-card__email">
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

    <div class="profile-account-card__details">
      <article class="profile-account-card__detail">
        <p class="profile-account-card__label">Member since</p>
        <p class="profile-account-card__value">{{ formatDate(createdAt) }}</p>
      </article>
      <article class="profile-account-card__detail">
        <p class="profile-account-card__label">System role</p>
        <p class="profile-account-card__value">{{ systemRoleLabel }}</p>
      </article>
      <article class="profile-account-card__detail">
        <p class="profile-account-card__label">Display name</p>
        <p class="profile-account-card__value">{{ displayName }}</p>
        <p class="profile-account-card__hint">Name editing is not available in this app yet.</p>
      </article>
      <article class="profile-account-card__detail">
        <p class="profile-account-card__label">Email</p>
        <p class="profile-account-card__value profile-account-card__value--break">{{ displayEmail }}</p>
        <p class="profile-account-card__hint">
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

<style scoped>
.profile-account-card__summary {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ui-border) 80%, transparent);
}

.profile-account-card__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.profile-account-card__email {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text-muted);
}

.profile-account-card__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.profile-account-card__detail {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ui-bg-muted) 65%, transparent);
}

.profile-account-card__label {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.profile-account-card__value {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-weight: 500;
}

.profile-account-card__value--break {
  overflow-wrap: anywhere;
}

.profile-account-card__hint {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .profile-account-card__details {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
