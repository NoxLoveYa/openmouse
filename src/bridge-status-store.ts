// A single shared poll of Bridge's `/v1/status`, so BridgeCard (version/
// connection display) and useBridgeProfileApplier (foreground-app profile
// matching) aren't each running their own timer against the same loopback
// endpoint. Starts polling on the first subscriber and stops on the last,
// gated by bridge-hid.ts's own connection signal so nothing polls a Bridge
// that isn't there.
import { bridgeStatus, type BridgeStatus } from "./bridge";
import { subscribeBridgeHidActive } from "./bridge-hid";

const POLL_MS = 5_000;

type Listener = (status: BridgeStatus | null) => void;

let current: BridgeStatus | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let unsubscribeActive: (() => void) | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener(current);
}

function poll(): void {
  void bridgeStatus().then((next) => {
    current = next;
    notify();
  }).catch(() => {
    // Bridge briefly not answering — bridge-hid.ts's own disconnect
    // handling is what actually stops polling; this just skips a beat.
  });
}

function startPolling(): void {
  if (timer !== null) return;
  poll();
  timer = setInterval(poll, POLL_MS);
}

function stopPolling(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  current = null;
  notify();
}

/** Returns an unsubscribe function. Immediately calls `listener` with the current status (or null). */
export function subscribeBridgeStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  if (listeners.size === 1) {
    unsubscribeActive = subscribeBridgeHidActive((active) => {
      if (active) startPolling();
      else stopPolling();
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeActive?.();
      unsubscribeActive = null;
      stopPolling();
    }
  };
}

export function currentBridgeStatus(): BridgeStatus | null {
  return current;
}
