// composables/useActivePoll.ts
import { computed, watch, toValue, type MaybeRefOrGetter } from "vue";
import {
  useDocumentVisibility,
  useWindowFocus,
  useIdle,
  useOnline,
  useTimeoutPoll,
} from "@vueuse/core";

export function useActivePoll(
  fn: () => Promise<void> | void,
  interval: MaybeRefOrGetter<number> = 30_000,
  opts: ActivePollOptions = {},
) {
  const {
    idleTimeout = 5 * 60_000,
    requireFocus = false,
    requireOnline = true,
    immediate = true,
  } = opts;

  const visibility = useDocumentVisibility();
  const focused = useWindowFocus();
  const online = useOnline();
  const { idle, lastActive } = useIdle(idleTimeout);

  const active = computed(
    () =>
      visibility.value === "visible" &&
      !idle.value &&
      (!requireFocus || focused.value) &&
      (!requireOnline || online.value),
  );

  const { isActive, pause, resume } = useTimeoutPoll(fn, () => toValue(interval), {
    immediate: false,
  });

  watch(
    active,
    (on) => {
      if (on) resume();
      else pause();
    },
    { immediate },
  );

  return { active, isActive, pause, resume, idle, lastActive, online };
}

export interface ActivePollOptions {
  /** ms of no user input before considered idle. Default 5min. */
  idleTimeout?: number;
  /** Pause when another app has OS focus, even if the tab is visible. Default false. */
  requireFocus?: boolean;
  /** Pause when navigator reports offline. Default true. */
  requireOnline?: boolean;
  /** Start polling immediately if conditions are met. Default true. */
  immediate?: boolean;
}
