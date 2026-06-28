import type { Ref } from "vue";

export interface UnloadGuardOptions {
  onLeave?: () => void | Promise<void>;
}

export default function useUnloadGuard(
  isDirty: Ref<boolean>,
  options: UnloadGuardOptions = {},
): {
  guarded: Ref<boolean>;
  lock: () => void;
  unlock: () => void;
} {
  const lock = ref(true);
  const guarded = computed(() => lock.value && isDirty.value);

  function handler(event: BeforeUnloadEvent) {
    if (!guarded.value) return;
    event.preventDefault();
    event.returnValue = "";
  }

  onMounted(() => {
    window.addEventListener("beforeunload", handler);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", handler);
  });

  onBeforeRouteLeave(async (to, from, next) => {
    if (!guarded.value) {
      await options.onLeave?.();
      next();
      return;
    }

    const answer = window.confirm("You have unsaved changes. Are you sure you want to leave?");
    if (answer) {
      await options.onLeave?.();
      next();
    } else {
      next(false);
    }
  });

  return {
    guarded,
    unlock() {
      lock.value = false;
    },
    lock() {
      lock.value = true;
    },
  };
}
