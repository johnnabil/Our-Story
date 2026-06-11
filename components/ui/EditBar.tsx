"use client";

import { signIn } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { Modal } from "@/components/ui/Modal";
import type { ContentKey } from "@/lib/types";

interface ScrollAnchor {
  sectionId: string;
  offsetFromSectionTop: number;
  focusY: number;
}

const CONTENT_STATUS_LABELS: Record<ContentKey, string> = {
  hero: "Cover",
  milestones: "Milestones",
  dates: "Dates",
  gallery: "Photos",
  story: "Story",
  profiles: "Profiles",
  letter: "Letter",
  dreams: "Dreams"
};

function contentStatusLabel(key: ContentKey) {
  return CONTENT_STATUS_LABELS[key];
}

function captureScrollAnchor(): ScrollAnchor | null {
  const sectionElements = Array.from(
    document.querySelectorAll<HTMLElement>("main section[id]")
  );

  if (!sectionElements.length) {
    return null;
  }

  const focusY = Math.min(220, Math.max(96, Math.round(window.innerHeight * 0.28)));

  const sectionAtFocus =
    sectionElements.find((sectionElement) => {
      const rect = sectionElement.getBoundingClientRect();
      return rect.top <= focusY && rect.bottom >= focusY;
    }) ??
    sectionElements.reduce((closest, sectionElement) => {
      if (!closest) {
        return sectionElement;
      }

      const currentDistance = Math.abs(sectionElement.getBoundingClientRect().top - focusY);
      const closestDistance = Math.abs(closest.getBoundingClientRect().top - focusY);
      return currentDistance < closestDistance ? sectionElement : closest;
    }, sectionElements[0]);

  const sectionRect = sectionAtFocus.getBoundingClientRect();

  return {
    sectionId: sectionAtFocus.id,
    focusY,
    offsetFromSectionTop: focusY - sectionRect.top
  };
}

function restoreScrollAnchor(anchor: ScrollAnchor | null) {
  if (!anchor) {
    return;
  }

  const sectionElement = document.getElementById(anchor.sectionId);
  if (!sectionElement) {
    return;
  }

  const sectionRect = sectionElement.getBoundingClientRect();
  const sectionAbsoluteTop = window.scrollY + sectionRect.top;
  const targetTop = Math.max(0, sectionAbsoluteTop + anchor.offsetFromSectionTop - anchor.focusY);

  window.scrollTo({ top: targetTop, behavior: "auto" });
}

function restoreAfterLayout(anchor: ScrollAnchor | null) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      restoreScrollAnchor(anchor);
    });
  });
}

export function EditBar() {
  const { canEdit, isEditing, toggleEdit } = useEdit();
  const { flushAll, pendingKeys, lastSavedAt, lastSavedKey, lastSaveError } = useContent();

  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [shouldEnterEditAfterAuth, setShouldEnterEditAfterAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!shouldEnterEditAfterAuth || !canEdit || isEditing) {
      return;
    }

    const anchor = captureScrollAnchor();
    toggleEdit();
    restoreAfterLayout(anchor);
    setShouldEnterEditAfterAuth(false);
  }, [shouldEnterEditAfterAuth, canEdit, isEditing, toggleEdit]);

  const toggleEditWithScrollPreservation = useCallback(() => {
    const anchor = captureScrollAnchor();
    toggleEdit();
    restoreAfterLayout(anchor);
  }, [toggleEdit]);

  const handleSaveAndExit = async () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    setIsSaving(true);
    try {
      const result = await flushAll();

      if (result.ok && isEditing) {
        toggleEditWithScrollPreservation();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCredentialsSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    const result = await signIn("credentials", {
      password,
      redirect: false
    });

    if (!result || result.error) {
      setAuthError("Incorrect password. Try again.");
      return;
    }

    setPassword("");
    setShowAuthModal(false);
  };

  const saveStatusText = lastSaveError
    ? lastSaveError
    : pendingKeys.length > 0
      ? pendingKeys.length === 1
        ? `Saving ${contentStatusLabel(pendingKeys[0]).toLowerCase()}...`
        : "Saving changes..."
      : lastSavedAt
        ? lastSavedKey
          ? `${contentStatusLabel(lastSavedKey)} saved`
          : "All changes saved"
        : null;

  return (
    <>
      <div
        className={`fixed z-50 transition-all duration-300 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          right: "max(1rem, env(safe-area-inset-right))"
        }}
      >
        <div className="rounded-full border border-gold/40 bg-warm-white/95 p-1 shadow-lg backdrop-blur-md">
          {isEditing ? (
            <div className="flex items-center gap-1">
              {saveStatusText ? (
                <span
                  className="px-3 text-xs font-medium text-text-muted"
                  role="status"
                  aria-live="polite"
                >
                  {saveStatusText}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleSaveAndExit();
                }}
                disabled={isSaving}
                className="min-h-11 rounded-full border border-rose/40 px-4 py-2 text-xs font-medium text-rose-ink transition hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
              >
                {isSaving ? "Saving..." : "Save & Exit"}
              </button>
              <button
                type="button"
                onClick={toggleEditWithScrollPreservation}
                disabled={isSaving}
                className="min-h-11 rounded-full border border-gold/40 px-4 py-2 text-xs font-medium text-text transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  setShouldEnterEditAfterAuth(true);
                  setShowAuthModal(true);
                  return;
                }

                toggleEditWithScrollPreservation();
              }}
              className="min-h-11 rounded-full border border-rose/40 px-5 py-2 text-xs font-medium text-rose-ink transition hover:bg-rose/10 sm:text-sm"
            >
              {canEdit ? "Edit Site" : "Edit"}
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAuthModal}
        title="Enter Password"
        onClose={() => {
          setShowAuthModal(false);
          setPassword("");
          setAuthError(null);
          setShouldEnterEditAfterAuth(false);
        }}
      >
        <form onSubmit={(event) => void handleCredentialsSignIn(event)} className="space-y-3">
          <label htmlFor="edit-password" className="block text-sm text-text-muted">
            Enter the edit password to unlock inline editing.
          </label>
          <input
            id="edit-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
            required
          />
          {authError ? <p className="text-sm text-rose-deep">{authError}</p> : null}
          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-11 rounded-full border border-rose/40 px-4 py-2 text-sm font-medium text-rose-ink transition hover:bg-rose/10"
            >
              Unlock
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
