export type QueueNotifier = {
  bind: (send: () => Promise<void>) => void;
  nudge: () => Promise<void>;
};

export default function makeQueueNotifier(): QueueNotifier {
  let send: (() => Promise<void>) | null = null;

  return {
    bind(fn) {
      send = fn;
    },

    async nudge() {
      await send?.();
    },
  };
}
