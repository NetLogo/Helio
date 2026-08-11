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
          <div
            class="shrink-0 flex items-center justify-center size-10 rounded-full bg-primary/10"
          >
            <UIcon name="i-lucide-key-round" class="size-5 text-primary" />
          </div>
          <div class="space-y-1">
            <h6 class="font-semibold text-highlighted">Your old account is still here</h6>
            <p class="text-sm text-muted">
              Accounts from the previous modelingcommons.org site came across to this new
              version. Passwords did not, so reset yours to get back in.
            </p>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="dismiss">Maybe later</UButton>
          <UButton
            variant="solid"
            color="primary"
            icon="i-lucide-key-round"
            :to="resetPasswordLink"
            @click="dismiss"
          >
            Reset password
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
