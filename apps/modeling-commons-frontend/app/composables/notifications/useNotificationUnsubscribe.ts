export type NotificationUnsubscribeStatus = "idle" | "submitting" | "done" | "invalid" | "failed";

const INVALID_TOKEN_STATUS = 400;

export default function useNotificationUnsubscribe(token: MaybeRefOrGetter<string>) {
  const status = ref<NotificationUnsubscribeStatus>(toValue(token) ? "idle" : "invalid");

  async function unsubscribe() {
    if (status.value === "submitting" || status.value === "done") return;
    status.value = "submitting";

    try {
      const { error, response } = await unsubscribeFromNotificationEmails(toValue(token));
      if (!error) status.value = "done";
      else status.value = response.status === INVALID_TOKEN_STATUS ? "invalid" : "failed";
    } catch {
      status.value = "failed";
    }
  }

  return { status, unsubscribe };
}
