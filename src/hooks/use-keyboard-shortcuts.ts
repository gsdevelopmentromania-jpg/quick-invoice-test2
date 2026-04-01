"use client";

import { useEffect, useRef } from "react";

type KeyHandler = (key: string, event: KeyboardEvent) => void;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (target as HTMLElement).isContentEditable
  );
}

/**
 * Registers a global keydown listener.
 * The handler is called with the pressed key string.
 * Does not fire when focus is inside an input/textarea/select.
 * Does not fire when modifier keys (Ctrl/Meta/Alt) are held.
 */
export function useKeyboardShortcuts(handler: KeyHandler): void {
  const handlerRef = useRef<KeyHandler>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handlerRef.current(e.key, e);
    }

    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
