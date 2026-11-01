"use client";

import { useSyncExternalStore } from "react";

/**
 * One polite live region for the whole bag page. It sits outside the item
 * list, so messages survive the line (and its controls) being removed.
 */

let message = "";
const listeners = new Set<() => void>();

export function announce(text: string) {
  // Clear first so an identical message is still announced again.
  message = "";
  listeners.forEach((l) => l());
  queueMicrotask(() => {
    message = text;
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function BagAnnouncer() {
  const text = useSyncExternalStore(
    subscribe,
    () => message,
    () => "",
  );
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
