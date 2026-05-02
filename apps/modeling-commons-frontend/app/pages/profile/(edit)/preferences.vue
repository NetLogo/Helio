<template>
  <div class="grid gap-8">
    <section class="grid items-start gap-6 mt-1">
      <ProfileSettingsCard
        title="Notifications"
        description="Manage your notification preferences for Modeling Commons updates and activity."
        :ui="{
          root: 'ring-0',
          body: 'p-1 sm:p-1 mt-5',
        }"
      >
        <UTable :columns="columns" :data="data">
          <template #email-cell="{ row }">
            <USwitch :model-value="row.original.email" />
          </template>
          <template #inApp-cell="{ row }">
            <USwitch :model-value="row.original.inApp" />
          </template>
        </UTable>
      </ProfileSettingsCard>
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

const columns = [
  { header: "Type of Notification", accessorKey: "type" },
  { header: "Modeling Commons", accessorKey: "inApp" },
  { header: "Email", accessorKey: "email" },
];

const data = ref([
  {
    type: "New Comments on Your Models",
    email: true,
    inApp: true,
  },
  {
    type: "New Forks from Your Models",
    email: false,
    inApp: true,
  },
  {
    type: "Announcements from Modeling Commons",
    email: true,
    inApp: false,
  },
  {
    type: "Weekly Summary of Your Activity",
    email: false,
    inApp: false,
  },
  {
    type: "Insight Updates on Your Models",
    email: true,
    inApp: true,
  },
]);
</script>
