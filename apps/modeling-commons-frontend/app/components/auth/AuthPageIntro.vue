<template>
  <div class="auth-page-intro">
    <UIcon :name="icon" class="auth-page-intro__icon" />
    <div class="auth-page-intro__copy">
      <h1 class="auth-page-intro__title">{{ title }}</h1>
      <p class="auth-page-intro__description">
        <slot>{{ description }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.auth-page-intro {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  text-align: center;
}

.auth-page-intro__icon {
  font-size: 2.5rem;
  color: var(--ui-color-primary-500);
}

.auth-page-intro__copy {
  display: grid;
  gap: 0.5rem;
}

.auth-page-intro__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
}

.auth-page-intro__description {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--ui-text-muted);
}
</style>
