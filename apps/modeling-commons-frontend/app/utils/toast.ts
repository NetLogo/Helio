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

export function showActionFailedToast(action: string, what?: string, sayMore?: string) {
  const toast = useToast();

  toast.add({
    title: `${sentenceCase(action)} ${what ?? ""} Failed`,
    description:
      sayMore ??
      `We were unable to ${action.toLowerCase()} the ${(what ?? "").toLowerCase()}. Please try again.`,
    color: "error",
    icon: "i-lucide-x-circle",
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
