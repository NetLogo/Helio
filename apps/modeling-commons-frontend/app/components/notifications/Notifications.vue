<template>
  <!--
    The menu is client-only (per-user data + Reka UI positioning). The fallback
    renders the same button markup so hydration swaps in place with no shift.
    The unread dot is absolutely positioned, so it can appear post-hydration
    without affecting layout.
  -->
  <ClientOnly>
    <NotificationsMenu />
    <template #fallback>
      <NotificationsMenuTrigger />
    </template>
  </ClientOnly>
</template>