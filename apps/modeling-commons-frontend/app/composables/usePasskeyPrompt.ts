export default function usePasskeyPrompt() {
  const user = useUser();
  const { hasPasskeys, isPending, isRefetching } = usePasskeys({ withList: true });
  const dismissed = ref(false);
  const isClientReady = ref(false);

  const dismissalKey = computed(() => {
    if (!user.value.isLoggedIn) {
      return null;
    }

    return `auth:passkey-prompt:dismissed:${user.value.email}`;
  });

  const isReady = computed(() => isClientReady.value && !isPending.value && !isRefetching.value);
  const shouldSkipPrompt = computed(() => isReady.value && (dismissed.value || hasPasskeys.value));

  function canAccessDismissalStorage() {
    return Boolean(typeof window !== "undefined" && dismissalKey.value);
  }

  function syncDismissalState() {
    if (!canAccessDismissalStorage()) {
      dismissed.value = false;
      return;
    }

    dismissed.value = window.localStorage.getItem(dismissalKey.value!) === "1";
    isClientReady.value = true;
  }

  function dismissPrompt() {
    if (canAccessDismissalStorage()) {
      window.localStorage.setItem(dismissalKey.value!, "1");
    }

    dismissed.value = true;
  }

  function clearPromptDismissal() {
    if (canAccessDismissalStorage()) {
      window.localStorage.removeItem(dismissalKey.value!);
    }

    dismissed.value = false;
  }

  onMounted(syncDismissalState);

  watch(dismissalKey, () => {
    if (typeof window !== "undefined") {
      syncDismissalState();
    }
  });

  return {
    dismissed,
    isReady,
    shouldSkipPrompt,
    dismissPrompt,
    clearPromptDismissal,
  };
}
