"use client";

import { useState } from "react";

import { useEdit } from "@/components/providers/EditProvider";

interface EditableTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export function EditableTags({ tags, onChange, className }: EditableTagsProps) {
  const { isEditing } = useEdit();
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const nextTag = draft.trim();
    if (!nextTag) {
      setIsAdding(false);
      setDraft("");
      return;
    }

    if (!tags.includes(nextTag)) {
      onChange([...tags, nextTag]);
    }

    setDraft("");
    setIsAdding(false);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold-light/30 px-3 py-1 text-sm text-text"
        >
          {tag}
          {isEditing ? (
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-xs text-rose-deep transition hover:text-rose"
              aria-label={`Remove ${tag}`}
            >
              x
            </button>
          ) : null}
        </span>
      ))}

      {isEditing ? (
        <>
          {isAdding ? (
            <input
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onBlur={addTag}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }

                if (event.key === "Escape") {
                  setIsAdding(false);
                  setDraft("");
                }
              }}
              className="min-w-28 rounded-full border border-rose/60 bg-warm-white px-3 py-1 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              placeholder="New tag"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="rounded-full border border-dashed border-rose/60 px-3 py-1 text-sm text-rose transition hover:bg-rose/10"
            >
              + Add
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
