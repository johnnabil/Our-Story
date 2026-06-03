"use client";

import { useMemo, useState } from "react";

import { EditableRichText } from "@/components/edit/EditableRichText";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { Modal } from "@/components/ui/Modal";
import { DREAM_CATEGORIES, type Dream, type DreamCategory } from "@/lib/types";
import { createId } from "@/lib/utils";



export function Dreams() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIcon, setNewIcon] = useState("*");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<DreamCategory>("travel");
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

  return (
    <section
      id="dreams"
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-serif text-3xl text-rose sm:text-4xl md:text-5xl">Dreams</h2>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full border border-rose/40 px-4 py-2 text-sm text-rose transition hover:bg-rose/10"
          >
            Add dream
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedDreams.map((dream) => (
          <article
            key={dream.id}
            className={`relative rounded-2xl border border-gold/25 bg-warm-white p-4 shadow-sm transition sm:p-5 ${
              dream.done ? "opacity-60" : ""
            }`}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => updateDream(dream.id, { done: !dream.done })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  dream.done
                    ? "border-rose/40 bg-rose/10 text-rose"
                    : "border-gold/35 text-text-muted hover:border-rose/35 hover:text-rose"
                }`}
              >
                {dream.done ? "Done" : "Mark done"}
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={() =>
                    updateContent(
                      "dreams",
                      dreams.filter((currentDream) => currentDream.id !== dream.id)
                    )
                  }
                  className="rounded border border-rose/30 px-2 py-1 text-xs text-rose transition hover:bg-rose/10"
                >
                  Delete
                </button>
              ) : null}
            </div>

            <EditableText
              value={dream.icon}
              className="text-3xl"
              onChange={(icon) => updateDream(dream.id, { icon })}
            />

            <EditableText
              value={dream.title}
              as="h3"
              className="mt-2 font-serif text-2xl text-text"
              onChange={(title) => updateDream(dream.id, { title })}
            />

            <div className="mt-3">
              <EditableRichText
                value={dream.desc}
                onChange={(desc) => updateDream(dream.id, { desc })}
                className="text-text-muted"
              />
            </div>

            <div className="mt-4">
              {isEditing ? (
                <select
                  value={dream.category}
                  onChange={(event) =>
                    updateDream(dream.id, { category: event.target.value as DreamCategory })
                  }
                  className="rounded-full border border-gold/35 bg-cream px-3 py-1 text-xs capitalize text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
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
          </article>
        ))}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        title="Add Dream"
        onClose={() => {
          setIsAddModalOpen(false);
          setNewIcon("*");
          setNewTitle("");
          setNewDesc("");
          setNewCategory("travel");
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newTitle.trim() || !newDesc.trim()) {
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

            setIsAddModalOpen(false);
            setNewIcon("*");
            setNewTitle("");
            setNewDesc("");
            setNewCategory("travel");
          }}
        >
          <label className="block text-sm text-text-muted">
            Icon
            <input
              type="text"
              value={newIcon}
              onChange={(event) => setNewIcon(event.target.value)}
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
            />
          </label>

          <label className="block text-sm text-text-muted">
            Title
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              required
            />
          </label>

          <label className="block text-sm text-text-muted">
            Description
            <textarea
              value={newDesc}
              onChange={(event) => setNewDesc(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              required
            />
          </label>

          <label className="block text-sm text-text-muted">
            Category
            <select
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value as DreamCategory)}
              className="mt-1 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
            >
              {DREAM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full border border-rose/40 px-4 py-2 text-sm font-medium text-rose transition hover:bg-rose/10"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
