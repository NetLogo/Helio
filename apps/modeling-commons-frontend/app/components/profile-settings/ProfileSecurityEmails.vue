<template>
  <ProfileSettingsCard
    title="Email"
    description="Change your account email address. You will need to verify the new email before changes take effect."
  >
    <div class="flex flex-col gap-3">
      <UAuthForm
        v-if="formVisible"
        :fields="changeEmailFields"
        :validator="changeEmailValidator"
        :submit="{
          label: 'Update Email',
          color: 'primary',
          variant: 'solid',
        }"
        :ui="{
          root: 'ring-1 p-5 rounded-lg ring-neutral-darkest/10',
        }"
        @submit="handleChangeEmail"
      />
      <UButton v-else color="neutral" variant="outline" icon="i-lucide-mails" @click="toggleForm">
        Change email address
      </UButton>
    </div>
    <USeparator>
      <p class="text-sm">
        You are currently using <strong>{{ currentEmail }}</strong>
      </p>
    </USeparator>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "#ui/types";
import type * as z from "zod";
import { changeEmailFields, changeEmailValidator } from "~/assets/auth";

defineProps<{
  currentEmail: string;
  emailVerified: boolean;
}>();

const toast = useToast();
const { changeEmail } = useAuthActions();
const { handleError } = useAuthResponse();
const formVisible = ref(false);

function toggleForm() {
  formVisible.value = !formVisible.value;
}

async function handleChangeEmail(payload: FormSubmitEvent<z.infer<typeof changeEmailValidator>>) {
  try {
    handleError(await changeEmail(payload.data.newEmail));

    toast.add({
      title: "Email updated",
      description:
        "A confirmation email has been sent to your new email address. Please verify to complete the update.",
      icon: "i-lucide-inbox",
      color: "warning",
    });
    formVisible.value = false;
  } catch (error) {
    toast.add({
      title: "Error updating email",
      description: error instanceof Error ? error.message : "An unexpected error occurred.",
      icon: "i-lucide-x-circle",
      color: "error",
    });
  }
}
</script>
