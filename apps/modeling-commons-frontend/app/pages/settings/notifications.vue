<template>
  <div class="grid gap-8">
    <div v-if="error" class="grid gap-4">
      <Error
        :title="notificationPreferenceLiterals.loadErrorTitle"
        :message="notificationPreferenceLiterals.loadErrorMessage"
      >
        <UButton variant="outline" @click="refresh()">Try again</UButton>
      </Error>
    </div>

    <section v-else class="grid items-start gap-6 mt-1">
      <ProfileSettingsCard :description="notificationPreferenceLiterals.description">
        <div v-if="pending && !categories.length" class="grid gap-4">
          <USkeleton v-for="index in 3" :key="index" class="h-16 w-full" />
        </div>

        <p v-else-if="!categories.length" class="m-0 text-sm text-muted">
          {{ notificationPreferenceLiterals.emptyMessage }}
        </p>

        <div v-else class="grid">
          <div
            class="hidden sm:grid grid-cols-[minmax(0,1fr)_8rem_14rem] gap-6 pb-3 text-sm font-medium text-muted"
          >
            <span />
            <span class="flex items-center gap-2">
              <UIcon :name="notificationPreferenceLiterals.inAppIcon" class="size-4" />
              {{ notificationPreferenceLiterals.inAppLabel }}
            </span>
            <span class="flex items-center gap-2">
              <UIcon :name="notificationPreferenceLiterals.emailIcon" class="size-4" />
              {{ notificationPreferenceLiterals.emailLabel }}
            </span>
          </div>

          <ul class="m-0 grid list-none gap-0 p-0 divide-y divide-default border-t border-default">
            <li
              v-for="preference in categories"
              :key="preference.category"
              class="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_14rem] sm:gap-6 sm:items-center"
            >
              <div class="flex gap-3">
                <UIcon :name="getCategoryIcon(preference.category)" class="size-5 shrink-0 mt-0.5 text-muted" />
                <div class="grid gap-1">
                  <p class="m-0 font-medium text-highlighted">{{ preference.label }}</p>
                  <p class="m-0 text-xs text-muted">{{ preference.description }}</p>
                </div>
              </div>

              <URadioGroup
                :model-value="choices[preference.category]?.inApp ? 'on' : 'off'"
                :items="inAppModes"
                :aria-label="`${notificationPreferenceLiterals.inAppLabel}: ${preference.label}`"
                :disabled="isSaving"
                variant="table"
                indicator="hidden"
                orientation="horizontal"
                size="sm"
                :ui="segmented"
                @update:model-value="choose(preference.category, { inApp: $event === 'on' })"
              />

              <URadioGroup
                :model-value="choices[preference.category]?.email"
                :items="emailModes"
                :aria-label="`${notificationPreferenceLiterals.emailLabel}: ${preference.label}`"
                :disabled="isSaving"
                variant="table"
                indicator="hidden"
                orientation="horizontal"
                size="sm"
                :ui="segmented"
                @update:model-value="choose(preference.category, { email: $event as NotificationEmailMode })"
              />
            </li>
          </ul>

          <footer
            class="flex flex-col gap-4 border-t border-default pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="m-0 text-sm text-muted">
              {{
                isDirty
                  ? notificationPreferenceLiterals.unsavedMessage
                  : notificationPreferenceLiterals.savedMessage
              }}
            </p>

            <div class="flex w-full flex-wrap gap-3 sm:w-auto">
              <UButton color="neutral" variant="outline" :disabled="!isDirty || isSaving" @click="reset">
                {{ notificationPreferenceLiterals.resetLabel }}
              </UButton>
              <UButton color="primary" variant="solid" :loading="isSaving" :disabled="!isDirty" @click="saveChoices">
                {{ notificationPreferenceLiterals.saveLabel }}
              </UButton>
            </div>
          </footer>
        </div>
      </ProfileSettingsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { NotificationEmailMode } from "~/features/notification-preferences/types";

definePageMeta({
  middleware: "auth",
  layout: "profile",
});

useSeoMeta({
  title: notificationPreferenceLiterals.seoTitle,
  description: notificationPreferenceLiterals.seoDescription,
  robots: "noindex, nofollow",
});

const emailModes = [...notificationPreferenceLiterals.emailModes];
const inAppModes = [...notificationPreferenceLiterals.inAppModes];
const segmented = { fieldset: "w-full", item: "flex-1 justify-center" };

const { categories, choices, isDirty, isSaving, pending, error, refresh, choose, reset, save } =
  await useNotificationPreferences();

useUnloadGuard(isDirty);

const toast = useToast();

async function saveChoices() {
  if (await save()) {
    toast.add({
      title: notificationPreferenceLiterals.savedToastTitle,
      icon: "i-lucide-badge-check",
      color: "success",
    });
    return;
  }
  showActionFailedToast(notificationPreferenceLiterals.saveFailedAction);
}
</script>
