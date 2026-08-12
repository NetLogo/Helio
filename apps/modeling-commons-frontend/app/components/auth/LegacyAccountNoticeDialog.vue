<template>
  <UModal
    :open="open"
    class="lg:max-w-lg"
    title="Your old account is still here"
    @update:open="onOpenChange"
  >
    <template #content>
      <div class="p-6 space-y-5">
        <div class="flex gap-4">
          <div class="shrink-0 flex items-center justify-center size-10 rounded-full bg-primary/10">
            <UIcon name="i-lucide-key-round" class="size-5 text-primary" />
          </div>
          <div class="space-y-1">
            <h6 class="font-semibold text-highlighted">Old accounts are not lost</h6>
            <p class="text-sm text-muted">
              Accounts from the previous modelingcommons.org site came across to this new version.
              Passwords did not, but we can email you a link to set up a new one.
            </p>

            <p class="text-xs text-muted mt-5">
              Not sure if you had one? Try reclaiming it. We will email a link if we find an account
              for your address.
            </p>
          </div>
        </div>

        <div class="flex flex-col justify-end gap-4">
          <UButton variant="solid" color="primary" :to="resetPasswordLink" icon="lucide:user-round-search" @click="dismiss">
            Reclaim account
          </UButton>
          <UButton variant="link" size="xs" class="mx-auto" color="neutral" @click="dismiss">
            I didn't have an old account
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{ next?: string }>();

const { open, dismiss } = useLegacyAccountNotice();

const resetPasswordLink = computed(() => getResetPasswordLink(props.next));

function onOpenChange(value: boolean) {
  if (!value) {
    dismiss();
  }
}
</script>
