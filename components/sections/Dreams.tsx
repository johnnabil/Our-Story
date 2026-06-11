"use client";

import { useMemo, useState } from "react";

import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { UndoToast } from "@/components/ui/UndoToast";
import { DREAM_CATEGORIES, type Dream, type DreamCategory } from "@/lib/types";
import { createId } from "@/lib/utils";

interface RemovedDream {
  dream: Dream;
  index: number;
}



export function Dreams() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  const [isAddingDream, setIsAddingDream] = useState(false);
  const [newIcon, setNewIcon] = useState("*");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<DreamCategory>("travel");
  const [newDreamError, setNewDreamError] = useState<string | null>(null);
  const [removedDream, setRemovedDream] = useState<RemovedDream | null>(null);
  const dreams = useMemo(() => content?.dreams ?? [], [content]);

  const sortedDreams = useMemo(
    () => [...dreams].sort((a, b) => Number(a.done) - Number(b.done)),
    [dreams]
  );

  if (isLoading || !content) {
    return (
      <section
        id="dreams"
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
      >
        <p className="text-text-muted">Loading...</p>
      </section>
    );
  }

  const updateDream = (id: string, patch: Partial<Dream>) => {
    updateContent(
      "dreams",
      dreams.map((dream) => (dream.id === id ? { ...dream, ...patch } : dream))
    );
  };

  const removeDream = (dream: Dream) => {
    const index = dreams.findIndex((currentDream) => currentDream.id === dream.id);
    if (index < 0) {
      return;
    }

    setRemovedDream({ dream, index });
    updateContent(
      "dreams",
      dreams.filter((currentDream) => currentDream.id !== dream.id)
    );
  };

  const restoreDream = () => {
    if (!removedDream) {
      return;
    }

    const next = [...dreams];
    next.splice(Math.min(removedDream.index, next.length), 0, removedDream.dream);
    updateContent("dreams", next);
    setRemovedDream(null);
  };

  const resetNewDream = () => {
    setIsAddingDream(false);
    setNewIcon("*");
    setNewTitle("");
    setNewDesc("");
    setNewCategory("travel");
    setNewDreamError(null);
  };

  const handleAddDream = () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      setNewDreamError("Add a title and a few words before saving this dream.");
      return;
    }

    updateContent("dreams", [
      ...dreams,
      {
        id: createId(),
        icon: newIcon.trim() || "*",
        title: newTitle.trim(),
        desc: newDesc.trim(),
        category: newCategory,
        done: false
      }
    ]);

    resetNewDream();
  };

  return (
    <section
      id="dreams"
      className="px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
        <h2 className="font-serif text-4xl leading-tight text-rose-ink sm:text-5xl md:text-6xl">Dreams</h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsAddingDream(true)}
            className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
          >
            Add dream
          </button>
        ) : null}
      </div>

      {isEditing && isAddingDream ? (
        <div className="mb-5 rounded-2xl border border-gold/25 bg-warm-white/85 p-4">
          <div className="grid gap-3 sm:grid-cols-[80px_1fr]">
            <label className="block text-sm text-text-muted">
              Icon
              <input
                type="text"
                value={newIcon}
                onChange={(event) => setNewIcon(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Title
              <input
                type="text"
                value={newTitle}
                onChange={(event) => {
                  setNewTitle(event.target.value);
                  setNewDreamError(null);
                }}
                className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="block text-sm text-text-muted">
              Description
              <textarea
                value={newDesc}
                onChange={(event) => {
                  setNewDesc(event.target.value);
                  setNewDreamError(null);
                }}
                rows={3}
                className="mt-1 min-h-24 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
            </label>
            <label className="block text-sm text-text-muted">
              Category
              <select
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value as DreamCategory)}
                className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              >
                {DREAM_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {newDreamError ? <p className="mt-3 text-sm text-rose-deep">{newDreamError}</p> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetNewDream}
              className="min-h-11 rounded-full border border-gold/35 px-4 py-2 text-sm text-text-muted transition hover:bg-cream active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDream}
              className="min-h-11 rounded-full border border-rose/40 px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
            >
              Save dream
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {sortedDreams.map((dream) => (
          <article
            key={dream.id}
            className={`relative grid gap-4 rounded-2xl border p-4 transition sm:grid-cols-[auto_1fr] sm:p-5 ${
              dream.done
                ? "border-gold/20 bg-gold-light/30 text-text-muted"
                : "border-gold/25 bg-warm-white/82 shadow-sm"
            }`}
          >
            <div className="flex items-start gap-3 sm:contents">
              <button
                type="button"
                onClick={() => updateDream(dream.id, { done: !dream.done })}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm transition active:scale-[0.96] ${
                  dream.done
                    ? "border-rose/45 bg-rose-ink text-warm-white"
                    : "border-gold/45 bg-cream text-transparent hover:border-rose/45"
                }`}
                aria-label={dream.done ? `Mark ${dream.title} as not done` : `Mark ${dream.title} done`}
              >
                <span aria-hidden>{dream.done ? "✓" : ""}</span>
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => removeDream(dream)}
                  className="ml-auto min-h-11 rounded-full border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98] sm:col-start-2 sm:row-start-1"
                >
                  Delete
                </button>
              ) : null}
            </div>

            <div className="min-w-0 sm:col-start-2 sm:row-start-1">
              <div className="flex items-start gap-3 pr-0 sm:pr-24">
                <EditableText
                  value={dream.icon}
                  className="text-3xl leading-none"
                  onChange={(icon) => updateDream(dream.id, { icon })}
                />
                <EditableText
                  value={dream.title}
                  as="h3"
                  className="font-serif text-2xl text-text"
                  onChange={(title) => updateDream(dream.id, { title })}
                />
              </div>

              <EditableRichText
                value={dream.desc}
                onChange={(desc) => updateDream(dream.id, { desc })}
                className="mt-3 text-text-muted"
              />

              <div className="mt-4">
                {isEditing ? (
                  <select
                    value={dream.category}
                    onChange={(event) =>
                      updateDream(dream.id, { category: event.target.value as DreamCategory })
                    }
                    className="min-h-11 rounded-full border border-gold/35 bg-cream px-4 py-2 text-xs capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                  >
                    {DREAM_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-full border border-gold/35 bg-gold-light/30 px-3 py-1 text-xs capitalize text-text">
                    {dream.category}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {removedDream ? (
        <UndoToast
          message="Dream removed."
          actionLabel="Undo"
          onAction={restoreDream}
          onDismiss={() => setRemovedDream(null)}
        />
      ) : null}
      </div>

    </section>
  );
}
