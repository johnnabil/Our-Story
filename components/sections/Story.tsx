"use client";

import { useEffect, useMemo, useState } from "react";

import { EditableDate } from "@/components/edit/EditableDate";
import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";
import { UndoToast } from "@/components/ui/UndoToast";
import type { StoryEntry } from "@/lib/types";
import { createId } from "@/lib/utils";

interface RemovedStoryEntry {
  entry: StoryEntry;
  index: number;
}



export function Story() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();
  const [removedEntry, setRemovedEntry] = useState<RemovedStoryEntry | null>(null);
  const [pendingNewEntryId, setPendingNewEntryId] = useState<string | null>(null);
  const story = useMemo(() => content?.story ?? [], [content]);

  const sortedEntries = useMemo(
    () => [...story].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [story]
  );

  useEffect(() => {
    if (!pendingNewEntryId) {
      return;
    }

    const entryElement = document.querySelector<HTMLElement>(
      `[data-story-entry-id="${pendingNewEntryId}"]`
    );
    if (!entryElement) {
      return;
    }

    entryElement.scrollIntoView({ behavior: "smooth", block: "center" });

    window.requestAnimationFrame(() => {
      const titleField = entryElement.querySelector<HTMLElement>('[contenteditable="true"]');
      titleField?.focus();
    });

    setPendingNewEntryId(null);
  }, [pendingNewEntryId, sortedEntries.length]);

  if (isLoading || !content) {
    return <MemoryLoading id="story" />;
  }

  const updateEntry = (id: string, patch: Partial<StoryEntry>) => {
    updateContent(
      "story",
      story.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  };

  const removeEntry = (entry: StoryEntry) => {
    const index = story.findIndex((currentEntry) => currentEntry.id === entry.id);
    if (index < 0) {
      return;
    }

    setRemovedEntry({ entry, index });
    updateContent(
      "story",
      story.filter((currentEntry) => currentEntry.id !== entry.id)
    );
  };

  const restoreEntry = () => {
    if (!removedEntry) {
      return;
    }

    const next = [...story];
    next.splice(Math.min(removedEntry.index, next.length), 0, removedEntry.entry);
    updateContent("story", next);
    setRemovedEntry(null);
  };

  return (
    <section id="story" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end md:mb-16">
          <h2 className="font-serif text-4xl leading-tight text-rose-ink sm:text-5xl md:text-6xl">Our Story</h2>
          {isEditing ? (
            <button
              type="button"
              onClick={() => {
                const id = createId();
                updateContent("story", [
                  ...story,
                  {
                    id,
                    date: new Date().toISOString().slice(0, 10),
                    title: "",
                    body: ""
                  }
                ]);
                setPendingNewEntryId(id);
              }}
              className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
            >
              Add entry
            </button>
          ) : null}
        </div>

        <div className="relative">
          <div className="absolute bottom-3 left-[1.05rem] top-3 w-px bg-gradient-to-b from-transparent via-rose/45 to-transparent md:left-1/2" />
          <ol className="relative space-y-10 md:space-y-0">
            {sortedEntries.map((entry, index) => {
              const isRightAligned = index % 2 === 1;

              return (
                <li
                  key={entry.id}
                  data-story-entry-id={entry.id}
                  className="relative grid gap-4 pl-12 md:min-h-44 md:grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] md:gap-6 md:pl-0"
                >
                  <div className="absolute left-0 top-0 z-10 md:static md:col-start-2 md:row-start-1 md:flex md:justify-center">
                    <div className="grid size-9 place-items-center rounded-full border border-rose/35 bg-warm-white text-[11px] font-semibold text-rose-ink shadow-[0_8px_24px_oklch(39%_0.105_348_/_0.10)] md:size-11 md:text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <article
                    className={`relative border-t border-rose/20 pt-5 md:row-start-1 md:pb-16 ${
                      isRightAligned ? "md:col-start-3" : "md:col-start-1 md:text-right"
                    } ${index === sortedEntries.length - 1 ? "md:pb-0" : ""}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -top-px h-px w-16 bg-rose ${
                        isRightAligned ? "left-0" : "left-0 md:left-auto md:right-0"
                      }`}
                    />
                    <div className={`mb-4 flex flex-wrap items-center gap-3 ${
                      isRightAligned ? "" : "md:justify-end"
                    }`}>
                      <EditableDate
                        value={entry.date}
                        onChange={(date) => updateEntry(entry.id, { date })}
                        ariaLabel={`Date for story entry ${entry.title || "New chapter"}`}
                        className="text-sm font-medium text-rose-ink"
                      />
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry)}
                          className="min-h-9 rounded-full border border-rose/30 px-3 py-1.5 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>

                    <EditableText
                      value={entry.title}
                      as="h3"
                      className="font-serif text-3xl leading-tight text-text sm:text-4xl"
                      placeholder="New chapter"
                      onChange={(title) => updateEntry(entry.id, { title })}
                    />
                    {entry.body || isEditing ? (
                      <div className="mt-4">
                        <EditableRichText
                          value={entry.body}
                          placeholder="Write this memory..."
                          onChange={(body) => updateEntry(entry.id, { body })}
                          className={`text-base leading-relaxed text-text-muted ${
                            isRightAligned ? "" : "md:text-right"
                          }`}
                        />
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {removedEntry ? (
        <UndoToast
          message="Story entry removed."
          actionLabel="Undo"
          onAction={restoreEntry}
          onDismiss={() => setRemovedEntry(null)}
        />
      ) : null}
    </section>
  );
}
