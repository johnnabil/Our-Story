"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "md" | "lg";
  bodyClassName?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openModalCount = 0;

export function Modal({
  isOpen,
  title,
  onClose,
  children,
  maxWidth = "md",
  bodyClassName = ""
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const widthClass = maxWidth === "lg" ? "sm:max-w-2xl" : "sm:max-w-md";

  useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    openModalCount += 1;
    document.body.dataset.modalOpen = "true";

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        delete document.body.dataset.modalOpen;
      }
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !dialogRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last || !dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-text/50 p-0 sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/30 bg-warm-white shadow-lg outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl ${widthClass}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
          {title ? <h2 className="font-serif text-2xl text-text">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-11 rounded border border-gold/40 px-4 py-2 text-sm text-text-muted transition hover:bg-cream"
          >
            Close
          </button>
        </div>
        <div className={`min-h-0 overflow-y-auto px-5 pb-5 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
