export const notificationPreferenceLiterals = {
  title: "Notifications",
  description: "Choose how Modeling Commons keeps you informed about activity on your models.",
  seoTitle: "Notification Settings",
  seoDescription: "Manage how Modeling Commons notifies you in the app and by email.",
  inAppLabel: "In app",
  inAppIcon: "i-lucide-bell",
  emailLabel: "Email",
  emailIcon: "i-lucide-mail",
  categoryIcons: {
    "comment.on_your_model": "i-lucide-message-square",
    "comment.reply_to_you": "i-lucide-reply",
  } as Record<string, string>,
  fallbackCategoryIcon: "i-lucide-bell",
  inAppModes: [
    {
      value: "on",
      label: "On",
    },
    {
      value: "off",
      label: "Off",
    },
  ],
  loadErrorTitle: "We couldn't load your notification settings",
  loadErrorMessage: "Refresh the page and try again.",
  emptyMessage: "There are no notification settings to manage yet.",
  saveFailedAction: "Save notification preferences",
  unsavedMessage: "You have unsaved changes.",
  savedMessage: "Your notification settings are up to date.",
  resetLabel: "Reset",
  saveLabel: "Save changes",
  savedToastTitle: "Notification settings saved",
  emailModes: [
    {
      value: "immediate",
      label: "Instant",
    },
    {
      value: "daily",
      label: "Daily",
    },
    {
      value: "off",
      label: "Off",
    },
  ],
} as const;
