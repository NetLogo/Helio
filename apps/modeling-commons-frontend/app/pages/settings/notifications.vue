<template>
  <div class="grid gap-8">
    <div v-if="error" class="grid gap-4">
      <Error :title="strings.loadErrorTitle" :message="strings.loadErrorMessage">
        <UButton variant="outline" @click="refresh()">Try again</UButton>
      </Error>
    </div>

    <section v-else class="grid items-start gap-6 mt-1">
      <ProfileSettingsCard :title="strings.title" :description="strings.description">
        <div v-if="pending && !categories.length" class="grid gap-4">
          <USkeleton v-for="index in 3" :key="index" class="h-16 w-full" />
        </div>

        <p v-else-if="!categories.length" class="m-0 text-sm text-muted">
          {{ strings.emptyMessage }}
        </p>

        <ul v-else class="m-0 grid list-none gap-0 p-0 divide-y divide-default">
          <li
            v-for="preference in categories"
            :key="preference.category"
            class="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div class="grid gap-1">
              <p class="m-0 font-medium text-highlighted">{{ preference.label }}</p>
              <p class="m-0 text-xs text-muted">{{ preference.description }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-5">
              <USwitch
                :model-value="preference.inApp"
                :label="strings.inAppLabel"
                :disabled="isSaving(preference.category)"
                @update:model-value="updatePreference(preference.category, { inApp: $event })"
              />
              <UFormField :label="strings.emailLabel" orientation="horizontal" class="items-center">
                <USelectMenu
                  :model-value="preference.email"
                  :items="emailModes"
                  value-key="value"
                  :search-input="false"
                  :disabled="isSaving(preference.category)"
                  class="w-40"
                  size="sm"
                  @update:model-value="updatePreference(preference.category, { email: $event })"
                />
              </UFormField>
            </div>
          </li>
        </ul>
      </ProfileSettingsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import strings from "~/data/notification-preferences.json";
import type { NotificationEmailMode } from "~/composables/notifications/useNotificationPreferences";

definePageMeta({
  middleware: "auth",
  layout: "profile",
});

useSeoMeta({
  title: strings.seoTitle,
  description: strings.seoDescription,
  robots: "noindex, nofollow",
});

const emailModes = strings.emailModes as { value: NotificationEmailMode; label: string }[];

const { categories, pending, error, refresh, isSaving, updatePreference } =
  useNotificationPreferences();
</script>
