<template>
  <UCard
    :variant="variant"
    :ui="{
      root: 'profile-settings-card-root border-0 ring-1 ring-neutral-darkest/8',
      body: 'profile-settings-card-body',
    }"
  >
    <section class="profile-settings-card">
      <header v-if="title || description || eyebrow || $slots.header" class="profile-settings-card__header">
        <div class="profile-settings-card__intro">
          <p v-if="eyebrow" class="profile-settings-card__eyebrow">{{ eyebrow }}</p>
          <div class="profile-settings-card__heading">
            <div class="profile-settings-card__copy">
              <h2 v-if="title" class="profile-settings-card__title">{{ title }}</h2>
              <p v-if="description" class="profile-settings-card__description">{{ description }}</p>
            </div>
            <slot name="header" />
          </div>
        </div>
      </header>
      <div class="profile-settings-card__content">
        <slot />
      </div>
    </section>
  </UCard>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    variant?: "outline" | "soft" | "subtle" | "solid";
  }>(),
  {
    eyebrow: undefined,
    title: undefined,
    description: undefined,
    variant: "outline",
  },
);
</script>

<style scoped>
.profile-settings-card :deep(.profile-settings-card-root) {
  background: var(--ui-bg);
  border-radius: 0.75rem;
}

.profile-settings-card :deep(.profile-settings-card-body) {
  padding: 2rem;
}

.profile-settings-card {
  display: grid;
  gap: 1.5rem;
}

.profile-settings-card__header {
  display: grid;
  gap: 0.75rem;
}

.profile-settings-card__intro {
  display: grid;
  gap: 0.75rem;
}

.profile-settings-card__eyebrow {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.profile-settings-card__heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.profile-settings-card__copy {
  display: grid;
  gap: 0.35rem;
}

.profile-settings-card__title {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: 1.25rem;
  font-weight: 500;
}

.profile-settings-card__description {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
}

.profile-settings-card__content {
  display: grid;
  gap: 1.25rem;
}

@media (max-width: 640px) {
  .profile-settings-card :deep(.profile-settings-card-body) {
    padding: 1.5rem;
  }

  .profile-settings-card__heading {
    flex-direction: column;
  }
}
</style>
