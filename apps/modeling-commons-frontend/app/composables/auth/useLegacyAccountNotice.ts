/**
 * The legacy modelingcommons.org notice stops showing on this date (viewer local time).
 * Edit this single constant to move or extend the sunset.
 */
export const legacyAccountNoticeSunsetDate = "2026-09-18";

export const legacyAccountNoticeDismissalKey = "auth:legacy-account-notice:dismissed";

export function isLegacyAccountNoticeExpired(now: Date = new Date()) {
  return now.getTime() >= new Date(`${legacyAccountNoticeSunsetDate}T00:00:00`).getTime();
}

export default function useLegacyAccountNotice() {
  const user = useUser();
  const open = ref(false);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(legacyAccountNoticeDismissalKey, "1");
    }

    open.value = false;
  }

  onMounted(() => {
    if (user.value.isLoggedIn || isLegacyAccountNoticeExpired()) {
      return;
    }

    open.value = window.localStorage.getItem(legacyAccountNoticeDismissalKey) !== "1";
  });

  return { open, dismiss };
}
