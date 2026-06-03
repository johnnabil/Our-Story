"use client";

import { useMemo } from "react";

import { EditableDate } from "@/components/edit/EditableDate";
import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import type { StoryEntry } from "@/lib/types";
import { createId } from "@/lib/utils";



export function Story() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();
  const story = useMemo(() => content?.story ?? [], [content]);

  const sortedEntries = useMemo(
    () => [...story].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [story]
  );

  if (isLoading || !content) {
    return (
      <section id="story" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <p className="text-text-muted">Loading...</p>
      </section>
    );
  }

  const updateEntry = (id: string, patch: Partial<StoryEntry>) => {
    updateContent(
      "story",
      story.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  };

  return (
    <section id="story" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-serif text-3xl text-rose sm:text-4xl md:text-5xl">Our Story</h2>
        {isEditing ? (
          <button
            type="button"
            onClick={() =>
              updateContent("story", [
                ...story,
                {
                  id: createId(),
                  date: new Date().toISOString().slice(0, 10),
                  title: "",
                  body: ""
                }
              ])
            }
            className="rounded-full border border-rose/40 px-4 py-2 text-sm text-rose transition hover:bg-rose/10"
          >
            Add entry
          </button>
        ) : null}
      </div>

      <div className="relative space-y-8">
        <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gold/35 md:block" />
        {sortedEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`relative md:flex ${index % 2 === 0 ? "md:justify-end" : "md:justify-start"}`}
          >
            <span className="absolute left-1/2 top-6 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-rose md:block" />

            <article className="relative z-10 rounded-2xl border border-gold/20 bg-warm-white p-4 shadow-sm sm:p-5 md:w-[calc(50%-1.5rem)]">
              <div className="mb-3 flex items-start justify-between gap-3">
                <EditableDate
                  value={entry.date}
                  onChange={(date) => updateEntry(entry.id, { date })}
                  className="text-sm text-text-muted"
                />
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateContent(
                        "story",
                        story.filter((currentEntry) => currentEntry.id !== entry.id)
                      )
                    }
                    className="rounded border border-rose/30 px-2 py-1 text-xs text-rose transition hover:bg-rose/10"
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <EditableText
                value={entry.title}
                as="h3"
                className="font-serif text-2xl text-text"
                placeholder="New chapter"
                onChange={(title) => updateEntry(entry.id, { title })}
              />
              <div className="mt-3">
                <EditableRichText
                  value={entry.body}
                  placeholder="Write this memory..."
                  onChange={(body) => updateEntry(entry.id, { body })}
                  className="text-text-muted"
                />
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
