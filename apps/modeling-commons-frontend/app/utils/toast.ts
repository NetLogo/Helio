export function showRequiresLoginToast(what: string = "perform this action") {
  const toast = useToast();

  toast.add({
    title: "Login Required",
    description: `You need to be logged in to ${what}.`,
    color: "warning",
    icon: "i-lucide-key-round",
  });
}

export function showNotFoundToast(what: string = "item", sayMore?: string) {
  const toast = useToast();

  toast.add({
    title: `${sentenceCase(what)} Not Found`,
    description: sayMore ?? `The ${what} you are looking for could not be found.`,
    color: "error",
    icon: "i-lucide-alert-circle",
  });
}

export function showActionFailedToast(action: string, sayMore?: string) {
  const toast = useToast();

  toast.add({
    title: `${sentenceCase(action)} Failed`,
    description: sayMore,
    color: "error",
    icon: "i-lucide-x-circle",
  });
}

export function showComingSoonToast(feature: string, options: { icon?: string } = {}) {
  const toast = useToast();
  const { icon = "i-lucide-clock" } = options;

  toast.add({
    title: `${feature} is not available yet`,
    description: `We're working hard to bring it to you! Stay tuned for updates.`,
    color: "info",
    icon,
  });
}

export function toastLinkExpired() {
  const toast = useToast();

  toast.add({
    title: "Link Expired",
    description:
      "The link you are trying to access has expired. Please refresh the page and try again.",
    color: "error",
    icon: "i-lucide-alert-triangle",
  });
}
