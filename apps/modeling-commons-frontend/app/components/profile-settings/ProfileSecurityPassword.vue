<template>
  <ProfileSettingsCard
    title="Password"
    description="Change your account password. You can use your current password or request a password reset email if you've forgotten it."
  >
    <div class="flex flex-col gap-3">
      <UAuthForm
        v-if="isChangingPassword"
        :fields="changePasswordFields"
        :schema="changePasswordValidator"
        :submit="{
          label: 'Update Password',
          color: 'primary',
          variant: 'solid',
        }"
        :ui="{
          root: 'ring-1 p-5 rounded-lg ring-neutral-darkest/10',
        }"
        @submit="handleChangePassword"
      />
      <UButton
        v-else
        color="neutral"
        variant="outline"
        icon="i-lucide-key-round"
        @click="isChangingPassword = true"
      >
        Change password
      </UButton>
      <USeparator label="OR" />
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-lock"
        :to="authRoutes.resetPassword"
      >
        I forgot my password
      </UButton>
    </div>
  </ProfileSettingsCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from "#ui/types";
import type * as z from "zod";
import { changePasswordFields, changePasswordValidator } from "~/forms/auth";

const toast = useToast();
const { changePassword } = useAuthActions();
const { handleError } = useAuthResponse();
const isChangingPassword = ref(false);

async function handleChangePassword(
  payload: FormSubmitEvent<z.infer<typeof changePasswordValidator>>,
) {
  try {
    handleError(await changePassword(payload.data));

    toast.add({
      title: "Password updated",
      description: "Your password has been updated successfully.",
      icon: "i-lucide-badge-check",
      color: "success",
    });
    isChangingPassword.value = false;
  } catch (error) {
    toast.add({
      title: "Error updating password",
      description: error instanceof Error ? error.message : "An unexpected error occurred.",
      icon: "i-lucide-x-circle",
      color: "error",
    });
  }
}
</script>
