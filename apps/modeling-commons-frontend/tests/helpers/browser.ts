import { vi } from "vitest";

type Listener = (event: Event) => void;

export class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: Array<FakeEventSource> = [];
  static peakOpen = 0;

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = FakeEventSource.CONNECTING;
  private readonly listeners = new Map<string, Array<Listener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
    FakeEventSource.instances.push(this);
    FakeEventSource.peakOpen = Math.max(FakeEventSource.peakOpen, openEventSources().length);
  }

  addEventListener(name: string, listener: Listener) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  simulateOpen() {
    this.readyState = FakeEventSource.OPEN;
    this.dispatch("open");
  }

  simulateEvent(name: string) {
    this.dispatch(name);
  }

  simulateDrop() {
    this.readyState = FakeEventSource.CONNECTING;
    this.dispatch("error");
  }

  simulateGiveUp() {
    this.readyState = FakeEventSource.CLOSED;
    this.dispatch("error");
  }

  private dispatch(name: string) {
    for (const listener of this.listeners.get(name) ?? []) listener(new Event(name));
  }
}

export const openEventSources = () =>
  FakeEventSource.instances.filter((source) => source.readyState !== FakeEventSource.CLOSED);

export const latestEventSource = () => FakeEventSource.instances.at(-1);

export function installFakeEventSource() {
  FakeEventSource.instances = [];
  FakeEventSource.peakOpen = 0;
  vi.stubGlobal("EventSource", FakeEventSource);
}

export function setDocumentVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

export function resetDocumentVisibility() {
  Reflect.deleteProperty(document, "visibilityState");
}
