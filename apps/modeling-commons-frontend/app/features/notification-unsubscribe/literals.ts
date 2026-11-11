export const notificationUnsubscribeLiterals = {
  seoTitle: "Unsubscribe",
  seoDescription: "Stop receiving these notification emails.",
  intros: {
    confirm: {
      icon: "i-lucide-mail-x",
      title: "Unsubscribe from these emails?",
      description:
        "You will stop receiving emails for the notifications this email was about. You can turn them back on at any time.",
    },
    done: {
      icon: "i-lucide-mail-check",
      title: "You're unsubscribed",
      description: "You won't receive these emails anymore.",
    },
    invalid: {
      icon: "i-lucide-link-2-off",
      title: "This unsubscribe link is invalid",
      description:
        "The link may be incomplete. Manage your emails from your notification settings instead.",
    },
    failed: {
      icon: "i-lucide-circle-alert",
      title: "We couldn't unsubscribe you",
      description: "Something went wrong. Try again in a moment.",
    },
  },
  confirmButton: "Unsubscribe",
  retryButton: "Try again",
  settingsLink: "Notification settings",
} as const;
