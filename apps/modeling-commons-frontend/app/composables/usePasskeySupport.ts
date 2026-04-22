function detectPasskeySupport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.isSecureContext && "PublicKeyCredential" in window;
}

export default function usePasskeySupport() {
  const supported = useState("passkey-supported", () => false);
  const resolved = useState("passkey-supported-resolved", () => false);

  onMounted(() => {
    if (resolved.value) {
      return;
    }

    supported.value = detectPasskeySupport();
    resolved.value = true;
  });

  return {
    isPasskeySupported: computed(() => resolved.value && supported.value),
    isPasskeySupportResolved: computed(() => resolved.value),
  };
}
