"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface ShortcutRow {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ["d"], description: "Go to Dashboard" },
  { keys: ["i"], description: "Go to Invoices" },
  { keys: ["c"], description: "Go to Clients" },
  { keys: ["n"], description: "New Invoice" },
  { keys: ["?"], description: "Show this help" },
  { keys: ["Esc"], description: "Close modal" },
];

function ShortcutsModal({ onClose }: { onClose: () => void }): React.ReactElement {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close shortcuts help"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <ul className="divide-y divide-gray-50 px-5 py-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys.join("+")}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-sm text-gray-600">{s.description}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-2 py-0.5 font-mono text-xs font-medium text-gray-700"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-xs text-gray-400">
            Shortcuts don&apos;t fire when an input field is focused.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Global keyboard shortcut manager — add to dashboard layout.
 * Handles navigation shortcuts and shows a help modal on "?".
 */
export function GlobalShortcuts(): React.ReactElement {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  const closeHelp = useCallback(() => setShowHelp(false), []);

  useKeyboardShortcuts((key) => {
    switch (key) {
      case "d":
        router.push("/dashboard");
        break;
      case "i":
        router.push("/invoices");
        break;
      case "c":
        router.push("/clients");
        break;
      case "n":
        router.push("/invoices/new");
        break;
      case "?":
        setShowHelp(true);
        break;
      case "Escape":
        setShowHelp(false);
        break;
      default:
        break;
    }
  });

  return <>{showHelp && <ShortcutsModal onClose={closeHelp} />}</>;
}
