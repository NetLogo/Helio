export type EventQueueNotifier = {
  bind: (send: () => Promise<void>) => void;
  nudge: () => Promise<void>;
};

export default function makeEventQueueNotifier(): EventQueueNotifier {
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
