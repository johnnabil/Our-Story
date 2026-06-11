"use client";

import { useEffect, useRef } from "react";

interface UndoToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, actionLabel, onAction, onDismiss }: UndoToastProps) {
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    actionButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border border-gold/40 bg-warm-white px-4 py-3 text-sm text-text shadow-lg outline-none focus:ring-2 focus:ring-rose/25 sm:left-auto sm:right-4"
      style={{
        bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 4.25rem)"
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onDismiss();
        }
      }}
    >
      <span>{message}</span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          ref={actionButtonRef}
          type="button"
          onClick={onAction}
          className="min-h-11 rounded-full border border-rose/40 px-3 py-2 text-xs font-medium text-rose-ink transition hover:bg-rose/10 focus:outline-none focus:ring-2 focus:ring-rose/25"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-full border border-gold/40 px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-cream focus:outline-none focus:ring-2 focus:ring-rose/25"
          aria-label="Dismiss notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
